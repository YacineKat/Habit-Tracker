export default function DeleteModal({ visible, deletingHabit, onConfirm, onClose }) {
  return (
    <div
      className={`modal-overlay${visible ? '' : ' hidden'}`}
      id="delete-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <h3>Delete Habit</h3>
        <p id="delete-msg">
          {deletingHabit
            ? `Are you sure you want to delete "${deletingHabit.name}"?`
            : 'Are you sure you want to delete this habit?'}
        </p>
        <div className="modal-actions">
          <button type="button" className="btn-danger" id="delete-confirm" onClick={onConfirm}>Delete</button>
          <button type="button" className="btn-ghost" id="delete-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
