import QRCode from "qrcode";

export function slugifyWorkstationQr(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 60);
}

export function buildPublicCafeteriaQrPath(tenantSlug: string, qrSlug: string) {
  return `/cafeteria/qr/${tenantSlug}/${qrSlug}`;
}

export function buildPublicCafeteriaQrUrl(tenantSlug: string, qrSlug: string) {
  if (typeof window === "undefined") {
    return buildPublicCafeteriaQrPath(tenantSlug, qrSlug);
  }

  return new URL(
    buildPublicCafeteriaQrPath(tenantSlug, qrSlug),
    window.location.origin,
  ).toString();
}

export async function generateQrDataUrl(value: string) {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 8,
    color: {
      dark: "#111111",
      light: "#FFFFFF",
    },
  });
}
