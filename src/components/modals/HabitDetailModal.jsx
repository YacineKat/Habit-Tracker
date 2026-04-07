export default function HabitDetailModal({
  visible,
  habit,
  stats,
  trendCanvasRef,
  weekdayCanvasRef,
  breakdownCanvasRef,
  onClose,
}) {
  return (
    <div
      className={`modal-overlay${visible ? '' : ' hidden'}`}
      id="habit-detail-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal habit-detail-modal">
        {!habit ? (
          <div className="habit-detail-empty">
            <h3>Habit Insights</h3>
            <p>Pick a habit to view detailed analytics.</p>
            <div className="modal-actions">
              <button type="button" className="btn-primary" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          <>
            <div className="habit-detail-header">
              <div>
                <h3>{habit.name}</h3>
                <p>Started {stats.createdLabel}</p>
              </div>
              <button type="button" className="btn-ghost" onClick={onClose}>Close</button>
            </div>

            <div className="habit-detail-stats">
              <div className="habit-detail-stat-card">
                <span className="habit-detail-stat-label">Current Streak</span>
                <strong>{stats.currentStreak} day{stats.currentStreak !== 1 ? 's' : ''}</strong>
              </div>
              <div className="habit-detail-stat-card">
                <span className="habit-detail-stat-label">Best Streak</span>
                <strong>{stats.bestStreak} day{stats.bestStreak !== 1 ? 's' : ''}</strong>
              </div>
              <div className="habit-detail-stat-card">
                <span className="habit-detail-stat-label">Completion</span>
                <strong>{stats.completionPercent}%</strong>
              </div>
              <div className="habit-detail-stat-card">
                <span className="habit-detail-stat-label">Today</span>
                <strong>{stats.todayDone ? 'Done' : 'Missed'}</strong>
              </div>
            </div>

            <div className="habit-detail-grid">
              <section className="habit-detail-chart-card trend-card">
                <h4>30-Day Trend</h4>
                <div className="habit-detail-chart-wrap trend-wrap">
                  <canvas ref={trendCanvasRef}></canvas>
                </div>
              </section>

              <section className="habit-detail-chart-card">
                <h4>Weekday Performance</h4>
                <div className="habit-detail-chart-wrap weekday-wrap">
                  <canvas ref={weekdayCanvasRef}></canvas>
                </div>
              </section>

              <section className="habit-detail-chart-card">
                <h4>Done vs Missed</h4>
                <div className="habit-detail-chart-wrap donut-wrap">
                  <canvas ref={breakdownCanvasRef}></canvas>
                </div>
                <div className="habit-detail-breakdown-note">
                  {stats.completedDays} completed out of {stats.trackedDays} tracked days
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}