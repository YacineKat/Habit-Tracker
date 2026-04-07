const TAB_LABELS = {
  habits: 'Habits',
  dashboard: 'Dashboard',
  calendar: 'Calendar',
};

export default function AppHeader({ tabs, activeTab, onTabChange, onExportClick, todayDateText }) {
  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="logo">
            <span className="logo-icon">🎯</span>
            Nebula Tracker
          </h1>
          <span className="date-badge" id="today-date">{todayDateText}</span>
        </div>
        <div className="header-right">
          <nav className="tab-nav">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`tab-btn${activeTab === tab ? ' active' : ''}`}
                data-tab={tab}
                onClick={() => onTabChange(tab)}
              >
                {TAB_LABELS[tab] || tab}
              </button>
            ))}
          </nav>
          <button type="button" className="btn-icon" id="btn-export" title="Export Data" onClick={onExportClick}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
