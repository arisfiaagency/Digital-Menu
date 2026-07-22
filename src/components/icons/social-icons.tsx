import type { SVGProps } from "react";

// Simple, recognizable brand marks (lucide dropped TikTok/Snapchat), drawn to
// match the existing whatsapp-icon. They use currentColor so they inherit the
// button's text color.

export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.25-1.46 1.55-1.46H17V4.66c-.28-.04-1.25-.12-2.38-.12-2.36 0-3.97 1.44-3.97 4.08v2.28H8v3.1h2.65V22z" />
    </svg>
  );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TiktokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.5 3c.32 2.06 1.62 3.52 3.5 3.78v2.2c-1.27.04-2.5-.36-3.5-1.05v6.27a5.25 5.25 0 1 1-5.25-5.25c.3 0 .6.03.88.08v2.42a2.83 2.83 0 1 0 1.97 2.7V3z" />
    </svg>
  );
}

export function SnapchatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.2c2.45 0 4.13 1.86 4.24 4.3.03.6 0 1.2-.06 1.74.22.12.5.18.78.18.55 0 .85-.32 1.27-.32.42 0 .8.3.8.72 0 .9-1.55 1.02-1.55 1.62 0 .5 1.27 1.6 2.56 2 .3.1.5.3.5.6 0 .72-1.9.98-2.2 1.32-.18.2.08.9-.5 1.1-.5.2-1.3-.2-2.1.08-.72.24-1.3 1.3-3 1.3s-2.28-1.06-3-1.3c-.8-.28-1.6.12-2.1-.08-.58-.2-.32-.9-.5-1.1-.3-.34-2.2-.6-2.2-1.32 0-.3.2-.5.5-.6 1.3-.4 2.56-1.5 2.56-2 0-.6-1.55-.72-1.55-1.62 0-.42.38-.72.8-.72.42 0 .72.32 1.27.32.28 0 .56-.06.78-.18-.06-.54-.09-1.14-.06-1.74C7.87 4.06 9.55 2.2 12 2.2z" />
    </svg>
  );
}
