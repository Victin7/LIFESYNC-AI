import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import logoImg from "@/assets/logo.png";

type Size = "mobile" | "navbar" | "sidebar" | "login" | "hero";

// Exact pixel sizes per design spec
const sizeMap: Record<Size, { img: string; text: string; gap: string }> = {
  mobile:  { img: "h-[40px] w-[40px]",   text: "text-[20px]", gap: "gap-2" },
  navbar:  { img: "h-[44px] w-[44px]",   text: "text-[22px]", gap: "gap-3" },
  sidebar: { img: "h-[52px] w-[52px]",   text: "text-[26px]", gap: "gap-3" },
  login:   { img: "h-[160px] w-[160px]", text: "text-[52px]", gap: "gap-5" },
  hero:    { img: "h-[140px] w-[140px] md:h-[180px] md:w-[180px]", text: "text-[44px] md:text-[64px]", gap: "gap-6" },
};

export function Logo({
  to = "/",
  compact = false,
  size = "navbar",
  animated = false,
  glow = true,
}: {
  to?: string;
  compact?: boolean;
  size?: Size;
  animated?: boolean;
  glow?: boolean;
}) {
  const s = sizeMap[size];
  const Img = animated ? motion.img : "img";
  const animProps = animated
    ? { animate: { y: [0, -6, 0] }, transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } }
    : {};

  return (
    <Link to={to} className={`flex items-center ${s.gap} group relative`}>
      {glow && (
        <span
          aria-hidden
          className="absolute -inset-2 rounded-full blur-2xl opacity-60 group-hover:opacity-90 transition-opacity pointer-events-none"
          style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--primary) 45%, transparent), transparent 70%)" }}
        />
      )}
      <Img
        src={logoImg}
        alt="LifeSync AI"
        className={`relative ${s.img} object-contain drop-shadow-[0_0_18px_color-mix(in_oklab,var(--primary)_60%,transparent)] transition-transform duration-300 group-hover:scale-110`}
        {...(animProps as any)}
      />
      {!compact && (
        <span className={`relative font-bold tracking-tight text-foreground ${s.text}`}>
          LifeSync<span className="text-primary"> AI</span>
        </span>
      )}
    </Link>
  );
}
