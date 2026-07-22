// Animated versions of the menu header contact chips. Each loops a small motion
// and is disabled under prefers-reduced-motion (see globals.css).

export function AvailableIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden focusable="false">
      <circle
        className="avl-ring"
        cx="12"
        cy="12"
        r="9"
        pathLength={100}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="100"
        strokeLinecap="round"
        transform="rotate(-90 12 12)"
      />
      <path
        className="avl-check"
        d="M8 12.4l2.5 2.5 5-5.2"
        pathLength={14}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PhoneSignalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden focusable="false">
      {/* signal ripples broadcasting from the handset */}
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path className="sig-wave" style={{ animationDelay: "0s" }} d="M11 9a3 3 0 0 1 3 3" />
        <path className="sig-wave" style={{ animationDelay: "0.3s" }} d="M11 6.5a5.5 5.5 0 0 1 5.5 5.5" />
        <path className="sig-wave" style={{ animationDelay: "0.6s" }} d="M11 4a8 8 0 0 1 8 8" />
      </g>
      {/* handset */}
      <path
        d="M5 13a10 10 0 0 0 6 6l1.2-1.2a1.3 1.3 0 0 1 1.4-.3 8 8 0 0 0 1.8.45 1.3 1.3 0 0 1 1.1 1.3v1.9a1.3 1.3 0 0 1-1.4 1.3A14 14 0 0 1 4.7 7.4 1.3 1.3 0 0 1 6 6h1.9A1.3 1.3 0 0 1 9.2 7.1a8 8 0 0 0 .45 1.8 1.3 1.3 0 0 1-.3 1.4z"
        fill="currentColor"
        opacity="0.16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WhatsappSendIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path d="M3.8 20.2 5 16.7a7.5 7.5 0 1 1 2.5 2.3z" />
      <path d="M8.7 9.3c.2-.4.4-.4.6-.4h.4c.2 0 .4 0 .5.3l.6 1.4c.1.2 0 .4-.1.6l-.4.4c-.1.2-.2.3 0 .6.4.8 1.1 1.4 2 1.9.2.1.4.1.6 0l.5-.6c.2-.2.3-.2.6-.1l1.4.6c.2.1.3.2.3.5v.4c0 .3-.2.7-.5.9-.4.2-1 .4-1.6.3-3-.4-5.6-2.8-6.2-5.6-.1-.5 0-1 .3-1.3z" />
      {/* the message being sent */}
      <path className="msg-fly" d="M15 4l4.5 2-4.5 2 1-2z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LocationPinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden focusable="false">
      {/* ground ping where the pin lands */}
      <ellipse className="pin-ping" cx="12" cy="21" rx="3.4" ry="1.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      {/* the pin dropping in */}
      <g className="pin-drop">
        <path
          d="M12 2a6 6 0 0 0-6 6c0 4.2 6 11 6 11s6-6.8 6-11a6 6 0 0 0-6-6z"
          fill="currentColor"
          opacity="0.16"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="8" r="2.2" fill="currentColor" />
      </g>
    </svg>
  );
}
