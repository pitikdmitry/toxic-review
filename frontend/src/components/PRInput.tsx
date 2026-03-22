"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createReview } from "@/lib/api";
import { Loader2, ArrowRight } from "lucide-react";

function PersonaAvatar({ initials, image, selected }: { initials: string; image: string; selected: boolean }) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold ${
        selected ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
      }`}>
        {initials}
      </div>
    );
  }

  return (
    <div className="w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-[var(--bg-tertiary)] border-2 border-[var(--border-primary)]">
      <Image
        src={image}
        alt={initials}
        width={40}
        height={40}
        className="pixel-art w-full h-full object-cover"
        unoptimized
        onError={() => setImgError(true)}
      />
    </div>
  );
}

const CRINGE_LABELS = [
  { label: "Sassy", emoji: "😏", desc: "Polite with zingers" },
  { label: "Passive-Aggressive", emoji: "🙂", desc: "Weaponized politeness" },
  { label: "Toxic", emoji: "💀", desc: "Reddit energy" },
  { label: "Roast", emoji: "🔥", desc: "Stand-up comedy" },
  { label: "Unhinged", emoji: "🤯", desc: "Full meltdown" },
];

const PERSONA_OPTIONS = [
  { id: "gordon_ramsay", label: "Gordon Ramsay", initials: "GR", desc: "IT'S RAW!", image: "/personas/gordon_ramsay/neutral.png" },
  { id: "disappointed_dad", label: "Disappointed Dad", initials: "DD", desc: "I'm not angry...", image: "/personas/disappointed_dad/neutral.png" },
  { id: "elon_musk", label: "Elon Musk", initials: "EM", desc: "First principles", image: "/personas/elon_musk/neutral.png" },
];

export function PRInput() {
  const [url, setUrl] = useState("");
  const [cringeLevel, setCringeLevel] = useState(3);
  const [persona, setPersona] = useState("default");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError("");
    try {
      const review = await createReview(url.trim(), cringeLevel, persona);
      router.push(`/reviews/${review.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const current = CRINGE_LABELS[cringeLevel - 1];

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="flex gap-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-1.5 shadow-sm focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent-glow)] transition-all">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a GitHub PR URL..."
          disabled={loading}
          className="flex-1 bg-transparent px-3 py-2.5 text-sm placeholder:text-[var(--text-tertiary)] focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-all"
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <ArrowRight size={15} />
          )}
          {loading ? "Analyzing..." : "Review"}
        </button>
      </div>

      {/* Cringe Level Slider */}
      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Cringe Level
          </span>
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <span className="text-lg">{current.emoji}</span>
            <span className="text-[var(--text-primary)]">{current.label}</span>
            <span className="text-xs font-normal text-[var(--text-tertiary)]">
              &mdash; {current.desc}
            </span>
          </span>
        </div>

        <div className="relative">
          {/* Track background */}
          <div className="absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2 rounded-full bg-[var(--bg-tertiary)]" />
          {/* Filled track */}
          <div
            className="absolute top-1/2 left-0 h-2 -translate-y-1/2 rounded-full transition-all duration-200"
            style={{
              width: `${((cringeLevel - 1) / 4) * 100}%`,
              background: `linear-gradient(90deg, var(--accent) 0%, ${cringeLevel >= 4 ? "var(--orange)" : "var(--accent-hover)"} 100%)`,
            }}
          />
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={cringeLevel}
            onChange={(e) => setCringeLevel(Number(e.target.value))}
            disabled={loading}
            className="cringe-slider relative z-10 w-full appearance-none bg-transparent cursor-pointer disabled:opacity-60"
          />
        </div>

        {/* Step labels */}
        <div className="flex justify-between mt-1.5 px-0.5">
          {CRINGE_LABELS.map((l, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCringeLevel(i + 1)}
              disabled={loading}
              className={`text-[10px] transition-colors disabled:opacity-60 ${
                cringeLevel === i + 1
                  ? "text-[var(--accent)] font-semibold"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {l.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Persona Selector */}
      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] px-5 py-4">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-3 block text-left">
          Reviewer Persona
        </span>
        <div className="flex gap-2">
          {PERSONA_OPTIONS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPersona(persona === p.id ? "default" : p.id)}
              disabled={loading}
              className={`flex flex-1 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all duration-200 disabled:opacity-60 ${
                persona === p.id
                  ? "border border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:border-[var(--border-secondary)]"
              }`}
            >
              <PersonaAvatar initials={p.initials} image={p.image} selected={persona === p.id} />
              <div className="min-w-0">
                <div className={`text-sm font-medium leading-snug whitespace-nowrap ${persona === p.id ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>
                  {p.label}
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)] whitespace-nowrap">{p.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  );
}
