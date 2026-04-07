export default function ExportModal({ visible, onClose, onExportJson, onExportCsv }) {
  return (
    <div
      className={`modal-overlay${visible ? '' : ' hidden'}`}
      id="export-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <h3>Export Data</h3>
        <p>Choose an export format:</p>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" id="export-json" onClick={onExportJson}>JSON</button>
          <button type="button" className="btn-secondary" id="export-csv" onClick={onExportCsv}>CSV</button>
          <button type="button" className="btn-ghost" id="export-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
