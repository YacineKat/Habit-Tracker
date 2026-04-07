export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportJsonBlob(habits, dayNotes = {}) {
  return new Blob([JSON.stringify({
    schemaVersion: 1,
    habits,
    dayNotes,
  }, null, 2)], { type: 'application/json' });
}

function escapeCsvCell(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportCsvBlob(habits, metrics) {
  const { calculateStreak, getCompletedDays, getCommitmentPercent } = metrics;
  const allDates = new Set();

  habits.forEach((habit) => {
    Object.keys(habit.history || {}).forEach((key) => allDates.add(key));
  });

  const dates = [...allDates].sort();
  const rows = [];
  rows.push(['Habit', ...dates, 'Days Completed', 'Commitment %', 'Streak'].join(','));

  habits.forEach((habit) => {
    const checks = dates.map((day) => (habit.history?.[day] ? '1' : '0'));
    rows.push([
      escapeCsvCell(habit.name),
      ...checks,
      String(getCompletedDays(habit)),
      `${getCommitmentPercent(habit)}%`,
      String(calculateStreak(habit)),
    ].join(','));
  });

  return new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
}
