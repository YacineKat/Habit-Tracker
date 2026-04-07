import { useEffect, useMemo, useRef, useState } from 'react';

const NOTE_TITLE_MAX = 100;
const NOTE_BODY_MAX = 2000;
const NOTE_TAGS_MAX = 6;
const NOTE_TAG_MAX_LENGTH = 20;
const SEARCH_SCOPES = [
  { key: 'month', label: 'This month' },
  { key: 'day', label: 'This day' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'Last 7 days' },
];

function parseTagsFromInput(inputText) {
  const seen = new Set();

  return String(inputText ?? '')
    .split(',')
    .map((value) => value.trim().slice(0, NOTE_TAG_MAX_LENGTH))
    .filter((value) => {
      if (!value) return false;
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, NOTE_TAGS_MAX);
}

function toTagInput(tags) {
  return (Array.isArray(tags) ? tags : []).join(', ');
}

function formatDayLabel(dayKey) {
  if (!dayKey) return '';
  const [year, month, day] = String(dayKey).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return dayKey;

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function formatEditedAt(isoValue) {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function parseDayKey(dayKey) {
  if (!dayKey) return null;
  const [year, month, day] = String(dayKey).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDayKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isWithinSearchScope(noteDayKey, scope, referenceDate) {
  if (!noteDayKey || scope === 'month' || !referenceDate) return scope === 'month';
  const noteDate = parseDayKey(noteDayKey);
  if (!noteDate) return false;

  if (scope === 'day') {
    return toDayKey(noteDate) === toDayKey(referenceDate);
  }

  if (scope === 'yesterday') {
    const yesterday = new Date(referenceDate);
    yesterday.setDate(yesterday.getDate() - 1);
    return toDayKey(noteDate) === toDayKey(yesterday);
  }

  if (scope === 'week') {
    const windowStart = new Date(referenceDate);
    windowStart.setDate(windowStart.getDate() - 6);
    return noteDate >= windowStart && noteDate <= referenceDate;
  }

  return true;
}

export default function DayNotesModal({
  visible,
  dayKey,
  dayNotes,
  monthNotes,
  monthTagSuggestions,
  templates,
  moods,
  onOpenDay,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onTogglePin,
  onNoteFeedback,
  onClose,
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [selectedMood, setSelectedMood] = useState('neutral');
  const [pinned, setPinned] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState('month');
  const [formError, setFormError] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const searchInputRef = useRef(null);
  const bodyInputRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    setTitle('');
    setBody('');
    setTagsInput('');
    setSelectedMood('neutral');
    setPinned(false);
    setEditingNoteId(null);
    setSelectedNoteId(null);
    setViewMode('list');
    setSearchQuery('');
    setSearchScope('month');
    setFormError('');
  }, [visible, dayKey]);

  useEffect(() => {
    if (viewMode !== 'read') return;
    if (!selectedNoteId) return;

    const exists = dayNotes.some((note) => note.id === selectedNoteId);
    if (!exists) {
      setSelectedNoteId(null);
      setViewMode('list');
    }
  }, [dayNotes, selectedNoteId, viewMode]);

  const dayLabel = useMemo(() => formatDayLabel(dayKey), [dayKey]);
  const currentTags = useMemo(() => parseTagsFromInput(tagsInput), [tagsInput]);
  const referenceDate = useMemo(() => parseDayKey(dayKey), [dayKey]);
  const scopeLabel = useMemo(() => {
    return SEARCH_SCOPES.find((scope) => scope.key === searchScope)?.label || 'Results';
  }, [searchScope]);

  const filteredMonthResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return monthNotes.filter((note) => {
      if (!isWithinSearchScope(note.dayKey, searchScope, referenceDate)) return false;
      if (!query) return true;
      if (note.title.toLowerCase().includes(query)) return true;
      if ((note.body || '').toLowerCase().includes(query)) return true;
      if (note.tags.some((tag) => tag.toLowerCase().includes(query))) return true;
      return false;
    });
  }, [monthNotes, referenceDate, searchQuery, searchScope]);

  const shouldShowMonthResults = searchQuery.trim().length > 0 || searchScope !== 'month';

  const editingActive = !!editingNoteId;
  const pinnedNotes = useMemo(() => dayNotes.filter((note) => !!note.pinned), [dayNotes]);
  const regularNotes = useMemo(() => dayNotes.filter((note) => !note.pinned), [dayNotes]);

  const selectedNote = useMemo(() => {
    if (!selectedNoteId) return null;
    return dayNotes.find((note) => note.id === selectedNoteId) || null;
  }, [dayNotes, selectedNoteId]);

  const noteBeingEdited = useMemo(() => {
    if (!editingNoteId) return null;
    return dayNotes.find((note) => note.id === editingNoteId) || null;
  }, [dayNotes, editingNoteId]);

  useEffect(() => {
    if (!visible || viewMode !== 'compose') return;
    const textarea = bodyInputRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const minHeight = 220;
    const maxHeight = Math.max(260, Math.round(window.innerHeight * 0.48));
    const nextHeight = Math.min(maxHeight, Math.max(minHeight, textarea.scrollHeight));
    textarea.style.height = `${nextHeight}px`;
  }, [body, viewMode, visible]);

  const openCreateMode = () => {
    setEditingNoteId(null);
    setTitle('');
    setBody('');
    setTagsInput('');
    setSelectedMood('neutral');
    setPinned(false);
    setFormError('');
    setViewMode('compose');
  };

  const openReadMode = (noteId) => {
    setSelectedNoteId(noteId);
    setViewMode('read');
  };

  const startEdit = (note) => {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setBody(note.body || '');
    setTagsInput(toTagInput(note.tags));
    setSelectedMood(note.mood || 'neutral');
    setPinned(!!note.pinned);
    setFormError('');
    setViewMode('compose');
  };

  const resetForm = () => {
    setEditingNoteId(null);
    setTitle('');
    setBody('');
    setTagsInput('');
    setSelectedMood('neutral');
    setPinned(false);
    setFormError('');
  };

  const applyTemplate = (template) => {
    setTitle(template.title || '');
    setBody(template.body || '');
    setTagsInput(toTagInput(template.tags));
    setSelectedMood(template.mood || 'neutral');
    setFormError('');
  };

  const removeTag = (tagToRemove) => {
    const nextTags = currentTags.filter((tag) => tag !== tagToRemove);
    setTagsInput(toTagInput(nextTags));
  };

  const openRelativeNote = (delta) => {
    if (dayNotes.length === 0) return;
    const currentIndex = selectedNoteId ? dayNotes.findIndex((note) => note.id === selectedNoteId) : -1;
    const startIndex = currentIndex < 0 ? (delta > 0 ? 0 : dayNotes.length - 1) : currentIndex + delta;
    const boundedIndex = Math.min(dayNotes.length - 1, Math.max(0, startIndex));
    const nextNote = dayNotes[boundedIndex];
    if (nextNote) {
      openReadMode(nextNote.id);
    }
  };

  const handleTogglePin = (note) => {
    onTogglePin(dayKey, note.id);
    onNoteFeedback?.(note.pinned ? 'Note unpinned.' : 'Note pinned.');
  };

  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (event) => {
      const target = event.target;
      const isFieldTarget = target instanceof HTMLElement
        && !!target.closest('input, textarea, select, [contenteditable="true"]');

      if (isFieldTarget) return;

      const key = event.key.toLowerCase();

      if (viewMode === 'list') {
        if (key === 'n') {
          event.preventDefault();
          openCreateMode();
          return;
        }
        if (key === '/') {
          event.preventDefault();
          searchInputRef.current?.focus();
          return;
        }
        if (key === 'arrowdown' || key === 'j') {
          event.preventDefault();
          openRelativeNote(1);
          return;
        }
        if (key === 'arrowup' || key === 'k') {
          event.preventDefault();
          openRelativeNote(-1);
        }
        return;
      }

      if (viewMode === 'read' && selectedNote) {
        if (key === 'e') {
          event.preventDefault();
          startEdit(selectedNote);
          return;
        }
        if (key === 'p') {
          event.preventDefault();
          handleTogglePin(selectedNote);
          return;
        }
        if (key === 'l') {
          event.preventDefault();
          setViewMode('list');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dayKey, dayNotes, selectedNote, selectedNoteId, viewMode, visible]);

  const appendTagSuggestion = (tag) => {
    const nextTags = parseTagsFromInput([tagsInput, tag].filter(Boolean).join(','));
    setTagsInput(toTagInput(nextTags));
  };

  const handleSubmit = () => {
    const trimmedTitle = title.trim().slice(0, NOTE_TITLE_MAX);
    if (!trimmedTitle) {
      setFormError('Title is required.');
      return;
    }

    const payload = {
      title: trimmedTitle,
      body: body.slice(0, NOTE_BODY_MAX),
      tags: currentTags,
      mood: selectedMood,
      pinned,
    };

    let ok = false;
    if (editingNoteId) {
      const currentEditingId = editingNoteId;
      ok = onUpdateNote(dayKey, editingNoteId, payload);
      if (ok) {
        resetForm();
        setSelectedNoteId(currentEditingId);
        setViewMode('read');
        onNoteFeedback?.('Note updated.');
      }
    } else {
      ok = onAddNote(dayKey, payload);
      if (ok) {
        resetForm();
        setViewMode('list');
        onNoteFeedback?.('Note added.');
      }
    }

    if (!ok) {
      setFormError('Could not save this note. Please try again.');
      return;
    }
  };

  const handleDeleteNote = (noteId) => {
    onDeleteNote(dayKey, noteId);
    onNoteFeedback?.('Note deleted.');
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
      setViewMode('list');
    }
  };

  const renderNoteCard = (note) => {
    const moodMeta = moods.find((mood) => mood.key === note.mood) || moods[0];

    return (
      <article
        key={`day-note-${note.id}`}
        className={`day-note-item${note.pinned ? ' pinned' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => openReadMode(note.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openReadMode(note.id);
          }
        }}
      >
        <div className="day-note-header">
          <div className="day-note-title-wrap">
            <strong>{note.title}</strong>
            <span className="day-note-meta">
              {moodMeta.icon} {moodMeta.label} - Updated {formatEditedAt(note.updatedAt)}
            </span>
          </div>
          {note.pinned ? <span className="day-note-pin">Pinned</span> : null}
        </div>

        {note.body ? <p className="day-note-snippet">{note.body}</p> : null}

        {note.tags.length > 0 ? (
          <div className="day-note-tags">
            {note.tags.map((tag) => <span key={`${note.id}-${tag}`}>#{tag}</span>)}
          </div>
        ) : null}
      </article>
    );
  };

  const renderListView = () => (
    <section className="day-notes-list-card">
      <div className="day-notes-list-head">
        <h4>Notes for this day ({dayNotes.length})</h4>
        <div className="day-notes-summary">
          <span>{pinnedNotes.length} pinned</span>
          <span>{regularNotes.length} regular</span>
        </div>
      </div>

      {dayNotes.length === 0 ? (
        <p className="day-notes-muted">No notes yet. Tap + to add your first note.</p>
      ) : (
        <div className="day-notes-list">
          {pinnedNotes.length > 0 ? <h5 className="day-note-section-title">Pinned</h5> : null}
          {pinnedNotes.map(renderNoteCard)}
          {regularNotes.length > 0 && pinnedNotes.length > 0 ? <h5 className="day-note-section-title">Other Notes</h5> : null}
          {regularNotes.map(renderNoteCard)}
        </div>
      )}

      <p className="day-note-keyboard-hint">Shortcuts: N new, / search, J/K browse, E edit, P pin</p>
    </section>
  );

  const renderReadView = () => {
    if (!selectedNote) {
      return (
        <section className="day-notes-reader-card">
          <p className="day-notes-muted">This note is no longer available.</p>
          <div className="modal-actions">
            <button type="button" className="btn-primary" onClick={() => setViewMode('list')}>Back to Notes</button>
          </div>
        </section>
      );
    }

    const moodMeta = moods.find((mood) => mood.key === selectedNote.mood) || moods[0];

    return (
      <section className="day-notes-reader-card">
        <div className="day-note-reader-title-wrap">
          <h4>{selectedNote.title}</h4>
          <div className="day-note-reader-meta">
            <span>{moodMeta.icon} {moodMeta.label}</span>
            <span>Updated {formatEditedAt(selectedNote.updatedAt)}</span>
            {selectedNote.pinned ? <span className="day-note-pin">Pinned</span> : null}
          </div>
        </div>

        {selectedNote.tags.length > 0 ? (
          <div className="day-note-reader-tags">
            {selectedNote.tags.map((tag) => <span key={`read-${selectedNote.id}-${tag}`}>#{tag}</span>)}
          </div>
        ) : null}

        <div className="day-note-reader-body">
          {selectedNote.body || 'No content provided.'}
        </div>

        <div className="day-note-reader-actions day-note-reader-actions-bottom">
          <button type="button" className="btn-ghost" onClick={() => setViewMode('list')}>Back</button>
          <button type="button" className="btn-secondary" onClick={() => startEdit(selectedNote)}>Edit</button>
          <button type="button" className="btn-secondary" onClick={() => handleTogglePin(selectedNote)}>
            {selectedNote.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button type="button" className="btn-danger" onClick={() => handleDeleteNote(selectedNote.id)}>Delete</button>
        </div>
      </section>
    );
  };

  const renderComposeView = () => (
    <section className="day-notes-form-card day-notes-compose-card">
      <div className="day-note-compose-head">
        <div className="day-note-compose-title-wrap">
          <h4>{editingActive ? 'Edit Note' : 'Add New Note'}</h4>
          <p className="day-note-edit-hint">
            {editingActive ? `Editing: ${noteBeingEdited?.title || 'Current note'}` : 'Capture key details for easy daily review.'}
          </p>
        </div>

        <button type="button" className="btn-ghost" onClick={() => {
          resetForm();
          if (editingActive && selectedNoteId) {
            setViewMode('read');
          } else {
            setViewMode('list');
          }
        }}>
          Cancel
        </button>
      </div>

      <div className="note-templates-row">
        {templates.map((template) => (
          <button
            key={template.key}
            type="button"
            className="note-template-btn"
            onClick={() => applyTemplate(template)}
          >
            {template.label}
          </button>
        ))}
      </div>

      <input
        id="day-note-title"
        type="text"
        placeholder="Note title"
        value={title}
        aria-label="Note title"
        maxLength={NOTE_TITLE_MAX}
        onChange={(e) => {
          setTitle(e.target.value);
          if (formError) setFormError('');
        }}
      />
      <div className="note-field-counter">{title.trim().length}/{NOTE_TITLE_MAX}</div>

      <textarea
        id="day-note-body"
        ref={bodyInputRef}
        className="note-body-input"
        placeholder="Write your note here..."
        aria-label="Note body"
        value={body}
        maxLength={NOTE_BODY_MAX}
        onChange={(e) => setBody(e.target.value)}
      ></textarea>
      <div className="note-field-counter">{body.length}/{NOTE_BODY_MAX}</div>

      <input
        id="day-note-tags"
        type="text"
        placeholder="Tags (comma separated)"
        value={tagsInput}
        aria-label="Tags input"
        maxLength={160}
        onChange={(e) => setTagsInput(e.target.value)}
      />
      <div className="note-field-counter">{currentTags.length}/{NOTE_TAGS_MAX} tags</div>

      {currentTags.length > 0 ? (
        <div className="tag-pill-row">
          {currentTags.map((tag) => (
            <span key={`pill-${tag}`} className="tag-pill">
              #{tag}
              <button
                type="button"
                className="tag-pill-remove"
                aria-label={`Remove tag ${tag}`}
                onClick={() => removeTag(tag)}
              >
                x
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <p className="tag-input-help">Use commas to separate tags. Duplicate tags are ignored automatically.</p>

      {monthTagSuggestions.length > 0 ? (
        <div className="tag-suggestions-row">
          {monthTagSuggestions.map((tag) => (
            <button
              key={`tag-${tag}`}
              type="button"
              className="tag-suggestion-btn"
              onClick={() => appendTagSuggestion(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mood-row">
        {moods.map((mood) => (
          <button
            key={mood.key}
            type="button"
            className={`mood-btn${selectedMood === mood.key ? ' active' : ''}`}
            aria-pressed={selectedMood === mood.key}
            onClick={() => setSelectedMood(mood.key)}
          >
            <span>{mood.icon}</span>
            <span>{mood.label}</span>
          </button>
        ))}
      </div>

      <label className="pin-toggle">
        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
        <span>Pin this note</span>
      </label>

      {formError ? <div className="day-notes-error" role="status" aria-live="polite">{formError}</div> : null}

      <div className="modal-actions">
        <button type="button" className="btn-primary" onClick={handleSubmit}>
          {editingActive ? 'Save Changes' : 'Add Note'}
        </button>
      </div>
    </section>
  );

  return (
    <div
      className={`modal-overlay${visible ? '' : ' hidden'}`}
      id="day-notes-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal day-notes-modal">
        <div className="day-notes-header">
          <div>
            <h3>Daily Notes</h3>
            <p>{dayLabel}</p>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose}>Close</button>
        </div>

        <div className="day-notes-filter-row" role="tablist" aria-label="Search scope">
          {SEARCH_SCOPES.map((scope) => (
            <button
              key={scope.key}
              type="button"
              role="tab"
              aria-selected={searchScope === scope.key}
              className={`day-notes-filter-btn${searchScope === scope.key ? ' active' : ''}`}
              onClick={() => setSearchScope(scope.key)}
            >
              {scope.label}
            </button>
          ))}
        </div>

        <div className="day-notes-search">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes in this month..."
            aria-label="Search month notes"
            maxLength={80}
          />
          {searchQuery ? (
            <button
              type="button"
              className="btn-ghost day-notes-search-clear"
              onClick={() => setSearchQuery('')}
            >
              Clear
            </button>
          ) : null}
        </div>

        {shouldShowMonthResults ? (
          <section className="day-notes-month-results">
            <h4>{scopeLabel} results ({filteredMonthResults.length})</h4>
            {searchQuery.trim() ? <p className="day-notes-muted">Matching: "{searchQuery.trim()}"</p> : null}
            {filteredMonthResults.length === 0 ? (
              <p className="day-notes-muted">No matching notes this month.</p>
            ) : (
              <div className="day-notes-month-list">
                {filteredMonthResults.map((note) => (
                  <article key={`search-${note.dayKey}-${note.id}`} className="month-note-item">
                    <div className="month-note-main">
                      <strong>{note.title}</strong>
                      <span>{note.dayLabel}</span>
                      {note.body ? <p className="month-note-snippet">{note.body}</p> : null}
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        onOpenDay(note.dayKey);
                        setSearchQuery('');
                        setSearchScope('month');
                        setViewMode('list');
                        setSelectedNoteId(null);
                      }}
                    >
                      Open Day
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}

        <div className="day-notes-content">
          {viewMode === 'compose' ? renderComposeView() : null}
          {viewMode === 'read' ? renderReadView() : null}
          {viewMode === 'list' ? renderListView() : null}
        </div>

        {viewMode === 'list' ? (
          <button type="button" className="day-notes-fab" title="New note (N)" aria-label="Add note" onClick={openCreateMode}>+</button>
        ) : null}
      </div>
    </div>
  );
}