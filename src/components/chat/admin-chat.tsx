'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Loader2, Sparkles, BarChart3 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME: Record<string, string> = {
  en: "Hello! I'm Wassel Admin AI. Ask me about orders, revenue, stores, delivery team, or any dashboard metric. What would you like to know?",
  fr: "Bonjour! Je suis Wassel Admin AI. Demandez-moi sur les commandes, revenus, boutiques, livraisons, ou toute métrique. Que souhaitez-vous savoir?",
  ar: "!مرحبًا! أنا Wassel Admin AI. اسألني عن الطلبات، الإيرادات، المتاجر، فريق التوصيل، أو أي إحصائية. ماذا تريد أن تعرف؟",
};

const QUICK: Record<string, { label: string; prompt: string }[]> = {
  en: [
    { label: 'Dashboard overview', prompt: 'Give me a full dashboard overview with all key metrics' },
    { label: "Today's stats", prompt: "How many orders today and what's the revenue?" },
    { label: 'Top stores', prompt: 'Which stores have the most orders?' },
    { label: 'Delivery team', prompt: 'How is the delivery team performing?' },
    { label: 'Categories', prompt: 'Show me orders by category' },
  ],
  fr: [
    { label: 'Vue du tableau de bord', prompt: "Donnez-moi un aperçu complet du tableau de bord" },
    { label: "Stats d'aujourd'hui", prompt: "Combien de commandes aujourd'hui et quel est le revenu?" },
    { label: 'Meilleures boutiques', prompt: 'Quelles boutiques ont le plus de commandes?' },
    { label: 'Équipe livraison', prompt: "Comment se porte l'équipe de livraison?" },
    { label: 'Catégories', prompt: 'Montrez-moi les commandes par catégorie' },
  ],
  ar: [
    { label: 'نظرة عامة', prompt: 'أعطني نظرة عامة كاملة على لوحة التحكم' },
    { label: 'إحصائيات اليوم', prompt: 'كم طلبات اليوم وما الإيراد؟' },
    { label: 'أفضل المتاجر', prompt: 'أي المتاجر لديها أكبر عدد طلبات؟' },
    { label: 'فريق التوصيل', prompt: 'كيف أداء فريق التوصيل؟' },
    { label: 'حسب الفئة', prompt: 'أرني الطلبات حسب الفئة' },
  ],
};

export default function AdminAiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<'en' | 'fr' | 'ar'>('en');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('wassel-lang') : null;
    if (saved === 'ar' || saved === 'fr' || saved === 'en') setLang(saved);
  }, []);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: 'assistant', content: WELCOME[lang] }]);
    }
  }, [isOpen, lang]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          role: 'admin',
        }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply || data.error || 'Error fetching data.',
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = QUICK[lang] || QUICK.en;

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 z-[9999] w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all"
        style={{ background: 'linear-gradient(135deg, #FF6B00, #E55A00)' }}
        whileHover={{ scale: 1.1, boxShadow: '0 8px 30px rgba(255, 107, 0, 0.4)' }}
        whileTap={{ scale: 0.95 }}
        animate={isOpen ? {} : { boxShadow: ['0 4px 15px rgba(255,107,0,0.3)', '0 4px 25px rgba(255,107,0,0.5)', '0 4px 15px rgba(255,107,0,0.3)'] }}
        transition={isOpen ? {} : { duration: 2, repeat: Infinity }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Sparkles className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 left-4 sm:left-6 z-[9999] w-[calc(100vw-32px)] sm:w-[400px] sm:max-w-[calc(100vw-48px)] rounded-2xl shadow-2xl overflow-hidden flex flex-col border"
            style={{
              height: 'min(540px, calc(100vh - 120px))',
              background: 'var(--color-background)',
              borderColor: 'var(--color-border)',
            }}
          >
            {/* Header */}
            <div className="text-white px-4 py-3 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #FF6B00, #E55A00)' }}>
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm">Wassel Admin AI</h3>
                <p className="text-xs text-white/80">
                  {lang === 'ar' ? 'مساعد لوحة التحكم' : lang === 'fr' ? 'Assistant admin' : 'Admin Dashboard AI'}
                </p>
              </div>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as any)}
                className="bg-white/20 text-white text-xs rounded-lg px-2 py-1.5 border border-white/30 outline-none cursor-pointer backdrop-blur-sm"
              >
                <option value="en" className="text-black">EN</option>
                <option value="fr" className="text-black">FR</option>
                <option value="ar" className="text-black">عربي</option>
              </select>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ background: 'var(--color-surface)' }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'text-white rounded-2xl rounded-br-md'
                      : 'rounded-2xl rounded-bl-md border'
                  }`} style={msg.role === 'user'
                    ? { background: 'linear-gradient(135deg, #FF6B00, #E55A00)' }
                    : { background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }
                  }>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1 mb-1.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B00, #E55A00)' }}>
                          <Bot className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: '#FF6B00' }}>Admin AI</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md border" style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#FF6B00' }} />
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {lang === 'ar' ? 'جاري تحليل البيانات...' : lang === 'fr' ? 'Analyse des données...' : 'Analyzing data...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick actions */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5" style={{ background: 'var(--color-surface)' }}>
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(action.prompt)}
                    className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors border"
                    style={{
                      background: 'var(--color-background)',
                      borderColor: 'var(--color-border)',
                      color: '#FF6B00',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#FF6B00'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#FF6B00'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-background)'; e.currentTarget.style.color = '#FF6B00'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-3 py-3 border-t" style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  placeholder={lang === 'ar' ? 'اسأل عن أي شيء...' : lang === 'fr' ? 'Posez une question...' : 'Ask about your business...'}
                  className="flex-1 resize-none rounded-xl px-3 py-2.5 text-sm focus:outline-none max-h-20 border"
                  style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  rows={1}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 rounded-xl text-white flex items-center justify-center transition-all disabled:opacity-40 flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #FF6B00, #E55A00)' }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
