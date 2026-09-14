"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { animate, stagger } from "animejs";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  LayoutDashboard,
  Mail,
  Menu,
  MessageCircle,
  Monitor,
  Package,
  Palette,
  Pause,
  Play,
  Plus,
  Scissors,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  WandSparkles,
  Workflow,
  X,
} from "lucide-react";
import Link from "next/link";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./landing.module.css";

const modules = [
  {
    name: "Citas y agenda",
    icon: CalendarDays,
    text: "Cada cita en su lugar. Servicios, horarios y especialistas en una sola agenda.",
    detail: "Reservas online · Horarios · Especialistas",
    color: "violet",
  },
  {
    name: "Clientes",
    icon: Users,
    text: "Conoce a quienes vuelven. Perfiles e historial para una atención más personal.",
    detail: "Perfiles · Historial · Preferencias",
    color: "blue",
  },
  {
    name: "Tienda y ventas",
    icon: ShoppingBag,
    text: "Tus servicios y productos, en el mismo lugar donde tus clientes reservan.",
    detail: "Catálogo · Pedidos · Caja",
    color: "peach",
  },
  {
    name: "Inventario",
    icon: Package,
    text: "Lleva el control de tus productos, existencias y movimientos.",
    detail: "Productos · Stock · Categorías",
    color: "green",
  },
  {
    name: "Equipo y sucursales",
    icon: Users,
    text: "Coordina especialistas, comisiones y ubicaciones desde tu negocio.",
    detail: "Sucursales · Equipo · Comisiones",
    color: "pink",
  },
  {
    name: "Reportes",
    icon: ChartNoAxesCombined,
    text: "Mira cómo va tu negocio y toma decisiones con información a mano.",
    detail: "Dashboard · Ventas · Desempeño",
    color: "yellow",
  },
];
const palettes = [
  { name: "Violeta", value: "#7354d2", pale: "#eee8fa" },
  { name: "Océano", value: "#2563a6", pale: "#e3edf7" },
  { name: "Bosque", value: "#26725b", pale: "#e2f0e9" },
  { name: "Coral", value: "#b94d39", pale: "#f9e8e3" },
];
const faqs = [
  [
    "¿La app lleva el nombre y los colores de mi negocio?",
    "Sí. Puedes personalizar la identidad de tu app de clientes: nombre, logo, colores y apariencia. El configurador de esta página es una vista previa de esa experiencia.",
  ],
  [
    "¿Tengo que contratar todos los módulos?",
    "No. La plataforma permite activar módulos por negocio. Puedes comenzar con citas y clientes y añadir ventas, inventario u otras funciones según tus necesidades.",
  ],
  [
    "¿Cómo funciona la integración con WhatsApp?",
    "La plataforma permite enviar notificaciones de citas por WhatsApp. Requiere configurar el proveedor de mensajería; su disponibilidad y costos se revisan al preparar tu implementación.",
  ],
  [
    "¿Qué puedo hacer con la conexión MCP?",
    "Conecta un asistente compatible para consultar servicios, disponibilidad, clientes y citas con los permisos autorizados. Las nuevas citas pasan por un borrador y una confirmación antes de registrarse.",
  ],
  [
    "¿Mis clientes necesitan descargar una aplicación?",
    "Pueden abrir tu app web desde un enlace en su teléfono o computadora para explorar servicios y reservar. No necesitan pasar por una tienda de aplicaciones.",
  ],
];

function Brand() {
  return (
    <span className={styles.brand}>
      <span className={styles.brandMark}>
        <CalendarDays size={21} strokeWidth={2.3} />
      </span>
      booknow<span className={styles.brandDot}>.</span>
    </span>
  );
}

