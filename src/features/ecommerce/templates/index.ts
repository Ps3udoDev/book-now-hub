import type {
  EcommerceTemplatePreset,
  EcommerceTemplateSlug,
} from "./types";

export const ecommerceTemplates: EcommerceTemplatePreset[] = [
  {
    slug: "beauty-editorial",
    name: "Beauty Editorial",
    description: "Template inicial para salones, estudio de belleza y retail premium.",
    layout: "editorial",
    badge: "Bespoke Beauty",
    fontDisplay: '"Cormorant Garamond", "Times New Roman", serif',
    fontBody: '"Plus Jakarta Sans", "Trebuchet MS", sans-serif',
    shellClassName:
      "bg-[radial-gradient(circle_at_top_left,_rgba(201,153,122,0.16),_transparent_32%),linear-gradient(180deg,#fffaf6_0%,#f4ede6_52%,#efe4da_100%)] text-stone-900",
    heroClassName:
      "bg-[linear-gradient(135deg,rgba(255,250,246,0.92),rgba(244,231,219,0.84))] backdrop-blur-sm",
    panelClassName: "bg-white/70 backdrop-blur-md border-stone-200/80 shadow-[0_24px_70px_rgba(120,82,58,0.10)]",
    cardClassName:
      "bg-white/82 border-stone-200/70 shadow-[0_16px_40px_rgba(130,94,75,0.10)] hover:-translate-y-1",
    controlClassName: "bg-white/76 border-stone-200/80 text-stone-900",
    footerClassName: "border-stone-200/70 bg-white/50 text-stone-600",
    buttonClassName: "rounded-full uppercase tracking-[0.24em] text-[11px]",
    chipClassName: "rounded-full border-stone-300/80 bg-white/80 text-stone-700",
    imageMaskClassName: "rounded-[2rem]",
  },
  {
    slug: "neo-urban",
    name: "Neo Urban",
    description: "Contraste alto, look nocturno y acentos electricos.",
    layout: "neo",
    badge: "Electric Pulse",
    fontDisplay: '"Space Grotesk", "Arial Black", sans-serif',
    fontBody: '"Inter", "Segoe UI", sans-serif',
    shellClassName:
      "bg-[radial-gradient(circle_at_top_right,_rgba(0,71,255,0.20),_transparent_28%),linear-gradient(180deg,#0c0d12_0%,#13141a_100%)] text-slate-100",
    heroClassName:
      "bg-[linear-gradient(135deg,rgba(20,21,28,0.88),rgba(9,15,42,0.78))] backdrop-blur-md",
    panelClassName: "bg-white/6 border-white/10 backdrop-blur-xl shadow-[0_28px_90px_rgba(0,0,0,0.36)]",
    cardClassName:
      "bg-white/5 border-white/10 backdrop-blur-md shadow-[0_18px_48px_rgba(0,0,0,0.28)] hover:-translate-y-1",
    controlClassName: "bg-white/5 border-white/10 text-slate-100",
    footerClassName: "border-white/10 bg-black/30 text-slate-400",
    buttonClassName: "rounded-full uppercase tracking-[0.18em] text-[11px]",
    chipClassName: "rounded-full border-white/10 bg-white/6 text-slate-100",
    imageMaskClassName: "rounded-[1.75rem]",
  },
  {
    slug: "pure-organic",
    name: "Pure Organic",
    description: "Calido, natural y con aire editorial sereno.",
    layout: "organic",
    badge: "Organic Sanctuary",
    fontDisplay: '"Plus Jakarta Sans", "Gill Sans", sans-serif',
    fontBody: '"Be Vietnam Pro", "Trebuchet MS", sans-serif',
    shellClassName:
      "bg-[radial-gradient(circle_at_top_left,_rgba(154,68,45,0.12),_transparent_28%),linear-gradient(180deg,#faf7f1_0%,#f0ece4_100%)] text-stone-900",
    heroClassName:
      "bg-[linear-gradient(135deg,rgba(250,247,241,0.9),rgba(233,229,221,0.92))]",
    panelClassName: "bg-white/65 border-stone-200/80 shadow-[0_22px_60px_rgba(78,61,43,0.12)]",
    cardClassName:
      "bg-[#fbfaf6]/90 border-stone-200/70 shadow-[0_12px_28px_rgba(96,79,56,0.10)] hover:-translate-y-1",
    controlClassName: "bg-[#faf7f1]/90 border-stone-200/80 text-stone-900",
    footerClassName: "border-stone-200/70 bg-[#faf7f1]/80 text-stone-600",
    buttonClassName: "rounded-[1rem] tracking-[0.12em] text-[12px]",
    chipClassName: "rounded-full border-stone-300 bg-[#f8f3eb] text-stone-700",
    imageMaskClassName: "rounded-[1.5rem]",
  },
  {
    slug: "silent-luxury",
    name: "Silent Luxury",
    description: "Japandi limpio, espaciado amplio y geometria estricta.",
    layout: "luxury",
    badge: "Architectural Stillness",
    fontDisplay: '"Noto Serif", "Georgia", serif',
    fontBody: '"Plus Jakarta Sans", "Segoe UI", sans-serif',
    shellClassName:
      "bg-[linear-gradient(180deg,#f8f5ef_0%,#efebe2_100%)] text-stone-900",
    heroClassName:
      "bg-[linear-gradient(135deg,rgba(248,245,239,0.94),rgba(227,223,214,0.88))]",
    panelClassName: "bg-white/70 border-black/10 shadow-[0_20px_60px_rgba(45,38,28,0.10)]",
    cardClassName:
      "bg-[#fcfaf6]/92 border-black/10 shadow-[0_14px_34px_rgba(70,60,48,0.08)] hover:-translate-y-1",
    controlClassName: "bg-[#f7f3eb]/90 border-black/10 text-stone-900",
    footerClassName: "border-black/10 bg-[#f4f0e8]/75 text-stone-600",
    buttonClassName: "rounded-none uppercase tracking-[0.22em] text-[11px]",
    chipClassName: "rounded-none border-black/10 bg-[#f3efe7] text-stone-700",
    imageMaskClassName: "rounded-none",
  },
];

export const defaultEcommerceTemplate = ecommerceTemplates[0];

export function getEcommerceTemplate(
  slug: string | null | undefined,
): EcommerceTemplatePreset {
  return (
    ecommerceTemplates.find((template) => template.slug === slug) ||
    defaultEcommerceTemplate
  );
}
