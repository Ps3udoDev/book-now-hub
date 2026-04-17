export type EcommerceTemplateSlug =
  | "beauty-editorial"
  | "neo-urban"
  | "pure-organic"
  | "silent-luxury";

export interface EcommerceTemplatePreset {
  slug: EcommerceTemplateSlug;
  name: string;
  description: string;
  layout: "editorial" | "neo" | "organic" | "luxury";
  badge: string;
  fontDisplay: string;
  fontBody: string;
  shellClassName: string;
  heroClassName: string;
  panelClassName: string;
  cardClassName: string;
  controlClassName: string;
  footerClassName: string;
  buttonClassName: string;
  chipClassName: string;
  imageMaskClassName: string;
}
