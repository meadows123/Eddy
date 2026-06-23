import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, X, Send, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from './ui/use-toast';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { user } = useAuth();

  // Predefined questions users can ask
  const suggestedQuestions = [
    "How do I make a booking?",
    "How does split payment work?",
    "Can I cancel my booking?",
    "How do I update my profile?",
    "What are venue credits?",
    "How do I contact support?",
    "What is the refund policy?",
    "How do I use my referral code?"
  ];

  // Load conversation history when opening chat
  useEffect(() => {
    if (isOpen && user && conversationId) {
      loadConversationHistory();
    }
  }, [isOpen, conversationId, user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isMinimized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversationHistory = async () => {
    if (!conversationId || !user) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.created_at
        })));
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setShowSuggestions(false); // Hide suggestions once user starts chatting
    
    // Add user message to UI immediately
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Call AI chat function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId: conversationId,
          history: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Add AI response to messages
      const aiMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMessage]);

      // Update conversation ID if we got a new one
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
      
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    
    // Add welcome message if no messages
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Hello! I'm your Eddy's Members support assistant. How can I help you today?\n\nYou can ask me about:\n• Making bookings\n• Split payments\n• Cancellations & refunds\n• Your profile & account\n• Venue credits\n• And more!\n\nOr click on one of the suggested questions below to get started.",
        timestamp: new Date().toISOString()
      }]);
      setShowSuggestions(true);
    }
  };

  const handleSuggestionClick = (question) => {
    setInput(question);
    setShowSuggestions(false);
    // Auto-focus input and user can press enter or click send
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <>
      {/* Help Icon Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-40 bg-brand-burgundy text-white rounded-full p-3 shadow-lg hover:bg-brand-burgundy/90 transition-all duration-200 hover:scale-110"
          aria-label="Get help"
          title="Need help? Click to chat with support"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 z-50 w-96 h-[600px] shadow-2xl flex flex-col border-brand-burgundy/20">
          {/* Header */}
          <div className="bg-brand-burgundy text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              <h3 className="font-semibold">Support Chat</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMinimize}
                className="h-8 w-8 text-white hover:bg-white/20"
                aria-label={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8 text-white hover:bg-white/20"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          {!isMinimized && (
            <>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-brand-burgundy text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                
                {/* Suggested Questions */}
                {showSuggestions && messages.length === 1 && !isLoading && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-medium mb-2">Suggested questions:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {suggestedQuestions.slice(0, 4).map((question, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(question)}
                          className="text-left text-xs bg-white border border-gray-200 rounded-lg p-2.5 hover:bg-brand-burgundy/5 hover:border-brand-burgundy/30 transition-colors text-gray-700"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin text-brand-burgundy" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Input Area */}
              <form onSubmit={handleSend} className="p-4 border-t border-gray-200 bg-white">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Powered by AI • support@oneeddy.com
                </p>
              </form>
            </>
          )}
        </Card>
      )}
    </>
  );
};

export default ChatBot;
