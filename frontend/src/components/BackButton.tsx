import { useNavigate } from 'react-router-dom';

export default function BackButton({ fallback = '/' }: { fallback?: string }) {
  const navigate = useNavigate();

  function handleClick() {
    // history.state.idx is set by react-router's browser history; if this
    // page was opened directly (no local history to go back to), fall back
    // to a known route instead of leaving the app.
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  }

  return (
    <button type="button" className="back-button" onClick={handleClick}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M10 3L5 8L10 13"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Back
    </button>
  );
}
