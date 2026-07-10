import type { SVGProps } from "react";

export function WhatsappIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4.8 19.2 6 15.7a8 8 0 1 1 2.7 2.5z" />
      <path d="M9.2 8.9c.2-.5.4-.5.7-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.3 0 .5-.2.7l-.4.5c-.2.2-.2.4 0 .7.5.9 1.3 1.7 2.3 2.2.3.2.5.2.7 0l.6-.7c.2-.2.4-.3.7-.2l1.6.7c.3.1.4.3.4.6v.4c0 .4-.2.8-.6 1-.5.3-1.2.5-1.9.4-3.4-.4-6.6-3.2-7.2-6.6-.1-.6.1-1.1.4-1.5.1-.2.2-.4.5-.5z" />
    </svg>
  );
}
