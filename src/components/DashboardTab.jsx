export default function DashboardTab({
  active,
  dashSummary,
  ringStats,
  ringCanvasRef,
  lineCanvasRef,
  barCanvasRef,
  barWrapperRef,
}) {
  return (
    <section id="tab-dashboard" className={`tab-content${active ? ' active' : ''}`}>
      <div className="dash-summary">
        <div className="dash-summary-card">
          <div className="dash-summary-icon blue">📈</div>
          <div>
            <div className="dash-summary-value" id="dash-avg-rate">{dashSummary.avgRate}%</div>
            <div className="dash-summary-label">Avg. Completion (14d)</div>
          </div>
        </div>
        <div className="dash-summary-card">
          <div className="dash-summary-icon green">🏆</div>
          <div>
            <div className="dash-summary-value" id="dash-perfect-days">{dashSummary.perfectDays}</div>
            <div className="dash-summary-label">Perfect Days (14d)</div>
          </div>
        </div>
        <div className="dash-summary-card">
          <div className="dash-summary-icon amber">⚡</div>
          <div>
            <div className="dash-summary-value" id="dash-total-checks">{dashSummary.totalChecks}</div>
            <div className="dash-summary-label">Total Check-ins</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="chart-card ring-card">
          <h3>Today's Progress</h3>
          <div className="ring-container">
            <canvas id="ring-chart" width="200" height="200" ref={ringCanvasRef}></canvas>
            <div className="ring-center">
              <span className="ring-value" id="ring-value">{ringStats.percent}%</span>
              <span className="ring-label">Completed</span>
            </div>
          </div>
          <div className="ring-detail" id="ring-detail">{ringStats.done} / {ringStats.total} habits</div>
        </div>

        <div className="chart-card line-card">
          <h3>Daily Progress <small>Last 14 days</small></h3>
          <div className="chart-wrapper">
            <canvas id="line-chart" ref={lineCanvasRef}></canvas>
          </div>
        </div>

        <div className="chart-card bar-card">
          <h3>Habit Commitment Ranking</h3>
          <div className="chart-wrapper bar-wrapper" ref={barWrapperRef}>
            <canvas id="bar-chart" ref={barCanvasRef}></canvas>
          </div>
        </div>
      </div>
    </section>
  );
}
