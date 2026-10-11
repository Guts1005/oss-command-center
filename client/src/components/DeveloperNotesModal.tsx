import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { X, CheckCircle2, Circle, Trash2, Plus, Calendar, Clock, Loader2, StickyNote } from 'lucide-react';

export interface DeveloperNote {
  id: string;
  user_id: string;
  content: string;
  target_date: string | null;
  is_completed: number;
  created_at: string;
}

interface DeveloperNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeveloperNotesModal: React.FC<DeveloperNotesModalProps> = ({ isOpen, onClose }) => {
  const [notes, setNotes] = useState<DeveloperNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newTarget, setNewTarget] = useState<'none' | 'today' | 'tomorrow'>('tomorrow');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/notes');
      setNotes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch developer notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotes();
    }
  }, [isOpen]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const targetDate = newTarget === 'none' ? null : newTarget;
      const res = await axios.post('/api/notes', {
        content: newContent.trim(),
        targetDate,
      });
      if (res.data) {
        setNotes((prev) => [res.data, ...prev]);
        setNewContent('');
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async (id: string) => {
    try {
      const res = await axios.patch(`/api/notes/${id}`);
      if (res.data) {
        setNotes((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_completed: res.data.is_completed } : n))
        );
      }
    } catch (err) {
      console.error('Failed to update note status:', err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await axios.delete(`/api/notes/${id}`);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-lg rounded-2xl border border-border-subtle bg-surface-card shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-surface/80 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-sapphire/15 border border-accent-sapphire/30 text-accent-sapphire">
                  <StickyNote className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary tracking-tight">Developer Notes & Tasks</h3>
                  <p className="text-[11px] font-mono text-text-muted">Persistent reminder ledger managed via UI or natural language</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Add Form */}
            <form onSubmit={handleCreateNote} className="p-4 border-b border-border-subtle bg-surface-elevated/40">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="e.g. check Gitlab MR tomorrow, rebase branch..."
                  className="flex-1 bg-surface-card border border-border-subtle rounded-xl px-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent-sapphire transition-all font-sans"
                />
                <button
                  type="submit"
                  disabled={!newContent.trim() || isSubmitting}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-sapphire hover:bg-accent-sapphire/90 text-white font-mono text-xs font-semibold disabled:opacity-40 cursor-pointer transition-all shrink-0"
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  <span>Add</span>
                </button>
              </div>

              {/* Target Date Quick Selector */}
              <div className="flex items-center gap-2 mt-2.5 text-[11px] font-mono text-text-muted">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Due:
                </span>
                <button
                  type="button"
                  onClick={() => setNewTarget('tomorrow')}
                  className={`px-2 py-0.5 rounded-md border text-[10px] transition-all cursor-pointer ${
                    newTarget === 'tomorrow'
                      ? 'bg-accent-sapphire/20 border-accent-sapphire/40 text-accent-sapphire font-bold'
                      : 'border-border-subtle hover:bg-surface-elevated text-text-muted'
                  }`}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => setNewTarget('today')}
                  className={`px-2 py-0.5 rounded-md border text-[10px] transition-all cursor-pointer ${
                    newTarget === 'today'
                      ? 'bg-accent-sapphire/20 border-accent-sapphire/40 text-accent-sapphire font-bold'
                      : 'border-border-subtle hover:bg-surface-elevated text-text-muted'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setNewTarget('none')}
                  className={`px-2 py-0.5 rounded-md border text-[10px] transition-all cursor-pointer ${
                    newTarget === 'none'
                      ? 'bg-accent-sapphire/20 border-accent-sapphire/40 text-accent-sapphire font-bold'
                      : 'border-border-subtle hover:bg-surface-elevated text-text-muted'
                  }`}
                >
                  No Date
                </button>
              </div>
            </form>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-text-muted gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-accent-sapphire" />
                  <span className="text-xs font-mono">Loading notes ledger...</span>
                </div>
              ) : notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-text-muted text-center gap-1.5">
                  <StickyNote className="h-8 w-8 text-text-muted/40" />
                  <p className="text-xs font-medium text-text-primary">No developer notes recorded</p>
                  <p className="text-[11px] font-mono max-w-xs text-text-dim">
                    Ask the Query Solver to add notes or reminders (e.g. "add a note to check Gitlab tomorrow").
                  </p>
                </div>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition-all ${
                      note.is_completed
                        ? 'bg-surface-elevated/30 border-border-subtle/50 opacity-60'
                        : 'bg-surface-card border-border-subtle hover:border-accent-sapphire/40'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(note.id)}
                      className="mt-0.5 text-text-muted hover:text-accent-sapphire transition-colors cursor-pointer shrink-0"
                    >
                      {note.is_completed ? (
                        <CheckCircle2 className="h-4 w-4 text-status-merged" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-medium leading-relaxed break-words ${
                          note.is_completed ? 'line-through text-text-muted' : 'text-text-primary'
                        }`}
                      >
                        {note.content}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-text-muted">
                        {note.target_date && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Clock className="h-3 w-3" />
                            <span>Due: {note.target_date}</span>
                          </span>
                        )}
                        <span>Created {note.created_at.split('T')[0]}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-text-muted hover:text-status-closed transition-colors cursor-pointer p-1 rounded-md hover:bg-surface-elevated shrink-0"
                      title="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border-subtle bg-surface/90 flex items-center justify-between text-[11px] font-mono text-text-dim">
              <span>{notes.filter((n) => !n.is_completed).length} active tasks remaining</span>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded-lg border border-border-subtle hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
