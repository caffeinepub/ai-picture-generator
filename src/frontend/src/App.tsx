import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Download,
  ImageIcon,
  Loader2,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Generation } from "./backend.d";
import {
  useDeleteGeneration,
  useGetGenerations,
  useSaveGeneration,
} from "./hooks/useQueries";

const queryClient = new QueryClient();

const NAV_LINKS = ["Features", "Gallery", "About"];

const STYLES = [
  { label: "Realistic", suffix: "photorealistic, 8K, detailed" },
  { label: "Anime", suffix: "anime style, vibrant" },
  { label: "Fantasy", suffix: "fantasy art, magical, epic" },
  { label: "Watercolor", suffix: "watercolor painting, artistic" },
  { label: "Cinematic", suffix: "cinematic, movie still, dramatic lighting" },
  { label: "Cyberpunk", suffix: "cyberpunk, neon lights, futuristic" },
];

interface PendingItem {
  id: string;
  prompt: string;
  style: string;
  imageUrl: string;
}

function LogoMark() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="logo-grad"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="25%" stopColor="#3b82f6" />
          <stop offset="55%" stopColor="#8b5cf6" />
          <stop offset="80%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path
        d="M16 3L28 26H4L16 3Z"
        fill="url(#logo-grad)"
        strokeLinejoin="round"
      />
      <path d="M10 20L16 9L22 20" fill="white" opacity="0.35" />
    </svg>
  );
}

/* ─── Gallery card with overlay design ─────────────── */
function GalleryCard({
  item,
  index,
  onDelete,
}: {
  item: Generation;
  index: number;
  onDelete: (id: string) => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{
        duration: 0.38,
        delay: Math.min(index * 0.05, 0.3),
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="gallery-card aspect-square bg-muted"
      data-ocid={`gallery.item.${index + 1}`}
    >
      {/* Skeleton while loading */}
      {!imgLoaded && <div className="absolute inset-0 animate-shimmer" />}

      {/* Image */}
      <img
        src={item.imageUrl}
        alt={item.prompt}
        className={`gallery-card-img transition-opacity duration-500 ${
          imgLoaded ? "opacity-100" : "opacity-0"
        }`}
        style={{ height: "100%" }}
        onLoad={() => setImgLoaded(true)}
      />

      {/* Hover overlay gradient */}
      <div className="gallery-card-overlay" aria-hidden="true" />

      {/* Action buttons — top right */}
      <div className="gallery-card-actions">
        <a
          href={item.imageUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          data-ocid={`gallery.download_button.${index + 1}`}
          className="gallery-action-btn"
          title="Download"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="w-3.5 h-3.5" />
        </a>
        <button
          type="button"
          data-ocid={`gallery.delete_button.${index + 1}`}
          onClick={() => onDelete(item.id)}
          className="gallery-action-btn delete"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Slide-up metadata */}
      <div className="gallery-card-meta">
        <p
          className="text-white text-xs font-semibold truncate leading-tight mb-1.5"
          title={item.prompt}
        >
          {item.prompt}
        </p>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: "oklch(0.53 0.23 264 / 0.80)",
              color: "white",
              backdropFilter: "blur(6px)",
            }}
          >
            {item.style}
          </span>
          <span className="text-[10px] text-white/60 font-medium">4K</span>
        </div>
      </div>
    </motion.div>
  );
}

function LoadingCard() {
  return (
    <div
      className="gallery-card aspect-square bg-muted relative"
      data-ocid="gallery.loading_state"
    >
      <div className="absolute inset-0 animate-shimmer" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "oklch(0.53 0.23 264 / 0.12)" }}
        >
          <Loader2
            className="w-5 h-5 animate-spin"
            style={{ color: "oklch(0.53 0.23 264)" }}
          />
        </div>
        <p className="text-xs font-medium text-muted-foreground">Generating…</p>
      </div>
    </div>
  );
}

