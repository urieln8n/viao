---
STATUS: CURRENT
ERA: Fase J-A — Auditoría UX/UI + propuesta de rediseño premium
DOMAIN: Producto / UX / UI
AUTHORITY: Auditoría y propuesta de diseño. NO es un Decision Lock, NO autoriza implementación. Ninguna afirmación aquí modifica RW1-RW6, L12, ni el modelo económico ya LOCKED.
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-27
---

# VIAO — FASE J-A: PREMIUM PRODUCT EXPERIENCE AUDIT

*Auditoría basada en inspección directa y completa del código real (19 rutas, componentes de navegación, design tokens, `package.json`), no en suposiciones. Toda cita incluye archivo:línea. No se ha modificado ningún archivo.*

---

## 1. Estado actual

19 rutas reales bajo `app/`, todas con UI real (ninguna es solo Server Action/API). El **core loop actual (Goals/Points/Rewards/Missions) no tiene rutas propias**: Missions vive únicamente como una card embebida en Home (`app/missions-summary.tsx`), Goals vive únicamente en `app/goal-card.tsx` (embebido en Home y Onboarding) — **no existen `/missions` ni `/goals` como páginas**. Partners (`/partners/dashboard/[accessToken]`, `/partners/ops/[accessToken]`) es de solo-acceso-directo por token, sin navegación, por diseño ya `LOCKED` en bloques anteriores — esto **no se cuestiona en esta fase**. El stack real: Next.js 16.3.1, React 19.2.8, Tailwind v4 (CSS-first), shadcn/ui (`style: base-nova`, `iconLibrary: lucide`) sobre `@base-ui/react` (no Radix), sin `framer-motion`, sin librería de formularios.

---

## 2. Problemas críticos

1. **"Explorar" apunta a dos sitios distintos según el dispositivo**: desktop → `/#travel` (`components/nav/sidebar.tsx:40`), mobile → `/search` (`components/nav/main-nav.tsx:28`). Mismo texto, distinto destino real — inconsistencia estructural, no solo visual.
2. **Sin estado de carga en 7+ de las pantallas más usadas** (Home, Trips, Rewards, Vision, Properties, Booking, Partners) — todas son Server Components `async` sin `loading.tsx`. Solo `/search/results/loading.tsx` existe en todo el árbol. Una llamada lenta a Supabase produce navegación en blanco, sin ningún feedback — lo opuesto a "se siente rápido".
3. **Ningún `error.tsx`** existe en todo `app/` — cualquier excepción no capturada cae en la pantalla de error genérica de Next.js, rompiendo instantáneamente la percepción de producto cuidado.
4. **Migración de `PageContainer` a medias**: el propio componente documenta en su código (`components/layout/page-container.tsx:19-23`) que ~12 páginas repiten a mano `mx-auto max-w-xl p-6` sin haberse migrado — confirmado que sigue siendo así hoy en 6 archivos (`app/rewards/page.tsx`, `app/trips/page.tsx`, `app/trips/[id]/page.tsx`, `app/vision/page.tsx`, `app/search/ai-recommendation/page.tsx`, y más), mientras otros 6 ya usan `PageContainer`.
5. **Home no tiene una jerarquía de foco única**: hero (viaje o saludo) + Goal + Missions + Points teaser + chips de destino, todo con peso visual similar — un test de "5 segundos" hoy no tiene una única respuesta clara.
6. **Sin landing/propuesta de valor para un visitante nuevo**: `app/page.tsx` en estado deslogueado muestra solo un saludo + CTA de registro (`app/page.tsx:190-204`) — ninguna explicación de Goals/Points/Rewards/Missions/Partners.

---

## 3. Oportunidades

- Sistema de color OKLCH ya construido con comentarios propios sobre contraste WCAG (`app/globals.css:98-113`) — base poco común en un MVP, digna de conservarse y formalizarse, no de rehacerse.
- `focus-visible:ring-3 focus-visible:ring-ring/50` ya aplicado de forma consistente en Button/Input/Nav (`button.tsx:30`, `input.tsx:23`, `sidebar.tsx:70`) — convención real ya existente, no hay que inventarla.
- `EmptyState`/`ErrorState`/`LoadingState` ya existen y están ampliamente adoptados (§7) — el problema es cobertura, no ausencia de sistema.
- `PageContainer` y `StatCard` ya existen — el arreglo es **terminar una migración empezada**, no diseñar algo nuevo.
- Stack sobre `@base-ui/react` (no Radix) coincide exactamente con la nueva familia de bloques oficiales de shadcn/ui (§14), lo que abre una vía de bajo riesgo para el sidebar premium (§6).

