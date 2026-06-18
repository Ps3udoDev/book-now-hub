// Contenido mock por template para el preview de la app del cliente.
// Portado del bundle de diseño (data.js) para que cada industria muestre
// contenido verosimil en las pantallas del preview.
import type {
  ClientAppDensity,
  ClientAppTemplateSlug,
} from "@/features/client-app/templates";

const PAVATAR = (id: number) => `https://i.pravatar.cc/200?img=${id}`;
const UNS = (id: string, q = 80) =>
  `https://images.unsplash.com/${id}?w=600&q=${q}`;

export interface PreviewService {
  id: string;
  name: string;
  cat: string;
  price: number;
  dur: number;
  featured?: boolean;
  img: string;
  desc?: string;
}

export interface PreviewSpecialist {
  id: string;
  name: string;
  tags: string[];
  rating: number;
  reviews: number;
  avatar: string;
  years: number;
}

export interface PreviewContent {
  appName: string;
  userName: string;
  nextAppt: {
    service: string;
    specialist: string;
    date: string;
    time: string;
    duration: number;
    price: number;
    img: string;
  };
  categories: Array<{ id: string; label: string; icon: string }>;
  services: PreviewService[];
  specialists: PreviewSpecialist[];
  history: Array<{
    date: string;
    service: string;
    status: string;
    price: number;
  }>;
  currency: string;
}

