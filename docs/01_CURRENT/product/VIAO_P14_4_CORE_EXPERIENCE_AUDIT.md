---
STATUS: CURRENT
ERA: Partners Two-Sided Ecosystem
DOMAIN: Producto (Home + Goal + Missions + Wallet + Partners, como un único sistema)
AUTHORITY: Auditoría pura — no autoriza implementación por sí misma. Cada recomendación requiere su propio turno de autorización explícita, igual que cualquier otro bloque de VIAO.
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-09-04 (creación — P14.4 Core Experience Audit)
---

# VIAO — P14.4 CORE EXPERIENCE AUDIT

**Fecha**: 2026-09-04. **Estado**: AUDITORÍA COMPLETA, sin implementación. **Metodología**: lectura directa y completa del código real (Home, Goal, Missions, Wallet/Rewards, Partners, Navigation — lista exacta de archivos abajo), sin asumir que la estructura actual es correcta, contrastado con evidencia visual ya reunida en turnos anteriores de esta sesión (capturas reales de `/`, `/partners`, `/partner/login`, desktop 1280×800 y mobile 375×812). No se creó ninguna sesión/cuenta nueva en producción para esta auditoría (habría sido una escritura en base de datos, fuera de alcance de un bloque audit-only) — la vista de Home autenticada con `balance`/`activeGoal` reales se reconstruye a partir del código (determinista, sin ramas ocultas) más las capturas anónimas ya existentes, no de una captura autenticada nueva. Se marca explícitamente donde esto aplica.

**Archivos inspeccionados**: `app/page.tsx`, `app/goal-card.tsx`, `app/missions-summary.tsx`, `app/home-landing.tsx`, `app/landing-first-experience.tsx` (referenciado, no citado en detalle), `lib/goals/get-goal.ts`, `lib/goals/calculate-progress.ts`, `lib/missions/get-missions-status.ts`, `lib/missions/rules.ts`, `lib/rewards/get-wallet-balance.ts`, `app/rewards/page.tsx`, `app/rewards/reward-catalog.tsx`, `app/partners/page.tsx`, `app/partners/partner-card.tsx`, `lib/partners/get-active-partners.ts`, `lib/partners/get-partner-by-slug.ts`, `components/nav/sidebar.tsx`, `components/nav/main-nav.tsx`, `lib/i18n/es.ts` (claves `home.*`, `goals.*`, `missions.*`, `rewards.*`), más todo lo ya auditado en profundidad en P14.2/P14.3 (Partner Dashboard/perfil público/navegación), reutilizado aquí sin repetir la lectura.

---

## 1. Executive Summary

VIAO tiene un Core Loop real y coherente en el backend (`Goal → Points → Missions/Partners → progreso → Reward`), y Home ya sigue el principio "una pantalla orienta, las demás profundizan" mejor de lo que el brief de este bloque parecía anticipar — la estructura actual (Hero → Goal → Missions → teasers de Partners/Wallet) no es un dashboard de 10 cards, es 3 bloques + 2 líneas. El problema real no es "demasiado en una pantalla": es que **dos piezas del propio sistema se contradicen entre sí**, y que **el descubrimiento progresivo se agota rápido** una vez completada la primera semana. Los 10 hallazgos principales:

1. **🔴 Contradicción estructural Goal↔Wallet**: el progreso del Goal es literalmente `walletBalance / targetPoints`. Canjear una Reward reduce `walletBalance` — y por tanto **reduce visiblemente el progreso del Goal**. El propio loop que Home promete ("cada Point te acerca a tu objetivo") se rompe en el momento exacto en que el usuario usa Wallet para lo que Wallet existe.
2. **🔴 Partners tiene dos significados desconectados**: Partners-como-Discovery (`getActivePartners()`, dónde ganas Points) y `reward.partnerName` (texto libre en el catálogo de Rewards, dónde canjeas) no están relacionados por ningún dato — un usuario puede ganar en "Partner A" y ver una Reward "en Partner B" sin ninguna conexión visible.
3. **🟠 Descubrimiento progresivo se agota en ~1 semana**: de las 4 Missions, 2 son `lifetime` (se hacen una vez) y solo 2 son `weekly`. Una vez completadas ambas la primera semana, no hay nada nuevo que "descubrir" hasta la semana siguiente — el Nivel 3/4 de progressive discovery que pide este bloque no tiene con qué sostenerse hoy.
4. **🟠 Microcopy con lenguaje de viajes superviviente**: `goals.createDescription` = "Elige un **destino** y cuántos Points quieres reunir" — contradice directamente el propio Core Reset ("VIAO no es una app de viajes") documentado en los comentarios del mismo archivo de i18n, dos líneas más abajo.
5. **🟡 `targetDate` se captura y nunca se muestra**: `GoalForm` pide una fecha objetivo opcional; `ActiveGoalCard` nunca la renderiza después de creado el Goal.
6. **🟡 Navigation: 6 items, pero solo 4 destinos reales**: "Inicio" y "Mi objetivo" y "Missions" son 3 entradas de navegación que apuntan a la misma URL (`/`, con o sin ancla) — no 3 pantallas distintas.
7. **🟡 Wallet no abre con el dato más orientador**: el saldo (`rewards.balanceLabel`) es la 3ª de 4 cards de `/rewards`, no la primera.
8. **🟡 Cero conexión visual entre "por qué gané esto" y "para qué me sirve"**: Missions/Partners explican cómo ganar Points; Wallet explica el historial; pero nada conecta "acabas de ganar 10 Points" con "te faltan X para tu Goal" en el momento mismo de ganar (no hay ningún toast/confirmación post-acción en el código auditado).
9. **🟢 El Hero de Home ya resuelve bien el "primer contacto"**: título + subtítulo + CTA responden qué es VIAO y cuál es la siguiente acción en las primeras líneas, sin necesitar scroll.
10. **🟢 La arquitectura de información ya es mayoritariamente correcta**: Goal/progreso/próxima acción en Home; historial/detalle en Wallet; catálogo de negocios en Partners — el problema no es dónde vive cada cosa, es la coherencia narrativa entre ellas.