function AppContent() {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("Realistic");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);

  const { data: generations = [] } = useGetGenerations();
  const saveGeneration = useSaveGeneration();
  const deleteGeneration = useDeleteGeneration();

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    const style = STYLES.find((s) => s.label === selectedStyle);
    const styleSuffix = style?.suffix ?? "";
    const fullPrompt = `${prompt.trim()}, ${styleSuffix}`;
    const seed = Math.floor(Math.random() * 999999);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=768&height=768&nologo=true&seed=${seed}&model=flux`;
    const pendingId = `pending-${Date.now()}`;
    setIsGenerating(true);
    setPendingItems((prev) => [
      ...prev,
      { id: pendingId, prompt: prompt.trim(), style: selectedStyle, imageUrl },
    ]);

    const img = new Image();
    img.src = imageUrl;
    img.onload = async () => {
      try {
        await saveGeneration.mutateAsync({
          prompt: prompt.trim(),
          style: selectedStyle,
          imageUrl,
        });
        toast.success("Image generated and saved!");
      } catch {
        toast.error("Generated but failed to save to gallery.");
      } finally {
        setPendingItems((prev) => prev.filter((p) => p.id !== pendingId));
        setIsGenerating(false);
        setPrompt("");
      }
    };
    img.onerror = () => {
      toast.error("Image generation failed. Please try again.");
      setPendingItems((prev) => prev.filter((p) => p.id !== pendingId));
      setIsGenerating(false);
    };
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGeneration.mutateAsync(id);
      toast.success("Image deleted.");
    } catch {
      toast.error("Failed to delete image.");
    }
  };

  const allItems = [...generations.map((g) => ({ ...g, isPending: false }))];
  const hasPending = pendingItems.length > 0;
  const isEmpty = allItems.length === 0 && !hasPending;

  const year = new Date().getFullYear();
  const hostname = encodeURIComponent(window.location.hostname);

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Header ─────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 border-b border-border"
        style={{
          background: "oklch(1 0 0 / 0.80)",
          backdropFilter: "blur(16px) saturate(160%)",
          WebkitBackdropFilter: "blur(16px) saturate(160%)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <LogoMark />
            <span className="font-display font-bold text-lg tracking-tight text-foreground">
              Picture<span className="logo-gradient">AI</span>
            </span>
          </div>

          <nav
            className="hidden md:flex items-center gap-6"
            aria-label="Main navigation"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                data-ocid={`nav.${link.toLowerCase()}.link`}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              data-ocid="nav.login.link"
              className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Login
            </button>
            <Button
              data-ocid="nav.signup.primary_button"
              className="text-sm font-semibold px-5 rounded-full btn-primary-glow"
              style={{
                background: "oklch(var(--primary))",
                color: "oklch(var(--primary-foreground))",
              }}
            >
              Sign Up Free
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* ─── Hero ──────────────────────────────────── */}
        <section
          id="features"
          className="relative overflow-hidden py-20 md:py-28 px-4 sm:px-6"
        >
          {/* Mesh gradient orbs */}
          <div
            className="hero-orb-cyan"
            style={{ top: "-80px", left: "calc(50% - 500px)" }}
          />
          <div
            className="hero-orb-violet"
            style={{ top: "40px", right: "calc(50% - 460px)" }}
          />
          <div
            className="hero-orb-pink"
            style={{ bottom: "0px", left: "calc(50% - 180px)" }}
          />

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: -24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-7"
                style={{
                  background: "oklch(0.94 0.05 265 / 0.8)",
                  border: "1px solid oklch(0.72 0.16 264 / 0.5)",
                  color: "oklch(0.45 0.20 264)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Powered by Flux AI Model
              </div>

              {/* H1 */}
              <h1 className="font-display font-extrabold text-[42px] md:text-[56px] lg:text-[64px] tracking-tight leading-[1.05] text-foreground mb-5">
                Generate Stunning{"\u00A0"}
                <span className="logo-gradient">AI Art</span>
                <br />
                <span style={{ color: "oklch(0.25 0.020 255)" }}>
                  Instantly
                </span>
              </h1>

              <p
                className="text-base md:text-lg text-muted-foreground max-w-lg mx-auto mb-12"
                style={{ lineHeight: 1.7 }}
              >
                Type any idea, pick a style, and watch our AI transform your
                imagination into breathtaking artwork in seconds.
              </p>
            </motion.div>

            {/* ── Generator glass panel ─────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.18,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="glass-panel rounded-2xl p-5 md:p-6 mb-3"
            >
              {/* Prompt row */}
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <Textarea
                  data-ocid="generator.prompt.textarea"
                  placeholder="A majestic dragon soaring over a neon-lit cityscape at dusk…"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                      handleGenerate();
                  }}
                  rows={3}
                  className="flex-1 resize-none rounded-xl border bg-white/70 text-foreground placeholder:text-muted-foreground text-sm focus-visible:ring-primary"
                  style={{ borderColor: "oklch(0.88 0.015 245)" }}
                />
                <Button
                  data-ocid="generator.generate.primary_button"
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="sm:self-stretch sm:min-w-[152px] rounded-xl text-sm font-semibold btn-primary-glow flex items-center justify-center gap-2"
                  style={{
                    background: "oklch(var(--primary))",
                    color: "oklch(var(--primary-foreground))",
                  }}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Generating…
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" /> Generate Image
                    </>
                  )}
                </Button>
              </div>

              {/* Style pills */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">
                  Style Presets
                </p>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      data-ocid={`generator.style.${s.label.toLowerCase()}.toggle`}
                      onClick={() => setSelectedStyle(s.label)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all"
                      style={{
                        background:
                          selectedStyle === s.label
                            ? "oklch(var(--pill-selected-bg))"
                            : "oklch(1 0 0 / 0.7)",
                        borderColor:
                          selectedStyle === s.label
                            ? "oklch(var(--pill-selected-border))"
                            : "oklch(0.88 0.012 245)",
                        color:
                          selectedStyle === s.label
                            ? "oklch(var(--brand-blue))"
                            : "oklch(var(--muted-foreground))",
                        boxShadow:
                          selectedStyle === s.label
                            ? "0 0 0 3px oklch(0.72 0.16 264 / 0.18)"
                            : "none",
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold border border-dashed transition-colors hover:bg-muted/50"
                    style={{
                      borderColor: "oklch(0.80 0.015 245)",
                      color: "oklch(0.60 0.015 245)",
                      background: "transparent",
                    }}
                  >
                    More Styles…
                  </button>
                </div>
              </div>
            </motion.div>

            <p className="text-[11px] text-muted-foreground/70">
              Press{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono border border-border">
                Ctrl
              </kbd>
              {" + "}
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono border border-border">
                Enter
              </kbd>
              {" to generate quickly"}
            </p>
          </div>
        </section>

        {/* ─── Gallery ───────────────────────────────── */}
        <section id="gallery" className="py-14 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-10"
            >
              <h2 className="font-display font-bold text-2xl md:text-[32px] text-foreground mb-2 tracking-tight">
                Your Recent Masterpieces
              </h2>
              <p className="text-sm text-muted-foreground">
                All your AI-generated artwork — saved and ready to download.
              </p>
            </motion.div>

            {isEmpty && !hasPending ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24 rounded-2xl border-2 border-dashed"
                style={{ borderColor: "oklch(0.87 0.012 245)" }}
                data-ocid="gallery.empty_state"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "oklch(0.94 0.05 265 / 0.6)" }}
                >
                  <ImageIcon
                    className="w-7 h-7"
                    style={{ color: "oklch(0.53 0.23 264)" }}
                  />
                </div>
                <p className="text-base font-semibold text-foreground mb-1">
                  No images yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Your generated images will appear here
                </p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                <AnimatePresence mode="popLayout">
                  {pendingItems.map(() => (
                    <LoadingCard key="loading" />
                  ))}
                  {allItems.map((item, i) => (
                    <GalleryCard
                      key={item.id}
                      item={item}
                      index={i}
                      onDelete={handleDelete}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </section>

        {/* ─── CTA ───────────────────────────────────── */}
        <section id="about" className="py-16 px-4 sm:px-6">
          <div className="max-w-xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="cta-card"
            >
              <div className="cta-card-inner text-center">
                {/* Interior orb */}
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: "-60px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "320px",
                    height: "200px",
                    borderRadius: "50%",
                    background:
                      "radial-gradient(ellipse, oklch(0.72 0.16 264 / 0.16) 0%, transparent 70%)",
                    filter: "blur(30px)",
                    pointerEvents: "none",
                  }}
                />
                <div className="relative z-10">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.65 0.20 264), oklch(0.60 0.22 300))",
                      boxShadow: "0 4px 16px oklch(0.53 0.23 264 / 0.35)",
                    }}
                  >
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-display font-extrabold text-2xl md:text-3xl text-foreground mb-3 tracking-tight">
                    Start Creating Today
                  </h2>
                  <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                    Join thousands of creators generating stunning AI artwork
                    every day. No credit card required.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      data-ocid="cta.how_it_works.secondary_button"
                      className="w-full sm:w-auto rounded-xl border font-semibold"
                      style={{
                        borderColor: "oklch(0.85 0.015 245)",
                        color: "oklch(0.35 0.02 255)",
                      }}
                    >
                      How it Works
                    </Button>
                    <Button
                      data-ocid="cta.signup.primary_button"
                      className="w-full sm:w-auto rounded-xl font-semibold btn-primary-glow"
                      style={{
                        background: "oklch(var(--primary))",
                        color: "oklch(var(--primary-foreground))",
                      }}
                    >
                      Sign Up Free →
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─────────────────────────────────── */}
      <footer
        className="border-t"
        style={{
          borderColor: "oklch(0.91 0.012 245)",
          background: "oklch(0.985 0.004 240)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-5">
                <LogoMark />
                <span className="font-display font-bold text-base text-foreground">
                  Picture<span className="logo-gradient">AI</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-4 mb-4">
                {["About", "Terms", "Privacy", "API", "Support"].map((link) => (
                  <a
                    key={link}
                    href="/"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link}
                  </a>
                ))}
              </div>
              <div className="flex gap-3">
                {["Twitter", "GitHub", "Discord"].map((s) => (
                  <a
                    key={s}
                    href="/"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {s}
                  </a>
                ))}
              </div>
            </div>

            <div className="flex-shrink-0">
              <p className="text-sm font-semibold text-foreground mb-3">
                Newsletter Sign up
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="you@example.com"
                  data-ocid="footer.newsletter.input"
                  className="px-3 py-2 rounded-lg border bg-white text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 w-52"
                  style={{
                    borderColor: "oklch(0.88 0.012 245)",
                    // @ts-ignore
                    "--tw-ring-color": "oklch(0.53 0.23 264 / 0.30)",
                  }}
                />
                <Button
                  data-ocid="footer.newsletter.submit_button"
                  className="rounded-lg text-sm font-semibold btn-primary-glow"
                  style={{
                    background: "oklch(var(--primary))",
                    color: "oklch(var(--primary-foreground))",
                  }}
                >
                  Sign up
                </Button>
              </div>
            </div>
          </div>

          <div
            className="border-t pt-6 text-center"
            style={{ borderColor: "oklch(0.91 0.012 245)" }}
          >
            <p className="text-xs text-muted-foreground">
              © {year}. Built with ❤️ using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${hostname}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground underline underline-offset-2 transition-colors"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </div>
      </footer>

      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
