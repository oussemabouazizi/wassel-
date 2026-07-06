'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  MessageCircle, ChevronRight, Store, Package, Send, ArrowLeft, User
} from 'lucide-react';
import { Button, Card, Input, Badge, Skeleton, EmptyState } from '@/components/ui';
import { useToast } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime } from '@/lib/utils';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import type { Order, Message, Store as StoreType } from '@/types';

type OrderForChat = Order & { stores: Pick<StoreType, 'name' | 'image_url'> };

export default function CustomerChatPage() {
  const router = useRouter();
  const supabase = createClient();
  const user = useAppStore((s) => s.user);
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderForChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    fetchOrders();
  }, [user]);

  async function fetchOrders() {
    try {
      const { data } = await supabase
        .from('orders')
        .select('*, stores(name, image_url)')
        .eq('customer_id', user!.id)
        .in('status', ['confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way', 'delivered'])
        .order('created_at', { ascending: false });
      setOrders(data || []);
    } catch {} finally { setLoading(false); }
  }

  async function fetchChat(orderId: string) {
    const { data } = await supabase
      .from('chats')
      .select('id, delivery_person_id')
      .eq('order_id', orderId)
      .maybeSingle();
    return data;
  }

  async function fetchMessages(chatId: string) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as Message[]);
  }

  const selectOrder = async (orderId: string) => {
    setSelectedId(orderId);
    setMessages([]);
    const chat = await fetchChat(orderId);
    if (chat) {
      setChatId(chat.id);
      await fetchMessages(chat.id);
    } else {
      setChatId(null);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`customer-chat-${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, (payload: any) => {
        const msg = payload.new as Message;
        setMessages((prev) => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatId, supabase]);

  // Polling fallback — re-fetch messages every 3s
  useEffect(() => {
    if (!chatId) return;
    const interval = setInterval(() => fetchMessages(chatId), 3000);
    return () => clearInterval(interval);
  }, [chatId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !chatId || !user) return;
    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');

    // Optimistic: add message to state immediately
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      chat_id: chatId,
      sender_id: user.id,
      text,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const { data, error } = await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: user.id,
      text,
    }).select().single();

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

  if (loading) return (
    <div className="p-4 max-w-2xl mx-auto space-y-3">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
    </div>
  );

  if (orders.length === 0) return (
    <div className="p-4">
      <EmptyState icon={<MessageCircle className="w-8 h-8 text-[var(--color-text-secondary)]" />} title="No conversations" description="Place an order to start chatting with your delivery person" action={<Button onClick={() => router.push('/stores')}>Browse stores</Button>} />
    </div>
  );

  return (
    <div className="p-4 max-w-2xl mx-auto pb-32">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">Messages</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          {orders.map((order, i) => (
            <motion.div key={order.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <button onClick={() => selectOrder(order.id)} className="w-full text-left">
                <Card hover className={cn('flex items-center gap-3 p-3', selectedId === order.id && 'border-[var(--color-primary)]')}>
                  <div className="w-12 h-12 rounded-xl bg-[var(--color-surface)] overflow-hidden shrink-0">
                    {order.stores?.image_url ? <img src={order.stores.image_url} alt={order.stores.name} className="w-full h-full object-cover" /> : (
                      <div className="w-full h-full flex items-center justify-center"><Store className="w-5 h-5 text-[var(--color-text-secondary)]" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--color-text-primary)] text-sm truncate">{order.stores?.name || 'Store'}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Order #{order.id.slice(0, 8)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                </Card>
              </button>
            </motion.div>
          ))}
        </div>
        <div className="min-h-[400px]">
          {selectedId ? (
            <Card className="h-full flex flex-col">
              <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-border)] mb-3">
                <button onClick={() => { setSelectedId(null); setChatId(null); }} className="p-1 rounded-lg hover:bg-[var(--color-surface)] transition-colors md:hidden">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <Package className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-sm font-medium text-[var(--color-text-primary)]">Order #{selectedId.slice(0, 8)}</span>
              </div>
              <div className="flex-1 space-y-3 mb-4 overflow-y-auto max-h-[300px]">
                {!chatId ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageCircle className="w-8 h-8 text-[var(--color-text-secondary)] mb-2" />
                    <p className="text-sm text-[var(--color-text-secondary)]">Waiting for a delivery person to accept your order. Chat will be available once assigned.</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageCircle className="w-8 h-8 text-[var(--color-text-secondary)] mb-2" />
                    <p className="text-sm text-[var(--color-text-secondary)]">No messages yet. Send a message to your delivery person.</p>
                  </div>
                ) : messages.map((msg) => (
                  <div key={msg.id} className={cn('max-w-[80%] p-3 rounded-2xl text-sm', msg.sender_id === user?.id ? 'bg-[var(--color-primary)] text-white ml-auto rounded-br-md' : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] mr-auto rounded-bl-md')}>
                    <p>{msg.text}</p>
                    <p className={cn('text-[10px] mt-1', msg.sender_id === user?.id ? 'text-white/70' : 'text-[var(--color-text-secondary)]')}>{formatRelativeTime(msg.created_at)}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              {chatId && (
                <div className="flex gap-2 pt-3 border-t border-[var(--color-border)]">
                  <Input placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
                  <Button size="sm" onClick={handleSend} isLoading={sending} disabled={!newMessage.trim()}><Send className="w-4 h-4" /></Button>
                </div>
              )}
            </Card>
          ) : (
            <div className="hidden md:flex md:items-center md:justify-center h-full">
              <EmptyState icon={<MessageCircle className="w-8 h-8 text-[var(--color-text-secondary)]" />} title="Select an order" description="Choose an order to view messages" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