export const previewContent: Record<ClientAppTemplateSlug, PreviewContent> = {
  beauty: {
    appName: "Lumière",
    userName: "Sofía",
    nextAppt: {
      service: "Corte + Color Balayage",
      specialist: "Camila Reyes",
      date: "Mar 12 May",
      time: "15:30",
      duration: 120,
      price: 89,
      img: UNS("photo-1522337360788-8b13dee7a37e"),
    },
    categories: [
      { id: "hair", label: "Cabello", icon: "✂" },
      { id: "color", label: "Color", icon: "🎨" },
      { id: "nails", label: "Uñas", icon: "💅" },
      { id: "skin", label: "Piel", icon: "✨" },
      { id: "makeup", label: "Maquillaje", icon: "💄" },
      { id: "spa", label: "Spa", icon: "🌿" },
    ],
    services: [
      {
        id: "s1",
        name: "Balayage premium",
        cat: "Color",
        price: 95,
        dur: 120,
        featured: true,
        img: UNS("photo-1560066984-138dadb4c035"),
        desc: "Técnica de iluminación natural cabello a cabello.",
      },
      {
        id: "s2",
        name: "Corte signature",
        cat: "Cabello",
        price: 45,
        dur: 60,
        img: UNS("photo-1522337360788-8b13dee7a37e"),
      },
      {
        id: "s3",
        name: "Manicura rusa",
        cat: "Uñas",
        price: 38,
        dur: 75,
        featured: true,
        img: UNS("photo-1604654894610-df63bc536371"),
      },
      {
        id: "s4",
        name: "Tratamiento Olaplex",
        cat: "Cabello",
        price: 55,
        dur: 45,
        img: UNS("photo-1595476108010-b4d1f102b1b1"),
      },
      {
        id: "s5",
        name: "Limpieza facial profunda",
        cat: "Piel",
        price: 68,
        dur: 60,
        img: UNS("photo-1570172619644-dfd03ed5d881"),
      },
      {
        id: "s6",
        name: "Maquillaje social",
        cat: "Maquillaje",
        price: 60,
        dur: 60,
        img: UNS("photo-1487412947147-5cebf100ffc2"),
      },
    ],
    specialists: [
      {
        id: "sp1",
        name: "Camila Reyes",
        tags: ["Color", "Balayage"],
        rating: 4.9,
        reviews: 312,
        avatar: PAVATAR(47),
        years: 8,
      },
      {
        id: "sp2",
        name: "Valeria Costa",
        tags: ["Corte", "Styling"],
        rating: 4.8,
        reviews: 198,
        avatar: PAVATAR(48),
        years: 6,
      },
      {
        id: "sp3",
        name: "Lucía Pérez",
        tags: ["Manicura", "Nail Art"],
        rating: 5.0,
        reviews: 256,
        avatar: PAVATAR(45),
        years: 10,
      },
    ],
    history: [
      {
        date: "28 Abr",
        service: "Corte signature",
        status: "Completada",
        price: 45,
      },
      {
        date: "14 Abr",
        service: "Manicura rusa",
        status: "Completada",
        price: 38,
      },
      {
        date: "02 Abr",
        service: "Limpieza facial",
        status: "Completada",
        price: 68,
      },
    ],
    currency: "€",
  },

  dental: {
    appName: "Pure Smile",
    userName: "Mateo",
    nextAppt: {
      service: "Limpieza dental + revisión",
      specialist: "Dra. Isabel Garrido",
      date: "Jue 14 May",
      time: "09:00",
      duration: 45,
      price: 45,
      img: UNS("photo-1606811971618-4486d14f3f99"),
    },
    categories: [
      { id: "check", label: "Revisión", icon: "🦷" },
      { id: "limpia", label: "Limpieza", icon: "✦" },
      { id: "estetica", label: "Estética", icon: "✨" },
      { id: "orto", label: "Ortodoncia", icon: "⌐" },
      { id: "implant", label: "Implantes", icon: "◆" },
      { id: "urg", label: "Urgencias", icon: "+" },
    ],
    services: [
      {
        id: "s1",
        name: "Limpieza profesional",
        cat: "Limpieza",
        price: 45,
        dur: 45,
        featured: true,
        img: UNS("photo-1606811971618-4486d14f3f99"),
        desc: "Profilaxis completa, pulido y revisión.",
      },
      {
        id: "s2",
        name: "Blanqueamiento LED",
        cat: "Estética",
        price: 280,
        dur: 90,
        featured: true,
        img: UNS("photo-1581585504957-e90fd1a7ada0"),
      },
      {
        id: "s3",
        name: "Empaste compuesto",
        cat: "General",
        price: 75,
        dur: 30,
        img: UNS("photo-1588776814546-1ffcf47267a8"),
      },
      {
        id: "s4",
        name: "Revisión + radiografía",
        cat: "Revisión",
        price: 35,
        dur: 30,
        img: UNS("photo-1609840114035-3c981b782dfe"),
      },
      {
        id: "s5",
        name: "Carillas estéticas",
        cat: "Estética",
        price: 480,
        dur: 120,
        img: UNS("photo-1598256989800-fe5f95da9787"),
      },
      {
        id: "s6",
        name: "Ortodoncia invisible",
        cat: "Ortodoncia",
        price: 120,
        dur: 30,
        img: UNS("photo-1629909613654-28e377c37b09"),
      },
    ],
    specialists: [
      {
        id: "sp1",
        name: "Dra. Isabel Garrido",
        tags: ["Estética", "Limpieza"],
        rating: 4.9,
        reviews: 412,
        avatar: PAVATAR(31),
        years: 12,
      },
      {
        id: "sp2",
        name: "Dr. Andrés Fonseca",
        tags: ["Ortodoncia", "Implantes"],
        rating: 4.8,
        reviews: 287,
        avatar: PAVATAR(33),
        years: 15,
      },
      {
        id: "sp3",
        name: "Dra. Marina López",
        tags: ["Endodoncia"],
        rating: 4.9,
        reviews: 195,
        avatar: PAVATAR(36),
        years: 9,
      },
    ],
    history: [
      {
        date: "12 Mar",
        service: "Limpieza profesional",
        status: "Completada",
        price: 45,
      },
      { date: "04 Feb", service: "Empaste", status: "Completada", price: 75 },
      { date: "18 Ene", service: "Revisión", status: "Completada", price: 35 },
    ],
    currency: "€",
  },

  wellness: {
    appName: "Serene",
    userName: "Aitana",
    nextAppt: {
      service: "Masaje shiatsu 80 min",
      specialist: "Hana Tanaka",
      date: "Sáb 16 May",
      time: "11:00",
      duration: 80,
      price: 95,
      img: UNS("photo-1540555700478-4be289fbecef"),
    },
    categories: [
      { id: "masaje", label: "Masaje", icon: "◯" },
      { id: "facial", label: "Facial", icon: "◐" },
      { id: "body", label: "Corporal", icon: "◑" },
      { id: "yoga", label: "Yoga", icon: "◇" },
      { id: "medita", label: "Meditación", icon: "◌" },
      { id: "termal", label: "Termal", icon: "☉" },
    ],
    services: [
      {
        id: "s1",
        name: "Shiatsu signature",
        cat: "Masaje",
        price: 95,
        dur: 80,
        featured: true,
        img: UNS("photo-1540555700478-4be289fbecef"),
        desc: "Presión digital sobre meridianos energéticos.",
      },
      {
        id: "s2",
        name: "Ritual del bosque",
        cat: "Corporal",
        price: 145,
        dur: 120,
        featured: true,
        img: UNS("photo-1544161515-4ab6ce6db874"),
      },
      {
        id: "s3",
        name: "Yoga restaurativo",
        cat: "Yoga",
        price: 25,
        dur: 60,
        img: UNS("photo-1545205597-3d9d02c29597"),
      },
      {
        id: "s4",
        name: "Facial botánico",
        cat: "Facial",
        price: 78,
        dur: 60,
        img: UNS("photo-1570172619644-dfd03ed5d881"),
      },
      {
        id: "s5",
        name: "Meditación guiada",
        cat: "Meditación",
        price: 18,
        dur: 45,
        img: UNS("photo-1499209974431-9dddcece7f88"),
      },
      {
        id: "s6",
        name: "Baño termal japonés",
        cat: "Termal",
        price: 52,
        dur: 50,
        img: UNS("photo-1571902943202-507ec2618e8f"),
      },
    ],
    specialists: [
      {
        id: "sp1",
        name: "Hana Tanaka",
        tags: ["Shiatsu", "Reiki"],
        rating: 5.0,
        reviews: 188,
        avatar: PAVATAR(20),
        years: 14,
      },
      {
        id: "sp2",
        name: "Lina Mendes",
        tags: ["Facial", "Botánica"],
        rating: 4.9,
        reviews: 142,
        avatar: PAVATAR(25),
        years: 7,
      },
      {
        id: "sp3",
        name: "Marco Aurelio",
        tags: ["Yoga", "Meditación"],
        rating: 4.9,
        reviews: 96,
        avatar: PAVATAR(15),
        years: 10,
      },
    ],
    history: [
      {
        date: "02 May",
        service: "Facial botánico",
        status: "Completada",
        price: 78,
      },
      {
        date: "20 Abr",
        service: "Yoga restaurativo",
        status: "Completada",
        price: 25,
      },
      { date: "08 Abr", service: "Shiatsu", status: "Completada", price: 95 },
    ],
    currency: "€",
  },

  barber: {
    appName: "Iron & Oak",
    userName: "Diego",
    nextAppt: {
      service: "Corte + Afeitado clásico",
      specialist: "Rafael Bruno",
      date: "Vie 15 May",
      time: "18:30",
      duration: 60,
      price: 42,
      img: UNS("photo-1503951914875-452162b0f3f1"),
    },
    categories: [
      { id: "corte", label: "Corte", icon: "◣" },
      { id: "barba", label: "Barba", icon: "◢" },
      { id: "afeit", label: "Afeitado", icon: "◤" },
      { id: "color", label: "Color", icon: "◥" },
      { id: "rit", label: "Ritual", icon: "◆" },
      { id: "kid", label: "Niño", icon: "◇" },
    ],
    services: [
      {
        id: "s1",
        name: "Corte signature",
        cat: "Corte",
        price: 28,
        dur: 45,
        featured: true,
        img: UNS("photo-1503951914875-452162b0f3f1"),
        desc: "Corte personalizado + lavado + styling final.",
      },
      {
        id: "s2",
        name: "Afeitado clásico navaja",
        cat: "Afeitado",
        price: 22,
        dur: 30,
        featured: true,
        img: UNS("photo-1599351431202-1e0f0137899a"),
      },
      {
        id: "s3",
        name: "Perfilado de barba",
        cat: "Barba",
        price: 18,
        dur: 25,
        img: UNS("photo-1622286342621-4bd786c2447c"),
      },
      {
        id: "s4",
        name: "Ritual completo",
        cat: "Ritual",
        price: 65,
        dur: 90,
        img: UNS("photo-1605497788044-5a32c7078486"),
      },
      {
        id: "s5",
        name: "Coloración masculina",
        cat: "Color",
        price: 38,
        dur: 50,
        img: UNS("photo-1493256338651-d82f7acb2b38"),
      },
      {
        id: "s6",
        name: "Corte junior",
        cat: "Niño",
        price: 18,
        dur: 30,
        img: UNS("photo-1519699047748-de8e457a634e"),
      },
    ],
    specialists: [
      {
        id: "sp1",
        name: "Rafael Bruno",
        tags: ["Corte", "Barba"],
        rating: 4.9,
        reviews: 528,
        avatar: PAVATAR(12),
        years: 11,
      },
      {
        id: "sp2",
        name: "Tomás Aguilar",
        tags: ["Afeitado", "Ritual"],
        rating: 4.8,
        reviews: 376,
        avatar: PAVATAR(13),
        years: 8,
      },
      {
        id: "sp3",
        name: "Iván Soto",
        tags: ["Color", "Corte"],
        rating: 4.9,
        reviews: 244,
        avatar: PAVATAR(11),
        years: 6,
      },
    ],
    history: [
      {
        date: "24 Abr",
        service: "Corte signature",
        status: "Completada",
        price: 28,
      },
      { date: "03 Abr", service: "Afeitado", status: "Completada", price: 22 },
      {
        date: "12 Mar",
        service: "Ritual completo",
        status: "Completada",
        price: 65,
      },
    ],
    currency: "€",
  },

  studio: {
    appName: "Studio",
    userName: "Alex",
    nextAppt: {
      service: "Sesión de tatuaje · brazo",
      specialist: "Rin Okabe",
      date: "Mié 13 May",
      time: "17:00",
      duration: 90,
      price: 180,
      img: UNS("photo-1521590832167-7bcbfaa6381f"),
    },
    categories: [
      { id: "all", label: "Todos", icon: "◻" },
      { id: "salon", label: "Salón", icon: "◼" },
      { id: "studio", label: "Estudio", icon: "▣" },
      { id: "health", label: "Salud", icon: "▤" },
      { id: "spa", label: "Spa", icon: "▥" },
      { id: "shop", label: "Tienda", icon: "▧" },
    ],
    services: [
      {
        id: "s1",
        name: "Sesión personalizada",
        cat: "Estudio",
        price: 120,
        dur: 90,
        featured: true,
        img: UNS("photo-1521590832167-7bcbfaa6381f"),
        desc: "Sesión 1:1 enfocada en tu objetivo.",
      },
      {
        id: "s2",
        name: "Consultoría inicial",
        cat: "Estudio",
        price: 60,
        dur: 45,
        featured: true,
        img: UNS("photo-1556761175-5973dc0f32e7"),
      },
      {
        id: "s3",
        name: "Sesión de seguimiento",
        cat: "Salud",
        price: 75,
        dur: 60,
        img: UNS("photo-1571019613454-1cb2f99b2d8b"),
      },
      {
        id: "s4",
        name: "Ritual de bienestar",
        cat: "Spa",
        price: 95,
        dur: 75,
        img: UNS("photo-1544161515-4ab6ce6db874"),
      },
      {
        id: "s5",
        name: "Pack 4 sesiones",
        cat: "Estudio",
        price: 380,
        dur: 90,
        img: UNS("photo-1521737604893-d14cc237f11d"),
      },
      {
        id: "s6",
        name: "Producto premium",
        cat: "Tienda",
        price: 48,
        dur: 0,
        img: UNS("photo-1556228720-195a672e8a03"),
      },
    ],
    specialists: [
      {
        id: "sp1",
        name: "Rin Okabe",
        tags: ["Senior"],
        rating: 4.9,
        reviews: 312,
        avatar: PAVATAR(60),
        years: 10,
      },
      {
        id: "sp2",
        name: "Mara Vidal",
        tags: ["Senior"],
        rating: 4.8,
        reviews: 245,
        avatar: PAVATAR(49),
        years: 8,
      },
      {
        id: "sp3",
        name: "Theo Marin",
        tags: ["Junior"],
        rating: 4.7,
        reviews: 96,
        avatar: PAVATAR(57),
        years: 3,
      },
    ],
    history: [
      {
        date: "04 May",
        service: "Consultoría",
        status: "Completada",
        price: 60,
      },
      {
        date: "20 Abr",
        service: "Sesión personalizada",
        status: "Completada",
        price: 120,
      },
      {
        date: "06 Abr",
        service: "Ritual de bienestar",
        status: "Completada",
        price: 95,
      },
    ],
    currency: "€",
  },
};

