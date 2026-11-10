import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash as Trash2,
  PencilSimple as Edit3,
  CalendarBlank as Calendar,
  Clock,
  MagnifyingGlass as Search,
  CheckCircle as CheckCircle2,
  Link as LinkIcon,
  ListChecks as ListTodo,
  X,
  ArrowLeft,
  Warning as AlertTriangle,
  CaretDown,
  FunnelSimple,
  CaretUp,
} from '@phosphor-icons/react';
import { QuickNote, TaskPriority, TaskUrl, Subtask } from '../../types';
import { bufferTextColor, formatMinutesToHours } from '../../utils/timeBudget';
import { taskPeriods, formatPeriodMinutes, addMonthsInclusive, type TaskPeriod } from '../../utils/taskPeriod';
import type { TaskViewState } from './useTaskView';
import { modalBackdropVariants, modalContentVariants, staggerItemVariants, staggerContainerVariants } from '../../utils/motion';
import { SafeDescription } from '../Common/SafeDescription';
import { TaskLinks } from './TaskLinks';
import { toggleTaskInList, toggleSubtaskInList } from '../../utils/taskUrgency';

export interface TaskManagementScreenProps {
  notes: QuickNote[];
  view: TaskViewState;
  now?: Date;
  createTaskRequested: boolean;
  onCreateTaskOpened: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onUpdateNotes: (notes: QuickNote[]) => void;
  onViewTask: (taskId: string) => void;
  onBackToDashboard?: () => void;
  initialTaskId?: string | null;
  onInitialTaskOpened?: () => void;
  onToggleTask?: (taskId: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
}

type FilterTab = 'All' | 'Urgent' | 'High Priority' | 'Medium' | 'Low' | 'Due Soon' | 'Completed';

export const TaskManagementScreen: React.FC<TaskManagementScreenProps> = ({
  notes,
  view,
  now = new Date(),
  createTaskRequested,
  onCreateTaskOpened,
  searchQuery,
  onSearchChange: setSearchQuery,
  onUpdateNotes,
  onViewTask,
  onBackToDashboard,
  initialTaskId,
  onInitialTaskOpened,
  onToggleTask,
  onToggleSubtask,
}) => {
  // Filters & State
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [showCompletedInAll, setShowCompletedInAll] = useState(true);
  const [expandedChecklists, setExpandedChecklists] = useState<Record<string, boolean>>({});
  const { period, setPeriod, customRange, setCustomRange, baseRange, defaultEndInclusive,
    range, rangeError, periodNotes, periodLoad, periodBuffer, hasPeriodBudget } = view;
  // Modal / Form state for Add / Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
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
  const loadSummary = periodLoad;
  const totalCompleted = periodLoad.completedCount;

  // Deadline & Date Helpers
  const formatLocalYMD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Add calendar days to a local-midnight Date without UTC parsing.
  const addDaysLocal = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  // Parse a date-input value into a local-midnight Date without UTC parsing or rollover.
  // Returns null for empty/invalid input so callers can reset to the default range instead of showing NaN.
  const parseLocalDateValue = (s: string): Date | null => {
    if (!s) return null;
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!parts) return null;
    const y = +parts[1];
    const m = +parts[2];
    const d = +parts[3];
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
    return date;
  };

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // DD-MMM-YY (e.g. 01-Nov-26), not locale-dependent so the format is stable across browsers.
  const formatDDMMMYY = (d: Date) => `${String(d.getDate()).padStart(2, '0')}-${MONTH_NAMES[d.getMonth()]}-${String(d.getFullYear() % 100).padStart(2, '0')}`;

  const handleTodayDateChange = (value: string) => {
    const selected = parseLocalDateValue(value);
    if (!selected) { setCustomRange(null); return; }
    setCustomRange({ start: selected, end: selected });
  };
  const handleDateStartChange = (value: string) => {
    const selected = parseLocalDateValue(value);
    if (!selected) { setCustomRange(null); return; }
    const end = period === 'Today' ? selected : period === 'Weekly' ? addDaysLocal(selected, 6) : addMonthsInclusive(selected, 1);
    setCustomRange({ start: selected, end });
  };
  const handleDateEndChange = (value: string) => {
    const selected = parseLocalDateValue(value);
    if (!selected) { setCustomRange(null); return; }
    setCustomRange((prev) => ({ start: prev?.start ?? baseRange.start, end: selected }));
  };

