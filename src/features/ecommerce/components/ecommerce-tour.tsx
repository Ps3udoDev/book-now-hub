// src/features/ecommerce/components/ecommerce-tour.tsx
"use client";

import { type DriveStep, driver } from "driver.js";
import "driver.js/dist/driver.css";
import { HelpCircle } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";

// Attribute selector usado en los pasos: añade data-tour="<id>" a los elementos
// del page de /settings/ecommerce para anclar el tour.
const STEPS: DriveStep[] = [
  {
    element: '[data-tour="ecommerce-header"]',
    popover: {
      title: "Bienvenido a tu ecommerce",
      description:
        "Aquí configuras tu tienda online. Este recorrido te muestra, paso a paso, cada sección y cómo sacarle provecho. Puedes saltar en cualquier momento con el botón <b>Saltar</b> o la tecla <kbd>ESC</kbd>.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tour="ecommerce-view-store"]',
    popover: {
      title: "Ver tu tienda pública",
      description:
        "Abre una pestaña con la vista real que tendrán tus clientes. Úsalo para previsualizar cada cambio antes de compartir el link.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: '[data-tour="ecommerce-status"]',
    popover: {
      title: "Estado del módulo",
      description:
        "Activa <b>Módulo activo</b> para que aparezca en el menú. Activa <b>Storefront público</b> cuando estés listo para que cualquier persona con el link pueda ver tu catálogo.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="ecommerce-template"]',
    popover: {
      title: "Plantilla visual",
      description:
        "Elige el estilo base de tu tienda: tipografías, espacios y tono general. Puedes cambiar entre plantillas en cualquier momento — el contenido se conserva.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="ecommerce-branding"]',
    popover: {
      title: "Marca y hero",
      description:
        "Nombre de la tienda, logo y la imagen principal (hero). El <b>hero title</b> y <b>subtitle</b> son lo primero que ve el cliente — sé claro y aspiracional.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="ecommerce-whatsapp-seo"]',
    popover: {
      title: "WhatsApp y SEO",
      description:
        "Configura el número de WhatsApp que recibirá los pedidos y el mensaje automático con el carrito. El <b>SEO title/description</b> se usa en Google y al compartir el link.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="ecommerce-sections"]',
    popover: {
      title: "Secciones editoriales",
      description:
        "Tres bloques narrativos: <b>Discovery</b> (curaduría o categorías destacadas), <b>Story</b> (el fundador o la visión de marca) y <b>Journal</b> (blog, rituales o tips). Cada uno se puede desactivar si no lo necesitas.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="ecommerce-preview"]',
    popover: {
      title: "Vista previa en tiempo real",
      description:
        "Todos los cambios se reflejan aquí antes de guardar. Usa esta preview para afinar colores, textos y secciones sin afectar la tienda publicada.",
      side: "left",
      align: "start",
    },
  },
  {
    element: '[data-tour="ecommerce-save"]',
    popover: {
      title: "Guardar cambios",
      description:
        "Cuando termines, presiona <b>Guardar</b>. Tus ajustes se publican inmediatamente en el storefront. ¡Listo para vender!",
      side: "bottom",
      align: "end",
    },
  },
];

export function startEcommerceTour() {
  // Filtrar pasos cuyos elementos no existan (si alguien oculta una sección)
  const available = STEPS.filter((step) => {
    const selector =
      typeof step.element === "string" ? step.element : undefined;
    if (!selector) return true;
    return document.querySelector(selector) !== null;
  });

  if (available.length === 0) return;

  const d = driver({
    showProgress: true,
    allowClose: true,
    animate: true,
    overlayOpacity: 0.6,
    stagePadding: 6,
    progressText: "Paso {{current}} de {{total}}",
    nextBtnText: "Siguiente",
    prevBtnText: "Anterior",
    doneBtnText: "Finalizar",
    showButtons: ["next", "previous", "close"],
    popoverClass: "ecommerce-tour-popover",
    steps: available,
    onPopoverRender: (popover) => {
      // driver.js no expone closeBtnText, así que reemplazamos el contenido
      // del botón X por el texto "Saltar" para que siempre esté visible.
      if (popover.closeButton) {
        popover.closeButton.textContent = "Saltar";
        popover.closeButton.setAttribute("aria-label", "Saltar recorrido");
      }
    },
  });

  d.drive();
}

interface EcommerceTourButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "sm" | "default" | "lg";
}

export function EcommerceTourButton({
  className,
  variant = "outline",
  size = "default",
}: EcommerceTourButtonProps) {
  const handleClick = useCallback(() => {
    // Pequeño delay para asegurar que el DOM esté pintado
    setTimeout(() => startEcommerceTour(), 50);
  }, []);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
    >
      <HelpCircle className="mr-2 h-4 w-4" />
      Ver uso
    </Button>
  );
}
