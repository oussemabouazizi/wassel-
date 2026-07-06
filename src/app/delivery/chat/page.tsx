'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Send, ChevronLeft, User, Store,
  Phone, MapPin, Clock, CheckCheck
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { Card, Badge, Skeleton, EmptyState, Input, Button } from '@/components/ui';
import { useToast } from '@/components/ui';
import { formatRelativeTime } from '@/lib/utils';
import type { Chat, Message, Order, Profile } from '@/types';

interface ChatWithDetails extends Chat {
  orders: { order_number: string; delivery_address: string };
  profiles: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
  messages: Message[];
}

export default function ChatPage() {
  const supabase = createClient();
  const { user } = useAppStore();
  const { toast } = useToast();

  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatWithDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchChats = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from('chats')
      .select('*, orders(order_number, delivery_address), profiles!chats_customer_id_fkey(id, full_name, avatar_url)')
      .eq('delivery_person_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      const chatsWithMessages = await Promise.all(
        (data as ChatWithDetails[]).map(async (chat) => {
          const { data: msgs } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1);
          return { ...chat, messages: msgs || [] };
        })
      );
      setChats(chatsWithMessages);
    }

    setLoading(false);
  }, [user, supabase]);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  const fetchMessages = async (chatId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data as Message[]);
  };

  const selectChat = async (chat: ChatWithDetails) => {
    setSelectedChat(chat);
    setMessages([]);
    await fetchMessages(chat.id);

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('chat_id', chat.id)
      .neq('sender_id', user?.id);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedChat || !user) return;
    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');

    // Optimistic: add message to state immediately
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      chat_id: selectedChat.id,
      sender_id: user.id,
      text,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: selectedChat.id,
        sender_id: user.id,
        text,
      })
      .select()
      .single();

    if (error) {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter(m => m.id !== optimisticMsg.id));
      setNewMessage(text);
      toast('error', 'Failed to send message');
    } else if (data) {
      // Replace optimistic with real message
      setMessages((prev) => prev.map(m => m.id === optimisticMsg.id ? (data as Message) : m));
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!selectedChat) return;

    const channel = supabase
      .channel(`delivery-chat-${selectedChat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${selectedChat.id}`,
        },
        (payload: any) => {
          const msg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedChat, supabase]);

  // Polling fallback — re-fetch messages every 3s
  useEffect(() => {
    if (!selectedChat) return;
    const interval = setInterval(() => fetchMessages(selectedChat.id), 3000);
    return () => clearInterval(interval);
  }, [selectedChat]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32 rounded-xl" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (selectedChat) {
    return (
      <div className="flex flex-col h-[calc(100vh-12rem)]">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setSelectedChat(null)}
            className="p-2 rounded-xl hover:bg-[var(--color-surface)] transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--color-text-primary)]" />
          </button>
          <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
            <User className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[var(--color-text-primary)]">{selectedChat.profiles?.full_name || 'Customer'}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{selectedChat.orders?.order_number}</p>
          </div>
        </div>

        <Card className="flex-1 overflow-hidden flex flex-col p-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-[var(--color-text-secondary)]">No messages yet. Say hello!</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMine = msg.sender_id === user?.id;
                const showAvatar = i === 0 || messages[i - 1]?.sender_id !== msg.sender_id;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] ${
                        isMine
                          ? 'bg-[var(--color-primary)] text-white rounded-2xl rounded-br-md'
                          : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-2xl rounded-bl-md'
                      } px-4 py-2.5`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-[10px] mt-1 ${isMine ? 'text-white/70' : 'text-[var(--color-text-secondary)]'}`}>
                        {formatRelativeTime(msg.created_at)}
                      </p>
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-[var(--color-border)]">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                isLoading={sending}
                disabled={!newMessage.trim()}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Chats</h1>

      {chats.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="w-8 h-8 text-[var(--color-text-secondary)]" />}
          title="No conversations"
          description="When you accept a delivery, a chat with the customer will appear here."
        />
      ) : (
        <div className="space-y-3">
          {chats.map((chat, i) => (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                hover
                onClick={() => selectChat(chat)}
                className="flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-[var(--color-primary)]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-semibold text-[var(--color-text-primary)]">
                      {chat.profiles?.full_name || 'Customer'}
                    </p>
                    {chat.messages?.[0] && (
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {formatRelativeTime(chat.messages[0].created_at)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <Store className="w-3.5 h-3.5" />
                    <span className="truncate">{chat.orders?.order_number}</span>
                  </div>
                  {chat.messages?.[0] && (
                    <p className="text-sm text-[var(--color-text-secondary)] truncate mt-0.5">
                      {chat.messages[0].text}
                    </p>
                  )}
                </div>

                <ChevronLeft className="w-5 h-5 text-[var(--color-text-secondary)] rotate-180 flex-shrink-0" />
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
