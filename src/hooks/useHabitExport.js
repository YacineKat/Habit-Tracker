import { downloadBlob, exportCsvBlob, exportJsonBlob } from '../utils/habitExport';

export default function useHabitExport({
  habits,
  dayNotes,
  todayKey,
  setShowExportModal,
  calculateStreak,
  getCompletedDays,
  getCommitmentPercent,
}) {
  const handleExportJson = () => {
    downloadBlob(exportJsonBlob(habits, dayNotes), `habit-tracker-${todayKey}.json`);
    setShowExportModal(false);
  };

  const handleExportCsv = () => {
    downloadBlob(
      exportCsvBlob(habits, {
        calculateStreak,
        getCompletedDays,
        getCommitmentPercent,
      }),
      `habit-tracker-${todayKey}.csv`,
    );
    setShowExportModal(false);
  };

  return {
    handleExportJson,
    handleExportCsv,
  };
}