---

## 4. Auditoría de navegación

**Sidebar desktop** (`components/nav/sidebar.tsx`, 135 líneas): Inicio `/`, Mi objetivo `/#goal`, Explorar `/#travel`, Mi viaje `/trips` | Wallet `/rewards` | Perfil `/profile` — 6 ítems en 3 grupos.
**MainNav mobile** (`components/nav/main-nav.tsx`, 71 líneas): Inicio `/`, Explorar `/search`, Mi viaje `/trips`, Wallet `/rewards`, Perfil `/profile` — 5 ítems, una fila.

**Respuestas a las preguntas pedidas**:
- ¿Entiendo VIAO en 5 segundos? — No con claridad: 3 de 6 ítems de escritorio (Explorar, Mi viaje, y el propio hero de Home) siguen orientados a viajes, mientras Missions —parte central de la estrategia ya `LOCKED`— no tiene ninguna presencia visible.
- ¿Elementos duplicados/confusos? — "Explorar" (significado distinto por dispositivo, ya señalado).
- ¿Qué debería desaparecer o reducirse de peso? — El framing de viaje como protagonista de la navegación, dado que Travel está `FROZEN` desde hace varios bloques de esta sesión.

**No se propone tocar Partners** — su ausencia de navegación es una decisión de diseño ya establecida (acceso solo por token, curado manualmente), no un defecto a corregir aquí.

---

## 5. Auditoría del sidebar

Cubierta en detalle en §4 y §6. Hallazgo adicional: el indicador de estado activo difiere entre desktop (barra izquierda de 3px + color, `sidebar.tsx:69-85`) y mobile (solo color de texto/icono) — dos tratamientos de "dónde estoy" distintos según el dispositivo.

---

## 6. Auditoría del dashboard (Home)

`app/page.tsx` combina: hero de viaje o saludo → `GoalCard` → `MissionsSummary` → línea de saldo de Points → chips de destino/búsqueda — sin una acción primaria única. Bajo el marco pedido:

| Elemento | Estado actual |
|---|---|
| Primary action | No definida con claridad — compite entre "crear Goal" y "buscar destino" |
| Primary metric | Ambigua entre progreso del Goal y saldo de Points (ambos visibles, ninguno jerárquicamente dominante) |
| Current progress | `GoalCard` lo muestra bien cuando hay Goal activo (`goal-card.tsx`, barra `Progress` real) |
| Next action | No explícita — no hay un "qué hago ahora" claro tras ver el progreso |
| Relevant reward | No aparece en Home — solo accesible entrando a `/rewards` |
| Relevant mission | Sí, vía `MissionsSummary`, pero con el mismo peso visual que el resto |

No se propone rediseño concreto en esta fase — se documenta el hallazgo para J3.

---

## 7. Auditoría de landing

No existe landing separada — `app/page.tsx` bifurca todo dentro del mismo árbol según sesión/datos, no según ruta. Estado deslogueado: saludo estático + un único CTA "Crear cuenta" (`app/page.tsx:190-204`) — sin mención de viajes (correcto, coherente con Travel `FROZEN`), pero también sin ninguna explicación de qué es VIAO. Esto es una oportunidad real, no solo un problema: hoy no hay ningún riesgo de que la landing "venda viajes" porque, literalmente, no vende nada — el vacío es la propia oportunidad a llenar en una fase futura, centrada en Goals/Points/Rewards/Missions/Partners.

---

## 8. Auditoría visual

Ver inconsistencias completas en §2 y el inventario del sistema en §9. Resumen de lo más relevante no repetido arriba: escala de `<h1>` en 4 tamaños distintos para el mismo rol semántico (`text-xl` en 4 archivos, `text-2xl` en 5, `text-3xl md:text-4xl/5xl` solo en Home) — y las 5 pantallas de auth **no tienen `<h1>` en absoluto**, usan `CardTitle` (`card.tsx:41`, `text-base font-medium`) como título de página de facto, un nivel por debajo de cualquier otra pantalla.

---

## 9. Design System VIAO — propuesto (formalización, no reinvención)

