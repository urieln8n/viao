# VIAO — Premium Design System & UX V1
## Fase 1 — Auditoría y Propuesta de Rediseño (documento, sin implementación)

**Fecha:** 2026-08-24 · **HEAD auditado:** `561e0f0bf70aefb4b972eea309aac467d664a0c3` · Sin cambios de código, sin commit, sin push.

---

## 1. Executive Summary

VIAO no parte de cero. La auditoría de código encontró un design system real, no solo componentes sueltos: paleta en OKLCH con cálculo de contraste WCAG documentado explícitamente en el propio CSS (incluido el naranja de marca, verificado en modo claro y oscuro por separado), tipografía Geist (elección deliberada, no la fuente por defecto), una escala de `radius` coherente derivada de un único token base, botones construidos con `cva` con targets táctiles ya corregidos a 44px (Bloque 23, "Corrección P1 mobile touch targets" — ya ejecutado antes de este documento). Esto cambia el punto de partida: el trabajo que queda no es "crear un design system", es **terminar de aplicarlo con la misma disciplina a las piezas más nuevas del producto** (Goal, Missions, Points, Rewards) y **corregir un puñado de inconsistencias concretas y verificables** — no una intuición estética.

El hallazgo más importante de esta auditoría: **el elemento visual más cargado emocionalmente de todo VIAO — la barra de progreso del Goal — usa hoy el color más neutro y apagado del sistema** (`bg-primary`, que en el tema claro es prácticamente negro/gris, croma cero). El "esto se ve profesional" que pides ya casi existe en los cimientos; lo que falta es que los momentos que deberían sentirse como logro (Goal, Missions, Points) usen ese vocabulario visual con la misma intención con la que ya se usó en el botón principal.

El resto de gaps son igual de concretos: `Input` mide 32px de alto (por debajo del mínimo táctil de 44px que `Button` ya corrigió — inconsistencia directa dentro del propio sistema), no existe un componente `Badge` (los estados de Missions/Goal se resuelven con `<span>` sueltos), no hay ninguna escala de sombra más allá de un `ring-1` sutil en las cards (decisión válida, pero sin ningún token para elementos flotantes como un futuro bottom sheet), y prácticamente cero motion en todo el producto (ni siquiera en el momento en que se gana un Reward).

No hace falta un rediseño total. Hace falta terminar lo que Bloque 19 y Bloque 23 ya empezaron, aplicado a las piezas de loyalty/progreso que llegaron después.

---

## 2. Current UX Assessment

Basado en las dos auditorías de pilot-readiness ya realizadas en esta sesión (E2E completo, 22 pasos, y "first user experience"), más inspección visual de código en este bloque:

- El flujo funcional completo (Registro→Onboarding→Goal→Home→Search→Booking→Points→Missions→Rewards→Referral→retorno) ya es recorrible sin errores — confirmado, no se repite aquí en detalle.
- Home hace mucho trabajo en una sola pantalla: hasta 8 cards distintas en un único `grid` (Search, Points, Goal, Missions, Vision), todas con el mismo peso visual (mismo `Card`, mismo tamaño de título) — no hay ninguna señal de que una importa más que otra.
- Las tres piezas del loop económico (Points, Goal, Missions) son visualmente intercambiables entre sí: mismo `Card`/`CardHeader`/`CardTitle`, sin ningún acento de color propio que las distinga a simple vista (a diferencia de Vision, que sí tiene su propio azul `border-info/30`/`text-info`).
- El copy explicativo añadido en el bloque anterior (Points/Missions/Goal/Referral) ya resuelve el problema de comprensión — este documento no lo repite, se centra en cómo se *ve*, no en qué *dice*.

## 3. Current Design System Assessment