---

## 2. Current Experience

VIAO hoy es, en una frase: *"Gana Points haciendo cosas (Missions, actividad con Partners), acumúlalos hacia un Goal que tú defines, y cámbialos por Rewards cuando quieras."* Esa frase es coherente y ya está bien representada en el código y el copy. El sistema real, componente a componente:

- **Home** (`app/page.tsx`): Server Component único, sin sub-rutas. Resuelve `balance`/`activeGoal`/`missions` en paralelo (todas condicionadas a que exista sesión) y renderiza: Hero → línea de Points (si hay sesión) → CTA → `GoalCard` (ancla `#goal`) → `MissionsSummary` (ancla `#missions`) → `HomeLanding` (solo sin sesión) → teaser Partners → teaser Points/Wallet.
- **Goal** no es una ruta propia — vive dentro de Home (`GoalCard`), con creación/cancelación inline, sin historial de Goals pasados, sin edición del objetivo ya creado.
- **Missions** no es una ruta propia — vive dentro de Home (`MissionsSummary`), 4 Missions fijas en código (`lib/missions/rules.ts`), sin UI para "todas las Missions"/historial fuera de Home.
- **Wallet** (`/rewards`) es la única ruta con contenido propio de las cuatro: catálogo de Rewards + canje, historial de redenciones, saldo, historial de transacciones — en ese orden.
- **Partners** (`/partners`, `/partners/[slug]`) ya auditado en profundidad en P14.2/P14.3: Discovery pública, perfil mínimo, sin buscador/filtro.
- **Navigation**: `Sidebar`/`MainNav` comparten exactamente los mismos 6 items desde P14.3-A (Inicio, Mi objetivo, Missions, Wallet, Partners, Perfil).

---

## 3. Core Journey

### A. Primer contacto (usuario nuevo, sin sesión, primeros 5-10 segundos)

Lee, en orden, sin hacer scroll (confirmado por la captura ya reunida de `/` anónimo en 1280px, turno anterior): título ("Tu actividad de cada día te acerca a tu próximo objetivo"), subtítulo ("Elige un objetivo, gana Points con lo que ya haces y avanza hacia él"), botón "Ver cómo funciona". **¿Responde las 4 preguntas del brief?**

| Pregunta | ¿Se responde en 5-10s? |
|---|---|
| ¿Qué es VIAO? | 🟡 Parcial — dice qué se *hace* (perseguir un objetivo con Points), no qué *es* el producto en una frase reconocible ("app de fidelización local", etc. — nunca dicho explícitamente en ningún punto) |
| ¿Qué tengo que hacer? | 🟢 Sí — "Elige un objetivo" + CTA |
| ¿Qué gano? | 🟡 Parcial — "Points" se nombra pero no se explica hasta la sección siguiente ("¿Qué son los Points?", tras un scroll) |
| ¿Cuál es mi siguiente acción? | 🟢 Sí — un único CTA, sin ambigüedad |

**Conclusión**: el primer contacto es honesto y no está sobrecargado, pero deja "¿qué es VIAO?" y "¿qué gano exactamente?" para el segundo scroll — aceptable, no un fallo grave, pero no es un PASS completo a la pregunta literal del brief.

### B. Usuario logueado, sin scroll (reconstruido desde código — ver nota metodológica)

Ve, en orden: saludo + saldo de Points (línea compacta, ej. "0 Points" si es nuevo) + CTA ("Crear mi objetivo" o "Ver mi objetivo") + el propio `GoalCard`. Es decir: **orientación inmediata sí ocurre** — saldo y próxima acción están antes del primer scroll en la mayoría de tamaños de pantalla.

---

## 4. Home Audit

Contenido real de Home hoy (ver Sección 2/3), evaluado elemento a elemento:

