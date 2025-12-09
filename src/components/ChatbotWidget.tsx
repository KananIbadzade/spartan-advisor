import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Minimize2, Send, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { callOpenAI, callOpenAIWithTools } from '@/lib/api';
import {
  extractCourseCodes,
  getCoursesByCodes,
  buildCourseContext,
  extractMajorKeywords,
  searchRoadmaps,
  buildRoadmapContext,
  getCurrentUserMajor,
  getCompletedCoursesFromTranscript,
  buildCompletedCoursesContext
} from '@/lib/supabase-queries';
import {
  addCourseToPlan,
  removeCourseFromPlan,
  getCoursesInPlan,
  moveCourseToSemester
} from '@/lib/chatbot-actions';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

const STORAGE_KEY = 'chatbot-messages';

// Function definitions for OpenAI function calling
const CHATBOT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'add_course_to_plan',
      description: 'Add a course to the student\'s course planner for a specific semester',
      parameters: {
        type: 'object',
        properties: {
          courseCode: {
            type: 'string',
            description: 'The course code (e.g., "CMPE 133", "CS 146", "MATH 30")'
          },
          term: {
            type: 'string',
            enum: ['Spring', 'Summer', 'Fall', 'Winter'],
            description: 'The semester/term'
          },
          year: {
            type: 'string',
            description: 'The year (e.g., "2025", "2026")'
          }
        },
        required: ['courseCode', 'term', 'year']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'remove_course_from_plan',
      description: 'Remove a course from the student\'s course planner',
      parameters: {
        type: 'object',
        properties: {
          courseCode: {
            type: 'string',
            description: 'The course code to remove (e.g., "CMPE 133", "CS 146")'
          }
        },
        required: ['courseCode']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_courses_in_plan',
      description: 'Get all courses currently in the student\'s course planner',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'move_course_to_semester',
      description: 'Move a course that is already in the plan to a different semester/year',
      parameters: {
        type: 'object',
        properties: {
          courseCode: {
            type: 'string',
            description: 'The course code to move (e.g., "CMPE 133", "CS 146")'
          },
          newTerm: {
            type: 'string',
            enum: ['Spring', 'Summer', 'Fall', 'Winter'],
            description: 'The new semester/term to move the course to'
          },
          newYear: {
            type: 'string',
            description: 'The new year to move the course to (e.g., "2025", "2026")'
          }
        },
        required: ['courseCode', 'newTerm', 'newYear']
      }
    }
  }
];