**Sí existe un design system real**, con tres capas claras:
1. **Tokens** (`app/globals.css`): color (OKLCH, semántico: `primary`/`secondary`/`muted`/`accent`/`destructive`/`success`/`warning`/`info` + `viao-orange` como marca), radius (`--radius` base → 6 tamaños derivados), sin escala tipográfica propia (`--font-heading` = `--font-sans`, cero diferenciación).
2. **Primitivas** (`components/ui/`): `Button` (maduro — variantes, tamaños táctiles corregidos, documentación de contraste real), `Card` (elevación vía `ring-1 ring-foreground/10`, sin sombra), `Input` (funcional pero con una regresión de accesibilidad táctil no corregida — sección 26).
3. **Composición** (páginas/features): aquí es donde la disciplina se diluye — cada card de Home usa las primitivas correctamente, pero sin ningún sistema de "qué color/acento le corresponde a cada dominio" (Rewards, Goals, Missions no tienen un acento propio como sí lo tiene Vision).

**Inconsistencias verificadas por código, no supuestas:**
- `Button` (Bloque 23): altura mínima 44px, corregido explícitamente citando Apple HIG/Material.
- `Input`: `h-8` = 32px. Nunca se corrigió en el mismo bloque, a pesar de ser el otro elemento interactivo más común del producto (todos los formularios: Register, Login, Search, Goal, Profile).
- No existe `components/ui/badge.tsx`. Los "estados" de Missions (`Pendiente`/`Completada`) y las badges de periodicidad (`Semanal`/`Una vez`) son `<span>` con clases condicionales, no un componente reutilizable.
- No existe ningún componente `Progress`. La barra de Goal es un `<div>` con `width` inline — no reutilizable si en el futuro Rewards quisiera mostrar "cuánto te falta para poder canjear este Reward" con el mismo lenguaje visual.
- Casi cero uso de `shadow-*` en todo el código (2 coincidencias totales) — coherente con la decisión de usar `ring` para elevación de Card, pero sin ningún token equivalente para lo que sí necesita sentirse "flotando" (un futuro bottom sheet, un dialog de confirmación).

## 4. Main UX Problems

1. **El progreso del Goal usa el color más neutro del sistema** (`bg-primary`, gris/negro) en vez de cualquier acento — el momento más motivador del producto se ve como una barra de carga genérica de sistema operativo.
2. **Points/Goal/Missions son visualmente indistinguibles entre sí** — mismo `Card` blanco, mismo título, sin ningún acento de color de dominio (a diferencia de Vision).
3. **Home no tiene jerarquía visual real** — 8 cards del mismo tamaño en un grid, sin que ninguna comunique "esto es lo más importante ahora".
4. **Cero feedback de momento de logro** — ganar Points, completar una Mission o alcanzar el 100% de un Goal no producen ningún cambio visual más allá de que un número cambie en el siguiente render.
5. **Inconsistencia de accesibilidad táctil dentro del propio sistema** — `Button` ya se corrigió a 44px, `Input` se quedó en 32px.

## 5. VIAO Design Philosophy

**Viajar + Propósito + Progreso + Recompensa + Ayuda + Comunidad.** Los principios de servicio/generosidad/gratitud que mencionas no se comunican con iconografía religiosa ni copy explícito (ya se descartó explícitamente en el bloque anterior) — se comunican mediante: (a) el lenguaje ya cálido y humano que el bloque de claridad de producto introdujo ("Comparte tu código", "Verás tu progreso aquí" — nunca imperativo agresivo ni jerga financiera), (b) que Referral se sienta como compartir algo de valor, no como una mecánica de crecimiento viral, y (c) que Rewards se enmarquen como "lo que tu actividad te permite conseguir", no como una moneda que acumular por acumular. Es una cuestión de tono y de qué se prioriza visualmente, no de nuevos elementos.

## 6. Visual Direction

