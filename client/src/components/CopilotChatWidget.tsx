import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Sparkles, Send, X, Trash2, Bot, User as UserIcon, Loader2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  timestamp: string;
}

export const CopilotChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('oss_query_solver_chat') || localStorage.getItem('oss_copilot_chat');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore parsing error
    }
    return [
      {
        id: 'welcome_1',
        sender: 'copilot',
        text: 'I am your OSS Query Solver, trained to resolve pull request blockers, summarize maintainer feedback, and answer repository contribution questions. How can I assist you today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('oss_query_solver_chat', JSON.stringify(messages));
    } catch {
      // ignore storage quota error
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  const handleSend = async (textToSend?: string) => {
    const promptText = (textToSend || query).trim();
    if (!promptText || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setIsLoading(true);

    try {
      const res = await axios.post('/api/ai/copilot', { question: promptText }, { timeout: 120000 });
      const answer = res.data?.answer || 'No response returned from the model.';

      const copilotMsg: ChatMessage = {
        id: `copilot_${Date.now()}`,
        sender: 'copilot',
        text: answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, copilotMsg]);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to reach neural query solver.';
      const errorMsg: ChatMessage = {
        id: `error_${Date.now()}`,
        sender: 'copilot',
        text: `Error: ${errMsg}. Ensure the neural query solver service is running.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
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
    const initial: ChatMessage[] = [
      {
        id: `welcome_${Date.now()}`,
        sender: 'copilot',
        text: 'Chat history cleared. What would you like to examine next?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setMessages(initial);
  };

  const quickPrompts = [
    'Which PRs need action?',
    'Summarize open reviews',
    'How do I unblock #1478?',
  ];

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-40 select-none">
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2 h-11 px-3.5 sm:px-4 rounded-full bg-accent-sapphire hover:bg-accent-sapphire/90 text-white font-mono font-bold text-xs shadow-lg shadow-accent-sapphire/25 border border-white/15 cursor-pointer backdrop-blur-md transition-all"
          title="Open OSS Query Solver"
        >
          <Sparkles className="h-4 w-4 shrink-0 text-white animate-pulse" />
          <span className="tracking-wide">QUERY SOLVER</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-merged opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-status-merged" />
          </span>
        </motion.button>
      </div>

      {/* Floating Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-20 sm:bottom-20 right-3 sm:right-6 z-50 w-[calc(100vw-24px)] sm:w-[420px] h-[540px] max-h-[82vh] rounded-2xl border border-border-subtle bg-surface-card shadow-2xl flex flex-col overflow-hidden select-none"
          >
            {/* Window Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-surface/80 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-sapphire/15 border border-accent-sapphire/30 text-accent-sapphire">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-text-primary tracking-tight">Query Solver</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-status-merged/15 text-status-merged border border-status-merged/30">
                      ONLINE
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-text-muted">Automated open source query resolution</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleClear}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
                  title="Clear conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
                  title="Close chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick Prompts Bar */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-surface-elevated/50 border-b border-border-subtle overflow-x-auto no-scrollbar shrink-0">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(qp)}
                  disabled={isLoading}
                  className="whitespace-nowrap px-2.5 py-1 rounded-md text-[11px] font-mono border border-border-subtle bg-surface-card hover:bg-surface-active hover:border-accent-sapphire/50 text-text-muted hover:text-text-primary transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {qp}
                </button>
              ))}
            </div>

            {/* Message History */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3 font-sans text-xs min-h-0">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'copilot' && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-sapphire/20 text-accent-sapphire mt-0.5">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 leading-relaxed text-xs shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-accent-sapphire text-white rounded-br-xs font-medium'
                        : 'bg-surface-elevated text-text-primary border border-border-subtle rounded-bl-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap select-text">{msg.text}</div>
                    <div
                      className={`text-[9px] font-mono mt-1 ${
                        msg.sender === 'user' ? 'text-white/70 text-right' : 'text-text-muted text-left'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {msg.sender === 'user' && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-elevated text-text-muted mt-0.5">
                      <UserIcon className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2.5 justify-start items-center text-text-muted">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-sapphire/20 text-accent-sapphire">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  </div>
                  <div className="bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 text-[11px] font-mono flex items-center gap-2">
                    <span>Resolving query with neural engine...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-2.5 border-t border-border-subtle bg-surface/90 shrink-0">
              <div className="flex items-center gap-2 bg-surface-elevated border border-border-subtle rounded-xl px-3 py-1.5 focus-within:border-accent-sapphire focus-within:ring-1 focus-within:ring-accent-sapphire/30 transition-all">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask any query regarding PRs, reviews, unblocking..."
                  className="flex-1 bg-transparent border-0 outline-none resize-none text-xs text-text-primary placeholder:text-text-muted font-sans py-1 max-h-24"
                />
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!query.trim() || isLoading}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-sapphire hover:bg-accent-sapphire/90 text-white disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                  title="Send question (Enter)"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between px-1 mt-1 text-[10px] font-mono text-text-dim">
                <span>Shift+Enter for newline</span>
                <span>Query Engine Active</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
