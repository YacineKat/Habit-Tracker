export default function EditModal({ visible, value, onValueChange, onSave, onClose }) {
  return (
    <div
      className={`modal-overlay${visible ? '' : ' hidden'}`}
      id="edit-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <h3>Edit Habit</h3>
        <input
          type="text"
          id="edit-input"
          maxLength={60}
          autoComplete="off"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave();
            if (e.key === 'Escape') onClose();
          }}
        />
        <div className="modal-actions">
          <button type="button" className="btn-primary" id="edit-save" onClick={onSave}>Save</button>
          <button type="button" className="btn-ghost" id="edit-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