Mantener la dirección ya iniciada — plana, basada en `ring` en vez de sombra pesada, con un único acento de marca (`viao-orange`) reservado para la acción principal — es la elección correcta para "premium" (mismo lenguaje que Linear/Notion, no Duolingo). Lo que falta no es una nueva dirección, es **extender esa misma disciplina con acentos de color por dominio**: cada pieza del loop (Goal, Missions, Rewards) necesita su propio acento secundario, igual que Vision ya tiene el suyo (`info`/azul). No se necesita ningún hue nuevo — los tokens `success` (progreso/logro) y `viao-orange` (acción/marca) ya cubren la paleta necesaria; introducir más colores diluiría el trabajo de contraste ya validado.

## 7. Color System

| Token | Uso actual | Uso propuesto |
|---|---|---|
| `viao-orange` | CTA principal, VIAO AI | Sin cambios — reservado para la acción #1 de cada pantalla |
| `success` | Reward earned (icono ↑), saldo positivo | **Adoptar como el color oficial de "progreso"** — Goal progress bar, Mission completada |
| `info` | Vision | Sin cambios |
| `warning` | Definido, sin uso detectado en componentes de producto | Disponible para futuros estados de aviso (p. ej. pool casi agotado) — no usar todavía |
| `destructive` | Errores, cancelaciones | Sin cambios |
| `primary` (gris/negro neutro) | Texto, y **hoy también la barra de Goal** | Retirar de cualquier elemento de "progreso" — reservar para texto/estructura, nunca para logro |

No se propone ningún color nuevo. La paleta ya es suficiente; el problema es de asignación, no de cobertura.

## 8. Typography System

Geist (ya cargada, buena elección — moderna, muy legible, usada por productos "premium" reales como Vercel/Linear). Hoy `--font-heading` es un alias sin diferencia del body — cero jerarquía tipográfica más allá del `text-*` de Tailwind aplicado ad-hoc por componente. Propuesta mínima, sin añadir peso de carga (Geist ya expone varios `font-weight` vía variable font): headings con `font-semibold`/`tracking-tight` de forma consistente (ya ocurre en varios sitios, pero no como regla), body siempre `font-normal`, labels/badges siempre `text-xs font-medium uppercase tracking-wide` (patrón que ya aparece suelto en `home.introBeforeEyebrow` etc., formalizarlo como el estilo oficial de "eyebrow").

## 9. Spacing / Radius / Shadows

**Radius**: la escala ya existente (`sm`→`4xl`, derivada de `--radius: 0.75rem`) es sólida y no necesita cambios — es la responsable de gran parte del "look premium" ya presente en cards/botones.

**Spacing**: sin un token propio (`--card-spacing` existe solo dentro de `Card`) — Tailwind's escala numérica se usa directamente en todo el código (`gap-4`, `p-6`, etc.), consistente pero no documentada como sistema. Suficiente para V1, no se propone cambio.

**Shadows**: ausencia casi total es una decisión de diseño válida para superficies estáticas (cards en el flujo normal), pero deja sin resolver cualquier futuro elemento que deba sentirse "por encima" del contenido (bottom sheet, dialog, toast). Proponer 1-2 tokens nuevos (`--shadow-float` para elementos flotantes) cuando se implemente el primero de esos patrones — no antes, no especulativamente.

## 10. Component System

| Componente | Estado | Recomendación |
|---|---|---|
| `Button` | Maduro (variantes, `cva`, 44px, WCAG documentado) | Mantener tal cual |
| `Card` | Sólido, elevación coherente | Mantener — considerar una prop `accent` (borde/franja de color por dominio) reutilizable en vez de que cada feature invente su propia clase (`border-info/30` hoy es ad-hoc solo en Vision) |
| `Input` | Funcional, altura por debajo del estándar táctil ya fijado por `Button` | Corregir a 44px — mismo criterio ya aplicado, no una decisión nueva |
| `Badge` | **No existe** | Crear — Missions (`Pendiente`/`Completada`/`Semanal`/`Una vez`) y Goal ya lo necesitan hoy, con `<span>` hand-rolled como sustituto |
| `Progress` | **No existe** (la barra de Goal es un `div` con `width` inline, sin componente) | Crear como primitiva reutilizable — Goal la usa hoy, Rewards podría reutilizarla más adelante (sin implementarlo ahora) |

