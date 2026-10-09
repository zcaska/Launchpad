import React, { useState } from 'react';
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  FileText, 
  X, 
  ClipboardList,
  Clock
} from 'lucide-react';
import { QuickNote } from '../../types';
import { calculateTaskLoad, formatMinutesToHours } from '../../utils/timeBudget';

interface QuickNotesWidgetProps {
  notes: QuickNote[];
  scratchpadText: string;
  onUpdateNotes: (notes: QuickNote[]) => void;
  onUpdateScratchpad: (text: string) => void;
  onClose?: () => void;
}

const DURATION_OPTIONS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '1.5h', minutes: 90 },
  { label: '2h', minutes: 120 },
];

export const QuickNotesWidget: React.FC<QuickNotesWidgetProps> = ({
  notes,
  scratchpadText,
  onUpdateNotes,
  onUpdateScratchpad,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'checklist' | 'scratchpad'>('checklist');
  const [newTodoText, setNewTodoText] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<number>(30);

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;

    const newNote: QuickNote = {
      id: `note-${Date.now()}`,
      text: newTodoText.trim(),
      isDone: false,
      createdAt: Date.now(),
      durationMinutes: selectedDuration,
    };

    onUpdateNotes([newNote, ...notes]);
    setNewTodoText('');
  };

  const handleToggleTodo = (id: string) => {
    onUpdateNotes(
      notes.map((note) =>
        note.id === id ? { ...note, isDone: !note.isDone } : note
      )
    );
  };

  const handleDeleteTodo = (id: string) => {
    onUpdateNotes(notes.filter((note) => note.id !== id));
  };

  const handleClearCompleted = () => {
    onUpdateNotes(notes.filter((note) => !note.isDone));
  };

  const loadSummary = calculateTaskLoad(notes);
  const completedCount = notes.filter((n) => n.isDone).length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl shadow-card overflow-hidden">
      {/* Widget Header */}
      <div className="p-4 border-b border-serene-border-light dark:border-serene-border-dark flex items-center justify-between bg-serene-surfaceAlt-light/50 dark:bg-serene-surfaceAlt-dark/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark">
            <ClipboardList className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
              Action Tasks & Scratchpad
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] text-serene-text-muted">
              <span>{loadSummary.pendingCount} pending</span>
              <span>•</span>
              <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                {loadSummary.formattedPending} total
              </span>
            </div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-serene-border-light dark:border-serene-border-dark text-xs font-medium">
        <button
          onClick={() => setActiveTab('checklist')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'checklist'
              ? 'border-serene-primary text-serene-primary dark:text-serene-primary-dark font-semibold bg-serene-primary-soft/30 dark:bg-serene-primary/10'
              : 'border-transparent text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Tasks ({notes.length - completedCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('scratchpad')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'scratchpad'
              ? 'border-serene-primary text-serene-primary dark:text-serene-primary-dark font-semibold bg-serene-primary-soft/30 dark:bg-serene-primary/10'
              : 'border-transparent text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Freeform Notes</span>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 overflow-y-auto min-h-[250px]">
        {activeTab === 'checklist' ? (
          <div className="space-y-3">
            {/* Add Todo Input + Duration Picker */}
            <form onSubmit={handleAddTodo} className="space-y-2 p-2.5 bg-serene-surfaceAlt-light/60 dark:bg-serene-surfaceAlt-dark/40 rounded-xl border border-serene-border-light dark:border-serene-border-dark">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  placeholder="Add a new task..."
                  className="flex-1 text-xs bg-white dark:bg-serene-surface-dark px-3 py-1.5 rounded-lg border border-serene-border-light dark:border-serene-border-dark text-serene-text-primary dark:text-serene-text-darkPrimary placeholder:text-serene-text-muted focus:outline-none focus:ring-1 focus:ring-serene-primary"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-serene-primary hover:bg-serene-primary-hover text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {/* Quick Duration Pills */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-serene-text-muted font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Time:
                </span>
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.minutes}
                    type="button"
                    onClick={() => setSelectedDuration(opt.minutes)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-all ${
                      selectedDuration === opt.minutes
                        ? 'bg-serene-primary text-white font-semibold shadow-2xs'
                        : 'bg-white dark:bg-serene-surface-dark text-serene-text-secondary dark:text-serene-text-darkSecondary border border-serene-border-light dark:border-serene-border-dark hover:border-serene-primary/40'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </form>

            {/* Todo Items */}
            <div className="space-y-1.5 pt-1">
              {notes.length === 0 ? (
                <div className="text-center py-8 text-serene-text-muted text-xs">
                  🎉 All tasks finished! LaunchPad suggestion engine is ready.
                </div>
              ) : (
                notes.map((note) => {
                  const duration = note.durationMinutes || 30;
                  return (
                    <div
                      key={note.id}
                      onClick={() => handleToggleTodo(note.id)}
                      className={`group flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        note.isDone
                          ? 'bg-serene-surfaceAlt-light/60 dark:bg-serene-surfaceAlt-dark/40 border-transparent text-serene-text-muted'
                          : 'bg-white dark:bg-serene-surface-dark border-serene-border-light dark:border-serene-border-dark hover:border-serene-primary/40 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTodo(note.id);
                          }}
                          className={`shrink-0 transition-colors ${
                            note.isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-serene-text-muted group-hover:text-serene-primary'
                          }`}
                        >
                          {note.isDone ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <span
                          className={`text-xs truncate transition-all ${
                            note.isDone
                              ? 'line-through text-serene-text-muted dark:text-serene-text-darkMuted'
                              : 'text-serene-text-primary dark:text-serene-text-darkPrimary font-medium'
                          }`}
                        >
                          {note.text}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${
                          note.isDone 
                            ? 'bg-black/5 dark:bg-white/5 border-transparent text-serene-text-muted'
                            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 font-semibold'
                        }`}>
                          {formatMinutesToHours(duration)}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTodo(note.id);
                          }}
                          title="Delete task"
                          className="p-1 text-serene-text-muted hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {completedCount > 0 && (
              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={handleClearCompleted}
                  className="text-[11px] text-serene-text-muted hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                >
                  Clear completed ({completedCount})
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <textarea
              value={scratchpadText}
              onChange={(e) => onUpdateScratchpad(e.target.value)}
              placeholder="Dump thoughts, lecture notes, quick links, or temporary text here..."
              className="w-full flex-1 min-h-[220px] text-xs bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark p-3 rounded-xl border border-serene-border-light dark:border-serene-border-dark text-serene-text-primary dark:text-serene-text-darkPrimary placeholder:text-serene-text-muted focus:outline-none focus:ring-1 focus:ring-serene-primary font-mono leading-relaxed resize-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};