  const todayYMD = formatLocalYMD(now);
  const tomorrowYMD = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return formatLocalYMD(d);
  }, [todayYMD]);

  const getDeadlineDatePart = (str: string) => {
    if (!str) return '';
    const match = str.match(/\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : '';
  };

  const getDeadlineTimePart = (str: string) => {
    if (!str) return '';
    const match = str.match(/(?:^|\s|T)(\d{2}:\d{2})/);
    return match ? match[1] : '';
  };

  const handleSetTomorrow = () => {
    const time = getDeadlineTimePart(formDeadline);
    setFormDeadline(time ? `${tomorrowYMD} ${time}` : tomorrowYMD);
  };

  const handleSetToday = () => {
    const time = getDeadlineTimePart(formDeadline);
    setFormDeadline(time ? `${todayYMD} ${time}` : todayYMD);
  };

  const handleDeadlineDateChange = (newDate: string) => {
    const time = getDeadlineTimePart(formDeadline);
    if (!newDate) {
      setFormDeadline(time || '');
    } else {
      setFormDeadline(time ? `${newDate} ${time}` : newDate);
    }
  };

  const handleDeadlineTimeChange = (newTime: string) => {
    const date = getDeadlineDatePart(formDeadline);
    if (!newTime) {
      setFormDeadline(date || '');
    } else {
      if (date) {
        setFormDeadline(`${date} ${newTime}`);
      } else {
        setFormDeadline(`${todayYMD} ${newTime}`);
      }
    }
  };

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

      // If YYYY-MM-DD or YYYY-MM-DD HH:MM
      let deadlineDate: Date;
      if (/^\d{4}-\d{2}-\d{2}$/.test(deadlineStr)) {
        const [y, m, d] = deadlineStr.split('-').map(Number);
        deadlineDate = new Date(y, m - 1, d, 23, 59, 59);
      } else if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(deadlineStr)) {
        const [datePart, timePart] = deadlineStr.replace('T', ' ').split(' ');
        const [y, m, d] = datePart.split('-').map(Number);
        const [hh, mm] = timePart.split(':').map(Number);
        deadlineDate = new Date(y, m - 1, d, hh, mm, 0);
      } else {
        deadlineDate = new Date(deadlineStr);
      }

      if (isNaN(deadlineDate.getTime())) {
        return { label: deadlineStr, isGeneral: true };
      }

      const isToday =
        deadlineDate.getFullYear() === now.getFullYear() &&
        deadlineDate.getMonth() === now.getMonth() &&
        deadlineDate.getDate() === now.getDate();

      const diffHours = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (deadlineDate.getTime() < now.getTime()) {
        return { 
          label: `Overdue (${deadlineDate.toLocaleDateString([], { month: 'short', day: 'numeric' })})`, 
          isOverdue: true, 
          isDueToday: isToday 
        };
      }
      if (isToday) {
        const hasTime = deadlineStr.includes(':');
        return { 
          label: hasTime 
            ? `Due today ${deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
            : 'Due today', 
          isDueToday: true,
          isDueSoon: diffHours <= 24 
        };
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow =
        deadlineDate.getFullYear() === tomorrow.getFullYear() &&
        deadlineDate.getMonth() === tomorrow.getMonth() &&
        deadlineDate.getDate() === tomorrow.getDate();
      if (isTomorrow) {
        const hasTime = deadlineStr.includes(':');
        return {
          label: hasTime 
            ? `Tomorrow ${deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Due tomorrow',
          isDueSoon: true,
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
  const handleOpenCreateForm = useCallback(() => {
    setEditingTaskId(null);
    setFormTitle('');
    setFormDescription('');
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
  }, []);

  useEffect(() => {
    if (!createTaskRequested) return;
    handleOpenCreateForm();
    onCreateTaskOpened();
  }, [createTaskRequested, handleOpenCreateForm, onCreateTaskOpened]);

  // Open Task Edit
  const handleOpenEditForm = (task: QuickNote) => {
    setEditingTaskId(task.id);
    setFormTitle(task.text);
    setFormDescription(task.description || '');
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

  // Automatically open the edit modal when initialTaskId is provided and matches a task
  const openedInitialTaskIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialTaskId && initialTaskId !== openedInitialTaskIdRef.current) {
      const taskToEdit = notes.find((n) => n.id === initialTaskId);
      if (taskToEdit) {
        openedInitialTaskIdRef.current = initialTaskId;
        handleOpenEditForm(taskToEdit);
        onInitialTaskOpened?.();
      }
    } else if (!initialTaskId) {
      openedInitialTaskIdRef.current = null;
    }
  }, [initialTaskId, notes, onInitialTaskOpened]);

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
      const existing = notes.find((n) => n.id === editingTaskId);
      const allSubtasksDone = formSubtasks.length > 0 && formSubtasks.every((st) => st.isDone);
      let nextIsDone = existing ? existing.isDone : false;
      if (formSubtasks.length > 0) {
        if (allSubtasksDone) nextIsDone = true;
        else if (nextIsDone) nextIsDone = false;
      }
      onUpdateNotes(
        notes.map((n) =>
          n.id === editingTaskId
            ? {
                ...n,
                text: formTitle.trim(),
                description: formDescription.trim() || undefined,
                durationMinutes: formDuration,
                priority: formPriority,
                deadline: formDeadline.trim() || undefined,
                attachedUrls: formUrls.length > 0 ? formUrls : undefined,
                subtasks: formSubtasks.length > 0 ? formSubtasks : undefined,
                isDone: nextIsDone,
              }
            : n
        )
      );
    } else {
      const allSubtasksDone = formSubtasks.length > 0 && formSubtasks.every((st) => st.isDone);
      const newTask: QuickNote = {
        id: `task-${Date.now()}`,
        text: formTitle.trim(),
        description: formDescription.trim() || undefined,
        isDone: allSubtasksDone,
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
    if (onToggleTask) {
      onToggleTask(taskId);
    } else {
      const { updatedTasks } = toggleTaskInList(notes, taskId);
      onUpdateNotes(updatedTasks);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    onUpdateNotes(notes.filter((n) => n.id !== taskId));
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    if (onToggleSubtask) {
      onToggleSubtask(taskId, subtaskId);
    } else {
      const { updatedTasks } = toggleSubtaskInList(notes, taskId, subtaskId);
      onUpdateNotes(updatedTasks);
    }
  };

  // Filtered tasks computation
  const filteredTasks = useMemo(() => {
    return periodNotes.filter((task) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.text.toLowerCase().includes(query);
        const matchesDesc = task.description ? task.description.toLowerCase().includes(query) : false;
        const matchesSubtasks = task.subtasks?.some((st) =>
          st.text.toLowerCase().includes(query)
        );
        const matchesUrls = task.attachedUrls?.some(
          (u) =>
            u.url.toLowerCase().includes(query) ||
            (u.title && u.title.toLowerCase().includes(query))
        );
        if (!matchesTitle && !matchesDesc && !matchesSubtasks && !matchesUrls) {
          return false;
        }
      }

      // Tab filter
      switch (activeTab) {
        case 'All':
          return true;
        case 'Urgent':
          return !task.isDone && task.priority === 'urgent';
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
  }, [periodNotes, searchQuery, activeTab, now]);

  // Partition into remaining and completed for 'All' view and sort
  const remainingTasks = useMemo(() => {
    return filteredTasks
      .filter((task) => !task.isDone)
      .sort((a, b) => {
        const priorityRank = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (priorityRank[a.priority ?? 'medium'] ?? 2) - (priorityRank[b.priority ?? 'medium'] ?? 2);
      });
  }, [filteredTasks]);

  const completedTasks = useMemo(() => {
    return filteredTasks.filter((task) => task.isDone);
  }, [filteredTasks]);

  const sortedFilteredTasks = useMemo(() => {
    if (activeTab === 'Completed') return filteredTasks;
    const priorityRank = { urgent: 0, high: 1, medium: 2, low: 3 };
    return [...filteredTasks].sort((a, b) => {
      return (priorityRank[a.priority ?? 'medium'] ?? 2) - (priorityRank[b.priority ?? 'medium'] ?? 2);
    });
  }, [filteredTasks, activeTab]);

  // Tab counts computation
  const tabCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = {
      'All': periodNotes.length,
      'Urgent': 0,
      'High Priority': 0,
      'Medium': 0,
      'Low': 0,
      'Due Soon': 0,
      'Completed': 0,
    };

    periodNotes.forEach((task) => {
      if (task.isDone) {
        counts['Completed']++;
      } else {
        if (task.priority === 'urgent') counts['Urgent']++;
        else if (task.priority === 'high') counts['High Priority']++;
        else if (task.priority === 'medium') counts['Medium']++;
        else if (task.priority === 'low') counts['Low']++;

        if (task.deadline) {
          const status = getDeadlineStatus(task.deadline);
          if (status?.isDueSoon || status?.isOverdue || status?.isDueToday) {
            counts['Due Soon']++;
          }
        }
      }
    });

    return counts;
  }, [periodNotes, now]);

  // Tab Badge Style reflecting nature
  const getTabBadgeStyle = (tab: FilterTab, isActive: boolean) => {
    switch (tab) {
      case 'All':
        return isActive
          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-xs'
          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200/80 dark:hover:bg-slate-700';
      case 'Urgent':
        return isActive
          ? 'bg-red-600 text-white font-bold shadow-xs ring-2 ring-red-400/40'
          : 'bg-red-50/90 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60 hover:bg-red-100 dark:hover:bg-red-900/60';
      case 'High Priority':
        return isActive
          ? 'bg-rose-500 text-white font-semibold shadow-xs ring-2 ring-rose-400/30'
          : 'bg-rose-50/90 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/60';
      case 'Medium':
        return isActive
          ? 'bg-amber-500 text-white font-semibold shadow-xs ring-2 ring-amber-400/30'
          : 'bg-amber-50/90 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-100 dark:hover:bg-amber-900/60';
      case 'Low':
        return isActive
          ? 'bg-sky-500 text-white font-semibold shadow-xs ring-2 ring-sky-400/30'
          : 'bg-sky-50/90 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900/60 hover:bg-sky-100 dark:hover:bg-sky-900/60';
      case 'Due Soon':
        return isActive
          ? 'bg-purple-600 text-white font-semibold shadow-xs ring-2 ring-purple-400/30'
          : 'bg-purple-50/90 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/60 hover:bg-purple-100 dark:hover:bg-purple-900/60';
      case 'Completed':
        return isActive
          ? 'bg-emerald-600 text-white font-semibold shadow-xs ring-2 ring-emerald-400/30'
          : 'bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60';
      default:
        return '';
    }
  };

  // Priority Card Background
  const getTaskCardBackground = (task: QuickNote) => {
    if (task.isDone) {
      return 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/40 opacity-75';
    }
    switch (task.priority) {
      case 'urgent':
        return 'bg-gradient-to-br from-red-50/95 via-rose-50/50 to-white dark:from-red-950/45 dark:via-rose-950/25 dark:to-serene-surface-dark border-red-300 dark:border-red-800/80 shadow-xs hover:shadow-card hover:border-red-400 dark:hover:border-red-700';
      case 'high':
        return 'bg-gradient-to-br from-rose-50/80 via-pink-50/40 to-white dark:from-rose-950/35 dark:via-pink-950/20 dark:to-serene-surface-dark border-rose-200/90 dark:border-rose-900/60 shadow-subtle hover:shadow-card hover:border-rose-300 dark:hover:border-rose-800';
      case 'medium':
        return 'bg-gradient-to-br from-amber-50/80 via-yellow-50/35 to-white dark:from-amber-950/30 dark:via-yellow-950/15 dark:to-serene-surface-dark border-amber-200/90 dark:border-amber-900/60 shadow-subtle hover:shadow-card hover:border-amber-300 dark:hover:border-amber-800';
      case 'low':
        return 'bg-gradient-to-br from-sky-50/80 via-blue-50/35 to-white dark:from-sky-950/30 dark:via-blue-950/15 dark:to-serene-surface-dark border-sky-200/90 dark:border-sky-900/60 shadow-subtle hover:shadow-card hover:border-sky-300 dark:hover:border-sky-800';
      default:
        return 'bg-white dark:bg-serene-surface-dark border-serene-border-light dark:border-serene-border-dark shadow-subtle hover:shadow-card';
    }
  };

  const renderTaskCard = (task: QuickNote) => {
    const deadlineInfo = getDeadlineStatus(task.deadline);
    const subtasks = task.subtasks || [];
    const completedSubtasks = subtasks.filter((s) => s.isDone).length;
    const hasMetadata = !!(task.priority || task.durationMinutes || deadlineInfo || (task.attachedUrls && task.attachedUrls.length > 0));

    return (
      <motion.div
        layout
        key={task.id}
        variants={staggerItemVariants}
        onClick={(event) => {
          if (!(event.target instanceof Element) || event.target.closest("button, a, input, label")) return;
          if (window.getSelection()?.isCollapsed === false) return;
          onViewTask(task.id);
        }}
        className={`mobile-task-card group cursor-pointer rounded-xl md:rounded-2xl border p-3 sm:p-4 transition-all duration-200 flex flex-col justify-between ${getTaskCardBackground(task)}`}
      >
        <div className="space-y-2.5">
          {/* Top Row: Checkbox, Title & Actions */}
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2 sm:gap-2.5 flex-1 min-w-0">
              <button
                onClick={() => handleToggleTaskComplete(task.id)}
                className="task-card-check mt-0.5 grid h-6 w-6 place-items-center rounded-md text-serene-text-muted hover:text-serene-primary dark:hover:text-serene-primary-dark transition-colors shrink-0"
                title={task.isDone ? 'Mark as incomplete' : 'Mark as complete'}
                aria-label={task.isDone ? 'Mark as incomplete' : 'Mark as complete'}
              >
                {task.isDone ? (
                  <CheckSquare className="w-5 h-5 text-serene-primary dark:text-serene-primary-dark" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>
              
              <div className="flex-1 min-w-0">
                <h3
                  className={`text-[15px] font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary leading-snug break-words ${
                    task.isDone
                      ? 'line-through text-serene-text-muted dark:text-serene-text-darkMuted'
                      : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onViewTask(task.id)}
                    className="max-w-full rounded text-left [overflow-wrap:anywhere] hover:text-serene-primary dark:hover:text-serene-primary-dark"
                  >
                    {task.text}
                  </button>
                </h3>
                {task.description && (
                  <div className={`mt-1 leading-relaxed ${task.isDone ? 'line-through opacity-70' : ''}`}>
                    <SafeDescription
                      text={task.description}
                      className="text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary line-clamp-3"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Edit & Delete Actions: Always neatly pinned at top-right of card */}
            <div className="task-card-actions flex items-center gap-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleOpenEditForm(task)}
                className="p-1.5 rounded-lg text-serene-text-muted hover:text-serene-primary dark:hover:text-serene-primary-dark hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title="Edit Task"
                aria-label="Edit Task"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteTask(task.id)}
                className="p-1.5 rounded-lg text-serene-text-muted hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                title="Delete Task"
                aria-label="Delete Task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Badges & Links Row: Unified, compact, wrapping cleanly */}
          {hasMetadata && (
            <div className="task-card-metadata flex flex-wrap items-center gap-1.5 text-xs">
              {/* Priority Badge */}
              {task.priority === 'urgent' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] bg-red-600 text-white shadow-2xs">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>Urgent</span>
                </span>
              )}
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

              {/* Attached URLs link pills (integrated right in the metadata row) */}
              {task.attachedUrls && task.attachedUrls.length > 0 && (
                <TaskLinks links={task.attachedUrls} compact />
              )}
            </div>
          )}

          {/* Subtasks Checklist Section */}
          {subtasks.length > 0 && (
            <div className="pt-2 border-t border-serene-border-light/50 dark:border-serene-border-dark/50">
              <button
                type="button"
                aria-expanded={Boolean(expandedChecklists[task.id])}
                aria-controls={"task-checklist-" + task.id}
                onClick={() => setExpandedChecklists((current) => ({ ...current, [task.id]: !current[task.id] }))}
                className="flex min-h-10 w-full items-center gap-2 text-left text-sm md:hidden"
              >
                <span>Checklist</span>
                <span className="mobile-metadata text-xs">{completedSubtasks} / {subtasks.length}</span>
                <CaretDown aria-hidden="true" className={expandedChecklists[task.id] ? "ml-auto rotate-180" : "ml-auto"} />
              </button>
              <div className="hidden md:flex items-center justify-between text-xs font-semibold text-serene-text-muted mb-1.5">
                <span className="flex items-center gap-1">
                  Checklist
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-14 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-serene-primary dark:bg-serene-primary-dark h-full transition-all duration-300"
                      style={{
                        width: `${(completedSubtasks / subtasks.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="font-mono text-[11px]">
                    {completedSubtasks}/{subtasks.length} done
                  </span>
                </div>
              </div>

              {/* Subtasks checklist items */}
              <div id={"task-checklist-" + task.id} className={expandedChecklists[task.id] ? "space-y-1" : "hidden space-y-1 md:block"}>
                {subtasks.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleToggleSubtask(task.id, st.id)}
                    aria-pressed={st.isDone}
                    className="task-checklist-item w-full flex items-center gap-2 py-0.5 px-1 rounded-md text-left text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors group/sub"
                  >
                    {st.isDone ? (
                      <CheckSquare className="w-3.5 h-3.5 text-serene-primary dark:text-serene-primary-dark shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-serene-text-muted shrink-0" />
                    )}
                    <span
                      className={`min-w-0 break-words whitespace-pre-line ${
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
      </motion.div>
    );
  };

  return (
    <div className="w-full flex flex-col h-full bg-serene-bg-light dark:bg-serene-bg-dark text-serene-text-primary dark:text-serene-text-darkPrimary overflow-hidden">
      {/* 1. TOP HEADER & OVERVIEW BAR */}
      <header className="tasks-toolbar w-full shrink-0 min-w-0 bg-white dark:bg-serene-surface-dark border-b border-serene-border-light dark:border-serene-border-dark px-3 sm:px-6 py-3.5 sm:py-4 shadow-subtle transition-colors overflow-hidden">
        <div data-date-range={hasPeriodBudget && period !== "Today" ? true : undefined} className="tasks-toolbar-heading w-full min-w-0 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Left: Back button + Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="tasks-back p-1.5 sm:p-2 rounded-xl bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark hover:bg-black/5 dark:hover:bg-white/10 text-serene-text-secondary dark:text-serene-text-darkSecondary border border-serene-border-light dark:border-serene-border-dark transition-all shrink-0"
                title="Back to Main Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark shrink-0">
                <ListTodo className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h1 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-serene-text-primary dark:text-serene-text-darkPrimary truncate">
                Tasks
              </h1>
            </div>

            {/* Desktop Status metrics row */}
            <div className="hidden lg:flex items-center gap-3 text-sm lg:text-base lg:ml-2 shrink-0">
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

          {/* Right: Date trigger & Period dropdown (shifted up to row 1 on mobile) */}
          <div className="tasks-period flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
            {hasPeriodBudget && (
              <div className="tasks-dates flex items-center gap-1.5 sm:gap-2">
                {period === 'Today' ? (
                  <>
                    <label className="relative inline-flex min-h-[34px] sm:min-h-[32px] items-center rounded-lg border border-serene-border-light bg-serene-surfaceAlt-light px-2 text-xs font-semibold dark:border-serene-border-dark dark:bg-serene-surfaceAlt-dark focus-within:ring-2 focus-within:ring-serene-primary">
                      <Calendar className="mr-1.5 hidden max-md:block" size={15} aria-hidden="true" />
                      {formatDDMMMYY(customRange?.start ?? range.start)}
                      <input
                        aria-label="Pick date"
                        type="date"
                        value={formatLocalYMD(customRange?.start ?? range.start)}
                        onChange={(e) => handleTodayDateChange(e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="relative inline-flex min-h-[34px] sm:min-h-[32px] items-center rounded-lg border border-serene-border-light bg-serene-surfaceAlt-light px-2 text-xs font-semibold dark:border-serene-border-dark dark:bg-serene-surfaceAlt-dark focus-within:ring-2 focus-within:ring-serene-primary">
                      {formatDDMMMYY(customRange?.start ?? range.start)}
                      <input
                        aria-label="Pick start date"
                        type="date"
                        value={formatLocalYMD(customRange?.start ?? range.start)}
                        onChange={(e) => handleDateStartChange(e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                    <span className="text-xs text-serene-text-muted shrink-0">–</span>
                    <label className="relative inline-flex min-h-[34px] sm:min-h-[32px] items-center rounded-lg border border-serene-border-light bg-serene-surfaceAlt-light px-2 text-xs font-semibold dark:border-serene-border-dark dark:bg-serene-surfaceAlt-dark focus-within:ring-2 focus-within:ring-serene-primary">
                      {formatDDMMMYY(customRange?.end ?? defaultEndInclusive)}
                      <input
                        aria-label="Pick end date"
                        type="date"
                        value={formatLocalYMD(customRange?.end ?? defaultEndInclusive)}
                        onChange={(e) => handleDateEndChange(e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                  </>
                )}
              </div>
            )}
            <label className="tasks-period-picker flex shrink-0 items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold">
              <span className="hidden md:inline">View</span>
              <select
                aria-label="Task time period"
                value={period}
                onChange={(event) => setPeriod(event.target.value as TaskPeriod)}
                className="min-h-[34px] sm:min-h-[32px] min-w-[76px] sm:min-w-[88px] rounded-lg border border-serene-border-light bg-serene-surfaceAlt-light px-2 text-xs sm:text-sm text-serene-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-serene-primary dark:border-serene-border-dark dark:bg-serene-surfaceAlt-dark dark:text-serene-text-darkPrimary"
              >
                {taskPeriods.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {rangeError && <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">{rangeError}</p>}

        {/* Tablet Status Metrics 3-Column Symmetrical Grid (on md to lg) */}
        <div className="hidden md:grid grid-cols-3 gap-2 w-full lg:hidden mt-2.5">
          <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark text-[11px] sm:text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span className="truncate"><strong>{loadSummary.pendingCount}</strong> pending</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/40 text-[11px] sm:text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate"><strong>{totalCompleted}</strong> done</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-serene-primary-soft/60 dark:bg-serene-primary/15 border border-serene-primary/20 dark:border-serene-primary/30 text-[11px] sm:text-xs text-serene-primary dark:text-serene-primary-dark font-mono">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate"><strong>{loadSummary.formattedPending}</strong> load</span>
          </div>
        </div>

        {hasPeriodBudget ? (
          <div className="tasks-budget mt-2 text-xs sm:text-sm" aria-live="polite">
            <div className="flex flex-wrap items-baseline gap-x-3 sm:gap-x-4 gap-y-1">
              <span><strong>{formatPeriodMinutes(range.availableMinutes)}</strong> available</span>
              <span><strong>{formatPeriodMinutes(periodLoad.pendingMinutes)}</strong> pending</span>
              <strong className={bufferTextColor[periodBuffer.status]}>
                {formatPeriodMinutes(Math.abs(periodBuffer.bufferMinutes))} {periodBuffer.bufferMinutes < 0 ? 'over capacity' : periodBuffer.status === 'tight' ? 'left · tight' : 'to spare'}
              </strong>
            </div>
          </div>
        ) : period === 'Undated' ? (
          <p className="mt-2 text-xs text-serene-text-secondary dark:text-serene-text-darkSecondary">
            Tasks without a valid due date. Add a deadline to include them in a period budget.
          </p>
        ) : null}

        {/* 2. SUB-BAR: Filter Tabs & Search Bar Toolbar */}
        <div className="tasks-filter w-full min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3.5 pt-3 border-t border-serene-border-light/60 dark:border-serene-border-dark/60">
          <label className="flex w-full items-center gap-2 text-sm font-semibold md:hidden">
            <FunnelSimple size={16} aria-hidden="true" /> Filters
            <select
              value={activeTab}
              onChange={(event) => setActiveTab(event.target.value as FilterTab)}
              className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-serene-border-light bg-serene-surfaceAlt-light px-3 text-base dark:border-serene-border-dark dark:bg-serene-surfaceAlt-dark"
            >
              {(['All', 'Urgent', 'High Priority', 'Medium', 'Low', 'Due Soon', 'Completed'] as FilterTab[]).map((tab) => (
                <option key={tab} value={tab}>{tab} ({tabCounts[tab] ?? 0})</option>
              ))}
            </select>
          </label>
          {/* Desktop filter tabs */}
          <div className="hidden md:flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs no-scrollbar min-w-0 flex-1">
          {(['All', 'Urgent', 'High Priority', 'Medium', 'Low', 'Due Soon', 'Completed'] as FilterTab[]).map(
            (tab) => {
              const isActive = activeTab === tab;
              const count = tabCounts[tab] ?? 0;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all flex items-center gap-1.5 ${getTabBadgeStyle(tab, isActive)}`}
                >
                  {tab === 'Urgent' && <AlertTriangle className="w-3 h-3 shrink-0" />}
                  <span>{tab}</span>
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold leading-tight ${
                      isActive
                        ? 'bg-white/25 text-inherit'
                        : 'bg-black/10 dark:bg-white/10 text-inherit'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            }
          )}
          </div>

          {/* Search Input relocated to filter bar toolbar */}
          <div className="relative hidden w-full md:block md:w-56 lg:w-64 shrink-0">
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
                className="absolute right-2 top-1/2 -translate-y-1/2 text-serene-text-muted hover:text-serene-text-primary p-0.5"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. BODY CONTENT: Task list and schedule */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Task Cards Flow */}
        <main className="tasks-list flex-1 min-w-0 px-2.5 py-3 sm:px-6 sm:py-5 overflow-y-auto space-y-4 @container">
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
                  : hasPeriodBudget ? 'No tasks are due in the selected dates.' : 'No tasks in this view.'}
              </p>
              <button
                onClick={handleOpenCreateForm}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-serene-primary hover:bg-serene-primary-hover text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create a task</span>
              </button>
            </div>
          ) : activeTab === 'All' ? (
            <div className="space-y-6">
              {/* Remaining Section */}
              {remainingTasks.length > 0 && (
                <section aria-label="Remaining tasks" className="space-y-2.5">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary flex items-center gap-2">
                    <span>Remaining</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark text-serene-text-primary dark:text-serene-text-darkPrimary">
                      {remainingTasks.length}
                    </span>
                  </h2>
                  <motion.div
                    className="grid grid-cols-1 @xl:grid-cols-2 @5xl:grid-cols-3 gap-3 sm:gap-4 items-start"
                    variants={staggerContainerVariants}
                    initial="initial"
                    animate="animate"
                  >
                    {remainingTasks.map(renderTaskCard)}
                  </motion.div>
                </section>
              )}

              {/* Completed Section (collapsible in All view) */}
              {completedTasks.length > 0 && (
                <section aria-label="Completed tasks" className={`${remainingTasks.length > 0 ? 'pt-4 border-t border-serene-border-light/60 dark:border-serene-border-dark/60' : ''} space-y-2.5`}>
                  <button
                    type="button"
                    onClick={() => setShowCompletedInAll((prev) => !prev)}
                    className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary transition-colors group"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Completed</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      {completedTasks.length}
                    </span>
                    {showCompletedInAll ? (
                      <CaretUp className="w-3.5 h-3.5 text-serene-text-muted ml-0.5" />
                    ) : (
                      <CaretDown className="w-3.5 h-3.5 text-serene-text-muted ml-0.5" />
                    )}
                    <span className="text-xs font-normal normal-case text-serene-text-muted group-hover:underline ml-1">
                      {showCompletedInAll ? '(Click to collapse)' : '(Click to expand)'}
                    </span>
                  </button>
                  {showCompletedInAll && (
                    <motion.div
                      className="grid grid-cols-1 @xl:grid-cols-2 @5xl:grid-cols-3 gap-3 sm:gap-4 items-start"
                      variants={staggerContainerVariants}
                      initial="initial"
                      animate="animate"
                    >
                      {completedTasks.map(renderTaskCard)}
                    </motion.div>
                  )}
                </section>
              )}
            </div>
          ) : (
            /* Specific Filtered Tab View ('Urgent', 'High Priority', 'Medium', 'Low', 'Due Soon', 'Completed') */
            <section aria-label={`${activeTab} tasks`} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-serene-text-secondary dark:text-serene-text-darkSecondary flex items-center gap-2">
                  <span>{activeTab}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark text-serene-text-primary dark:text-serene-text-darkPrimary">
                    {sortedFilteredTasks.length}
                  </span>
                </h2>
              </div>
              <motion.div
                className="grid grid-cols-1 @xl:grid-cols-2 @5xl:grid-cols-3 gap-3 sm:gap-4 items-start"
                variants={staggerContainerVariants}
                initial="initial"
                animate="animate"
              >
                {sortedFilteredTasks.map(renderTaskCard)}
              </motion.div>
            </section>
          )}
        </main>

      </div>

      {/* 3. MODAL: TASK CREATION & EDITING */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
            <motion.div 
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              variants={modalBackdropVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={() => setIsFormOpen(false)}
            />
            <motion.div 
              role="dialog"
              aria-modal="true"
              aria-labelledby="task-form-title"
              variants={modalContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="relative z-10 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark sm:rounded-2xl shadow-modal w-full sm:max-w-xl h-full sm:h-auto sm:max-h-[90dvh] flex flex-col overflow-hidden"
            >
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-serene-border-light dark:border-serene-border-dark flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark">
                  {editingTaskId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <h2 id="task-form-title" className="text-base font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
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
            <form onSubmit={handleSaveTask} className="task-edit-form flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              
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

              {/* Description input */}
              <div>
                <label className="block text-xs font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary mb-1.5">
                  Description / Agenda Notes <span className="text-[11px] font-normal text-serene-text-muted">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Additional context, meeting notes, agenda, or location..."
                  className="w-full px-3.5 py-2 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl text-xs text-serene-text-primary dark:text-serene-text-darkPrimary placeholder:text-serene-text-muted focus:outline-none focus:ring-2 focus:ring-serene-primary/40 focus:border-serene-primary resize-y"
                />
              </div>

              {/* Priority & Duration Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Priority Selector */}
                <div>
                  <label className="block text-xs font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary mb-1.5">
                    Priority Level
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormPriority('urgent')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                        formPriority === 'urgent'
                          ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-400 dark:border-red-700 shadow-2xs'
                          : 'bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-muted border-serene-border-light dark:border-serene-border-dark hover:text-serene-text-primary'
                      }`}
                    >
                      Urgent
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormPriority('high')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                        formPriority === 'high'
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-400 dark:border-rose-700 shadow-2xs'
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
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-400 dark:border-amber-700 shadow-2xs'
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
                          ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-400 dark:border-sky-700 shadow-2xs'
                          : 'bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-muted border-serene-border-light dark:border-serene-border-dark hover:text-serene-text-primary'
                      }`}
                    >
                      Low
                    </button>
                  </div>
                </div>

                {/* Estimated Time Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary">
                      Estimated Time Budget
                    </label>
                    <span className="text-[11px] font-mono font-bold text-serene-primary dark:text-serene-primary-dark">
                      {formatMinutesToHours(formDuration)}
                    </span>
                  </div>

                  {/* Flexible Hours and Minutes Time Selectors */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Hours Select */}
                    <div className="flex items-center justify-between bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-serene-primary/40 focus-within:border-serene-primary">
                      <select
                        aria-label="Hours duration"
                        value={Math.floor(formDuration / 60)}
                        onChange={(e) => {
                          const h = parseInt(e.target.value, 10) || 0;
                          const m = formDuration % 60;
                          setFormDuration(Math.max(5, h * 60 + m));
                        }}
                        className="bg-transparent text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary focus:outline-none w-full cursor-pointer"
                      >
                        {Array.from({ length: 13 }, (_, i) => (
                          <option key={i} value={i} className="bg-white dark:bg-serene-surface-dark">
                            {i} {i === 1 ? 'hour' : 'hours'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Minutes Select */}
                    <div className="flex items-center justify-between bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-serene-primary/40 focus-within:border-serene-primary">
                      <select
                        aria-label="Minutes duration"
                        value={formDuration % 60}
                        onChange={(e) => {
                          const m = parseInt(e.target.value, 10) || 0;
                          const h = Math.floor(formDuration / 60);
                          setFormDuration(Math.max(5, h * 60 + m));
                        }}
                        className="bg-transparent text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary focus:outline-none w-full cursor-pointer"
                      >
                        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((mins) => (
                          <option key={mins} value={mins} className="bg-white dark:bg-serene-surface-dark">
                            {mins} mins
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Quick Preset Chips for speed */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {[15, 25, 30, 45, 60, 90, 120].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setFormDuration(mins)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all border ${
                          formDuration === mins
                            ? 'bg-serene-primary text-white border-serene-primary font-semibold shadow-2xs'
                            : 'bg-serene-surfaceAlt-light/60 dark:bg-serene-surfaceAlt-dark/60 text-serene-text-muted hover:text-serene-text-primary border-serene-border-light dark:border-serene-border-dark'
                        }`}
                      >
                        {formatMinutesToHours(mins)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Deadline Selector with Date Picker and Tomorrow Button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary">
                    Target Deadline
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSetToday}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
                        getDeadlineDatePart(formDeadline) === todayYMD
                          ? 'bg-serene-primary text-white border-serene-primary'
                          : 'bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-muted hover:text-serene-text-primary border-serene-border-light dark:border-serene-border-dark'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={handleSetTomorrow}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
                        getDeadlineDatePart(formDeadline) === tomorrowYMD
                          ? 'bg-serene-primary text-white border-serene-primary'
                          : 'bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark text-serene-text-muted hover:text-serene-text-primary border-serene-border-light dark:border-serene-border-dark'
                      }`}
                    >
                      Tomorrow
                    </button>
                    {formDeadline && (
                      <button
                        type="button"
                        onClick={() => setFormDeadline('')}
                        className="px-1.5 py-0.5 text-[11px] text-serene-text-muted hover:text-rose-500 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative flex items-center">
                    <Calendar className="w-3.5 h-3.5 absolute left-3 text-serene-text-muted pointer-events-none" />
                    <input
                      type="date"
                      value={getDeadlineDatePart(formDeadline)}
                      onChange={(e) => handleDeadlineDateChange(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl text-xs text-serene-text-primary dark:text-serene-text-darkPrimary focus:outline-none focus:ring-2 focus:ring-serene-primary/40 focus:border-serene-primary [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
                  <div className="relative flex items-center">
                    <Clock className="w-3.5 h-3.5 absolute left-3 text-serene-text-muted pointer-events-none" />
                    <input
                      type="time"
                      value={getDeadlineTimePart(formDeadline)}
                      onChange={(e) => handleDeadlineTimeChange(e.target.value)}
                      placeholder="Optional time"
                      className="w-full pl-8 pr-3 py-2 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl text-xs text-serene-text-primary dark:text-serene-text-darkPrimary focus:outline-none focus:ring-2 focus:ring-serene-primary/40 focus:border-serene-primary [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