## 11. Home Redesign Concept

La jerarquía que propones (Bienvenida → Goal → Progreso → Missions → Buscar → Points → Rewards → Trips → Vision) tiene una idea correcta: **poner el Goal por delante de Points** — hoy es al revés (Points, como `StatCard`, aparece antes que Goal en el grid). El Goal es el "por qué"; Points es el "cuánto llevas" — mostrar el objetivo antes que el marcador tiene más sentido narrativo.

Matiz importante que el código obliga a respetar: Home hoy **no es una sola pantalla**, son dos ramas deliberadamente distintas (`featured` vs. sin viaje) — un usuario con un viaje activo ve `TripHero` primero (con su propia narrativa "próximo/preparando/vuelta"), un usuario sin viajes ve el bloque de marketing + buscador. Cualquier rediseño de jerarquía debe decidir explícitamente qué pasa con esa rama — no se puede simplemente insertar "Goal" en la posición 2 sin decidir qué ocurre cuando ya hay un `TripHero` ocupando ese espacio. No resuelvo esa decisión aquí — la señalo como algo que la Fase 2 debe definir explícitamente, no asumir.

## 12. Goal Experience

Hoy: una `Card` neutra, un título, una barra `bg-primary` (gris), un número. Conceptualmente correcto (WALLET_BALANCE ya implementado, número honesto) pero visualmente indistinguible de cualquier otro dato. Dirección propuesta: la barra pasa a `success` (adoptado como color de progreso, sección 7); el título del destino (`goal.title`) gana más peso visual que el propio porcentaje — hoy el destino es un simple `text-lg font-semibold`, no el protagonista de la card. Ningún cambio de dato ni de `GOAL_COMPLETION_SEMANTICS` (sigue fuera de alcance).

## 13. Missions Experience

Hoy: una lista de filas de texto con un `+10 Points` en gris. Sin ningún elemento visual que las diferencie de una lista de configuración. Dirección propuesta: cada Mission como una fila con un indicador de estado más claro que "texto tachado" (un `Badge`/check visual), y el `periodicity` badge (`Semanal`/`Una vez`) como un `Badge` real, no un `<span>` de texto plano — sin inventar gamificación nueva (nada de streaks, niveles ni animaciones de celebración todavía, fuera de alcance explícito de este bloque de producto).

## 14. Points Experience

El propio copy ya añadido ("Ganas Points reservando...") resuelve la comprensión. Visualmente, el número (`StatCard` en Home, el balance grande en Wallet) ya tiene buen peso tipográfico. Lo que falta es que el CAMBIO se sienta — hoy un Point ganado y un Point gastado se ven exactamente igual salvo el signo `+`/`-` y el color success/destructive en el historial (esto ya está bien hecho, ver `app/rewards/page.tsx`). No se propone ningún cambio aquí más allá de lo ya cubierto en Rewards.

## 15. Rewards Experience

Catálogo + historial ya bien resueltos con el patrón `success`/`destructive` para earn/spend. Dirección propuesta a futuro (no P0): cuando el catálogo tenga más de 1-2 Rewards reales, un indicador visual de "cuánto te falta" por Reward (reutilizando el futuro componente `Progress`) reforzaría "esto es lo que puedo desbloquear" — hoy solo se distingue "puedes canjear" vs. "Points insuficientes" con texto.

## 16. Search Experience

Formulario ya funcional, ya con protección de doble submit (bloque anterior). Visualmente estándar — inputs en `Card`, sin ninguna fricción visible. No hay hallazgos P0 aquí; cualquier mejora sería puramente estética (P2/P3).

## 17. Hotel Results Experience

Grid responsive ya presente (`sm:grid-cols-2 lg:grid-cols-3`), estados vacío/error ya cubiertos con los primitivos `EmptyState`/`ErrorState`. Sin hallazgos P0.

## 18. Property Experience