function AgendaPreview() {
  return (
    <div className={styles.dashboard}>
      <aside className={styles.previewSidebar}>
        <div className={styles.workspace}>
          <span>A</span>
          <div>
            Atelier Studio<small>Mi espacio de trabajo</small>
          </div>
          <ChevronDown size={12} />
        </div>
        {[
          { label: "Resumen", icon: LayoutDashboard },
          { label: "Agenda", icon: CalendarDays },
          { label: "Clientes", icon: Users },
          { label: "Servicios", icon: Scissors },
          { label: "Mi equipo", icon: Users },
          { label: "Productos", icon: ShoppingBag },
        ].map(({ label, icon: Icon }) => (
          <div
            key={label}
            className={
              label === "Agenda" ? styles.sidebarActive : styles.sidebarItem
            }
          >
            <Icon size={15} />
            {label}
            {label === "Agenda" && <span>8</span>}
          </div>
        ))}
        <div className={styles.sidebarBottom}>
          <div>
            <CircleHelp size={15} />
            Centro de ayuda
          </div>
          <div>
            <Settings2 size={15} />
            Configuración
          </div>
          <div className={styles.previewProfile}>
            <span>AV</span>
            <div>
              Ana Valentina<small>Administradora</small>
            </div>
          </div>
        </div>
      </aside>
      <div className={styles.dashboardMain}>
        <div className={styles.dashboardTop}>
          <span>
            Mi negocio <ChevronRight size={12} /> <b>Agenda</b>
          </span>
          <div>
            <span className={styles.demoTag}>Vista de ejemplo</span>
            <Bell size={16} />
            <span className={styles.tinyAvatar}>AV</span>
          </div>
        </div>
        <div className={styles.agendaHeading}>
          <div>
            <h3>Todo listo para un gran día.</h3>
            <p>Tu equipo, tus citas y un poco más de tiempo para ti.</p>
          </div>
          <span className={styles.newAppointment}>
            <Plus size={13} />
            Nueva cita
          </span>
        </div>
        <div className={styles.stats}>
          {[
            {
              label: "Citas de hoy",
              value: "08",
              hint: "Tu día, organizado",
              icon: CalendarDays,
            },
            {
              label: "Confirmadas",
              value: "06",
              hint: "Todo en orden",
              icon: CheckCheck,
            },
            {
              label: "Especialistas",
              value: "03",
              hint: "Un equipo conectado",
              icon: Users,
            },
          ].map(({ label, value, hint, icon: Icon }) => (
            <div key={label}>
              <span>
                {label}
                <Icon size={15} />
              </span>
              <strong>{value}</strong>
              <small>{hint}</small>
            </div>
          ))}
        </div>
        <div className={styles.calendarToolbar}>
          <b>Lunes, 14 de septiembre</b>
          <span>
            <ChevronLeft size={14} />
            Hoy
            <ChevronRight size={14} />
            <span className={styles.weekView}>
              Semana
              <ChevronDown size={10} />
            </span>
          </span>
        </div>
        <div className={styles.calendar}>
          <div className={styles.calendarPeople}>
            <span />
            <span>
              <i className={styles.avatarPeach}>LC</i>Lucía
            </span>
            <span>
              <i className={styles.avatarViolet}>CM</i>Carlos
            </span>
            <span>
              <i className={styles.avatarGreen}>SP</i>Sofía
            </span>
          </div>
          <div className={styles.calendarGrid}>
            <div className={styles.hours}>
              {["09:00", "10:00", "11:00", "12:00"].map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className={styles.calendarColumn}>
              <div
                className={`${styles.appointment} ${styles.violetAppointment}`}
              >
                <b>Corte & styling</b>
                <span>María Rodríguez</span>
                <small>09:00 – 10:00</small>
              </div>
              <div
                className={`${styles.appointment} ${styles.peachAppointment}`}
                style={{ top: 164 }}
              >
                <b>Color & cuidado</b>
                <span>Isabella Torres</span>
                <small>11:00 – 12:00</small>
              </div>
            </div>
            <div className={styles.calendarColumn}>
              <div
                className={`${styles.appointment} ${styles.greenAppointment}`}
                style={{ top: 68 }}
              >
                <b>Corte de cabello</b>
                <span>Diego Martínez</span>
                <small>10:00 – 11:00</small>
              </div>
            </div>
            <div className={styles.calendarColumn}>
              <div
                className={`${styles.appointment} ${styles.peachAppointment}`}
                style={{ top: 10 }}
              >
                <b>Manicure & spa</b>
                <span>Valentina López</span>
                <small>09:00 – 10:00</small>
              </div>
              <div
                className={`${styles.appointment} ${styles.violetAppointment}`}
                style={{ top: 150 }}
              >
                <b>Un momento para ti</b>
                <span>Camila Flores</span>
                <small>11:00 – 12:00</small>
              </div>
            </div>
            <div className={styles.nowLine}>
              <span /> <i />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [palette, setPalette] = useState(palettes[0]);
  const [business, setBusiness] = useState("Atelier Studio");
  const [selected, setSelected] = useState(["Citas y agenda", "Clientes"]);
  const [slot, setSlot] = useState("10:00");
  const [booked, setBooked] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const brief = `Hola Javier, me interesa una página web y app con BookNow.\n\nNegocio: ${business.trim() || "Mi negocio"}\nColor: ${palette.name} (${palette.value})\nMódulos: ${selected.length ? selected.join(", ") : "Por definir"}\n\nMe gustaría conocer los siguientes pasos y recibir una cotización.`;
  const contactHref = `mailto:javiercalva@teams4soft.com?subject=${encodeURIComponent(`Mi app con BookNow — ${business.trim() || "Mi negocio"}`)}&body=${encodeURIComponent(brief)}`;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let intro: ReturnType<typeof animate> | undefined;
    const sync = () => {
      intro?.revert();
      if (media.matches || !root.current) return;
      intro = animate(root.current.querySelectorAll("[data-intro]"), {
        opacity: [0, 1],
        translateY: [18, 0],
        delay: stagger(100),
        duration: 800,
        ease: "out(3)",
      });
    };
    sync();
    media.addEventListener("change", sync);
    return () => {
      intro?.revert();
      media.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    const hero = root.current?.querySelector("[data-showcase]");
    if (!hero) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = animate(hero.querySelectorAll("[data-floating]"), {
      translateY: [0, -9],
      duration: 2900,
      delay: stagger(450),
      alternate: true,
      loop: true,
      ease: "inOutSine",
      autoplay: false,
    });
    let visible = false;
    const sync = () => {
      if (playing && visible && !media.matches && !document.hidden)
        motion.play();
      else motion.pause();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(hero);
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      motion.revert();
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [playing]);

  function toggleModule(name: string) {
    setSelected((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
    setDownloaded(false);
  }

  function downloadBrief() {
    const url = URL.createObjectURL(
      new Blob(
        [
          `${brief}\n\nContacto: javiercalva@teams4soft.com\nEste resumen es una propuesta de configuración, no una contratación.`,
        ],
        { type: "text/plain;charset=utf-8" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "mi-proyecto-booknow.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
  }

  return (
    <div className={styles.landing} ref={root} lang="es" id="inicio">
      <a href="#contenido" className={styles.skipLink}>
        Saltar al contenido
      </a>
      <header className={styles.header}>
        <a href="#inicio" aria-label="BookNow, inicio">
          <Brand />
        </a>
        <nav className={styles.desktopNav} aria-label="Navegación principal">
          <a href="#plataforma">La plataforma</a>
          <a href="#modulos">Módulos</a>
          <a href="#conexiones">Integraciones</a>
          <a href="#personaliza">A tu medida</a>
        </nav>
        <div className={styles.headerActions}>
          <Link href="/login" className={styles.login}>
            Iniciar sesión
            <ArrowUpRight size={14} />
          </Link>
          <a href="#personaliza" className={styles.smallCta}>
            Quiero mi app
            <ArrowRight size={15} />
          </a>
          <button
            type="button"
            className={styles.menuButton}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <nav
            id="mobile-nav"
            className={styles.mobileNav}
            aria-label="Navegación móvil"
          >
            {[
              ["La plataforma", "plataforma"],
              ["Módulos", "modulos"],
              ["Integraciones", "conexiones"],
              ["A tu medida", "personaliza"],
            ].map(([label, id]) => (
              <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>
                {label}
                <ArrowUpRight size={16} />
              </a>
            ))}
            <Link href="/login">Iniciar sesión</Link>
          </nav>
        )}
      </header>
      <main id="contenido">
        <section className={styles.hero} id="plataforma">
          <div className={styles.heroCopy}>
            <a href="#conexiones" className={styles.announcement} data-intro>
              <span>
                <Sparkles size={12} />
                Conectado con IA
              </span>
              Un nuevo capítulo para tu negocio
              <ArrowUpRight size={13} />
            </a>
            <h1 data-intro>
              Tu negocio merece
              <br />
              su propia app.
            </h1>
            <p data-intro>
              Tu marca. Tus módulos. Tu forma de trabajar.
              <br className={styles.desktopBreak} /> Convierte visitas en citas
              con una web que se siente tan tuya
              <br className={styles.desktopBreak} /> como el negocio que
              construiste.
            </p>
            <div className={styles.heroActions} data-intro>
              <a className={styles.primaryButton} href="#personaliza">
                Diseñar mi app
                <ArrowRight size={17} />
              </a>
              <Dialog.Root>
                <Dialog.Trigger asChild>
                  <button type="button" className={styles.secondaryButton}>
                    <Play size={15} />
                    Ver cómo funciona
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className={styles.videoOverlay} />
                  <Dialog.Content className={styles.videoDialog} lang="es">
                    <div className={styles.videoHeader}>
                      <Dialog.Title>Una app que encaja contigo.</Dialog.Title>
                      <Dialog.Close
                        className={styles.videoClose}
                        aria-label="Cerrar presentación"
                      >
                        <X size={20} />
                      </Dialog.Close>
                    </div>
                    <Dialog.Description className={styles.videoDescription}>
                      Tu marca, tu agenda y tus módulos en un mismo espacio.
                    </Dialog.Description>
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      poster="/landing/booknow-poster.png"
                      aria-label="Presentación animada de BookNow, sin audio"
                    >
                      <source
                        src="/landing/booknow-showcase.mp4"
                        type="video/mp4"
                      />
                      <track
                        kind="captions"
                        src="/landing/booknow-captions.vtt"
                        srcLang="es"
                        label="Español"
                        default
                      />
                      Tu navegador no permite reproducir este video.
                    </video>
                    <a
                      className={styles.videoDownload}
                      href="/landing/booknow-showcase.mp4"
                      download
                    >
                      Descargar presentación
                      <Download size={14} />
                    </a>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </div>
            <div className={styles.heroNotes} data-intro>
              <span>
                <Check size={13} />
                Con tu propia marca
              </span>
              <span>
                <Check size={13} />
                Solo los módulos que necesitas
              </span>
            </div>
          </div>
          <div className={styles.showcase} data-showcase data-intro id="demo">
            <div className={styles.showcaseBackdrop} />
            <div className={styles.browserFrame}>
              <div className={styles.browserChrome}>
                <div>
                  <i />
                  <i />
                  <i />
                </div>
                <span>
                  <ShieldCheck size={11} />
                  Tu negocio, conectado
                </span>
                <Monitor size={13} />
              </div>
              <AgendaPreview />
            </div>
            <div className={styles.notification} data-floating>
              <span className={styles.whatsappIcon}>
                <MessageCircle size={21} />
              </span>
              <div>
                <b>Una cita. Cero llamadas.</b>
                <p>Tu cliente recibió su confirmación.</p>
                <small>
                  WhatsApp <CheckCheck size={12} />
                </small>
              </div>
              <span className={styles.notificationDot} />
            </div>
            <div className={styles.phoneFloat} data-floating>
              <div className={styles.phoneNotch} />
              <div className={styles.miniPhoneContent}>
                <div className={styles.phoneBrand}>
                  <span>A</span>atelier
                </div>
                <span className={styles.phoneGreeting}>
                  Tu próximo momento favorito.
                </span>
                <div className={styles.phoneArt}>
                  <Scissors size={39} strokeWidth={1} />
                  <Sparkles size={20} />
                </div>
                <b>Un espacio para ti.</b>
                <p>Elige tu servicio. Nosotros te esperamos.</p>
                <div className={styles.phoneService}>
                  <span>
                    Corte & styling<small>60 min</small>
                  </span>
                  <span>$25</span>
                </div>
                <span className={styles.phoneCta}>
                  Reservar mi momento
                  <ArrowRight size={12} />
                </span>
                <div className={styles.phoneNav}>
                  <CalendarDays size={16} />
                  <ShoppingBag size={16} />
                  <Users size={16} />
                </div>
              </div>
            </div>
            <div className={styles.yourBrandNote}>
              <Palette size={16} />
              <span>
                Sí, puede llevar
                <br />
                <b>tu nombre y tus colores.</b>
              </span>
            </div>
          </div>
          <div className={styles.showcaseCaption}>
            <span>
              <span className={styles.liveDot} />
              Una plataforma. Toda tu experiencia.
            </span>
            <button
              type="button"
              onClick={() => setPlaying(!playing)}
              aria-label={playing ? "Pausar animación" : "Reproducir animación"}
            >
              {playing ? <Pause size={12} /> : <Play size={12} />}
              {playing ? "Pausar" : "Reproducir"}
            </button>
          </div>
        </section>
        <section
          className={styles.businessTypes}
          aria-label="Negocios que pueden usar BookNow"
        >
          <p>Hecho para quienes hacen tiempo para los demás.</p>
          <div>
            <span>
              <Scissors />
              Salones & barberías
            </span>
            <span>
              <Sparkles />
              Spas & bienestar
            </span>
            <span>
              <Users />
              Estudios & especialistas
            </span>
            <span>
              <CalendarDays />
              Negocios con citas
            </span>
          </div>
        </section>
        <section className={styles.modulesSection} id="modulos">
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionLabel}>
                <Package size={15} />
                Crece a tu manera
              </span>
              <h2>
                Todo encaja.
                <br />
                Nada sobra.
              </h2>
            </div>
            <p>
              Empieza con lo que necesitas hoy.
              <br />
              Suma nuevas posibilidades cuando tu negocio
              <br className={styles.desktopBreak} /> esté listo para el
              siguiente paso.
            </p>
          </div>
          <div className={styles.moduleGrid}>
            {modules.map(({ name, icon: Icon, text, detail, color }) => (
              <a href="#personaliza" className={styles.moduleCard} key={name}>
                <span className={`${styles.moduleIcon} ${styles[color]}`}>
                  <Icon size={23} strokeWidth={1.6} />
                </span>
                <ArrowUpRight className={styles.moduleArrow} size={19} />
                <h3>{name}</h3>
                <p>{text}</p>
                <small>{detail}</small>
              </a>
            ))}
          </div>
          <div className={styles.moduleFootnote}>
            <Plus size={16} />
            <span>
              ¿Tu negocio necesita algo más? Tu configuración es el punto de
              partida.
            </span>
            <a href="#personaliza">
              Arma la tuya
              <ArrowRight size={14} />
            </a>
          </div>
        </section>
        <section className={styles.connections} id="conexiones">
          <div className={styles.centerHeading}>
            <span className={styles.sectionLabel}>
              <Workflow size={15} />
              Menos tareas. Más conexiones.
            </span>
            <h2>
              Tu negocio sigue.
              <br />
              Incluso cuando tú desconectas.
            </h2>
            <p>
              Acerca tu agenda a las herramientas que ya forman parte de tu día.
            </p>
          </div>
          <div className={styles.connectionGrid}>
            <article className={styles.whatsappCard}>
              <div className={styles.connectionTitle}>
                <span className={styles.whatsappIcon}>
                  <MessageCircle />
                </span>
                <span>WhatsApp</span>
                <span className={styles.pill}>Notificaciones</span>
              </div>
              <h3>
                El próximo «nos vemos»,
                <br />
                ya está confirmado.
              </h3>
              <p>
                Envía los detalles de la cita a tus clientes por WhatsApp y
                mantén la conversación cerca.
              </p>
              <div className={styles.chatDemo}>
                <span className={styles.chatDate}>Ejemplo de notificación</span>
                <div className={styles.chatBubble}>
                  <b>Atelier Studio</b>
                  <p>¡Hola, María! Tu cita está confirmada ✨</p>
                  <div>
                    <CalendarDays size={14} />
                    Lunes, 14 de septiembre · 10:00
                  </div>
                  <div>
                    <Scissors size={14} />
                    Corte & styling con Lucía
                  </div>
                  <p>Te esperamos para regalarte un momento para ti.</p>
                  <small>
                    09:41
                    <CheckCheck size={14} />
                  </small>
                </div>
              </div>
              <small className={styles.integrationNote}>
                Requiere configuración del proveedor de mensajería.
              </small>
            </article>
            <article className={styles.aiCard}>
              <div className={styles.connectionTitle}>
                <span className={styles.aiIcon}>
                  <Sparkles />
                </span>
                <span>Inteligencia artificial</span>
                <span className={styles.pill}>Conexión MCP</span>
              </div>
              <h3>
                Tu agenda también
                <br />
                entiende una conversación.
              </h3>
              <p>
                Conecta un asistente compatible para consultar disponibilidad y
                preparar citas con tu autorización.
              </p>
              <div className={styles.aiConversation}>
                <div className={styles.aiQuestion}>
                  ¿Qué horarios tiene Lucía mañana?
                </div>
                <div className={styles.aiAnswer}>
                  <Sparkles size={18} />
                  <div>
                    <b>Encontré estos espacios para ti.</b>
                    <p>Corte & styling · Lucía · 60 minutos</p>
                    <div className={styles.aiSlots}>
                      <span>10:00</span>
                      <span>14:00</span>
                      <span>16:30</span>
                    </div>
                    <small>
                      <ShieldCheck size={12} />
                      Tú confirmas antes de registrar una cita.
                    </small>
                  </div>
                </div>
              </div>
              <small className={styles.integrationNote}>
                Demostración ilustrativa · Acceso según permisos y módulos.
              </small>
            </article>
          </div>
        </section>
        <section className={styles.customize} id="personaliza">
          <div className={styles.customizeCopy}>
            <span className={styles.sectionLabel}>
              <WandSparkles size={16} />
              Hazla tuya
            </span>
            <h2>
              No se parece a otra app.
              <br />
              Se parece a ti.
            </h2>
            <p>
              Prueba tu nombre, encuentra tu color y elige los módulos. Así
              comienza la próxima versión de tu negocio.
            </p>
            <label className={styles.inputLabel} htmlFor="business-name">
              El nombre de tu negocio
            </label>
            <input
              id="business-name"
              maxLength={35}
              value={business}
              onChange={(event) => {
                setBusiness(event.target.value);
                setDownloaded(false);
              }}
              placeholder="Escribe el nombre de tu negocio"
              className={styles.businessInput}
            />
            <fieldset className={styles.paletteField}>
              <legend>Tu color, tu personalidad</legend>
              <div>
                {palettes.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    aria-label={`Color ${item.name}`}
                    aria-pressed={palette.name === item.name}
                    style={{ background: item.value }}
                    onClick={() => {
                      setPalette(item);
                      setDownloaded(false);
                    }}
                  >
                    {palette.name === item.name && <Check size={18} />}
                  </button>
                ))}
                <span>{palette.name}</span>
              </div>
            </fieldset>
            <fieldset className={styles.modulesField}>
              <legend>¿Qué necesita tu negocio?</legend>
              <div>
                {modules.map(({ name, icon: Icon }) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={selected.includes(name)}
                    onClick={() => toggleModule(name)}
                  >
                    <Icon size={14} />
                    {name}
                    {selected.includes(name) ? (
                      <Check size={13} />
                    ) : (
                      <Plus size={13} />
                    )}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className={styles.contactActions}>
              <a className={styles.primaryButton} href={contactHref}>
                <Mail size={16} />
                Solicitar mi app
              </a>
              <button
                type="button"
                className={styles.downloadButton}
                onClick={downloadBrief}
                aria-label="Descargar mi propuesta"
              >
                <Download size={18} />
              </button>
            </div>
            <output className={styles.downloadHint}>
              {downloaded
                ? "Tu resumen se descargó. Puedes compartirlo cuando quieras."
                : "Abre tu correo con la propuesta. Sin compromiso."}
            </output>
            <a
              className={styles.contactEmail}
              href="mailto:javiercalva@teams4soft.com"
            >
              javiercalva@teams4soft.com
            </a>
          </div>
          <div
            className={styles.customizeVisual}
            style={
              {
                "--preview-color": palette.value,
                "--preview-pale": palette.pale,
              } as CSSProperties
            }
          >
            <span className={styles.previewBadge}>
              <span className={styles.liveDot} />
              Tu marca en tiempo real
            </span>
            <div className={styles.customPhone}>
              <div className={styles.customPhoneStatus}>
                <b>9:41</b>
                <span>••• ▰</span>
              </div>
              <div className={styles.customPhoneBrand}>
                <span>{(business.trim() || "M")[0].toUpperCase()}</span>
                <b>{business.trim() || "Mi negocio"}</b>
                <Menu size={17} />
              </div>
              <div className={styles.customPhoneHero}>
                <Sparkles size={28} strokeWidth={1.3} />
                <h3>
                  Un momento
                  <br />
                  solo para ti.
                </h3>
                <p>Tu próxima visita empieza aquí.</p>
              </div>
              <div className={styles.customPhoneBody}>
                {selected.includes("Citas y agenda") ? (
                  <>
                    <div className={styles.serviceHeading}>
                      <b>Reserva tu próxima visita</b>
                      <CalendarDays size={16} />
                    </div>
                    <div className={styles.bookingService}>
                      <span className={styles.serviceScissors}>
                        <Scissors size={22} />
                      </span>
                      <div>
                        <b>Servicio personalizado</b>
                        <small>60 min · Con nuestro equipo</small>
                      </div>
                    </div>
                    <p className={styles.chooseTime}>
                      Elige tu horario de ejemplo
                    </p>
                    <div className={styles.bookingSlots}>
                      {["10:00", "14:00", "16:30"].map((time) => (
                        <button
                          type="button"
                          key={time}
                          aria-pressed={slot === time}
                          onClick={() => {
                            setSlot(time);
                            setBooked(false);
                          }}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={styles.bookingButton}
                      onClick={() => setBooked(!booked)}
                    >
                      {booked ? (
                        <>
                          <Check size={15} />
                          Reserva de ejemplo lista
                        </>
                      ) : (
                        <>
                          Probar reserva
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                    <output className={styles.bookingDisclaimer}>
                      {booked
                        ? `Horario ${slot}. Es una demo; no se creó una cita real.`
                        : "Vista previa interactiva · Sin reservas reales"}
                    </output>
                  </>
                ) : (
                  <div className={styles.emptyPreview}>
                    <WandSparkles size={28} />
                    <b>Tu espacio, tus posibilidades.</b>
                    <p>Activa Citas y agenda para probar una reserva.</p>
                  </div>
                )}
                {selected.includes("Tienda y ventas") && (
                  <div className={styles.shopPreview}>
                    <ShoppingBag size={18} />
                    <span>
                      Tu tienda online
                      <small>Un espacio para tus productos</small>
                    </span>
                    <ArrowRight size={14} />
                  </div>
                )}
                <div className={styles.selectedCount}>
                  {selected.length} módulos en tu propuesta
                </div>
              </div>
              <div className={styles.customPhoneFooter}>
                <CalendarDays size={18} />
                <span>Hecho para {business.trim() || "tu negocio"}</span>
                <Users size={18} />
              </div>
            </div>
            <div className={styles.colorNote}>
              <Palette size={18} />
              <div>
                Tu identidad en cada detalle.
                <small>Web y móvil, conectados.</small>
              </div>
              <Check size={17} />
            </div>
          </div>
        </section>
        <section className={styles.stepsSection}>
          <div>
            <span className={styles.sectionLabel}>
              <ArrowRight size={15} />
              Del «lo imagino» al «ya es mío»
            </span>
            <h2>
              Tu próximo paso
              <br />
              puede ser muy simple.
            </h2>
          </div>
          <ol>
            {[
              [
                "Cuéntanos tu idea",
                "Tu negocio, tus clientes y lo que necesitas resolver.",
              ],
              [
                "Armamos tu espacio",
                "Definimos tu identidad, tus módulos y tus integraciones.",
              ],
              [
                "Comparte tu nueva app",
                "Tu equipo gestiona. Tus clientes descubren y reservan.",
              ],
            ].map(([title, body], index) => (
              <li key={title}>
                <span>{index + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section className={styles.faqSection}>
          <div>
            <span className={styles.sectionLabel}>
              <MessageCircle size={15} />
              Hablemos claro
            </span>
            <h2>
              Buenas preguntas.
              <br />
              Respuestas simples.
            </h2>
          </div>
          <div className={styles.faqList}>
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <Plus size={18} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className={styles.finalCta}>
          <span className={styles.ctaSpark}>
            <Sparkles size={29} />
          </span>
          <h2>
            Tu negocio ya es único.
            <br />
            Ahora, que tu app también lo sea.
          </h2>
          <p>Imagina lo que sigue. Empieza a darle forma.</p>
          <a href="#personaliza" className={styles.primaryButton}>
            Quiero mi propia app
            <ArrowUpRight size={18} />
          </a>
          <a href="#modulos" className={styles.exploreLink}>
            Primero, explorar los módulos
            <ArrowDown size={14} />
          </a>
        </section>
      </main>
      <footer className={styles.footer}>
        <a href="#inicio" aria-label="BookNow, volver al inicio">
          <Brand />
        </a>
        <p>Más tiempo para lo que hace único a tu negocio.</p>
        <div>
          <a href="#modulos">Módulos</a>
          <a href="#personaliza">Tu app</a>
          <Link href="/login">
            Administración
            <ArrowUpRight size={12} />
          </Link>
        </div>
        <span>© {new Date().getFullYear()} BookNow</span>
      </footer>
    </div>
  );
}
