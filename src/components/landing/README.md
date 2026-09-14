# Landing BookNow

La ruta pública `/` presenta la plataforma sin acceder a Supabase. Los datos de la
agenda, las conversaciones y la reserva interactiva son ejemplos locales.

- `landing.tsx`: navegación, demo, catálogo, configurador y contacto comercial.
- `landing.module.css`: identidad visual propia, responsive y movimiento reducido.
- `public/landing/`: video HyperFrames, poster y subtítulos descriptivos.
- `videos/booknow-motion/`: fuente de la pieza animada y configuración de render.

El CTA `Solicitar mi app` abre el cliente de correo del visitante con destino
`javiercalva@teams4soft.com`. Incluye nombre, color y módulos seleccionados; no envía
correos automáticamente ni guarda solicitudes. La descarga del resumen ofrece una
alternativa si el visitante no tiene un cliente de correo configurado.

Anime.js anima la entrada y las piezas del hero. El movimiento se pausa al salir
del viewport, al ocultar la pestaña, con el control de pausa o cuando el sistema
solicita movimiento reducido. El video se carga al abrir el diálogo y se reproduce
mediante sus controles, sin reproducción automática.

## Verificación

`npm run build` y Biome sobre los archivos de esta carpeta y `src/app/page.tsx`.
Las capturas y el resumen de ejemplo se guardan localmente en `artifacts/landing`.
El script local `scripts/check-landing.cjs` recibe como argumentos la ruta de
`playwright-core` y la del ejecutable de Chrome. `scripts/` está excluido del Git de
este repositorio; este script es una herramienta local de verificación.

```powershell
node scripts/check-landing.cjs <ruta-playwright-core> <ruta-chrome>
```

Prueba navegación móvil, ausencia de desbordamiento a 320/390/768 px,
personalización, módulos, reserva ficticia, descarga, destino y contenido del
correo, preguntas frecuentes y carga del video. No envía correos ni crea citas.
