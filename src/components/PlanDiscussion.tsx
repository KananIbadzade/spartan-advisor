import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Send, Trash2, User } from 'lucide-react';

interface Message {
  id: string;
  student_id: string;
  advisor_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

interface PlanDiscussionProps {
  studentId: string;
  advisorId?: string;
  currentUserRole: 'advisor' | 'student';
  studentName?: string;
}

export const PlanDiscussion = ({ studentId, advisorId, currentUserRole, studentName }: PlanDiscussionProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [resolvedAdvisorId, setResolvedAdvisorId] = useState<string | null>(advisorId || null);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [profilesById, setProfilesById] = useState<Record<string, { first_name: string | null; last_name: string | null }>>({});

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (studentId) {
      loadAdvisorAssignment();
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId && resolvedAdvisorId) {
      loadMessages();

      // Subscribe to all message changes for this student so both
      // advisor and student views stay in sync when messages are
      // added or cleared.
      const channel = supabase
        .channel(`plan_messages_${studentId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'plan_messages',
            filter: `student_id=eq.${studentId}`
          },
          () => {
            // Reload from the database on any insert/update/delete
            // so refreshes and clears stay consistent for both sides.
            loadMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [studentId, resolvedAdvisorId]);

  const loadAdvisorAssignment = async () => {
    // If advisorId is already provided, use it
    if (advisorId) {
      setResolvedAdvisorId(advisorId);
      return;
    }

    // Otherwise, fetch the advisor assignment for this student
    try {
      const { data, error } = await supabase
        .from('advisor_assignments')
        .select('advisor_id')
        .eq('student_id', studentId)
        .limit(1);

      if (error) {
        console.error('Error loading advisor assignment:', error);
        return;
      }

      if (data && data.length > 0) {
        console.log('Resolved advisor ID:', data[0].advisor_id);
        setResolvedAdvisorId(data[0].advisor_id);
      } else {
        console.log('No advisor assignment found for student:', studentId);
      }
    } catch (error) {
      console.error('Error loading advisor assignment:', error);
    }
  };

  const loadMessages = async () => {
    if (!resolvedAdvisorId) {
      console.log('❌ Cannot load messages - resolvedAdvisorId is null');
      console.log('   This means either:');
      console.log('   1. No advisor_assignments row exists for studentId:', studentId);
      console.log('   2. advisorId prop was not passed to PlanDiscussion');
      return;
    }

    try {
      setLoading(true);

      // Debug: Check current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('✅ Loading messages...');
      console.log('   Current user:', currentUser?.id);
      console.log('   Student ID:', studentId);
      console.log('   Advisor ID:', resolvedAdvisorId);
      console.log('   Current role:', currentUserRole);

      // Load all messages for this student using raw SQL to bypass TypeScript type issues
      // RLS policies will ensure advisors can only see messages for their assigned students
      const { data, error }: any = await supabase
        .from('plan_messages' as any)
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error loading messages:', error);
        console.error('   Error details:', JSON.stringify(error, null, 2));
      } else {
        console.log('✅ Messages loaded successfully:', data?.length || 0, 'messages');
      }

      if (error) {
        // Show RLS-specific guidance
        if (error.message?.includes('policy')) {
          console.error('❌ RLS Policy Error - User does not have permission to view these messages');
          console.error('   Check that:');
          console.error('   1. advisor_assignments table has a row linking this advisor to this student');
          console.error('   2. RLS policies on plan_messages allow SELECT for this user');
        }
        toast({
          title: 'Error',
          description: 'Failed to load messages. Check console for details.',
          variant: 'destructive'
        });
        return;
      }

      const rows = (data || []) as Message[];

      // Fetch sender profiles for all unique sender_ids
      const senderIds = [...new Set(rows.map(m => m.sender_id))];
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', senderIds);

        if (profiles) {
          const nextProfiles: Record<string, { first_name: string | null; last_name: string | null }> = { ...profilesById };
          profiles.forEach(p => {
            nextProfiles[p.id] = {
              first_name: p.first_name,
              last_name: p.last_name
            };
          });
          setProfilesById(nextProfiles);
        }
      }

      setMessages(rows);
    } catch (error) {
      console.error('Caught error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !resolvedAdvisorId) return;

    try {
      setSending(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to send messages',
          variant: 'destructive'
        });
        return;
      }

      const messageData = {
        student_id: studentId,
        advisor_id: resolvedAdvisorId,
        sender_id: user.id,
        message: newMessage.trim()
      };

      console.log('Attempting to insert message:', messageData);

      const { data: insertedData, error }: any = await supabase
        .from('plan_messages' as any)
        .insert(messageData)
        .select();

      console.log('Insert result:', insertedData);
      console.log('Insert error:', error);

      if (error) {
        console.error('❌ Error sending message:', error);
        console.error('   Error details:', JSON.stringify(error, null, 2));
        
        // Provide specific guidance based on error type
        let errorDescription = 'Failed to send message';
        if (error.message?.includes('policy') || error.code === '42501') {
          errorDescription = 'No advisor assigned. Please contact an administrator to assign an advisor.';
          console.error('   RLS Policy Error - likely no advisor_assignments row exists');
          console.error('   Student ID:', studentId);
          console.error('   Advisor ID:', resolvedAdvisorId);
          console.error('   Current user:', user.id);
        }
        
        toast({
          title: 'Error',
          description: errorDescription,
          variant: 'destructive'
        });
        return;
      }

      // Only add to local state if database insert was successful
      if (insertedData && insertedData.length > 0) {
        console.log('✅ Message sent successfully');
        // Immediately add to local state for instant UI feedback
        // The realtime subscription will also pick it up, but this is faster
        setMessages((current) => [...current, insertedData[0] as Message]);
      } else {
        console.warn('⚠️ Insert succeeded but no data returned');
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearConversation = async () => {
    if (!studentId) return;

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to clear messages',
          variant: 'destructive'
        });
        return;
      }

      // Only advisors (or admins accessing via advisor tools) should be able to clear
      if (currentUserRole !== 'advisor') {
        toast({
          title: 'Not allowed',
          description: 'Only advisors can clear the conversation.',
          variant: 'destructive'
        });
        return;
      }

      const { error }: any = await supabase
        .from('plan_messages' as any)
        .delete()
        .eq('student_id', studentId);

      if (error) {
        console.error('Error clearing messages:', error);
        toast({
          title: 'Error',
          description: 'Failed to clear conversation',
          variant: 'destructive'
        });
        return;
      }

      // Local clear for advisor; student view will clear on next realtime refresh
      setMessages([]);
      toast({
        title: 'Conversation cleared',
        description: 'Plan discussion messages have been cleared for this student.',
      });
    } catch (error) {
      console.error('Error clearing conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear conversation',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Plan Discussion
            </CardTitle>
            <CardDescription>
              {currentUserRole === 'advisor'
                ? `Conversation with ${studentName || 'student'} about their plan`
                : 'Discuss your plan with your advisor'}
            </CardDescription>
          </div>
          {currentUserRole === 'advisor' && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-destructive hover:text-destructive"
              onClick={handleClearConversation}
              disabled={loading || messages.length === 0}
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Messages Thread */}
            <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No messages yet</p>
                  <p className="text-sm mt-1">Start the conversation about this plan</p>
                </div>
              ) : (
                messages.map((msg) => {
                  // Check if message is from student (sender_id matches student_id)
                  // Otherwise it's from an advisor
                  const isFromStudent = msg.sender_id === studentId;
                  const isFromAdvisor = !isFromStudent;
                  const isOwnMessage = currentUserRole === 'advisor' ? isFromAdvisor : isFromStudent;

                  const profile = profilesById[msg.sender_id];
                  const hasName = profile && (profile.first_name || profile.last_name);
                  const displayName = hasName
                    ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
                    : isFromAdvisor
                      ? 'Advisor'
                      : 'Student';

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          isOwnMessage
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-3 h-3" />
                          <span className="text-xs font-semibold">
                            {displayName}
                          </span>
                          <span className="text-xs opacity-70">
                            {new Date(msg.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
              {/* Invisible div for auto-scrolling to bottom */}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t pt-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={sending || !resolvedAdvisorId}
                  rows={3}
                  className="resize-none"
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    {newMessage.length} characters
                  </p>
                  <Button
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim() || !resolvedAdvisorId}
                    size="sm"
                    className="gap-1"
                  >
                    <Send className="w-3 h-3" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
