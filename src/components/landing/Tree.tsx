import { useState } from "react";
import type React from "react";
import { ChevronDown, Plus } from "lucide-react";

/* Tree layout (Elena 5 Nov 2026) - the same shape as aideazz.xyz/sop-ai-ops.html:
   menu groups -> section (heading always visible) -> part (tag . name . count) -> items (one open at a time).
   Native <details>: folded text stays in the page for Google and AI answers. Nothing was removed, only folded. */
export function Part({ tag, name, count, children, defaultOpen = false, className = "" }: {
  tag: string; name: string; count?: string; children: React.ReactNode; defaultOpen?: boolean; className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      className={`group/part rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md ${className}`} style={{ boxShadow: "var(--shadow-card)" }}>
      <summary className="flex min-h-[56px] cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 [&::-webkit-details-marker]:hidden">
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">{tag}</span>
        <span className="text-lg font-semibold text-foreground">{name}</span>
        {count && <span className="text-sm text-muted-foreground">{count}</span>}
        <Plus aria-hidden className="ml-auto h-5 w-5 shrink-0 text-primary transition-transform duration-200 group-open/part:rotate-45" />
      </summary>
      <div className="space-y-3 px-4 pb-5 pt-1 sm:px-5">{children}</div>
    </details>
  );
}

export function Item({ group, title, children, defaultOpen = false }: {
  group: string; title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  return (
    <details name={group} open={defaultOpen || undefined} className="group/item rounded-xl border border-border/70 bg-background/70">
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
        <span className="flex-1">{title}</span>
        <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-primary transition-transform duration-200 group-open/item:rotate-180" />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

export function SectionHead({ eyebrow, title, lede }: { eyebrow: string; title: string; lede?: string }) {
  return (
    <div className="mx-auto mb-8 max-w-3xl text-center">
      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
      <h2 className="text-3xl text-foreground md:text-4xl">{title}</h2>
      {lede && <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{lede}</p>}
    </div>
  );
}
