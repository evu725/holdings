type MicButtonProps = {
  listening: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export default function MicButton({ listening, disabled, onClick }: MicButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={listening ? "Stop listening" : "Start talking"}
      aria-pressed={listening}
      className="relative grid size-[clamp(5.5rem,min(30vw,19vh),12rem)] place-items-center rounded-full bg-mic text-ink transition-transform hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink"
    >
      {listening && (
        <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-mic/30" />
      )}
      {listening ? (
        <span aria-hidden className="relative size-[32%] rounded-md bg-ink" />
      ) : (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="relative size-[42%]"
        >
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <path d="M12 18v3" />
        </svg>
      )}
    </button>
  );
}