| Token | Decisión propuesta | Por qué |
|---|---|---|
| **Color** | Mantener la paleta OKLCH actual (`globals.css:79-131`) tal cual — ya resuelve contraste y dark mode correctamente | Ya funciona, ya está documentada, tocarla sin motivo sería sobre-diseño (regla anti-sobre-diseño del propio encargo) |
| **Tipografía** | Mantener Geist Sans único (sin tipografía de titulares separada) pero **formalizar una escala de 4-5 pasos** para `<h1>`/`<h2>`/body, aplicada igual en todas las pantallas, auth incluida | Hoy hay 4 tamaños de `<h1>` de facto y las pantallas de auth carecen de uno — inconsistencia real, no estética gratuita |
| **Radius** | Mantener la escala actual (`--radius: 0.75rem` base) pero **unificar Button `default`/`sm`** para que la altura sí difiera, no solo el radio recortado | Hoy `default` y `sm` son ambos `h-11` — la escala de tamaño pierde expresividad |
| **Sombra** | No añadir sombras nuevas por defecto — el estilo plano (`ring-1 ring-foreground/10`) ya es coherente con la referencia Apple/Revolut de "precisión sin ruido" | Añadir sombra "porque sí" sería exactamente el sobre-diseño que el encargo prohíbe |
| **Espaciado** | Mantener utilidades Tailwind estándar, sin escala custom nueva | No hay evidencia de que falte una escala propia — el problema real es el `PageContainer` sin terminar de migrar (§2.4), no la falta de tokens |
| **Iconografía** | Documentar explícitamente cuándo aplica el tinte de color por módulo (hoy solo en `app/trips/[id]/page.tsx`) frente al uso neutro (`text-muted-foreground`) en el resto — o elegir uno de los dos como regla única | Hoy conviven dos filosofías sin ninguna regla escrita |
| **Estados** | Formalizar `EmptyState`/`ErrorState`/`LoadingState` como obligatorios en todo Server Component nuevo, y **rellenar la cobertura que falta** (§2.2) en los existentes | El sistema ya existe — falta aplicarlo de forma universal, no diseñar uno nuevo |

---

## 10. UX del core loop

`Goal → actividad → Points → Mission → Reward → progreso` se entiende parcialmente: `GoalCard` comunica bien "qué estoy consiguiendo" (progreso visual real). Se rompe en "qué tengo que hacer" — no hay ningún enlace visible desde Home hacia una actividad concreta que genere Points (coherente con que Partners no tiene navegación, correcto por diseño, pero deja un vacío de "próxima acción" en la propia Home). Falta también un puente visible entre `MissionsSummary` y `GoalCard` — ambas cards existen una junto a otra sin ninguna conexión visual que explique que las Missions alimentan el mismo progreso.

---

## 11. Responsive

Solo 6 archivos en todo el repositorio usan clases de breakpoint reales (`sidebar.tsx`, `main-nav.tsx`, `app-shell.tsx`, `page-container.tsx`, `app/page.tsx`, `app/search/results/page.tsx`, `dialog.tsx`, `input.tsx`). Las 11+ pantallas restantes (Rewards, Trips, Trips detail, Vision, Profile, las 4 de auth, Onboarding, AI-recommendation) usan el mismo `max-w-xl`/`max-w-sm` de columna única en cualquier ancho de viewport. **No es que mobile se sienta como desktop comprimido — es al revés: desktop se siente como mobile expandido**, con mucho espacio vacío en pantallas anchas. Esto es coherente con el hallazgo §2.5 (falta de jerarquía) y es probablemente el mayor contribuyente individual a una percepción de "MVP" en vez de "producto premium" en escritorio.

---

## 12. Accesibilidad

Base real y consistente: `focus-visible` uniforme en primitivas (§3); `label`/`htmlFor` correctamente emparejados en todos los formularios; `Progress` obtiene `role="progressbar"`/`aria-valuenow` real de `@base-ui/react`, con un fix explícito de hidratación SSR/cliente ya documentado en el propio código (`progress.tsx:28-39`); `PropertyImage` tiene un patrón sólido de fallback con `aria-hidden` (`property-image.tsx:48-61`). `aria-label` aparece en solo 3 sitios, pero es defendible dado el uso correcto de `label`/`htmlFor` en el resto. **No verificado en esta pasada** (`DATO A VERIFICAR`): manejo explícito de `prefers-reduced-motion` — no se encontró evidencia ni en un sentido ni en otro.

---

## 13. Microcopy

