export default function Toast({ text, visible, showing }) {
  const className = `toast${visible ? '' : ' hidden'}${showing ? ' show' : ''}`;

  return (
    <div id="motivation-toast" className={className}>
      <span className="toast-icon">🎉</span>
      <span className="toast-text">{text}</span>
    </div>
  );
}
