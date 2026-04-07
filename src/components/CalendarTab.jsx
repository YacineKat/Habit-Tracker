export default function CalendarTab({
  active,
  dayNames,
  calendarData,
  onDayClick,
  onPrevMonth,
  onNextMonth,
}) {
  return (
    <section id="tab-calendar" className={`tab-content${active ? ' active' : ''}`}>
      <div className="calendar-header">
        <button type="button" className="btn-icon" id="cal-prev" onClick={onPrevMonth}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h3 id="cal-month-label">{calendarData.monthLabel}</h3>
        <button type="button" className="btn-icon" id="cal-next" onClick={onNextMonth}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="calendar-grid" id="calendar-grid">
        {dayNames.map((d) => (
          <div key={`header-${d}`} className="day-header">{d}</div>
        ))}
        {Array.from({ length: calendarData.firstDay }).map((_, idx) => (
          <div key={`empty-${idx}`} className="day-cell empty"></div>
        ))}
        {calendarData.dayCells.map((cell) => (
          <div
            key={`day-${cell.day}`}
            className={`day-cell ${cell.cls} ${cell.isToday ? 'today' : ''} ${cell.hasNotes ? 'has-notes' : ''}`.trim()}
            title={`${cell.done}/${cell.total}${cell.notesCount > 0 ? ` • ${cell.notesCount} note${cell.notesCount > 1 ? 's' : ''}` : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => onDayClick(cell.key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onDayClick(cell.key);
              }
            }}
          >
            <span className="day-number">{cell.day}</span>
            {cell.hasNotes ? <span className="day-note-dot" aria-hidden="true"></span> : null}
          </div>
        ))}
      </div>

      <div className="calendar-legend">
        <span className="legend-item"><span className="legend-dot full"></span> Full completion</span>
        <span className="legend-item"><span className="legend-dot partial"></span> Partial</span>
        <span className="legend-item"><span className="legend-dot none"></span> Missed</span>
      </div>
    </section>
  );
}
