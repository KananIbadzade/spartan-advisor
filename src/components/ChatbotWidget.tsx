import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Minimize2, Send, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { callOpenAI } from '@/lib/api';
import {
  extractCourseCodes,
  getCoursesByCodes,
  buildCourseContext,
  extractMajorKeywords,
  searchRoadmaps,
  buildRoadmapContext,
  getCurrentUserMajor
} from '@/lib/supabase-queries';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

const STORAGE_KEY = 'chatbot-messages';

export const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      let contextParts: string[] = [];

      // Get user's major from profile (for personalized responses)
      const userMajor = await getCurrentUserMajor();

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

      // Enhanced system message for better roadmap responses
      const systemMessage = `You are a helpful assistant for SJSU students, specializing in course planning and academic advising.
${userMajor ? `\nThe student is majoring in ${userMajor}.` : ''}

IMPORTANT INSTRUCTIONS:
1. When showing major roadmaps, include ALL courses from the roadmap data provided, organized by year and semester.
2. Clearly distinguish between:
   - SPECIFIC COURSES (like "CS 46A - Introduction to Programming") - these have course codes and full titles
   - PLACEHOLDER CATEGORIES (like "GE Area 1A", "Computer Science Elective", "Upper Division Elective") - these are flexible choices the student selects
3. For placeholder categories, explain that students choose courses from that category (e.g., "GE Area 1A - you choose a course from General Education Area 1A").
4. Include unit counts for each semester.
5. Mention any special notes (like "Apply to Graduate" or GPA requirements).
6. Be comprehensive - don't summarize or skip courses when showing a roadmap.${userMajor ? `\n7. When asked about general course planning, prioritize information relevant to ${userMajor} students.` : ''}`;

      // Call OpenAI API with enhanced prompt (includes course/roadmap data)
      // Use higher token limit for roadmap queries to allow complete responses
      const maxTokens = majorKeywords.length > 0 ? 1500 : 500;
      const response = await callOpenAI(enhancedPrompt, systemMessage, maxTokens);

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        role: 'bot',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      // Add error message
      const errorMessage: Message = {
        id: `bot-${Date.now()}`,
        role: 'bot',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    setIsMinimized(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  return (
    <>
      {/* Launcher Button */}
      {(!isOpen || isMinimized) && (
        <button
          onClick={handleToggle}
          className={cn(
            'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999]',
            'w-14 h-14 rounded-full',
            'bg-primary text-primary-foreground',
            'shadow-lg hover:shadow-xl',
            'flex items-center justify-center',
            'transition-all duration-200',
            'hover:scale-110 active:scale-95'
          )}
          aria-label="Open chatbot"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          className={cn(
            'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999]',
            'w-[360px] max-w-[calc(100vw-2rem)] sm:max-w-[360px]',
            isMinimized ? 'h-auto' : 'h-[70vh] max-h-[600px] min-h-[400px]',
            'bg-background border border-border rounded-lg',
            'shadow-2xl',
            'flex flex-col',
            'transition-all duration-200'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
            <h3 className="font-semibold text-lg">Course Planner Assistant</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleMinimize}
                aria-label="Minimize"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClose}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    <p>Start a conversation about your course plan...</p>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          'flex',
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[80%] rounded-lg px-4 py-2 text-sm',
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-muted-foreground">Thinking...</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-border space-y-2">
                <div className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message... (Enter to send, Shift+Enter for newline)"
                    className="min-h-[60px] max-h-[120px] resize-none"
                    rows={2}
                    disabled={isLoading}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClear}
                    className="flex-1"
                    disabled={messages.length === 0 || isLoading}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                  <Button
                    onClick={handleSend}
                    size="sm"
                    className="flex-1"
                    disabled={!inputValue.trim() || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