| Elemento | ¿Debe permanecer? | ¿Subir/bajar? | Motivo |
|---|---|---|---|
| Hero (título+subtítulo+saldo+CTA) | Sí | — | Ya cumple "orientación inmediata" |
| GoalCard | Sí | — | Correcto que sea lo primero tras el Hero — es el protagonista declarado |
| MissionsSummary | Sí, pero revisar tamaño | Podría bajar de peso visual aún más | Ya usa `size="sm"`; su contenido (4 filas) es el elemento más largo de Home — compite en longitud con el propio Goal |
| Teaser Partners | Sí | — | Correcto como enlace de descubrimiento, no como contenido completo |
| Teaser Points/Wallet | Sí, pero es redundante con la línea del Hero | Considerar fusionar | El saldo ya se mostró arriba en el Hero; aquí se repite en formato más grande — dos apariciones del mismo número en la misma pantalla |
| HomeLanding (anónimo) | Sí, fuera del alcance de "usuario logueado" | — | Ya auditado en UX-14, no es el foco de este bloque |

**Qué sobra**: la duplicación del saldo (Hero + teaser final) sin que ninguna de las dos apariciones añada información que la otra no tenga.
**Qué falta**: ninguna confirmación/feedback inmediato tras completar una Mission o registrar actividad con un Partner (ver Hallazgo #8) — Home siempre muestra el estado "frío", nunca "acabas de...".

---

## 5. Principio 70/30

**Orientación (saldo, Goal, progreso, próxima acción)**: Hero + GoalCard ≈ 2 de 5 bloques visuales de Home logueado.
**Descubrimiento (Missions, Partners, nuevas acciones)**: MissionsSummary + teaser Partners + teaser Wallet ≈ 3 de 5 bloques.

Numéricamente esto es más cerca de 40/60 (descubrimiento) que de 70/30 (orientación) — **pero la proporción visual/de peso no es la misma que la de conteo de bloques**: GoalCard es la card más grande y la primera tras el Hero (mayor peso real), mientras que los dos teasers finales son una sola línea cada uno (peso mínimo). Ponderado por espacio ocupado en pantalla, Home logueado se acerca más a un 60/40 orientación/descubrimiento — más cerca del principio pedido que un conteo ingenuo de secciones sugeriría. **No es un incumplimiento grave**, pero MissionsSummary (una card completa, con 4 filas) empuja la balanza hacia "descubrimiento" más de lo que su propio contenido justifica: son las mismas 4 Missions cada semana, no contenido nuevo cada vez — funcionalmente es más "orientación recurrente" (qué me falta esta semana) que "descubrimiento" real.

---

## 6. ¿Todo en una pantalla?

| Elemento | Home | Otra pantalla | Motivo |
|---|---|---|---|
| Goal actual | ✅ | | Es el ancla del sistema — debe verse sin navegar |
| Progreso | ✅ | | Mismo motivo, va pegado al Goal |
| Balance Points | ✅ (resumen) | ✅ (detalle, Wallet) | Resumen en Home para orientar; detalle/historial en Wallet — ya es así hoy, correcto |
| Próxima acción | ✅ | | Es literalmente la función de Home |
| Missions | ✅ (resumen) | 🟡 (opcional: histórico) | El estado actual (4 filas) cabe en Home; un histórico de Missions pasadas completadas no existe hoy y, si se construyera, no debería vivir en Home |
| Historial Missions | | ✅ (no existe hoy) | No compite con "próxima acción" |
| Partners | 🟡 (teaser) | ✅ (Discovery completo) | Ya es así — correcto |
| Detalle Partner | | ✅ | Ya es así (`/partners/[slug]`) — correcto |
| Wallet (catálogo+canje) | | ✅ | Correcto que no esté en Home — es una decisión deliberada, no un olvido |
| Historial Points | | ✅ | Mismo motivo |
| Configuración Goal | 🟡 (crear/cancelar) | ✅ (editar objetivo, si se construye) | Hoy solo existe crear/cancelar, ambos en Home — correcto para esas dos acciones; una futura "edición" (cambiar target/fecha) no tiene por qué vivir en Home |

**Conclusión de arquitectura**: la división actual entre Home y el resto ya es, en líneas generales, la correcta. No hace falta mover nada a Home ni sacar nada de Home hoy — el problema de este sistema no es de ubicación, es de coherencia (Hallazgos #1/#2/#8).

---

## 7. Progressive Discovery

**Nivel 1** (entra): saldo + Goal — ✅ existe tal cual, confirmado en código.
**Nivel 2** (completa una acción → descubre Partners): 🟡 **no existe como secuencia real**. No hay ningún estado "acabas de ganar Points" que revele Partners a continuación — `MissionsSummary` ya muestra el explicador de Partners permanentemente (`missions.partnerExplainer`, "se muestra siempre", según el propio comentario del código), no como una revelación posterior a completar algo. El Nivel 2 conceptual del brief ya está "desplegado" desde el primer instante, no descubierto progresivamente.
**Nivel 3** (descubre Missions esta semana): mismo caso — `MissionsSummary` está siempre visible en Home, no aparece "después" de nada.
**Nivel 4** (nuevas formas de avanzar): 🔴 **no existe estructura para esto hoy**. Una vez hechas las Missions de la semana y sin más Partners que visitar, no hay ningún mecanismo (ni de código ni de contenido) que introduzca algo "nuevo" — no hay Missions rotativas, ni notificaciones de nuevos Partners, ni ningún tipo de "sorpresa" o expansión.

**Respuesta directa a la pregunta del brief** ("¿VIAO tiene estructura suficiente para progressive discovery real?"): **No, todavía no.** Hoy VIAO muestra *todo* desde el primer segundo (lo cual, dicho de otro modo, es coherente con que Home no es un dashboard sobrecargado — hay poco que mostrar) en vez de revelar por capas. Esto no es necesariamente un error de diseño — a este volumen de contenido (4 Missions, unos pocos Partners), fingir una revelación progresiva podría sentirse artificial. Pero si VIAO crece (más Missions, más Partners, más categorías), la estructura actual (todo siempre visible) no escala hacia el modelo de niveles que pide este bloque sin trabajo de diseño nuevo.

**Piezas que faltarían si se decide construir progressive discovery real**: (a) un mecanismo de "Missions nuevas"/rotación más allá de las 4 fijas actuales; (b) algún tipo de notificación/confirmación inmediata tras completar una acción, que sirva de gancho hacia el siguiente descubrimiento; (c) contenido diferenciado para "ya visitaste 1 Partner" vs. "todavía no has visitado ninguno" (hoy el explicador de Partners es idéntico siempre).

---

## 8. Goal Audit

`Objetivo → progreso → Points → siguiente acción`: el título y la barra de progreso comunican objetivo/progreso con claridad (`goal.title` en `text-2xl`, `Progress` accesible con `aria-valuenow`). Lo que **no** queda claro:

- **Contradicción con Wallet (Hallazgo #1, repetido aquí por ser el hallazgo central de esta sección)**: `calculateGoalProgressPercent(walletBalance, targetPoints)` — el progreso ES el saldo disponible, no un acumulado histórico de "Points ganados hacia este objetivo". `goals.progressMotivation` dice literalmente "Cada Point que ganas te acerca a este objetivo" — cierto solo mientras no canjees nada. El propio código conserva la columna `points_at_goal_creation` sin usarla (comentario explícito en `get-goal.ts`: "no eliminar todavía") — es decir, el propio equipo ya sabía que existía un modelo alternativo (acumulado histórico, inmune a canjes) y decidió, por ahora, el modelo que sí puede retroceder. Esto no es un bug de implementación — es una decisión de producto ya tomada (`GOAL_PROGRESS_MODEL=WALLET_BALANCE`, Decision Lock) — pero el copy actual no refleja esa consecuencia: en ningún punto se le dice al usuario "si canjeas una Reward, tu Goal retrocede".
- **`targetDate` capturado y nunca mostrado**: el usuario puede poner una fecha objetivo al crear el Goal; después de creado, `ActiveGoalCard` no la renderiza en ningún punto — dato recogido, invisible después.
- **Sin historial de Goals**: cancelar un Goal no dice qué pasó con el anterior en ningún lado visible (aunque `cancelGoalAction` existe y funciona) — un usuario que cancela y crea uno nuevo no tiene forma de ver "objetivos anteriores".
- **Relación con Missions/Partners**: clara a nivel de copy (`goals.progressMotivation`, `missions.partnerExplainer` mencionan el Goal explícitamente) — esta parte sí funciona bien.

---

## 9. Missions Audit

Respuesta a la pregunta A/B/C/D del brief: **hoy Missions es literalmente la opción C** (aparece contextualmente desde Home, vía `MissionsSummary` embebida) — no es una sección permanente con ruta propia (no hay `/missions`), tampoco es una herramienta puramente secundaria (tiene peso visual real en Home). No hay evidencia de que esto sea un problema de descubrimiento (siempre visible en Home = imposible no verla), pero tampoco hay una vía para profundizar (ver "todas las Missions pasadas", o Missions futuras) — el `C` actual está incompleto frente a un eventual `D` (combinar con una vista propia para quien quiera profundizar).

**Fatiga/exceso de tareas**: con solo 4 Missions fijas, 2 de ellas `lifetime` (se agotan para siempre tras completarse una vez), el riesgo de "lista interminable de tareas" es bajo hoy — si acaso, el riesgo real es el opuesto (ver Sección 7): quedarse sin nada que hacer después de la primera semana activa.

---

## 10. Partners Audit

El flujo conceptual del brief (`Goal → Necesito Points → ¿Cómo los gano? → Partners/Missions/otras acciones → Actividad → Points → Goal`) **sí está representado en el copy** (`home.landingCycleTitle` en `HomeLanding`, y `missions.partnerExplainer` en Home logueado) — el ciclo se explica correctamente como concepto. Pero, como ya estableció P14.2, la "actividad" real hoy es 100% autodeclarada (sin verificación), y como establece esta auditoría (Hallazgo #2), el otro extremo del ciclo (Rewards, dónde "gastas" lo ganado) usa una noción de "Partner" (`reward.partnerName`, texto libre) que no está conectada con la tabla real `partners` — un Partner donde ganas y un "Partner" donde gastas son, hoy, dos conceptos de datos completamente distintos que comparten solo el nombre en la UI. **Partners es hoy una sección independiente con un vínculo conceptual (copy) al Goal, no un vínculo de datos/UX real** — sigue pareciendo, en la práctica de uso, más una lista de comercios que un paso natural del propio loop de ganar Points.

---

## 11. Wallet Audit

Combinación de las 4 funciones del brief: principalmente **historial + herramienta de confianza** (código de canje visible, texto "no son dinero" repetido dos veces en la misma pantalla — `rewards.pointsExplainer` y `rewards.provisionalNote`, cada uno en su propia línea, dentro de la misma Card). Como **herramienta financiera/contable** funciona razonablemente (transacciones con signo, iconos +/-, fecha, referencia). Como **confirmación de progreso hacia el Goal**, no cumple ninguna función — Wallet nunca menciona el Goal en absoluto, ni conecta el saldo mostrado con el progreso del objetivo (esa conexión solo vive en Home).

**¿El usuario necesita entrar en Wallet para entender su progreso?** No — el saldo ya está en Home (dos veces, ver Hallazgo Home). Wallet aporta lo que Home no tiene: historial detallado, catálogo de Rewards, canje. Esto ya es la división correcta.

**Orden de la propia página** (Hallazgo #7): Catálogo+canje → Historial de redenciones → **Saldo** → Historial de transacciones. El saldo, probablemente el dato más orientador de toda la pantalla ("¿cuánto tengo?"), es el 3º de 4 bloques — un usuario que entra a Wallet solo para comprobar su saldo tiene que pasar por el catálogo completo y el historial de redenciones primero.

---

## 12. Navigation / IA Audit

1. **¿Demasiadas opciones?** 6 nominalmente, mismo límite ya revisado en P14.3-A — no es "demasiado" en el sentido de saturación visual (confirmado, sin overflow en 375px). Pero es engañoso en el sentido de "cuántos destinos reales hay": ver punto 6.
2. **¿Son las correctas?** Sí, las 6 corresponden a las 6 piezas reales del sistema (incluyendo Perfil).
3. **¿El orden tiene sentido?** Inicio → Mi objetivo → Missions → Wallet → Partners → Perfil sigue aproximadamente el propio Core Loop (Goal → cómo avanzar → recompensa → dónde actuar → cuenta) — el orden ya es razonable.
4. **¿"Mi objetivo" debería ser el centro?** Conceptualmente ya lo es (primera sección de Home, protagonista visual) — pero al no tener ruta propia, "ser el centro de la navegación" y "ser el centro de Home" son cosas distintas hoy: el nav item "Mi objetivo" no lleva a una experiencia dedicada al Goal, lleva a un ancla dentro de la misma Home que "Inicio".
5. **¿Partners debería estar más cerca de Missions?** Es una recomendación razonable dado el hallazgo de la Sección 10 (vínculo conceptual, no de UX) — acercarlos en la navegación no resolvería la desconexión de datos, pero reforzaría la narrativa "esto es cómo ganas Points" si estuvieran adyacentes. Hoy Wallet se interpone entre Missions y Partners.
6. **¿Wallet debería estar más secundaria?** No hay evidencia de que deba bajar de posición — es la única de las 4 piezas con ruta y contenido propios completos, no una sub-sección de Home.
7. **¿Hay duplicidad entre Home y estas secciones?** Sí — exactamente el punto 6: "Inicio" y "Mi objetivo" y "Missions" son 3 entradas para 1 sola URL. No es necesariamente un problema (las anclas son una forma válida de navegación dentro de una página), pero **la navegación se presenta visualmente como si fueran destinos equivalentes a Wallet/Partners/Perfil (misma jerarquía, mismo tratamiento de icono+label), cuando funcionalmente no lo son** (2 de ellas no cambian de URL fuera del hash).
8. **¿Los nombres son suficientemente claros?** Sí — "Inicio", "Wallet", "Partners", "Perfil" son términos ya establecidos y sin ambigüedad. "Mi objetivo" y "Missions" son claros también, aunque su naturaleza de "ancla, no página" no es perceptible desde el propio nombre.

---

## 13. Mobile (≈375px)

**¿Qué ve primero el usuario sin hacer scroll?** (confirmado por captura real ya reunida, `/` anónimo, 375×812): título del Hero completo, subtítulo, botón "Ver cómo funciona" — el CTA cabe sin scroll incluso en un viewport pequeño. Para el usuario logueado (reconstruido desde código, mismo layout): título + saldo + CTA deberían caber igual de bien, dado que la línea de saldo es más corta que el bloque de `HomeLanding` que sustituye.

**¿Qué debería ver primero?** Ya lo ve — sin cambios necesarios aquí.

**Jerarquía/scroll/densidad**: correcta — cada sección es una `Card` con separación clara (`gap-10`), sin apilamiento denso. **Carga cognitiva**: baja — el Hallazgo real de este bloque no es densidad visual, es coherencia de contenido (Hallazgos #1/#2), no cabida en pantalla.

---

## 14. Desktop (≈1280px)

Confirmado por captura real ya reunida (`/` anónimo, 1280×800, turno anterior): Home usa `PageContainer variant="wide"`, contenido en una sola columna centrada con el Sidebar a la izquierda — no hay "demasiadas columnas" ni espacio vacío evidente (el contenido llena razonablemente el ancho disponible bajo el máximo del contenedor). El único "espacio vacío" real confirmado en esta sesión fue en `/partner/login` (ya documentado en P14.3), no en Home — no se repite aquí. **Home no necesita una composición distinta en desktop.**

---

## 15. Estados

| Estado | Siguiente acción clara | Contexto | Feedback | CTA | Descubrimiento |
|---|---|---|---|---|---|
| Usuario nuevo, sin Goal | ✅ ("Crear mi objetivo") | 🟡 (sabe que debe crear un Goal, no por qué elegir uno u otro) | — | ✅ | 🟡 (Missions/Partners visibles pero sin urgencia) |
| Con Goal, 0 Points | ✅ (barra en 0%) | ✅ | — | ✅ (Missions disponibles) | ✅ |
| Activo, con progreso | ✅ | ✅ (% visible) | 🔴 (sin confirmación de "cuánto avancé hoy") | ✅ | 🟡 (ver Sección 7) |
| Acaba de ganar Points | 🔴 sin estado dedicado | 🔴 | 🔴 (ningún toast/confirmación en el código auditado) | — | 🔴 |
| Completó una Mission | 🟡 (badge cambia a "Completada", tachado) | ✅ (visible en la lista) | 🟡 (solo visual pasivo, sin celebración) | — | — |
| No volvió esta semana | 🟡 (`return_visit` sigue pendiente, visible) | ✅ | — | ✅ (la propia Mission es el CTA implícito) | — |
| Sin Partners disponibles | ✅ (`EmptyState` ya implementado en `/partners`) | ✅ | — | — | — |
| Varios Partners disponibles | ✅ | ✅ | — | ✅ | ✅ |
| Goal completado (100%) | 🔴 **sin estado dedicado** — `Progress` se capa en 100 pero no hay ninguna pantalla/mensaje de "¡lo lograste!" | 🔴 | 🔴 | 🔴 | 🔴 |

**Hallazgo nuevo de esta sección**: no existe ningún estado de celebración para "Goal completado al 100%" — el único "momento de celebración" real de todo el código auditado es el canje de una Reward (`motion-safe:animate-celebrate`, `reward-catalog.tsx`). Alcanzar el propio Goal, que es el evento central que todo el sistema promete, no tiene ningún tratamiento especial.

---

## 16. UX Psychology

| Dimensión | Evaluación |
|---|---|
| Claridad | 🟢 Alta — copy directo, sin jerga técnica |
| Motivación | 🟡 Existe (Goal visible, progreso visible) pero debilitada por la contradicción del Hallazgo #1 |
| Progreso | 🟡 Visible numéricamente, pero sin ningún refuerzo temporal ("esta semana avanzaste X") |
| Recompensa | 🟡 Clara al canjear una Reward (único momento con celebración); ausente al ganar Points (sin feedback inmediato) |
| Curiosidad | 🔴 Baja una vez pasada la primera semana (Sección 7) |
| Control | 🟢 Alta — crear/cancelar Goal, elegir qué Mission hacer, todo bajo control del usuario |
| Repetición | 🟡 El único gancho de repetición semanal real es `return_visit` (una Mission que premia volver) — funciona, pero es el único mecanismo, no varios reforzándose entre sí |

---

## 17. Microcopy

| Texto | Problema | Dirección propuesta (no implementar) |
|---|---|---|
| `goals.createDescription`: "Elige un **destino**..." | Lenguaje de viajes superviviente, contradice el Core Reset | Sustituir "destino" por "objetivo" o el propio `title` genérico ya usado en el resto del producto |
| `goals.progressMotivation`: "Cada Point que ganas te acerca a este objetivo" | Verdadero solo mientras no se canjee nada (Hallazgo #1) — puede sentirse engañoso tras un canje | Matizar, o resolverlo a nivel de modelo antes que de copy (decisión de producto, no de texto) |
| `rewards.pointsExplainer` + `rewards.provisionalNote` | Dos frases distintas explicando "qué son los Points" en la misma Card, una detrás de otra | Podrían fusionarse en un único mensaje sin perder información |
| `home.pointsTeaserTitle`: "Tus Points" + Hero ya muestra el saldo | Repetición del mismo dato en dos formatos en la misma pantalla | Evaluar si el teaser final aporta algo que el Hero no aporte ya |
| Ningún texto de "lenguaje técnico/dashboard" encontrado | — | El copy general ya evita jerga (no hay "KPI", "conversion", etc.) — punto fuerte, no cambiar |

---

## 18. UI/UX Pro Max

- **Jerarquía visual**: correcta — tamaños de fuente, pesos y `text-success` para cifras positivas son consistentes entre Home/GoalCard/Wallet.
- **Spacing/typography**: `font-mono tabular-nums` aplicado consistentemente a todas las cifras (Points, progreso, saldo) — buen detalle ya resuelto, sin necesidad de tocarlo.
- **Cards/estados vacíos/feedback**: `EmptyState`/`ErrorState` reutilizados consistentemente en Wallet/Partners — sin duplicación de componentes de estado.
- **CTA hierarchy**: un botón primario por pantalla en cada caso auditado, sin CTAs compitiendo.
- **Accesibilidad**: `Progress` con `role="progressbar"`/`aria-valuenow` ya implementado — punto fuerte confirmado en código.
- **Consistencia con shadcn/ui**: sin desviaciones — mismos primitivos (`Card`, `Badge`, `Button`) en todas las superficies auditadas.
- **Sensación premium**: alta en el detalle micro (mono numerals, badges con 3 tratamientos distintos en Missions) — el techo real de "premium" no es visual, es narrativo (Hallazgos #1/#2/#8).

**No se propone ningún cambio de design system** — el sistema existente ya se usa bien; los hallazgos de esta auditoría son de arquitectura de producto/datos, no de UI.

---

## 19. Conversión / Activación

- **PRIMARY ACTION de Home**: crear un Goal (usuario nuevo) o avanzar hacia el Goal activo vía una Mission/Partner (usuario existente) — el propio Hero ya lo declara como CTA único.
- **SECONDARY ACTIONS**: explorar Partners, ver Wallet/Rewards, completar una Mission concreta.
- **"Este usuario ha entendido VIAO"**: creación del primer Goal (`goal_created`, que además es la Mission de mayor valor, 50 Points — la propia economía ya refleja esta intuición).
- **"Este usuario ya está en el loop"**: primera Mission semanal completada (`return_visit` o `partner_activity_registered`) — es la primera señal de que el usuario volvió y actuó, no solo se registró.

---

## 20. Core Loop

### ACTUAL (tal como el código lo ejecuta hoy)

```
Home → [Missions o actividad con Partner] → Points → Goal (progreso sube)
                                                   ↓
                                        [canje de Reward] → Points bajan → Goal (progreso baja)
```

### RECOMENDADO (conceptual, sin implementar)

```
Goal → siguiente mejor acción (Mission o Partner, elegido por el propio sistema o el usuario)
     → actividad
     → Points
     → progreso (con feedback inmediato del propio evento)
     → nuevo descubrimiento (Mission nueva / Partner nuevo / hito del Goal)
     → siguiente acción
     → repetición
```

**Qué ya existe**: Goal → acción → Points → progreso (el tramo básico está completo y funciona).
**Qué falta**: (a) "siguiente mejor acción" sugerida activamente (hoy el usuario debe decidir solo, sin ninguna recomendación); (b) feedback inmediato del evento (Hallazgo Sección 15); (c) "nuevo descubrimiento" como mecanismo recurrente (Sección 7); (d) resolución de la contradicción Goal↔Wallet antes de reforzar cualquier repetición (reforzar un loop que a veces retrocede sin explicación sería agravar el problema, no resolverlo).

---

## 21. Tabla final de decisiones

| Área | Estado actual | Problema | Recomendación | Prioridad |
|---|---|---|---|---|
| Home | Hero+Goal+Missions+teasers, ya sigue 70/30 aproximadamente | Saldo duplicado (Hero + teaser final) | Evaluar fusionar o diferenciar las dos apariciones | P2 |
| Goal | Progreso = saldo de Wallet (WALLET_BALANCE) | Canjear una Reward reduce el progreso del Goal sin advertencia | Decisión de producto: ¿aceptar la consecuencia con copy explícito, o revisar el modelo? | **P0** |
| Goal | `targetDate` capturado, nunca mostrado | Dato recogido e invisible | Mostrar la fecha en `ActiveGoalCard` si el modelo se mantiene | P2 |
| Missions | 4 fijas, 2 lifetime + 2 weekly | Se agotan tras la primera semana — sin nada nuevo que descubrir después | Evaluar Missions rotativas o ampliar el set — depende de evidencia de piloto | P1 |
| Wallet | Saldo es la 3ª de 4 cards | No es lo primero que se ve al entrar a comprobar el saldo | Reordenar (saldo primero) | P2 |
| Partners | Vínculo con el Goal es solo de copy | `reward.partnerName` (texto libre) sin relación con la tabla `partners` real | Evaluar conectar ambos conceptos de datos (FK o al menos coherencia de nombres) | **P0** |
| Navigation | 6 items, 4 destinos reales | "Inicio"/"Mi objetivo"/"Missions" son 3 entradas para 1 URL, mismo tratamiento visual que las que sí son páginas distintas | Ninguna acción urgente — documentar la asimetría, considerar si merece un tratamiento visual distinto en el futuro | P3 |
| Progressive Discovery | Todo visible desde el primer segundo | No hay revelación por niveles ni "algo nuevo" recurrente | No construir todavía sin evidencia de que el volumen de contenido lo justifique | P2 |
| Mobile | Sin scroll, CTA visible, sin densidad excesiva | Ninguno confirmado | Ninguna | — |
| Desktop | Composición correcta, sin espacio vacío destacable en Home | Ninguno confirmado (a diferencia de `/partner/login`, ya documentado aparte) | Ninguna | — |
| Activation | Primary Action clara (crear/avanzar Goal) | Ninguno | Ninguna | — |
| Core Loop | Tramo básico completo | Sin feedback inmediato al ganar Points; sin sugerencia de "siguiente mejor acción"; sin celebración al completar el Goal | Diseñar (no implementar) un evento de confirmación post-acción y un estado de "Goal completado" | P1 |

---

## 22. Propuesta de arquitectura (sin implementar)

- **HOME**: debe seguir conteniendo exactamente lo que contiene hoy — Hero, Goal (resumen+progreso+próxima acción), Missions (resumen de la semana), teasers de Partners/Wallet. No añadir más bloques nuevos sin resolver antes los Hallazgos #1/#2/#8 — añadir contenido sobre una base narrativa contradictoria empeoraría, no mejoraría, la experiencia.
- **GOAL**: si algún día gana ruta propia, debe contener lo que Home no tiene espacio para mostrar: historial de Goals pasados, edición del objetivo activo, y la fecha objetivo (hoy invisible). Mientras siga viviendo dentro de Home, al menos mostrar `targetDate`.
- **MISSIONS**: si gana ruta propia, debe contener el histórico de Missions completadas (hoy inexistente en cualquier pantalla) — Home debe seguir mostrando solo el resumen semanal actual.
- **PARTNERS**: debe seguir siendo Discovery + perfil (ya correcto, ver P14.2/P14.3) — la prioridad real aquí no es de arquitectura de pantallas, es de conexión de datos con Wallet/Rewards (Hallazgo #2).
- **WALLET**: debe seguir siendo la única pantalla con catálogo+canje+historiales completos — solo se recomienda reordenar (saldo primero), no reestructurar.
- **PROFILE**: fuera del alcance de esta auditoría (no forma parte del Core Loop evaluado aquí).

**Qué información NO debe duplicarse**: el saldo de Points no debería aparecer tres veces con el mismo peso informativo en la misma sesión de uso (Hero, teaser de Home, Wallet) — cada aparición debería aportar algo que las otras no den (Hero: orientación instantánea; Wallet: detalle/historial) en vez de repetir el mismo número sin contexto adicional, como ocurre hoy entre el Hero y el teaser final de Home.

---

## 23. Resultado — respuestas directas

**1. ¿Home debe ser un dashboard completo?** No, y hoy no lo es — la estructura actual ya respeta "una pantalla orienta, las demás profundizan". No se recomienda ningún cambio de ese principio.

**2. ¿Qué debe ver el usuario en los primeros 3 segundos?** Lo que ya ve: qué debe hacer (crear/avanzar su Goal) y cuánto tiene ahora mismo. Ya se cumple.

**3. ¿Qué debe descubrir después?** Missions de la semana, luego Partners — ya en ese orden. El problema no es el orden, es que no hay "después de después" (Sección 7).

**4. ¿Qué debe vivir fuera de Home?** Ya vive fuera correctamente: catálogo/canje de Rewards, historial, Discovery completo de Partners, perfil de Partner. No mover nada.

**5. ¿Cuál debería ser el Core Loop de VIAO?** El de la Sección 20 ("recomendado") — ya casi es el actual, solo le falta feedback inmediato, sugerencia de siguiente acción, y una resolución explícita de la contradicción Goal↔Wallet.

**6. ¿Cuál debería ser la Primary Action?** Avanzar el Goal activo (vía Mission o Partner) — ya es, de facto, la acción que el Hero empuja.

**7. ¿Cuál es la arquitectura de navegación recomendada?** La actual (6 items) es aceptable — no se recomienda ningún cambio de navegación en este bloque. La única observación (Sección 12, punto 6) es documental, no accionable todavía.

**8. ¿Qué debemos implementar primero?** Resolver o al menos comunicar explícitamente la contradicción Goal↔Wallet (P0) y decidir si conectar Partners-Discovery con `reward.partnerName` (P0) — ambas son decisiones de producto/datos, no de UI, y ambas condicionan cualquier trabajo posterior de "premium feel" o progressive discovery.

**9. ¿Qué NO debemos implementar todavía?** Progressive discovery por niveles (Sección 7), Missions rotativas, cualquier rediseño de navegación, cualquier cambio de design system — ninguno tiene evidencia suficiente o depende de decisiones P0 sin resolver primero.

**10. ¿Qué cambios son realmente necesarios para una experiencia premium?** Ninguno de naturaleza visual — el UI/UX Pro Max (Sección 18) ya está en buen estado. Lo que falta es narrativo/estructural: que el sistema nunca se contradiga a sí mismo (Goal↔Wallet), que "ganar algo" se sienta como un evento (no solo un número que cambia), y que Partners sea un paso del loop, no una sección adyacente.

---

## Nota metodológica sobre evidencia visual

Esta auditoría se apoya en (a) lectura completa y literal del código real de los 5 sistemas (fuente primaria, exigida por el bloque), y (b) capturas reales ya reunidas en turnos anteriores de esta sesión para `/` anónimo (desktop 1280×800 y mobile 375×812) y para Partners/Navigation. **No se generó ninguna captura nueva de Home en estado autenticado con Goal/Missions reales** — hacerlo habría requerido crear una cuenta/Goal nuevo en producción, una escritura de base de datos fuera del alcance de un bloque explícitamente audit-only. Las conclusiones sobre el estado autenticado de Home se derivan del código (que es determinista y ya se leyó completo), no de una inferencia — pero se señala aquí para que quede explícito qué es lectura de código y qué es observación visual directa.
