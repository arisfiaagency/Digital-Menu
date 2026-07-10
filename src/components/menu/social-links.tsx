import type { ComponentType, SVGProps } from "react";
import { FacebookIcon, InstagramIcon, SnapchatIcon, TiktokIcon } from "@/components/icons/social-icons";
import { cn } from "@/lib/utils/cn";

type SocialLinksData = {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  snapchat?: string;
};

const SOCIALS: { key: keyof SocialLinksData; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; anim: string }[] = [
  { key: "instagram", label: "Instagram", Icon: InstagramIcon, anim: "social-anim-instagram" },
  { key: "facebook", label: "Facebook", Icon: FacebookIcon, anim: "social-anim-facebook" },
  { key: "tiktok", label: "TikTok", Icon: TiktokIcon, anim: "social-anim-tiktok" },
  { key: "snapchat", label: "Snapchat", Icon: SnapchatIcon, anim: "social-anim-snapchat" }
];

// Accept either a full URL or a bare handle/domain and always return a valid URL.
function toHref(value: string) {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// Compact icon-only social buttons for each configured link. Renders nothing when
// no socials are set, so it's safe to drop in anywhere. Pinned LTR so the icon
// order stays consistent in RTL languages.
export function SocialLinks({ social, className }: { social?: SocialLinksData; className?: string }) {
  const items = SOCIALS.filter(({ key }) => social?.[key]?.trim());
  if (!items.length) return null;

  return (
    <div dir="ltr" className={cn("flex flex-wrap items-center gap-2", className)}>
      {items.map(({ key, label, Icon, anim }) => (
        <a
          key={key}
          href={toHref(social![key]!)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className={cn(
            "focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
            anim
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </a>
      ))}
    </div>
  );
}