// Escala de espaciado por densidad (del bundle: themes.js → DENSITY).
export const densitySpec: Record<
  ClientAppDensity,
  { padX: number; padY: number; gap: number; navH: number; cardPad: number }
> = {
  compact: { padX: 16, padY: 12, gap: 10, navH: 56, cardPad: 14 },
  comfortable: { padX: 20, padY: 18, gap: 14, navH: 62, cardPad: 18 },
  spacious: { padX: 24, padY: 24, gap: 18, navH: 68, cardPad: 22 },
};

// Franja de fechas fija (como daysStrip del bundle) para que el preview sea estable.
export const previewDays = [
  { wd: "MAR", day: 12, month: "MAY" },
  { wd: "MIÉ", day: 13, month: "MAY" },
  { wd: "JUE", day: 14, month: "MAY" },
  { wd: "VIE", day: 15, month: "MAY" },
  { wd: "SÁB", day: 16, month: "MAY" },
  { wd: "DOM", day: 17, month: "MAY" },
];

export const previewSlots = [
  { time: "09:00", available: true },
  { time: "09:30", available: false },
  { time: "10:00", available: true },
  { time: "10:30", available: true },
  { time: "11:30", available: true },
  { time: "12:00", available: false },
  { time: "15:00", available: true },
  { time: "15:30", available: true },
  { time: "16:30", available: true },
  { time: "17:00", available: false },
  { time: "18:00", available: true },
  { time: "18:30", available: true },
];