No auditado en detalle visual en este bloque (fuera del foco de "loop económico" que pide la sección 8 del prompt) — funcionalmente ya confirmado sólido en auditorías previas.

## 19. Booking Experience

Ya con `disabled` en el submit, estados manejados, página de status dedicada con iconografía de estado (`CircleCheck`/`CircleX`/`Clock`, ya usa el vocabulario de color correcto: éxito/error/pendiente). Sin hallazgos P0.

## 20. Trips Experience

Ya corregido el estado "sin sesión" vs. "sin viajes" en el bloque anterior. Visualmente estándar, sin hallazgos nuevos en este pase.

## 21. Vision Experience

Es, paradójicamente, la feature con **mejor identidad visual propia hoy** (acento `info`/azul, `CardDescription` ya explicando qué hace) — el resto del producto debería aprender de este patrón, no al revés. Único hallazgo (ya señalado en la auditoría de pilot-readiness anterior): descubribilidad baja por no estar en `MainNav` — decisión de producto, no de diseño, no se resuelve aquí.

## 22. Profile / Referral Experience

Ya con explicación añadida (bloque anterior). Visualmente, el código de referido es un `Input disabled` — funcional pero no se siente "algo para compartir con orgullo". Mejora futura (P2): tratar el código como un elemento propio (mayor tamaño, quizás un botón de copiar) en vez de un campo de formulario deshabilitado más.

## 23. Navigation

`MainNav` (móvil, 5 items, `lg:hidden`) + `Sidebar` (desktop) ya existen, ya comparten lógica de ruta activa (`isNavItemActive` exportado y reutilizado, buena práctica). Límite de 5 items ya documentado como decisión deliberada. Sin hallazgos técnicos — el único punto (Vision fuera del nav) es de producto, no de arquitectura visual.

## 24. Mobile UX

**Hallazgo P0 real**: `Input` por debajo del estándar táctil que `Button` ya cumple (sección 10). El resto de la navegación móvil (bottom nav sticky, grids responsive, `flex-col` por defecto) ya sigue buenas prácticas mobile-first verificadas en el código. No existe todavía ningún patrón de bottom sheet — no es una carencia urgente (los flujos actuales de confirmación usan expansión inline dentro de la misma Card, que funciona bien y evita la complejidad de un modal/focus-trap) — no se recomienda introducirlo sin un caso de uso concreto que lo justifique.

## 25. Motion / Microinteractions

Prácticamente inexistente hoy — solo `transition-colors`/`transition-all` en estados `hover`/`focus` de los primitivos (Button, Input). Ninguna animación de entrada, de éxito, ni de cambio de valor. Recomendación: motion mínimo y con propósito, solo en 2-3 momentos de logro real (Mission completada, Points ganados, Goal alcanza 100%) — nunca decorativo ni continuo. Duración corta (150-250ms), easing estándar — no se especifica más sin antes decidir si se aprueba esta dirección.

## 26. Accessibility

Fundamento ya notablemente sólido: contraste WCAG calculado y documentado explícitamente para el color de marca en ambos temas, `focus-visible:ring-3` consistente en Button/Input, `aria-invalid` + mensajes de error asociados por `aria-describedby` en todos los formularios auditados esta sesión, targets táctiles de 44px ya corregidos en Button. Único gap real y verificable: `Input` no recibió la misma corrección (sección 10/24). El estado "completada" de Missions ya usa una señal no dependiente solo del color (`line-through`, no solo cambio de color) — correcto, no es un hallazgo.

## 27. P0 Improvements (imprescindible para que VIAO parezca un producto serio)

1. `Input` a 44px de alto — mismo criterio ya aplicado a `Button`, inconsistencia visible y de accesibilidad.
2. Goal progress bar: `bg-primary` → `success` — el momento más importante del producto usa hoy el color menos intencional del sistema.
3. Diferenciar visualmente Points/Goal/Missions entre sí (acento de color por dominio, mismo patrón que Vision ya demuestra que funciona).