export const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 360, height: 600 });
  const [isResizing, setIsResizing] = useState(false);

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })));
      } catch (error) {
        console.error('Failed to load messages from localStorage:', error);
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen && !isMinimized && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const contextParts: string[] = [];

      // Get user's major from profile (for personalized responses)
      const userMajor = await getCurrentUserMajor();

      // Get completed courses from transcript (for progress-aware recommendations)
      const completedCourses = await getCompletedCoursesFromTranscript().catch(err => {
        console.error('Failed to fetch completed courses:', err);
        return [];
      });
      if (completedCourses.length > 0) {
        const completedContext = buildCompletedCoursesContext(completedCourses);
        contextParts.push(completedContext);
        console.log(`Added ${completedCourses.length} completed courses to context`);
      }

      // Extract course codes from the user's message (e.g., "CMPE 133", "CS 46A")
      const courseCodes = extractCourseCodes(userMessage.content);

      // If course codes were mentioned, fetch data from Supabase
      if (courseCodes.length > 0) {
        const courses = await getCoursesByCodes(courseCodes);

        if (courses.length > 0) {
          const courseContext = buildCourseContext(courses);
          contextParts.push(courseContext);
        }
      }

      // Extract major keywords (e.g., "software engineering", "computer science")
      let majorKeywords = extractMajorKeywords(userMessage.content);

      // If no major mentioned but user has major in profile, auto-use it
      if (majorKeywords.length === 0 && userMajor) {
        majorKeywords = [userMajor.toLowerCase()];
        console.log(`Auto-detected user major from profile: ${userMajor}`);
      }

      // If major keywords were mentioned or detected, fetch roadmap data
      if (majorKeywords.length > 0) {
        // Search for the first matching major
        const roadmaps = await searchRoadmaps(majorKeywords[0]);

        if (roadmaps.length > 0) {
          const roadmapContext = buildRoadmapContext(roadmaps[0]);
          contextParts.push(roadmapContext);
        }
      }

      // Build the enhanced prompt with all available context
      let enhancedPrompt = userMessage.content;

      if (contextParts.length > 0) {
        enhancedPrompt = `${contextParts.join('\n\n---\n\n')}\n\nStudent Question: ${userMessage.content}`;
      }

      // Determine current and next semester
      const now = new Date();
      const currentMonth = now.getMonth(); // 0-11
      const currentYear = now.getFullYear();

      let currentSemester = '';
      let nextSemester = '';
      let nextYear = currentYear;

      // Determine current semester based on month
      if (currentMonth >= 0 && currentMonth <= 4) { // Jan-May
        currentSemester = 'Spring';
        nextSemester = 'Fall';
      } else if (currentMonth >= 5 && currentMonth <= 7) { // Jun-Aug
        currentSemester = 'Summer';
        nextSemester = 'Fall';
      } else { // Sep-Dec
        currentSemester = 'Fall';
        nextSemester = 'Spring';
        nextYear = currentYear + 1;
      }

      // Enhanced system message with function calling instructions
      const systemMessage = `You are a helpful assistant for SJSU students, specializing in course planning and academic advising.
${userMajor ? `\nThe student is majoring in ${userMajor}.` : ''}
${completedCourses.length > 0 ? `\nThe student has already completed ${completedCourses.length} courses (listed in the context below).` : ''}

CURRENT CONTEXT:
- Current semester: ${currentSemester} ${currentYear}
- Next semester: ${nextSemester} ${nextYear}
- When the student says "next semester", they mean ${nextSemester} ${nextYear}

IMPORTANT INSTRUCTIONS:
1. When showing major roadmaps, include ALL courses from the roadmap data provided, organized by year and semester.
2. Clearly distinguish between:
   - SPECIFIC COURSES (like "CS 46A - Introduction to Programming") - these have course codes and full titles
   - PLACEHOLDER CATEGORIES (like "GE Area 1A", "Computer Science Elective", "Upper Division Elective") - these are flexible choices the student selects
3. For placeholder categories, explain that students choose courses from that category (e.g., "GE Area 1A - you choose a course from General Education Area 1A").
4. Include unit counts for each semester.
5. Mention any special notes (like "Apply to Graduate" or GPA requirements).
6. Be comprehensive - don't summarize or skip courses when showing a roadmap.${userMajor ? `\n7. When asked about general course planning, prioritize information relevant to ${userMajor} students.` : ''}
${completedCourses.length > 0 ? `\n8. CRITICAL: When asked "what courses should I take", ONLY recommend courses the student HAS NOT completed yet. Cross-reference with their completed courses list.` : ''}
${completedCourses.length > 0 ? `\n9. When recommending next courses, check prerequisites - only suggest courses whose prerequisites they've already completed.` : ''}

COURSE PLANNER ACTIONS:
10. Use get_courses_in_plan ONLY when asked "what's in my plan", "show my plan", or "what courses do I have".
11. When asked "what should I take next semester" or "what courses should I take":
    - Look at their roadmap and completed courses
    - Find courses they HAVEN'T taken yet but should take next
    - IMMEDIATELY add those courses using add_course_to_plan (one call per course)
    - Tell them what you added
12. Use add_course_to_plan for:
    - Recommendations: "what should I take" → recommend and add immediately
    - Explicit requests: "add CMPE 133 to Fall 2025" → add immediately
13. Use remove_course_from_plan when asked to remove courses.
14. Use move_course_to_semester when asked to:
    - Move a course to a different semester (e.g., "move CMPE 133 to Spring 2026")
    - Change when a course is scheduled (e.g., "switch CS 146 to next semester")
    - Reschedule or adjust course timing
15. NEVER ask for confirmation - just execute the action and confirm what was done.`;

      // Call OpenAI API with tools (function calling support)
      const maxTokens = majorKeywords.length > 0 ? 1500 : 500;
      console.log('[CHATBOT] Calling OpenAI API with enhanced prompt');
      console.log('[CHATBOT] User question:', userMessage.content);
      console.log('[CHATBOT] Context parts:', contextParts.length);

      const { content, toolCalls } = await callOpenAIWithTools(
        enhancedPrompt,
        systemMessage,
        maxTokens,
        CHATBOT_TOOLS
      );

      console.log('[CHATBOT] OpenAI Response received:', {
        hasContent: !!content,
        toolCallsCount: toolCalls?.length || 0
      });

      // Handle tool calls if any
      if (toolCalls && toolCalls.length > 0) {
        console.log('[CHATBOT] Tool calls detected:', toolCalls.map(tc => ({
          name: tc.function.name,
          args: tc.function.arguments
        })));

        // Execute each tool call
        for (const toolCall of toolCalls) {
          try {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            console.log(`[CHATBOT] Executing tool: ${functionName}`, functionArgs);

            let result: any;

            switch (functionName) {
              case 'add_course_to_plan':
                result = await addCourseToPlan(
                  functionArgs.courseCode,
                  functionArgs.term,
                  functionArgs.year
                );
                console.log('[CHATBOT] Add course result:', result);
                // Trigger planner refresh
                if (result.success) {
                  window.dispatchEvent(new CustomEvent('plannerChanged'));
                }
                break;
              case 'remove_course_from_plan':
                result = await removeCourseFromPlan(functionArgs.courseCode);
                console.log('[CHATBOT] Remove course result:', result);
                // Trigger planner refresh
                if (result.success) {
                  window.dispatchEvent(new CustomEvent('plannerChanged'));
                }
                break;
              case 'move_course_to_semester':
                result = await moveCourseToSemester(
                  functionArgs.courseCode,
                  functionArgs.newTerm,
                  functionArgs.newYear
                );
                console.log('[CHATBOT] Move course result:', result);
                // Trigger planner refresh
                if (result.success) {
                  window.dispatchEvent(new CustomEvent('plannerChanged'));
                }
                break;
              case 'get_courses_in_plan':
                result = await getCoursesInPlan();
                console.log('[CHATBOT] Get courses result:', result);
                // Format the courses nicely
                if (result.success && result.courses.length > 0) {
                  const coursesByTerm: { [key: string]: any[] } = {};
                  result.courses.forEach((course: any) => {
                    const key = `${course.term} ${course.year}`;
                    if (!coursesByTerm[key]) coursesByTerm[key] = [];
                    coursesByTerm[key].push(course);
                  });

                  let formattedMessage = "Here are the courses currently in your plan:\n\n";
                  Object.entries(coursesByTerm).forEach(([term, courses]) => {
                    const totalUnits = courses.reduce((sum, c) => sum + c.units, 0);
                    formattedMessage += `**${term}** (${totalUnits} units):\n`;
                    courses.forEach(c => {
                      formattedMessage += `- ${c.code} - ${c.title} (${c.units} units)\n`;
                    });
                    formattedMessage += '\n';
                  });
                  result.message = formattedMessage;
                } else if (result.success) {
                  result.message = "Your course plan is currently empty.";
                }
                break;
              default:
                result = { success: false, message: 'Unknown function' };
                console.error('❌ Unknown function called:', functionName);
            }

            // Display function result to user
            const resultMessage: Message = {
              id: `bot-${Date.now()}-${toolCall.id}`,
              role: 'bot',
              content: result.message || 'Action completed.',
              timestamp: new Date(),
            };

            console.log('[CHATBOT] Adding result message to chat:', resultMessage.content);
            setMessages((prev) => [...prev, resultMessage]);
          } catch (toolError) {
            console.error('[CHATBOT ERROR] Error executing tool:', toolError);
            const errorMsg: Message = {
              id: `bot-error-${Date.now()}`,
              role: 'bot',
              content: `Error executing ${toolCall.function.name}: ${toolError instanceof Error ? toolError.message : 'Unknown error'}`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMsg]);
          }
        }
      } else if (content) {
        // No tool calls, just regular response
        console.log('[CHATBOT] Regular response (no tool calls):', content);
        const botMessage: Message = {
          id: `bot-${Date.now()}`,
          role: 'bot',
          content: content,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, botMessage]);
      } else {
        // Neither tool calls nor content - this shouldn't happen
        console.error('[CHATBOT WARNING] OpenAI returned neither content nor tool calls');
        const warningMessage: Message = {
          id: `bot-${Date.now()}`,
          role: 'bot',
          content: 'I received your message but the AI service returned an empty response. Please try again.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, warningMessage]);
      }
    } catch (error) {
      console.error('[CHATBOT ERROR]:', error);
      console.error('[CHATBOT] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });

      // Add detailed error message for user
      let errorText = 'Sorry, I encountered an error. ';

      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorText += 'The OpenAI API key is missing or invalid. Please check your .env file.';
        } else if (error.message.includes('fetch')) {
          errorText += 'Unable to connect to the OpenAI API. Please check your internet connection.';
        } else {
          errorText += `Error: ${error.message}`;
        }
      } else {
        errorText += 'An unknown error occurred. Please check the browser console for details.';
      }

      const errorMessage: Message = {
        id: `bot-${Date.now()}`,
        role: 'bot',
        content: errorText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    if (confirm('Clear all messages?')) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleToggle = () => {
    if (isOpen && isMinimized) {
      setIsMinimized(false);
    } else {
      setIsOpen(!isOpen);
      setIsMinimized(false);
    }
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleMouseDown = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = dimensions.width;
    const startHeight = dimensions.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      let newWidth = startWidth;
      let newHeight = startHeight;

      
      if (direction.includes('left')) {
        newWidth = Math.max(320, Math.min(800, startWidth + (startX - moveEvent.clientX)));
      }
      if (direction.includes('right')) {
        newWidth = Math.max(320, Math.min(800, startWidth + (moveEvent.clientX - startX)));
      }
      if (direction.includes('top')) {
        newHeight = Math.max(400, Math.min(window.innerHeight * 0.9, startHeight + (startY - moveEvent.clientY)));
      }
      if (direction.includes('bottom')) {
        newHeight = Math.max(400, Math.min(window.innerHeight * 0.9, startHeight + (moveEvent.clientY - startY)));
      }

      setDimensions({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <>
      {/* Launcher Button */}
      {(!isOpen || isMinimized) && (
        <button
          onClick={handleToggle}
          className={cn(
            '!fixed !bottom-4 !right-4 sm:!bottom-6 sm:!right-6 !z-[9999]',
            'w-16 h-16 rounded-full',
            'bg-gradient-to-br from-blue-600 to-blue-700',
            'text-white',
            'shadow-xl hover:shadow-2xl',
            'flex items-center justify-center',
            'transition-all duration-300',
            'hover:scale-110 active:scale-95',
            'border-2 border-blue-500/20',
            'overflow-hidden',
            'group'
          )}
          aria-label="Open chatbot"
          style={{ position: 'fixed', right: '1rem', bottom: '1rem', left: 'auto' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <MessageCircle className="w-7 h-7 relative z-10" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          ref={chatPanelRef}
          className={cn(
            'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999]',
            'bg-background border border-border rounded-lg',
            'shadow-2xl',
            'flex flex-col',
            isMinimized ? '' : 'transition-all duration-200',
            'backdrop-blur-xl',
            'overflow-hidden'
          )}
          style={
            isMinimized
              ? { width: `${dimensions.width}px`, height: 'auto' }
              : { width: `${dimensions.width}px`, height: `${dimensions.height}px` }
          }
        >
          {/* Resize Handles */}
          {!isMinimized && (
            <>
              {/* Top-left corner */}
              <div
                className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-10"
                onMouseDown={(e) => handleMouseDown(e, 'top-left')}
              />
              {/* Top-right corner */}
              <div
                className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-10"
                onMouseDown={(e) => handleMouseDown(e, 'top-right')}
              />
              {/* Bottom-left corner */}
              <div
                className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-10"
                onMouseDown={(e) => handleMouseDown(e, 'bottom-left')}
              />
              {/* Bottom-right corner */}
              <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-10"
                onMouseDown={(e) => handleMouseDown(e, 'bottom-right')}
              />
              {/* Top edge */}
              <div
                className="absolute top-0 left-4 right-4 h-1 cursor-ns-resize z-10"
                onMouseDown={(e) => handleMouseDown(e, 'top')}
              />
              {/* Bottom edge */}
              <div
                className="absolute bottom-0 left-4 right-4 h-1 cursor-ns-resize z-10"
                onMouseDown={(e) => handleMouseDown(e, 'bottom')}
              />
              {/* Left edge */}
              <div
                className="absolute left-0 top-4 bottom-4 w-1 cursor-ew-resize z-10"
                onMouseDown={(e) => handleMouseDown(e, 'left')}
              />
              {/* Right edge */}
              <div
                className="absolute right-0 top-4 bottom-4 w-1 cursor-ew-resize z-10"
                onMouseDown={(e) => handleMouseDown(e, 'right')}
              />
            </>
          )}
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Spartan AI Advisor</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Your course planning assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                onClick={handleMinimize}
                aria-label="Minimize"
              >
                <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                onClick={handleClose}
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-900">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-4">
                      <MessageCircle className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Welcome to Spartan AI Advisor!</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                      Ask me about courses, your schedule, or what to take next semester.
                    </p>
                    <div className="mt-6 space-y-2 w-full max-w-xs">
                      <div className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-2">Try asking:</div>
                      {['What should I take next semester?', 'Show my course plan', 'Add CMPE 133 to Fall 2025'].map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => setInputValue(suggestion)}
                          className="w-full text-left px-3 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-gray-700 dark:text-gray-300"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          'flex gap-3',
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {message.role === 'bot' && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                            <MessageCircle className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div
                          className={cn(
                            'max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm',
                            message.role === 'user'
                              ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-md'
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-md'
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words leading-relaxed">
                            {message.content}
                          </p>
                          <span className={cn(
                            'text-xs mt-1 block',
                            message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                          )}>
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                          <MessageCircle className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3 text-sm flex items-center gap-2 shadow-sm border border-gray-200 dark:border-gray-700">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          <span className="text-gray-600 dark:text-gray-300">Thinking...</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask me anything..."
                      className="min-h-[50px] max-h-[120px] resize-none rounded-xl border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800 pr-12 text-sm"
                      rows={1}
                      disabled={isLoading}
                    />
                    {inputValue.trim() && (
                      <Button
                        onClick={handleSend}
                        size="icon"
                        disabled={!inputValue.trim() || isLoading}
                        className="absolute right-2 bottom-2 h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 h-7"
                    disabled={messages.length === 0 || isLoading}
                  >
                    <Trash2 className="w-3 h-3 mr-1.5" />
                    Clear chat
                  </Button>
                  <div className="flex-1" />
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center">
                    Press Enter to send
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

