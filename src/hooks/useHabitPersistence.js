import { useEffect, useRef } from 'react';

function generateFallbackId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function sanitizeTag(tag) {
  return String(tag ?? '').trim().slice(0, 20);
}

function normalizeDayNotes(dayNotesRaw) {
  if (!dayNotesRaw || typeof dayNotesRaw !== 'object') return {};

  const out = {};

  Object.entries(dayNotesRaw).forEach(([dayKey, notes]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return;
    if (!Array.isArray(notes)) return;

    const normalized = notes
      .map((note) => {
        if (!note || typeof note !== 'object') return null;

        const title = String(note.title ?? '').trim().slice(0, 100) || 'Untitled';
        const body = String(note.body ?? '').slice(0, 2000);
        const mood = typeof note.mood === 'string' && note.mood.trim() ? note.mood.trim() : 'neutral';
        const pinned = !!note.pinned;

        const seenTags = new Set();
        const tags = (Array.isArray(note.tags) ? note.tags : [])
          .map(sanitizeTag)
          .filter((tag) => {
            if (!tag) return false;
            const key = tag.toLowerCase();
            if (seenTags.has(key)) return false;
            seenTags.add(key);
            return true;
          })
          .slice(0, 6);

        const nowIso = new Date().toISOString();

        return {
          id: typeof note.id === 'string' && note.id.trim() ? note.id.trim() : generateFallbackId(),
          title,
          body,
          tags,
          mood,
          pinned,
          createdAt: typeof note.createdAt === 'string' && note.createdAt ? note.createdAt : nowIso,
          updatedAt: typeof note.updatedAt === 'string' && note.updatedAt ? note.updatedAt : nowIso,
        };
      })
      .filter(Boolean);

    if (normalized.length > 0) {
      out[dayKey] = normalized;
    }
  });

  return out;
}

export default function useHabitPersistence({ storageKey, habits, dayNotes = {}, setHabits, setDayNotes }) {
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);

        const normalizedHabits = Array.isArray(parsed?.habits)
          ? parsed.habits.map((habit) => ({
            ...habit,
            history: habit && typeof habit.history === 'object' && habit.history !== null ? habit.history : {},
          }))
          : [];

        setHabits(normalizedHabits);
        if (setDayNotes) {
          setDayNotes(normalizeDayNotes(parsed?.dayNotes));
        }
      }
    } catch (err) {
      console.warn('Failed to load state:', err);
      setHabits([]);
      if (setDayNotes) {
        setDayNotes({});
      }
    } finally {
      hasLoadedRef.current = true;
    }
  }, [storageKey, setHabits, setDayNotes]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify({
        schemaVersion: 1,
        habits,
        dayNotes,
      }));
    } catch (err) {
      console.warn('Failed to save state:', err);
    }
  }, [habits, dayNotes, storageKey]);
}
