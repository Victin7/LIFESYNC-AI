import { motion } from "framer-motion";
import logoImg from "@/assets/logo.png";

export function LoadingScreen({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute inset-0 bg-hero" />

      {/* particles */}
      {[...Array(12)].map((_, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute rounded-full bg-primary/60 blur-[1px]"
          style={{
            width: 3 + (i % 3),
            height: 3 + (i % 3),
            left: `${10 + i * 7}%`,
            top: `${20 + (i * 9) % 60}%`,
          }}
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.9, 0.2] }}
          transition={{ duration: 3 + (i % 4), repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
        />
      ))}

      {/* glow halo */}
      <motion.div
        aria-hidden
        className="absolute w-[520px] h-[520px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--primary) 55%, transparent), transparent 70%)" }}
        animate={{ scale: [1, 1.18, 1], opacity: [0.55, 0.95, 0.55] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative flex flex-col items-center gap-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative"
        >
          <motion.img
            src={logoImg}
            alt="LifeSync AI"
            className="w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-[0_0_40px_color-mix(in_oklab,var(--primary)_75%,transparent)]"
            animate={{ y: [0, -8, 0], rotate: [0, 2, -2, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute rounded-full border-2 border-primary/40 border-t-primary"
            style={{ width: 176, height: 176, left: -16, top: -16 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>

        <div className="text-center">
          <div className="font-bold text-2xl tracking-tight">
            LifeSync<span className="text-primary"> AI</span>
          </div>
          <div className="text-sm text-muted-foreground mt-2">{label}</div>
        </div>

        <div className="w-56 h-1 rounded-full bg-card overflow-hidden border border-border">
          <motion.div
            className="h-full bg-primary-grad"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: "60%" }}
          />
        </div>
      </div>
    </div>
  );
}