## 28. P1 Improvements (alto impacto UX)

4. Componente `Badge` real (Missions/Goal dejan de usar `<span>` sueltos).
5. Jerarquía visual de Home — decidir qué card "pesa más" (empezando por Goal por delante de Points, sección 11).
6. Componente `Progress` reutilizable (hoy solo existe como `div` inline dentro de Goal).

## 29. P2 Improvements (mejora premium)

7. Motion mínimo en 2-3 momentos de logro (Mission completada, Points ganados).
8. Jerarquía tipográfica formal (`eyebrow`/heading/body como reglas, no ad-hoc).
9. Código de referido como elemento propio, no un input deshabilitado más.

## 30. Top 10 Highest Impact Changes

Si solo pudiéramos hacer 10 cambios, en este orden:

1. `Input` → 44px táctil.
2. Goal progress bar → color `success`.
3. Acento de color propio para Goal (verde/success) y Missions (a decidir — no inventar un hue nuevo, reutilizar `viao-orange` con menor intensidad es una opción razonable, a validar).
4. Componente `Badge`.
5. Componente `Progress` reutilizable.
6. Jerarquía de Home: Goal antes que Points.
7. Título del destino del Goal con más peso visual que el porcentaje.
8. Badge de periodicidad de Missions (`Semanal`/`Una vez`) como componente real.
9. Motion mínimo al completar una Mission.
10. Motion mínimo al alcanzar el 100% de un Goal (sin implicar `GOAL_COMPLETION_SEMANTICS`, puramente visual/efímero, sin persistir nada).

## 31. Proposed Implementation Phases

- **Fase A** (P0, ~1 sesión): Input táctil + color de Goal progress. Cambios de una línea cada uno, cero riesgo, máximo impacto visible.
- **Fase B** (P1): `Badge` + `Progress` como primitivas nuevas, aplicadas primero a Missions/Goal (los dos casos reales que ya las necesitan) — no crear componentes especulativos sin un consumidor real inmediato.
- **Fase C** (P1/P2): jerarquía de Home — requiere la decisión de producto de la sección 11 antes de tocar código.
- **Fase D** (P2): motion, mejoras de Referral/Profile.

Cada fase, igual que el resto de esta sesión: auditoría del bloque específico → propuesta de copy/diseño exacto → aprobación → implementación → validación → sin commit hasta revisión.

## 32. Risks

- Diluir el trabajo de contraste WCAG ya validado si se introducen colores nuevos sin recalcular contraste (evitable: no se propone ningún hue nuevo en este documento).
- Sobre-construir primitivas (`Badge`/`Progress`) más genéricas de lo que Missions/Goal necesitan hoy — construir para el caso real, no para hipotéticos futuros usos.
- Tocar `Input` (usado en TODOS los formularios) sin revisar cada consumidor visualmente antes de aprobar — cambio de alto apalancamiate, bajo riesgo técnico, pero requiere verificación visual real antes de commitear, no solo build/tsc/lint.

## 33. What NOT to Change

Arquitectura técnica, RLS, ledger, `TravelProvider`/`HotelbedsProvider`, mecanismo de i18n, convención de testing (sin tests de componentes React), la estructura ya sólida de `Button`/`Card` (extender, no reemplazar), el pipeline de color OKLCS ya validado, Rewards/Missions/Goals/Referrals backend, cualquier cifra económica.

## 34. Final Recommendation

Aprobar únicamente la **Fase A (P0)** como siguiente bloque de implementación: son 2 cambios de una línea cada uno (altura de `Input`, color de la barra de Goal), sin ningún componente nuevo, sin ninguna decisión de producto pendiente, y son exactamente los dos hallazgos que más se notarían en una primera impresión real de un tester — el resto de este documento queda como mapa de referencia para las fases siguientes, no como trabajo pendiente de aprobar de golpe.

---

No se ha modificado ningún archivo de código, no se ha hecho commit, no se ha hecho push.

STOP.
