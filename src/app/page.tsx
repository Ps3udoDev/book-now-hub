import type { Metadata } from "next";
import { Landing } from "@/components/landing/landing";

export const metadata: Metadata = {
  title: "BookNow — Tu negocio, tu propia app",
  description:
    "Tu página web y app de citas con tu marca. Elige módulos de agenda, clientes, ventas, WhatsApp e inteligencia artificial para tu negocio.",
};

export default function LandingPage() {
  return <Landing />;
}
