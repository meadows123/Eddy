import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation history when chat opens
  useEffect(() => {
    const loadConversationHistory = async () => {
      if (!isOpen || !user) return;

      setIsLoadingHistory(true);
      try {
        // Get the most recent conversation for this user
        const { data: conversations, error: convError } = await supabase
          .from('chat_conversations')
          .select('id')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (convError) {
          console.error('Error loading conversation:', convError);
          setIsLoadingHistory(false);
          return;
        }

        if (conversations && conversations.length > 0) {
          const convId = conversations[0].id;
          setConversationId(convId);

          // Load messages for this conversation
          const { data: chatMessages, error: messagesError } = await supabase
            .from('chat_messages')
            .select('role, content')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true });

          if (messagesError) {
            console.error('Error loading messages:', messagesError);
          } else if (chatMessages && chatMessages.length > 0) {
            console.log('Loaded messages:', chatMessages.length);
            setMessages(chatMessages.map(msg => ({
              role: msg.role,
              content: msg.content
            })));
          }
        } else {
          console.log('No previous conversations found');
        }
      } catch (error) {
        console.error('Error loading conversation history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadConversationHistory();
  }, [isOpen, user]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message to UI immediately
    const newUserMessage = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Call Supabase Edge Function
      const response = await supabase.functions.invoke('ai-chat', {
        body: {
          message: userMessage,
          conversationId: conversationId,
          history: messages.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        },
        headers: token ? {
          Authorization: `Bearer ${token}`
        } : {}
      });

      if (response.error) {
        throw response.error;
      }

      const aiMessage = response.data.message;
      const newConversationId = response.data.conversationId;

      if (newConversationId && !conversationId) {
        setConversationId(newConversationId);
      }

      // Add AI response to UI
      setMessages(prev => [...prev, { role: 'assistant', content: aiMessage }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or contact support@oneeddy.com'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 shadow-lg bg-brand-burgundy hover:bg-brand-burgundy/90"
          size="icon"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]">
      <Card className="shadow-2xl border-brand-burgundy/20">
        <div className="bg-brand-burgundy text-white p-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <h3 className="font-semibold">Help & Support</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-8 w-8"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <CardContent className="p-0 flex flex-col h-[500px] bg-white">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            {isLoadingHistory && (
              <div className="text-center text-gray-500 mt-8">
                <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
                <p>Loading conversation...</p>
              </div>
            )}
            {!isLoadingHistory && messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Hi! How can I help you today?</p>
              </div>
            )}
            {!isLoadingHistory && messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-brand-burgundy text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <p className={`text-sm whitespace-pre-wrap ${
                    msg.role === 'user' ? 'text-white' : 'text-gray-900 font-medium'
                  }`}>
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 rounded-lg px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-900" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t p-4 bg-white">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading || isLoadingHistory}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim() || isLoadingHistory}
                className="bg-brand-burgundy hover:bg-brand-burgundy/90"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatBot;