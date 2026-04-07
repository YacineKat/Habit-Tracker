import { useEffect, useMemo, useRef, useState } from 'react';
import AppHeader from './components/AppHeader';
import HabitsTab from './components/HabitsTab';
import DashboardTab from './components/DashboardTab';
import CalendarTab from './components/CalendarTab';
import Toast from './components/Toast';
import ExportModal from './components/modals/ExportModal';
import EditModal from './components/modals/EditModal';
import DeleteModal from './components/modals/DeleteModal';
import InstallModal from './components/modals/InstallModal';
import HabitDetailModal from './components/modals/HabitDetailModal';
import DayNotesModal from './components/modals/DayNotesModal';
import useCharts from './hooks/useCharts';
import useSwipeTabs from './hooks/useSwipeTabs';
import useHabitReorder from './hooks/useHabitReorder';
import useHabitPersistence from './hooks/useHabitPersistence';
import useHabitExport from './hooks/useHabitExport';
import useHabitDetailCharts from './hooks/useHabitDetailCharts';

const STORAGE_KEY = 'habit-tracker-data';
const TABS = ['habits', 'dashboard', 'calendar'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MOTIVATIONAL_MESSAGES = [
  'Amazing! You completed every habit today.',
  'Perfect day! Keep this momentum going.',
  'Incredible work! One day closer to your goals.',
  'Outstanding! You are building a better you.',
  'All done! Consistency is the key to greatness.',
  'Unstoppable! Your streak is on fire.',
  'Champion! Every habit checked off.',
  'Brilliant! Each step forward counts.',
];

const NOTE_MOODS = [
  { key: 'neutral', label: 'Neutral', icon: '😐' },
  { key: 'great', label: 'Great', icon: '😄' },
  { key: 'focused', label: 'Focused', icon: '🧠' },
  { key: 'tired', label: 'Tired', icon: '😴' },
  { key: 'stressed', label: 'Stressed', icon: '😵' },
];

const NOTE_TEMPLATES = [
  {
    key: 'win',
    label: 'Today Win',
    title: 'Big win today',
    body: 'What did I do well today?',
    tags: ['progress'],
    mood: 'great',
  },
  {
    key: 'plan',
    label: 'Tomorrow Plan',
    title: 'Plan for tomorrow',
    body: 'Top 3 priorities for tomorrow:',
    tags: ['planning'],
    mood: 'focused',
  },
  {
    key: 'idea',
    label: 'Quick Idea',
    title: 'New idea',
    body: 'Capture your idea before you forget it...',
    tags: ['idea'],
    mood: 'neutral',
  },
];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getTodayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function formatMonth(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
  }).format(date);
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function isDayPast(year, month, day) {
  const d = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

function calculateStreak(habit) {
  const history = habit.history || {};
  let streak = 0;
  const d = new Date();
  const todayKey = getTodayKey();
  if (!history[todayKey]) d.setDate(d.getDate() - 1);

  while (true) {
    const key = getTodayKey(d);
    if (history[key]) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function getCompletedDays(habit) {
  return Object.values(habit.history || {}).filter(Boolean).length;
}

function getCommitmentPercent(habit) {
  const created = new Date(habit.createdAt || Date.now());
  const createdTime = Number.isNaN(created.getTime()) ? Date.now() : created.getTime();
  const diffTime = Date.now() - createdTime;
  const totalDays = Math.max(1, Math.floor(diffTime / 86400000) + 1);
  return Math.round((getCompletedDays(habit) / totalDays) * 100);
}

function getUtcTimeFromDayKey(dayKey) {
  const [year, month, day] = dayKey.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function calculateBestStreak(habit) {
  const completedDayKeys = Object.entries(habit.history || {})
    .filter(([, done]) => !!done)
    .map(([key]) => key)
    .sort();

  if (completedDayKeys.length === 0) return 0;

  let best = 1;
  let current = 1;

  for (let i = 1; i < completedDayKeys.length; i += 1) {
    const prevMs = getUtcTimeFromDayKey(completedDayKeys[i - 1]);
    const currentMs = getUtcTimeFromDayKey(completedDayKeys[i]);
    const diffDays = Math.round((currentMs - prevMs) / 86400000);

    if (diffDays === 1) {
      current += 1;
      best = Math.max(best, current);
    } else if (diffDays > 1) {
      current = 1;
    }
  }

  return best;
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function getTimestamp(value) {
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function formatDayKeyLabel(dayKey) {
  const [year, month, day] = String(dayKey).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return dayKey;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function normalizeNoteTags(tags) {
  const seen = new Set();

  return (Array.isArray(tags) ? tags : [])
    .map((tag) => String(tag ?? '').trim().slice(0, 20))
    .filter((tag) => {
      if (!tag) return false;
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

function isMobile() {
  return (
    window.innerWidth < 768
    || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
}

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function App() {
  const [habits, setHabits] = useState([]);
  const [dayNotes, setDayNotes] = useState({});
  const [activeTab, setActiveTab] = useState('habits');
  const [calendarDate, setCalendarDate] = useState(new Date());

  const [newHabitName, setNewHabitName] = useState('');
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [deletingHabitId, setDeletingHabitId] = useState(null);

  const [showExportModal, setShowExportModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [detailHabitId, setDetailHabitId] = useState(null);
  const [selectedDayKey, setSelectedDayKey] = useState(null);

  const [toastText, setToastText] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastShowing, setToastShowing] = useState(false);
  const [celebratingHabitId, setCelebratingHabitId] = useState(null);

  const deferredPromptRef = useRef(null);
  const celebrationTimerRef = useRef(null);

  const { habitsListRef, isHabitReordering } = useHabitReorder({ setHabits });
  const modalOpen = showExportModal
    || editingHabitId !== null
    || deletingHabitId !== null
    || showInstallModal
    || detailHabitId !== null
    || selectedDayKey !== null;
  const { tabsViewportRef, trackX, trackDragging } = useSwipeTabs({
    activeTab,
    setActiveTab,
    tabs: TABS,
    isHabitReordering,
    modalOpen,
  });

  const todayKey = getTodayKey();
  const todayDateText = useMemo(() => formatDate(new Date()), []);

  useHabitPersistence({
    storageKey: STORAGE_KEY,
    habits,
    dayNotes,
    setHabits,
    setDayNotes,
  });

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      setShowExportModal(false);
      setEditingHabitId(null);
      setDeletingHabitId(null);
      setShowInstallModal(false);
      setDetailHabitId(null);
      setSelectedDayKey(null);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!detailHabitId) return;
    if (!habits.some((habit) => habit.id === detailHabitId)) {
      setDetailHabitId(null);
    }
  }, [detailHabitId, habits]);

  useEffect(() => {
    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      if (isMobile() && !isInstalled()) {
        window.setTimeout(() => {
          setShowInstallModal(true);
        }, 2000);
      }
    };

    const onAppInstalled = () => {
      deferredPromptRef.current = null;
      setShowInstallModal(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!toastVisible) return undefined;

    const raf = requestAnimationFrame(() => setToastShowing(true));
    const hideTimer = window.setTimeout(() => setToastShowing(false), 3500);
    const removeTimer = window.setTimeout(() => setToastVisible(false), 3900);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(hideTimer);
      window.clearTimeout(removeTimer);
    };
  }, [toastVisible]);

  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current) {
        window.clearTimeout(celebrationTimerRef.current);
      }
    };
  }, []);

  const stats = useMemo(() => {
    const total = habits.length;
    const doneToday = habits.filter((h) => h.history?.[todayKey]).length;
    const percentage = total === 0 ? 0 : Math.round((doneToday / total) * 100);
    const bestStreak = habits.reduce((mx, h) => Math.max(mx, calculateStreak(h)), 0);

    return {
      total,
      doneToday,
      percentage,
      bestStreak,
    };
  }, [habits, todayKey]);

  const dashSummary = useMemo(() => {
    const total = habits.length;
    let sumPct = 0;
    let perfectDays = 0;
    let totalChecks = 0;

    for (let i = 0; i < 14; i += 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = getTodayKey(d);
      const done = habits.filter((h) => h.history?.[key]).length;
      totalChecks += done;
      if (total > 0) {
        const dayPct = (done / total) * 100;
        sumPct += dayPct;
        if (done === total) perfectDays += 1;
      }
    }

    return {
      avgRate: total === 0 ? 0 : Math.round(sumPct / 14),
      perfectDays,
      totalChecks,
    };
  }, [habits]);

  const ringStats = useMemo(() => {
    const total = habits.length;
    const done = habits.filter((h) => h.history?.[todayKey]).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, percent };
  }, [habits, todayKey]);

  const lineSeries = useMemo(() => {
    const labels = [];
    const values = [];
    const total = habits.length;

    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = getTodayKey(d);
      labels.push(`${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`);
      if (total === 0) {
        values.push(0);
      } else {
        const done = habits.filter((h) => h.history?.[key]).length;
        values.push(Math.round((done / total) * 100));
      }
    }

    return { labels, values };
  }, [habits]);

  const barRanking = useMemo(() => {
    return [...habits]
      .map((h) => ({
        name: h.name,
        pct: getCommitmentPercent(h),
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 10);
  }, [habits]);

  const deletingHabit = useMemo(() => {
    return habits.find((h) => h.id === deletingHabitId) || null;
  }, [habits, deletingHabitId]);

  const detailHabit = useMemo(() => {
    return habits.find((h) => h.id === detailHabitId) || null;
  }, [habits, detailHabitId]);

  const calendarData = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    const dayCells = [];

    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const total = habits.length;
      const done = habits.filter((h) => h.history?.[key]).length;
      const notesCount = Array.isArray(dayNotes[key]) ? dayNotes[key].length : 0;
      const isToday = isCurrentMonth && day === today.getDate();

      let cls = '';
      if (total > 0 && done > 0) {
        cls = done === total ? 'full' : 'partial';
      } else if (total > 0 && isDayPast(year, month, day)) {
        cls = 'none';
      }

      dayCells.push({
        day,
        key,
        cls,
        isToday,
        done,
        total,
        notesCount,
        hasNotes: notesCount > 0,
      });
    }

    return {
      year,
      month,
      firstDay,
      dayCells,
      monthLabel: formatMonth(calendarDate),
    };
  }, [calendarDate, habits, dayNotes]);

  const selectedDayNotes = useMemo(() => {
    if (!selectedDayKey) return [];
    const notes = Array.isArray(dayNotes[selectedDayKey]) ? dayNotes[selectedDayKey] : [];

    return [...notes].sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return getTimestamp(b.updatedAt) - getTimestamp(a.updatedAt);
    });
  }, [dayNotes, selectedDayKey]);

  const monthNotes = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = String(calendarDate.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${year}-${month}-`;

    const rows = [];
    Object.entries(dayNotes).forEach(([dayKey, notes]) => {
      if (!dayKey.startsWith(monthPrefix) || !Array.isArray(notes)) return;

      notes.forEach((note) => {
        rows.push({
          ...note,
          dayKey,
          dayLabel: formatDayKeyLabel(dayKey),
          tags: Array.isArray(note.tags) ? note.tags : [],
          body: note.body || '',
        });
      });
    });

    return rows.sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return getTimestamp(b.updatedAt) - getTimestamp(a.updatedAt);
    });
  }, [calendarDate, dayNotes]);

  const monthTagSuggestions = useMemo(() => {
    const freq = new Map();

    monthNotes.forEach((note) => {
      (note.tags || []).forEach((tag) => {
        const key = String(tag).trim();
        if (!key) return;
        freq.set(key, (freq.get(key) || 0) + 1);
      });
    });

    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  }, [monthNotes]);

  const habitDetailData = useMemo(() => {
    if (!detailHabit) {
      return {
        stats: {
          currentStreak: 0,
          bestStreak: 0,
          completionPercent: 0,
          todayDone: false,
          trackedDays: 0,
          completedDays: 0,
          createdLabel: '',
        },
        trendSeries: {
          labels: [],
          values: [],
        },
        weekdaySeries: {
          labels: DAY_NAMES,
          values: DAY_NAMES.map(() => 0),
        },
        breakdown: {
          done: 0,
          missed: 0,
        },
      };
    }

    const history = detailHabit.history || {};

    const createdDate = new Date(detailHabit.createdAt || Date.now());
    const safeCreatedDate = Number.isNaN(createdDate.getTime()) ? new Date() : createdDate;
    safeCreatedDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const trackedDays = Math.max(1, Math.floor((today - safeCreatedDate) / 86400000) + 1);
    const completedDays = getCompletedDays(detailHabit);
    const missedDays = Math.max(0, trackedDays - completedDays);

    const trendLabels = [];
    const trendValues = [];
    for (let i = 29; i >= 0; i -= 1) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      const key = getTodayKey(day);
      trendLabels.push(`${MONTH_NAMES[day.getMonth()]} ${day.getDate()}`);
      trendValues.push(history[key] ? 1 : 0);
    }

    const weekdayTotals = DAY_NAMES.map(() => 0);
    const weekdayDone = DAY_NAMES.map(() => 0);
    for (const cursor = new Date(safeCreatedDate); cursor <= today; cursor.setDate(cursor.getDate() + 1)) {
      const weekday = cursor.getDay();
      weekdayTotals[weekday] += 1;
      const key = getTodayKey(cursor);
      if (history[key]) {
        weekdayDone[weekday] += 1;
      }
    }

    return {
      stats: {
        currentStreak: calculateStreak(detailHabit),
        bestStreak: calculateBestStreak(detailHabit),
        completionPercent: Math.round((completedDays / trackedDays) * 100),
        todayDone: !!history[todayKey],
        trackedDays,
        completedDays,
        createdLabel: formatShortDate(safeCreatedDate),
      },
      trendSeries: {
        labels: trendLabels,
        values: trendValues,
      },
      weekdaySeries: {
        labels: DAY_NAMES,
        values: weekdayTotals.map((total, idx) => (total === 0 ? 0 : Math.round((weekdayDone[idx] / total) * 100))),
      },
      breakdown: {
        done: completedDays,
        missed: missedDays,
      },
    };
  }, [detailHabit, todayKey]);

  const { ringCanvasRef, lineCanvasRef, barCanvasRef, barWrapperRef } = useCharts({
    activeTab,
    ringStats,
    lineSeries,
    barRanking,
  });

  const {
    trendCanvasRef,
    weekdayCanvasRef,
    breakdownCanvasRef,
  } = useHabitDetailCharts({
    visible: !!detailHabitId,
    habitId: detailHabit?.id || null,
    trendSeries: habitDetailData.trendSeries,
    weekdaySeries: habitDetailData.weekdaySeries,
    breakdown: habitDetailData.breakdown,
  });

  const { handleExportJson, handleExportCsv } = useHabitExport({
    habits,
    dayNotes,
    todayKey,
    setShowExportModal,
    calculateStreak,
    getCompletedDays,
    getCommitmentPercent,
  });

  const triggerToast = (message) => {
    setToastText(message);
    setToastVisible(true);
    setToastShowing(false);
  };

  const addHabit = () => {
    const name = newHabitName.trim();
    if (!name) return;

    setHabits((prev) => [
      ...prev,
      {
        id: generateId(),
        name,
        createdAt: new Date().toISOString(),
        history: {},
      },
    ]);

    setNewHabitName('');
  };

  const toggleHabit = (habitId, checked) => {
    setHabits((prev) => {
      const next = prev.map((habit) => {
        if (habit.id !== habitId) return habit;
        return {
          ...habit,
          history: {
            ...(habit.history || {}),
            [todayKey]: checked,
          },
        };
      });

      if (checked) {
        const total = next.length;
        const done = next.filter((h) => h.history?.[todayKey]).length;
        if (total > 0 && done === total) {
          const message = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
          Promise.resolve().then(() => triggerToast(message));
        }
      }

      return next;
    });

    if (checked) {
      setCelebratingHabitId(habitId);
      if (celebrationTimerRef.current) window.clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = window.setTimeout(() => {
        setCelebratingHabitId(null);
      }, 500);
    }
  };

  const addDayNote = (dayKey, payload) => {
    const title = String(payload?.title ?? '').trim().slice(0, 100);
    if (!title) return false;

    const body = String(payload?.body ?? '').slice(0, 2000);
    const tags = normalizeNoteTags(payload?.tags);
    const moodSet = new Set(NOTE_MOODS.map((mood) => mood.key));
    const mood = moodSet.has(payload?.mood) ? payload.mood : 'neutral';
    const pinned = !!payload?.pinned;
    const nowIso = new Date().toISOString();

    setDayNotes((prev) => {
      const existing = Array.isArray(prev[dayKey]) ? prev[dayKey] : [];
      const nextNote = {
        id: generateId(),
        title,
        body,
        tags,
        mood,
        pinned,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      return {
        ...prev,
        [dayKey]: [nextNote, ...existing],
      };
    });

    return true;
  };

  const updateDayNote = (dayKey, noteId, payload) => {
    const title = String(payload?.title ?? '').trim().slice(0, 100);
    if (!title || !noteId) return false;

    const existing = Array.isArray(dayNotes[dayKey]) ? dayNotes[dayKey] : [];
    if (!existing.some((note) => note.id === noteId)) return false;

    const body = String(payload?.body ?? '').slice(0, 2000);
    const tags = normalizeNoteTags(payload?.tags);
    const moodSet = new Set(NOTE_MOODS.map((mood) => mood.key));
    const mood = moodSet.has(payload?.mood) ? payload.mood : 'neutral';
    const pinned = !!payload?.pinned;

    setDayNotes((prev) => {
      const prevList = Array.isArray(prev[dayKey]) ? prev[dayKey] : [];
      const updatedList = prevList.map((note) => {
        if (note.id !== noteId) return note;

        return {
          ...note,
          title,
          body,
          tags,
          mood,
          pinned,
          updatedAt: new Date().toISOString(),
        };
      });

      return {
        ...prev,
        [dayKey]: updatedList,
      };
    });

    return true;
  };

  const deleteDayNote = (dayKey, noteId) => {
    if (!noteId) return;

    setDayNotes((prev) => {
      const existing = Array.isArray(prev[dayKey]) ? prev[dayKey] : [];
      const nextList = existing.filter((note) => note.id !== noteId);
      if (nextList.length === existing.length) return prev;

      if (nextList.length === 0) {
        const next = { ...prev };
        delete next[dayKey];
        return next;
      }

      return {
        ...prev,
        [dayKey]: nextList,
      };
    });
  };

  const togglePinDayNote = (dayKey, noteId) => {
    setDayNotes((prev) => {
      const existing = Array.isArray(prev[dayKey]) ? prev[dayKey] : [];
      if (existing.length === 0) return prev;

      let changed = false;
      const nextList = existing.map((note) => {
        if (note.id !== noteId) return note;
        changed = true;

        return {
          ...note,
          pinned: !note.pinned,
          updatedAt: new Date().toISOString(),
        };
      });

      if (!changed) return prev;

      return {
        ...prev,
        [dayKey]: nextList,
      };
    });
  };

  const openEditHabit = (habit) => {
    setEditingHabitId(habit.id);
    setEditingName(habit.name);
  };

  const saveEditHabit = () => {
    const value = editingName.trim();
    if (!value || !editingHabitId) return;

    setHabits((prev) => prev.map((habit) => {
      if (habit.id !== editingHabitId) return habit;
      return { ...habit, name: value };
    }));

    setEditingHabitId(null);
    setEditingName('');
  };

  const confirmDeleteHabit = () => {
    if (!deletingHabitId) return;
    setHabits((prev) => prev.filter((habit) => habit.id !== deletingHabitId));
    setDeletingHabitId(null);
  };

  const handleInstall = async () => {
    const prompt = deferredPromptRef.current;
    if (prompt) {
      prompt.prompt();
      try {
        await prompt.userChoice;
      } catch (err) {
        console.warn('Install prompt failed:', err);
      }
      deferredPromptRef.current = null;
    }
    setShowInstallModal(false);
  };

  const trackClassName = `tabs-track${trackDragging ? ' dragging' : ''}`;

  return (
    <>
      <Toast text={toastText} visible={toastVisible} showing={toastShowing} />

      <AppHeader
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onExportClick={() => setShowExportModal(true)}
        todayDateText={todayDateText}
      />

      <main className="app-main">
        <div className="tabs-viewport" id="tabs-viewport" ref={tabsViewportRef}>
          <div className={trackClassName} id="tabs-track" style={{ transform: `translateX(${trackX}px)` }}>
            <HabitsTab
              active={activeTab === 'habits'}
              stats={stats}
              newHabitName={newHabitName}
              onNewHabitNameChange={setNewHabitName}
              onAddHabit={addHabit}
              habits={habits}
              todayKey={todayKey}
              celebratingHabitId={celebratingHabitId}
              onToggleHabit={toggleHabit}
              onOpenEditHabit={openEditHabit}
              onDeleteHabit={setDeletingHabitId}
              onOpenDetailHabit={setDetailHabitId}
              isHabitReordering={isHabitReordering}
              habitsListRef={habitsListRef}
              calculateStreak={calculateStreak}
              getCompletedDays={getCompletedDays}
              getCommitmentPercent={getCommitmentPercent}
            />

            <DashboardTab
              active={activeTab === 'dashboard'}
              dashSummary={dashSummary}
              ringStats={ringStats}
              ringCanvasRef={ringCanvasRef}
              lineCanvasRef={lineCanvasRef}
              barCanvasRef={barCanvasRef}
              barWrapperRef={barWrapperRef}
            />

            <CalendarTab
              active={activeTab === 'calendar'}
              dayNames={DAY_NAMES}
              calendarData={calendarData}
              onDayClick={setSelectedDayKey}
              onPrevMonth={() => {
                setCalendarDate((prev) => {
                  const next = new Date(prev);
                  next.setMonth(next.getMonth() - 1);
                  return next;
                });
              }}
              onNextMonth={() => {
                setCalendarDate((prev) => {
                  const next = new Date(prev);
                  next.setMonth(next.getMonth() + 1);
                  return next;
                });
              }}
            />
          </div>
        </div>
      </main>

      <HabitDetailModal
        visible={!!detailHabitId}
        habit={detailHabit}
        stats={habitDetailData.stats}
        trendCanvasRef={trendCanvasRef}
        weekdayCanvasRef={weekdayCanvasRef}
        breakdownCanvasRef={breakdownCanvasRef}
        onClose={() => setDetailHabitId(null)}
      />

      <DayNotesModal
        visible={!!selectedDayKey}
        dayKey={selectedDayKey}
        dayNotes={selectedDayNotes}
        monthNotes={monthNotes}
        monthTagSuggestions={monthTagSuggestions}
        templates={NOTE_TEMPLATES}
        moods={NOTE_MOODS}
        onOpenDay={setSelectedDayKey}
        onAddNote={addDayNote}
        onUpdateNote={updateDayNote}
        onDeleteNote={deleteDayNote}
        onTogglePin={togglePinDayNote}
        onNoteFeedback={triggerToast}
        onClose={() => setSelectedDayKey(null)}
      />

      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportJson={handleExportJson}
        onExportCsv={handleExportCsv}
      />

      <EditModal
        visible={!!editingHabitId}
        value={editingName}
        onValueChange={setEditingName}
        onSave={saveEditHabit}
        onClose={() => setEditingHabitId(null)}
      />

      <DeleteModal
        visible={!!deletingHabitId}
        deletingHabit={deletingHabit}
        onConfirm={confirmDeleteHabit}
        onClose={() => setDeletingHabitId(null)}
      />

      <InstallModal
        visible={showInstallModal}
        onInstall={handleInstall}
        onClose={() => setShowInstallModal(false)}
      />
    </>
  );
}