Todo el copy pasa por `t()` (`lib/i18n`), no se auditó literal cadena por cadena en este bloque — sería una pasada específica sobre `lib/i18n/es.ts` en una fase posterior. Hallazgo de estructura ya cubierto en §8: las pantallas de auth carecen de un título de página real (`<h1>`), apoyándose en el `CardTitle` del formulario como único título visible. El disclaimer de Rewards ("no es dinero real", `app/rewards/page.tsx:95-100`) ya es un buen ejemplo de tono humano y directo — usarlo como referencia de estilo para el resto.

---

## 14. Referencias externas (principios, no interfaces copiadas)

| Referencia | Principio aplicable a VIAO |
|---|---|
| Apple | Una sola jerarquía de foco en Home (§6) — hoy hay varias compitiendo |
| Revolut | El disclaimer ya existente de Rewards (§13) es exactamente ese instinto de claridad de saldo/estado — extenderlo al resto de la app |
| Airbnb | Contenido visual solo cuando aporta — Partner dashboard (`partner-dashboard-view.tsx`) ya sigue este principio razonablemente bien, usarlo como referencia interna |
| shadcn/ui | Consistencia y composición — el propio `PageContainer`/`StatCard` sin terminar de adoptar es la brecha, no la falta del principio |

---

## 15. GitHub evaluados

