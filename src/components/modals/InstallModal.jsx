export default function InstallModal({ visible, onInstall, onClose }) {
  return (
    <div
      className={`modal-overlay${visible ? '' : ' hidden'}`}
      id="install-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal install-modal">
        <div className="install-header">
          <div className="install-icon">🚀</div>
          <h3>Nebula Tracker</h3>
        </div>
        <p>For a better experience, we recommend downloading the app</p>
        <div className="modal-actions">
          <button type="button" className="btn-primary" id="install-btn" onClick={onInstall}>Download</button>
          <button type="button" className="btn-ghost" id="install-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
