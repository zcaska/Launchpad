import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Clock,
  ExternalLink,
  Search,
  CheckCircle2,
  Link as LinkIcon,
  ListTodo,
  X,
  ArrowLeft,
  FileText
} from 'lucide-react';
import { QuickNote, TaskPriority, TaskUrl, Subtask } from '../../types';
import { calculateTaskLoad, formatMinutesToHours } from '../../utils/timeBudget';

export interface TaskManagementScreenProps {
  notes: QuickNote[];
  scratchpadText: string;
  onUpdateNotes: (notes: QuickNote[]) => void;
  onUpdateScratchpad: (text: string) => void;
  onBackToDashboard?: () => void;
}

const DURATION_OPTIONS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '1.5h', minutes: 90 },
  { label: '2h', minutes: 120 },
];

type FilterTab = 'All' | 'High Priority' | 'Medium' | 'Low' | 'Due Soon' | 'Completed';

export const TaskManagementScreen: React.FC<TaskManagementScreenProps> = ({
  notes,
  scratchpadText,
  onUpdateNotes,
  onUpdateScratchpad,
  onBackToDashboard,
}) => {
  // Filters & State
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(true);

  // Modal / Form state for Add / Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDuration, setFormDuration] = useState<number>(30);
  const [formPriority, setFormPriority] = useState<TaskPriority>('medium');
  const [formDeadline, setFormDeadline] = useState('');
  
  // Attached URLs form state
  const [formUrls, setFormUrls] = useState<TaskUrl[]>([]);
  const [urlTitleInput, setUrlTitleInput] = useState('');
  const [urlAddressInput, setUrlAddressInput] = useState('');
  const [urlError, setUrlError] = useState('');

  // Subtasks form state
  const [formSubtasks, setFormSubtasks] = useState<Subtask[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');

  // Quick stats
  const loadSummary = useMemo(() => calculateTaskLoad(notes), [notes]);
  const totalCompleted = useMemo(() => notes.filter((n) => n.isDone).length, [notes]);

  // Deadline calculation helpers
  const getDeadlineStatus = (deadlineStr?: string) => {
    if (!deadlineStr) return null;
    try {
      const now = new Date();
      // If only time is provided (e.g. HH:MM)
      if (/^\d{2}:\d{2}$/.test(deadlineStr)) {
        const [hours, minutes] = deadlineStr.split(':').map(Number);
        const deadlineDate = new Date();
        deadlineDate.setHours(hours, minutes, 0, 0);
        const diffMinutes = Math.round((deadlineDate.getTime() - now.getTime()) / 60000);
        if (diffMinutes < 0) return { label: `Overdue (${deadlineStr})`, isOverdue: true, isDueToday: true };
        if (diffMinutes <= 120) return { label: `Due in ${diffMinutes}m`, isDueSoon: true, isDueToday: true };
        return { label: `Due at ${deadlineStr}`, isDueToday: true };
      }

      // If full date or date-time is provided
      const deadlineDate = new Date(deadlineStr);
      if (isNaN(deadlineDate.getTime())) {
        return { label: deadlineStr, isGeneral: true };
      }

      const isToday =
        deadlineDate.getFullYear() === now.getFullYear() &&
        deadlineDate.getMonth() === now.getMonth() &&
        deadlineDate.getDate() === now.getDate();

      const diffHours = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (deadlineDate.getTime() < now.getTime()) {
        return { label: `Overdue (${deadlineDate.toLocaleDateString([], { month: 'short', day: 'numeric' })})`, isOverdue: true, isDueToday: isToday };
      }
      if (isToday) {
        return { 
          label: `Due today ${deadlineDate.getHours() ? deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`.trim(), 
          isDueToday: true,
          isDueSoon: diffHours <= 24 
        };
      }
      if (diffHours <= 48 && diffHours > 0) {
        return { label: `Due soon (${deadlineDate.toLocaleDateString([], { month: 'short', day: 'numeric' })})`, isDueSoon: true };
      }

      return { 
        label: deadlineDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: deadlineDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined }), 
        isFuture: true 
      };
    } catch {
      return { label: deadlineStr, isGeneral: true };
    }
  };

  // Open Task Creation
  const handleOpenCreateForm = () => {
    setEditingTaskId(null);
    setFormTitle('');
    setFormDuration(30);
    setFormPriority('medium');
    setFormDeadline('');
    setFormUrls([]);
    setFormSubtasks([]);
    setUrlTitleInput('');
    setUrlAddressInput('');
    setUrlError('');
    setSubtaskInput('');
    setIsFormOpen(true);
  };

  // Open Task Edit
  const handleOpenEditForm = (task: QuickNote) => {
    setEditingTaskId(task.id);
    setFormTitle(task.text);
    setFormDuration(task.durationMinutes || 30);
    setFormPriority(task.priority || 'medium');
    setFormDeadline(task.deadline || '');
    setFormUrls(task.attachedUrls ? [...task.attachedUrls] : []);
    setFormSubtasks(task.subtasks ? [...task.subtasks] : []);
    setUrlTitleInput('');
    setUrlAddressInput('');
    setUrlError('');
    setSubtaskInput('');
    setIsFormOpen(true);
  };

  // Add Attached URL
  const handleAddUrl = () => {
    let cleanUrl = urlAddressInput.trim();
    if (!cleanUrl) return;

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    try {
      new URL(cleanUrl);
      const newUrlObj: TaskUrl = {
        id: `url-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: urlTitleInput.trim() || undefined,
        url: cleanUrl,
      };
      setFormUrls([...formUrls, newUrlObj]);
      setUrlTitleInput('');
      setUrlAddressInput('');
      setUrlError('');
    } catch {
      setUrlError('Please enter a valid URL.');
    }
  };

  const handleRemoveUrl = (id: string) => {
    setFormUrls(formUrls.filter((u) => u.id !== id));
  };

  // Add Subtask
  const handleAddSubtask = () => {
    if (!subtaskInput.trim()) return;
    const newSub: Subtask = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: subtaskInput.trim(),
      isDone: false,
    };
    setFormSubtasks([...formSubtasks, newSub]);
    setSubtaskInput('');
  };

  const handleRemoveSubtask = (id: string) => {
    setFormSubtasks(formSubtasks.filter((s) => s.id !== id));
  };

  // Save Task (Create or Update)
  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingTaskId) {
      onUpdateNotes(
        notes.map((n) =>
          n.id === editingTaskId
            ? {
                ...n,
                text: formTitle.trim(),
                durationMinutes: formDuration,
                priority: formPriority,
                deadline: formDeadline.trim() || undefined,
                attachedUrls: formUrls.length > 0 ? formUrls : undefined,
                subtasks: formSubtasks.length > 0 ? formSubtasks : undefined,
              }
            : n
        )
      );
    } else {
      const newTask: QuickNote = {
        id: `task-${Date.now()}`,
        text: formTitle.trim(),
        isDone: false,
        createdAt: Date.now(),
        durationMinutes: formDuration,
        priority: formPriority,
        deadline: formDeadline.trim() || undefined,
        attachedUrls: formUrls.length > 0 ? formUrls : undefined,
        subtasks: formSubtasks.length > 0 ? formSubtasks : undefined,
      };
      onUpdateNotes([newTask, ...notes]);
    }

    setIsFormOpen(false);
  };

  // Direct In-Card Actions
  const handleToggleTaskComplete = (taskId: string) => {
    onUpdateNotes(
      notes.map((n) => (n.id === taskId ? { ...n, isDone: !n.isDone } : n))
    );
  };

  const handleDeleteTask = (taskId: string) => {
    onUpdateNotes(notes.filter((n) => n.id !== taskId));
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    onUpdateNotes(
      notes.map((task) => {
        if (task.id !== taskId || !task.subtasks) return task;
        return {
          ...task,
          subtasks: task.subtasks.map((st) =>
            st.id === subtaskId ? { ...st, isDone: !st.isDone } : st
          ),
        };
      })
    );
  };

  // Filtered tasks computation
  const filteredTasks = useMemo(() => {
    return notes.filter((task) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.text.toLowerCase().includes(query);
        const matchesSubtasks = task.subtasks?.some((st) =>
          st.text.toLowerCase().includes(query)
        );
        const matchesUrls = task.attachedUrls?.some(
          (u) =>
            u.url.toLowerCase().includes(query) ||
            (u.title && u.title.toLowerCase().includes(query))
        );
        if (!matchesTitle && !matchesSubtasks && !matchesUrls) {
          return false;
        }
      }

      // Tab filter
      switch (activeTab) {
        case 'All':
          return true;
        case 'High Priority':
          return !task.isDone && task.priority === 'high';
        case 'Medium':
          return !task.isDone && task.priority === 'medium';
        case 'Low':
          return !task.isDone && task.priority === 'low';
        case 'Due Soon': {
          if (task.isDone || !task.deadline) return false;
          const status = getDeadlineStatus(task.deadline);
          return !!(status?.isDueSoon || status?.isOverdue || status?.isDueToday);
        }
        case 'Completed':
          return task.isDone;
        default:
          return true;
      }
    });
  }, [notes, searchQuery, activeTab]);

  return (
    <div className="flex flex-col h-full bg-serene-bg-light dark:bg-serene-bg-dark text-serene-text-primary dark:text-serene-text-darkPrimary overflow-hidden">
      {/* 1. TOP HEADER & OVERVIEW BAR */}
      <header className="shrink-0 bg-white dark:bg-serene-surface-dark border-b border-serene-border-light dark:border-serene-border-dark px-4 sm:px-6 py-4 shadow-subtle transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Back button + Title & Core Stats */}
          <div className="flex items-center gap-3">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="p-2 rounded-xl bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark hover:bg-black/5 dark:hover:bg-white/10 text-serene-text-secondary dark:text-serene-text-darkSecondary border border-serene-border-light dark:border-serene-border-dark transition-all"
                title="Back to Main Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark">
                  <ListTodo className="w-5 h-5" />
                </div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-serene-text-primary dark:text-serene-text-darkPrimary">
                  Task Management & Planning
                </h1>
              </div>

              {/* Status metrics pill row */}
              <div className="flex items-center gap-3 mt-1 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-serene-text-secondary dark:text-serene-text-darkSecondary">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <strong className="text-serene-text-primary dark:text-serene-text-darkPrimary font-bold">
                    {loadSummary.pendingCount}
                  </strong>{' '}
                  pending
                </span>
                <span className="text-serene-text-muted">•</span>
                <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <strong>{totalCompleted}</strong> done
                </span>
                <span className="text-serene-text-muted">•</span>
                <span className="flex items-center gap-1 font-mono font-medium text-serene-primary dark:text-serene-primary-dark">
                  <Clock className="w-3.5 h-3.5" />
                  <strong>{loadSummary.formattedPending}</strong> load
                </span>
              </div>
            </div>
          </div>

          {/* Right: Search, Filter Tabs & Add Task Primary Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[200px] sm:min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-serene-text-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks, subtasks, urls..."
                className="w-full pl-8 pr-7 py-1.5 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark rounded-xl text-xs text-serene-text-primary dark:text-serene-text-darkPrimary border border-serene-border-light dark:border-serene-border-dark placeholder:text-serene-text-muted focus:outline-none focus:ring-2 focus:ring-serene-primary/30 focus:border-serene-primary transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-serene-text-muted hover:text-serene-text-primary"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Scratchpad Toggle Button */}
            <button
              onClick={() => setIsScratchpadOpen(!isScratchpadOpen)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isScratchpadOpen
                  ? 'bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark border-serene-primary/30'
                  : 'bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-secondary dark:text-serene-text-darkSecondary border-serene-border-light dark:border-serene-border-dark hover:text-serene-text-primary'
              }`}
              title="Toggle side scratchpad"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Scratchpad</span>
            </button>

            {/* Primary 'Add New Task' Button */}
            <button
              onClick={handleOpenCreateForm}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-serene-primary hover:bg-serene-primary-hover text-white text-xs font-semibold rounded-xl shadow-xs transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Task</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs Navigation */}
        <div className="flex items-center gap-1.5 mt-3.5 overflow-x-auto pb-0.5 pt-1 text-xs">
          {(['All', 'High Priority', 'Medium', 'Low', 'Due Soon', 'Completed'] as FilterTab[]).map(
            (tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all ${
                    isActive
                      ? 'bg-serene-primary text-white font-semibold shadow-xs'
                      : 'bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-secondary dark:text-serene-text-darkSecondary hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary border border-serene-border-light dark:border-serene-border-dark'
                  }`}
                >
                  {tab}
                </button>
              );
            }
          )}
        </div>
      </header>

      {/* 2. BODY CONTENT: Tasks Grid/List + Collapsible Scratchpad Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Task Cards Flow */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="py-20 text-center rounded-2xl border border-dashed border-serene-border-light dark:border-serene-border-dark bg-white/40 dark:bg-serene-surface-dark/40 flex flex-col items-center justify-center p-6">
              <div className="w-12 h-12 rounded-2xl bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark flex items-center justify-center text-serene-text-muted mb-3">
                <CheckSquare className="w-6 h-6 opacity-60" />
              </div>
              <h3 className="text-base font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
                No tasks found
              </h3>
              <p className="text-xs text-serene-text-muted mt-1 max-w-sm">
                {searchQuery
                  ? `No tasks match your search "${searchQuery}".`
                  : activeTab !== 'All'
                  ? `No tasks currently inside filter "${activeTab}".`
                  : 'Your task list is completely clear. Plan your next milestone.'}
              </p>
              <button
                onClick={handleOpenCreateForm}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-serene-primary hover:bg-serene-primary-hover text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create a task</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredTasks.map((task) => {
                const deadlineInfo = getDeadlineStatus(task.deadline);
                const subtasks = task.subtasks || [];
                const completedSubtasks = subtasks.filter((s) => s.isDone).length;

                return (
                  <div
                    key={task.id}
                    className={`group rounded-2xl border p-4 sm:p-5 transition-all duration-200 flex flex-col justify-between ${
                      task.isDone
                        ? 'bg-slate-50/70 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800/60 opacity-80'
                        : 'bg-white dark:bg-serene-surface-dark border-serene-border-light dark:border-serene-border-dark shadow-subtle hover:shadow-card'
                    }`}
                  >
                    <div>
                      {/* Top Row: Checkbox, Title & Actions */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <button
                            onClick={() => handleToggleTaskComplete(task.id)}
                            className="mt-0.5 text-serene-text-muted hover:text-serene-primary dark:hover:text-serene-primary-dark transition-colors shrink-0"
                            title={task.isDone ? 'Mark as incomplete' : 'Mark as complete'}
                          >
                            {task.isDone ? (
                              <CheckSquare className="w-5 h-5 text-serene-primary dark:text-serene-primary-dark" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            <h3
                              className={`text-sm sm:text-base font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary leading-snug break-words ${
                                task.isDone
                                  ? 'line-through text-serene-text-muted dark:text-serene-text-darkMuted'
                                  : ''
                              }`}
                            >
                              {task.text}
                            </h3>
                          </div>
                        </div>

                        {/* Edit & Delete Actions */}
                        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEditForm(task)}
                            className="p-1.5 rounded-lg text-serene-text-muted hover:text-serene-primary dark:hover:text-serene-primary-dark hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            title="Edit Task"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 rounded-lg text-serene-text-muted hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Badges Row: Priority, Time, Deadline */}
                      <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                        {/* Priority Badge */}
                        {task.priority === 'high' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
                            High Priority
                          </span>
                        )}
                        {task.priority === 'medium' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                            Medium
                          </span>
                        )}
                        {task.priority === 'low' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-900/50">
                            Low
                          </span>
                        )}

                        {/* Estimated Time Badge */}
                        {task.durationMinutes && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-medium bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-secondary dark:text-serene-text-darkSecondary border border-serene-border-light dark:border-serene-border-dark">
                            <Clock className="w-3 h-3 text-serene-text-muted" />
                            {formatMinutesToHours(task.durationMinutes)}
                          </span>
                        )}

                        {/* Deadline Badge */}
                        {deadlineInfo && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium border ${
                              deadlineInfo.isOverdue
                                ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/50'
                                : deadlineInfo.isDueToday || deadlineInfo.isDueSoon
                                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50'
                                : 'bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-secondary dark:text-serene-text-darkSecondary border-serene-border-light dark:border-serene-border-dark'
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            {deadlineInfo.label}
                          </span>
                        )}
                      </div>

                      {/* Attached URLs link pills */}
                      {task.attachedUrls && task.attachedUrls.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2 border-t border-serene-border-light/60 dark:border-serene-border-dark/60">
                          {task.attachedUrls.map((link) => (
                            <a
                              key={link.id}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-primary dark:text-serene-primary-dark hover:bg-serene-primary-soft dark:hover:bg-serene-primary/20 border border-serene-border-light dark:border-serene-border-dark hover:border-serene-primary/30 transition-all max-w-full truncate"
                              title={link.url}
                            >
                              <LinkIcon className="w-3 h-3 shrink-0 text-serene-text-muted" />
                              <span className="truncate max-w-[200px]">
                                {link.title || link.url.replace(/^https?:\/\//, '')}
                              </span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Subtasks Checklist Section */}
                      {subtasks.length > 0 && (
                        <div className="mt-3.5 pt-2.5 border-t border-serene-border-light/60 dark:border-serene-border-dark/60">
                          <div className="flex items-center justify-between text-xs font-semibold text-serene-text-muted mb-1.5">
                            <span className="flex items-center gap-1">
                              Checklist
                            </span>
                            <span className="font-mono text-[11px]">
                              {completedSubtasks}/{subtasks.length} done
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark h-1.5 rounded-full overflow-hidden mb-2">
                            <div
                              className="bg-serene-primary dark:bg-serene-primary-dark h-full transition-all duration-300"
                              style={{
                                width: `${(completedSubtasks / subtasks.length) * 100}%`,
                              }}
                            />
                          </div>

                          {/* Subtasks checklist items */}
                          <div className="space-y-1">
                            {subtasks.map((st) => (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => handleToggleSubtask(task.id, st.id)}
                                className="w-full flex items-center gap-2 p-1 rounded-lg text-left text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors group/sub"
                              >
                                {st.isDone ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-serene-primary dark:text-serene-primary-dark shrink-0" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-serene-text-muted shrink-0" />
                                )}
                                <span
                                  className={`truncate ${
                                    st.isDone
                                      ? 'line-through text-serene-text-muted dark:text-serene-text-darkMuted'
                                      : 'text-serene-text-primary dark:text-serene-text-darkPrimary'
                                  }`}
                                >
                                  {st.text}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Scratchpad Collapsible Side Panel */}
        {isScratchpadOpen && (
          <aside className="w-80 lg:w-96 shrink-0 border-l border-serene-border-light dark:border-serene-border-dark bg-white/70 dark:bg-serene-surface-dark/70 backdrop-blur-md p-4 flex flex-col justify-between overflow-hidden transition-all animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-serene-border-light dark:border-serene-border-dark">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-serene-primary dark:text-serene-primary-dark" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-serene-text-primary dark:text-serene-text-darkPrimary">
                  Scratchpad & Notes
                </h3>
              </div>
              <button
                onClick={() => setIsScratchpadOpen(false)}
                className="p-1 rounded-md text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary"
                title="Hide scratchpad"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 py-3 flex flex-col min-h-0">
              <textarea
                value={scratchpadText}
                onChange={(e) => onUpdateScratchpad(e.target.value)}
                placeholder="Jot down quick thoughts, ideas, links, or meeting notes here alongside your tasks..."
                className="w-full flex-1 p-3 bg-serene-surfaceAlt-light/60 dark:bg-serene-surfaceAlt-dark/60 border border-serene-border-light dark:border-serene-border-dark rounded-xl text-xs text-serene-text-primary dark:text-serene-text-darkPrimary placeholder:text-serene-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-serene-primary/30 focus:border-serene-primary font-sans leading-relaxed"
              />
            </div>

            <div className="pt-2 text-[11px] text-serene-text-muted flex items-center justify-between border-t border-serene-border-light/60 dark:border-serene-border-dark/60">
              <span>Auto-saved to storage</span>
              <span>{scratchpadText.length} characters</span>
            </div>
          </aside>
        )}
      </div>

      {/* 3. MODAL: TASK CREATION & EDITING */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl shadow-modal w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleIn">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-serene-border-light dark:border-serene-border-dark flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark">
                  {editingTaskId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <h2 className="text-base font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
                  {editingTaskId ? 'Edit Task' : 'Create New Task'}
                </h2>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSaveTask} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              
              {/* Title input */}
              <div>
                <label className="block text-xs font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary mb-1.5">
                  Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Finalize architectural diagram or write unit tests"
                  className="w-full px-3.5 py-2 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl text-sm text-serene-text-primary dark:text-serene-text-darkPrimary placeholder:text-serene-text-muted focus:outline-none focus:ring-2 focus:ring-serene-primary/40 focus:border-serene-primary"
                />
              </div>

              {/* Priority & Duration Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Priority Selector */}
                <div>
                  <label className="block text-xs font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary mb-1.5">
                    Priority Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormPriority('high')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                        formPriority === 'high'
                          ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 shadow-2xs'
                          : 'bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-muted border-serene-border-light dark:border-serene-border-dark hover:text-serene-text-primary'
                      }`}
                    >
                      High
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormPriority('medium')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                        formPriority === 'medium'
                          ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 shadow-2xs'
                          : 'bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-muted border-serene-border-light dark:border-serene-border-dark hover:text-serene-text-primary'
                      }`}
                    >
                      Medium
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormPriority('low')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                        formPriority === 'low'
                          ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800 shadow-2xs'
                          : 'bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-muted border-serene-border-light dark:border-serene-border-dark hover:text-serene-text-primary'
                      }`}
                    >
                      Low
                    </button>
                  </div>
                </div>

                {/* Estimated Time Selector */}
                <div>
                  <label className="block text-xs font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary mb-1.5">
                    Estimated Time Budget
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {DURATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.minutes}
                        type="button"
                        onClick={() => setFormDuration(opt.minutes)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-mono font-medium border transition-all ${
                          formDuration === opt.minutes
                            ? 'bg-serene-primary text-white border-serene-primary shadow-2xs'
                            : 'bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-secondary dark:text-serene-text-darkSecondary border-serene-border-light dark:border-serene-border-dark hover:text-serene-text-primary'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Deadline Selector */}
              <div>
                <label className="block text-xs font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary mb-1.5">
                  Deadline / Target Date or Time
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    placeholder="e.g. 2026-10-15, 17:30, or Tomorrow"
                    className="flex-1 px-3.5 py-2 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl text-xs text-serene-text-primary dark:text-serene-text-darkPrimary placeholder:text-serene-text-muted focus:outline-none focus:ring-2 focus:ring-serene-primary/40 focus:border-serene-primary"
                  />
                  {formDeadline && (
                    <button
                      type="button"
                      onClick={() => setFormDeadline('')}
                      className="text-xs text-serene-text-muted hover:text-serene-text-primary px-2"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Attached URLs Section */}
              <div className="p-3.5 rounded-xl bg-serene-surfaceAlt-light/50 dark:bg-serene-surfaceAlt-dark/50 border border-serene-border-light dark:border-serene-border-dark space-y-2.5">
                <label className="block text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
                  Attached Reference URLs
                </label>
                
                {formUrls.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {formUrls.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <LinkIcon className="w-3.5 h-3.5 text-serene-primary shrink-0" />
                          <span className="font-medium text-serene-text-primary dark:text-serene-text-darkPrimary truncate">
                            {u.title ? `${u.title} (${u.url})` : u.url}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveUrl(u.id)}
                          className="text-serene-text-muted hover:text-rose-500 shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={urlTitleInput}
                    onChange={(e) => setUrlTitleInput(e.target.value)}
                    placeholder="Link Title (optional)"
                    className="px-3 py-1.5 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl text-xs text-serene-text-primary dark:text-serene-text-darkPrimary placeholder:text-serene-text-muted focus:outline-none"
                  />
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={urlAddressInput}
                      onChange={(e) => {
                        setUrlAddressInput(e.target.value);
                        if (urlError) setUrlError('');
                      }}
                      placeholder="https://example.com"
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl text-xs text-serene-text-primary dark:text-serene-text-darkPrimary placeholder:text-serene-text-muted focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddUrl}
                      className="px-2.5 py-1.5 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark text-serene-primary dark:text-serene-primary-dark font-semibold rounded-xl text-xs hover:bg-serene-primary-soft dark:hover:bg-serene-primary/20 shrink-0"
                    >
                      Add URL
                    </button>
                  </div>
                </div>
                {urlError && <p className="text-[11px] text-rose-500">{urlError}</p>}
              </div>

              {/* Subtasks Builder */}
              <div className="p-3.5 rounded-xl bg-serene-surfaceAlt-light/50 dark:bg-serene-surfaceAlt-dark/50 border border-serene-border-light dark:border-serene-border-dark space-y-2.5">
                <label className="block text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
                  Checklist & Subtasks
                </label>

                {formSubtasks.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {formSubtasks.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark text-xs"
                      >
                        <span className="text-serene-text-primary dark:text-serene-text-darkPrimary truncate">
                          {st.text}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(st.id)}
                          className="text-serene-text-muted hover:text-rose-500 shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={subtaskInput}
                    onChange={(e) => setSubtaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                    placeholder="Add step or subtask (press Enter)"
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl text-xs text-serene-text-primary dark:text-serene-text-darkPrimary placeholder:text-serene-text-muted focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="px-3 py-1.5 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark text-serene-primary dark:text-serene-primary-dark font-semibold rounded-xl text-xs hover:bg-serene-primary-soft dark:hover:bg-serene-primary/20 shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Form Footer Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-serene-border-light dark:border-serene-border-dark">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary hover:text-serene-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-serene-primary hover:bg-serene-primary-hover text-white shadow-xs transition-colors"
                >
                  {editingTaskId ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
