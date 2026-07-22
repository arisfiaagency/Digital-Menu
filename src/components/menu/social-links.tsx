import type { ComponentType, SVGProps } from "react";
import { FacebookIcon, InstagramIcon, SnapchatIcon, TiktokIcon } from "@/components/icons/social-icons";
import { cn } from "@/lib/utils/cn";

// Visual variant for the social buttons. (Self-contained here now that the old
// AppearanceSettings model was removed.)
export type SocialLinkStyle = "icons" | "soft" | "outline" | "square";

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
export function SocialLinks({ social, className, style = "icons" }: { social?: SocialLinksData; className?: string; style?: SocialLinkStyle }) {
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
            socialLinkClass(style),
            anim
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {style !== "icons" ? <span className="text-xs font-semibold">{label}</span> : null}
        </a>
      ))}
    </div>
  );
}

function socialLinkClass(style: SocialLinkStyle) {
  if (style === "soft") {
    return "focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-full bg-primary/10 px-3 text-primary transition-colors hover:bg-primary/15";
  }
  if (style === "outline") {
    return "focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-full border border-primary/30 bg-card px-3 text-primary transition-colors hover:bg-primary/10";
  }
  if (style === "square") {
    return "focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-card px-3 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary";
  }
  return "focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary";
}