**Recomendación única, con justificación de descarte de alternativas**: los **bloques oficiales de sidebar de shadcn/ui** ([ui.shadcn.com/blocks/sidebar](https://ui.shadcn.com/blocks/sidebar)) — desde febrero de 2026 disponibles en variante **Base UI**, no solo Radix ([shadcn/ui changelog](https://ui.shadcn.com/docs/changelog/2026-02-blocks)). Compatibilidad: **exacta** — VIAO ya usa `@base-ui/react` (no Radix, confirmado en `package.json`), y ya tiene el CLI `shadcn` instalado (`package.json`, dependencies) y `components.json` configurado. Licencia: primera parte, mismo origen que el resto de `components/ui/` ya en el repo. Mantenimiento: activo (changelog de 2026). Simplicidad de integración: se instala con el mismo flujo `npx shadcn add` ya usado para el resto de componentes — cero dependencia nueva.

**No se evaluaron ni recomiendan repositorios de terceros** — la opción oficial supera a cualquier alternativa comunitaria en compatibilidad, mantenimiento y claridad de licencia, y el encargo pide explícitamente priorizar la opción más simple de integrar. No se ha instalado nada.

---

## 16. Skills evaluadas

Del listado de skills disponibles en esta sesión: **no existe una skill específica de "shadcn"**. Candidatas de valor real para una fase de implementación futura (**no invocadas en este bloque**): `design-review` (auditoría visual con ojo de diseñador sobre la app ya corriendo) y `design-consultation` (para formalizar el Design System si se quisiera ir más allá de lo ya propuesto en §9). Ninguna se instala ni se invoca aquí.

---

## 17. Matriz de prioridad

| Mejora | Impacto | Esfuerzo | Prioridad |
|---|---|---|---|
| Cobertura de `loading.tsx` en las 7 pantallas sin estado de carga | Alto | Bajo (patrón ya existe, `LoadingState`) | **P0** |
| Terminar migración a `PageContainer` (6 archivos pendientes) | Alto | Bajo (componente ya existe) | **P0** |
| Unificar escala de `<h1>` + darle título real a las 5 pantallas de auth | Alto | Bajo-medio | **P0** |
| Jerarquía única de foco en Home | Alto | Medio | **P1** |
| Resolver "Explorar" desktop≠mobile | Alto | Medio (toca Sidebar y MainNav, blast radius amplio) | **P1** |
| Adoptar el sidebar oficial de shadcn/ui (Base UI) | Medio-alto | Medio | **P1** |
| Responsive real en pantallas de contenido (desktop) | Alto | Medio-alto (toca muchas pantallas) | **P1** |
| Activar `Dialog` para confirmaciones (ej. cancelar Goal) | Medio | Bajo-medio | **P2** |
| `error.tsx` a nivel de ruta | Medio | Bajo | **P2** |
| Unificar filosofía de color de iconos | Bajo-medio | Bajo | **P2** |
| Usar `StatCard` también en Home | Bajo | Bajo | **P3** |
| Limpiar `home-search-form.tsx` huérfano | Bajo | Muy bajo | **P3** |

---

## 18. Arquitectura UX propuesta

**Actual** (desktop): Inicio · Mi objetivo (`#goal`) · Explorar (`#travel`) · Mi viaje · — Wallet · — Perfil.

**Propuesta a evaluar** (no decidida, requiere su propio turno de aprobación):

```
MAIN
- Inicio        /
- Mi objetivo   (Goals)
- Missions      (hoy sin ninguna presencia de navegación — hueco real)
- Wallet        /rewards

SECUNDARIO (menor peso, coherente con Travel FROZEN)
- Explorar/Mi viaje — mantener accesibles, pero sin competir visualmente
  con el core loop actual

ACCOUNT
- Perfil
```

**Partners permanece sin entrada de navegación**, por diseño ya establecido — no se propone cambiar esto.

---

## 19. Plan de implementación (fases, sin ejecutar)

| Fase | Archivos probables | Riesgo | Impacto | Dependencias |
|---|---|---|---|---|
| J1 Design System | `app/globals.css`, `components/ui/button.tsx` | Bajo | Alto | Ninguna |
| J2 Navigation | `components/nav/sidebar.tsx`, `components/nav/main-nav.tsx`, posible adopción de bloque oficial (§15) | Medio-alto (afecta toda la app) | Alto | J1 |
| J3 Dashboard | `app/page.tsx`, `app/goal-card.tsx`, `app/missions-summary.tsx` | Medio | Alto | J1, J2 |
| J4 Core screens | `app/rewards/*`, `app/trips/*`, `app/profile/page.tsx`, migración `PageContainer` restante | Medio | Alto | J1 |
| J5 Landing | `app/page.tsx` (estado deslogueado) | Bajo | Alto | J1 |
| J6 Responsive | Todas las pantallas sin breakpoints (§11) | Medio | Alto | J1, J4 |
| J7 Microinteractions | `components/ui/dialog.tsx` (activar), transiciones puntuales | Bajo-medio | Medio | J2-J4 |
| J8 QA | Toda la app | — | — | J1-J7 |

---

## 20. Riesgos

Tocar `sidebar.tsx`/`main-nav.tsx` tiene el mayor radio de impacto de todo el plan (se renderiza en cada página vía `app-shell.tsx:14-26`) — cualquier cambio ahí debe probarse en todas las rutas, no solo Home. Cambiar "Explorar" a mitad de Beta comercial (FASE I en curso) podría confundir a los primeros usuarios si coincide con conversaciones comerciales activas — coordinar el timing con FASE I. Riesgo de sobre-diseño explícitamente vetado por el propio encargo — la matriz de prioridad (§17) existe precisamente para evitarlo.

---

## 21. Archivos que probablemente deberían modificarse (en J-B, no ahora)

`components/nav/sidebar.tsx`, `components/nav/main-nav.tsx`, `components/layout/page-container.tsx` + las 6 páginas pendientes de migrar, `app/globals.css` (ajustes menores de tipografía/radius), `components/ui/button.tsx`, `app/page.tsx`, `app/goal-card.tsx`, `app/missions-summary.tsx`, adición de varios `loading.tsx`.

## 22. Archivos que NO deberían tocarse

Todo `app/partners/`, `lib/partners/`, `supabase/migrations/`, `lib/rewards/`, `lib/goals/`, `lib/missions/` (lógica económica — fuera de alcance de una fase de UX/UI), `docs/decisions/DECISION_LOCK_ECONOMIC_MODEL_V1.md`, cualquier Decision Lock existente, la estructura de `lib/i18n/*.ts` (el contenido de copy puede revisarse en el futuro, la estructura de claves no se toca en una fase visual).

---

## 23. Validación Git

```
git status → solo docs/ux/ (nuevo) + documentos ya creados en bloques anteriores + .gstack/ preexistente
git diff --check → sin salida
```

Ningún archivo de código, Supabase, Vercel, `RW1-RW6`, `L12`, ni el modelo económico fue modificado.

---

HARD STOP.

FASE J-A completada.

Se ha realizado únicamente auditoría y propuesta.

No se ha implementado ningún cambio.

No se ha modificado código.
No se ha modificado Supabase.
No se ha modificado Vercel.
No se han modificado RW1-RW6.
No se ha modificado L12.
No se ha modificado el modelo económico.
No se ha modificado la lógica de negocio.

La siguiente acción requerirá autorización explícita:
FASE J-B — IMPLEMENTACIÓN PREMIUM PRODUCT EXPERIENCE.
