export default function HabitsTab({
  active,
  stats,
  newHabitName,
  onNewHabitNameChange,
  onAddHabit,
  habits,
  todayKey,
  celebratingHabitId,
  onToggleHabit,
  onOpenEditHabit,
  onDeleteHabit,
  onOpenDetailHabit,
  isHabitReordering,
  habitsListRef,
  calculateStreak,
  getCompletedDays,
  getCommitmentPercent,
}) {
  return (
    <section id="tab-habits" className={`tab-content${active ? ' active' : ''}`}>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-body">
            <div className="stat-value" id="stat-total">{stats.total}</div>
            <div className="stat-label">Total Habits</div>
          </div>
        </div>
        <div className="stat-card accent">
          <div className="stat-icon">✅</div>
          <div className="stat-body">
            <div className="stat-value" id="stat-done-today">{stats.doneToday}</div>
            <div className="stat-label">Done Today</div>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">📊</div>
          <div className="stat-body">
            <div className="stat-value" id="stat-percentage">{stats.percentage}%</div>
            <div className="stat-label">Completion</div>
          </div>
        </div>
        <div className="stat-card streak">
          <div className="stat-icon">🔥</div>
          <div className="stat-body">
            <div className="stat-value" id="stat-best-streak">{stats.bestStreak}</div>
            <div className="stat-label">Best Streak</div>
          </div>
        </div>
      </div>

      <div className="add-habit-bar">
        <input
          type="text"
          id="habit-input"
          placeholder="Add a new habit..."
          maxLength={60}
          autoComplete="off"
          value={newHabitName}
          onChange={(e) => onNewHabitNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onAddHabit();
          }}
        />
        <button type="button" className="btn-add" id="btn-add-habit" onClick={onAddHabit}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add
        </button>
      </div>

      <div className="habits-list" id="habits-list" ref={habitsListRef}>
        {habits.map((habit) => {
          const done = !!habit.history?.[todayKey];
          const streak = calculateStreak(habit);
          const completed = getCompletedDays(habit);
          const commitment = getCommitmentPercent(habit);

          return (
            <div
              key={habit.id}
              className={`habit-item${done ? ' done' : ''}${celebratingHabitId === habit.id ? ' celebrate' : ''}`}
              data-id={habit.id}
            >
              <label className="habit-check">
                <input
                  type="checkbox"
                  checked={done}
                  data-habit-id={habit.id}
                  onChange={(e) => onToggleHabit(habit.id, e.target.checked)}
                />
                <span className="checkmark">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              </label>

              <div
                className="habit-info"
                role="button"
                tabIndex={0}
                aria-label={`Open insights for ${habit.name}`}
                onClick={() => {
                  if (isHabitReordering) return;
                  onOpenDetailHabit(habit.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenDetailHabit(habit.id);
                  }
                }}
              >
                <div className="habit-name">{habit.name}</div>
                <div className="habit-meta">
                  <span>{completed} day{completed !== 1 ? 's' : ''} completed</span>
                  <span>{commitment}% commitment</span>
                  {streak > 0 ? <span className="habit-streak">🔥 {streak} day{streak !== 1 ? 's' : ''} streak</span> : null}
                </div>
              </div>

              <div className="habit-actions">
                <button type="button" className="btn-edit" title="Edit" onClick={() => onOpenEditHabit(habit)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button type="button" className="btn-delete" title="Delete" onClick={() => onDeleteHabit(habit.id)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`empty-state${habits.length === 0 ? '' : ' hidden'}`} id="empty-state">
        <div className="empty-icon">📝</div>
        <p>No habits yet</p>
        <span>Start by adding your first habit!</span>
      </div>
    </section>
  );
}
