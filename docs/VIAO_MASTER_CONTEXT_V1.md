---
STATUS: CURRENT
ERA: V1 / Beta — Core Reset en curso
DOMAIN: Meta / Continuidad / Producto / Estrategia
AUTHORITY: Documento de continuidad entre sesiones de Claude/ChatGPT. NO es un Decision Lock — donde repite una decisión LOCKED, la fuente original (docs/02_DECISION_LOCKS/**) sigue siendo la autoridad. NO tiene precedencia sobre código+migraciones+tests (docs/00_GOVERNANCE.md, principio 1).
SUPERSEDES: — (no deroga formalmente ningún documento; ver §24 para contradicciones detectadas y cuál dirección prevalece)
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-27
---

# VIAO — MASTER CONTEXT V1

## 0. Cómo usar este documento

Este documento existe para que puedas abrir un chat nuevo con Claude o ChatGPT y continuar exactamente donde se quedó VIAO, sin perder decisiones, arquitectura, roadmap ni contexto estratégico. Léelo entero antes de tocar nada.

**Jerarquía de autoridad real** (heredada de `docs/00_GOVERNANCE.md` y `docs/00_VIAO_HANDOFF.md`, no inventada aquí):

1. **Código + migraciones + tests** — gana siempre, sin excepción.
2. **Decision Locks** (`docs/02_DECISION_LOCKS/**`) — autoridad económica/de producto por dominio.
3. **CURRENT** (`docs/01_CURRENT/**`) — diseño técnico vigente por dominio.
4. **Este documento y `VIAO_MASTER_PRODUCT_CONTEXT.md`** — síntesis de continuidad, nunca fuente primaria.
5. **`00_GOVERNANCE.md`** — reglas de gobernanza documental.
6. **`99_ARCHIVE_V1/`** — histórico, nunca autoridad vigente.

Si este documento contradice una idea antigua de VIAO en cualquier documento previo, **este documento prevalece en lo referente a la identidad de producto (Travel fuera del núcleo)** — pero NUNCA prevalece sobre un Decision Lock LOCKED de Rewards/Goals/Missions/Partners en lo económico. Ver §24 para las contradicciones reales encontradas y cómo se resuelven.

---

## 1. REGLA SUPREMA — Nueva identidad de VIAO

> **VIAO YA NO ES UN PRODUCTO DE VIAJES.**

Esta es una decisión estratégica definitiva, no una hipótesis. VIAO NO debe volver a plantearse como:

- app de viajes / plataforma de viajes
- buscador de hoteles / plataforma de reservas / marketplace hotelero
- app de destinos / travel companion
- un producto cuyo valor dependa de que el usuario viaje

Todo el código Travel que sigue existiendo en el repositorio (`lib/hotelbeds`, `lib/travel-provider`, `app/search`, `app/properties`, `app/booking`, `app/trips`, `types/travel.ts`, etc.) es **LEGACY / EN DECOMMISSIONING**. Sigue compilando, sigue en el repo, pero no representa la dirección del producto.

La nueva dirección:

```
GOALS → POINTS → MISSIONS → REWARDS → PARTNERS
```

Los viajes/hoteles no vuelven a ser núcleo de producto salvo que Andrés lo decida explícitamente en el futuro, en un turno propio, con una nueva decisión estratégica — nunca por inercia de código existente.

---

## 2. Visión de producto

VIAO no se define por lo que se eliminó — se define por lo que construye. La visión:

**VIAO es una capa cotidiana de motivación, progreso y recompensa que conecta a los usuarios con los comercios de su día a día.**

- El usuario tiene **objetivos** (Goals) — algo que realmente quiere conseguir, no necesariamente un viaje.
- Sus **actividades cotidianas** (comprar en un comercio local, volver, invitar a alguien) generan **progreso** real y medible.
- Los **Partners** (comercios locales) son quienes aportan esas actividades y, según el Decision Lock económico, son la pieza que financia principalmente el valor entregado.
- Las **Missions** existen para generar y reforzar esa actividad — no son un juego aparte, son el mecanismo que conecta "lo que hago" con "lo que gano".
- Los **Points** representan progreso y recompensa — nunca dinero.
- Los **Rewards** convierten ese progreso acumulado en un beneficio tangible y real.

La idea conceptual que sostiene todo esto — **"tu actividad cotidiana puede acercarte a cosas que realmente quieres conseguir"** — es la visión, no un texto de copy obligatorio. El copy real de producto se decide aparte (ver §9 y el Product Decision Lock del 2026-08-27, §G).

---

## 3. Loop principal

```
USER
  ↓
LOGIN / REGISTRATION
  ↓
GOAL
  ↓
ACTIVITY (con Partners, reforzada por Missions)
  ↓
POINTS
  ↓
REWARDS
  ↓
PARTNERS (donde ocurre el valor económico real)
  ↓
PROGRESO / RETENCIÓN
  ↓
VUELVE → MÁS ACTIVIDAD CON PARTNERS
```

**Nota de precisión** (corregida en el Product Decision Lock del 2026-08-27, §H): Missions no es un paso secuencial *después* de Points — es **otra fuente** de Points, paralela a la actividad con Partners. Y Partners no es una parada final aislada — es **dónde ocurre** la actividad. El loop de una línea más preciso: *"USER define un GOAL → genera ACTIVIDAD real con PARTNERS (reforzada por MISSIONS) → gana POINTS → canjea REWARDS → progresa/vuelve → más actividad con PARTNERS."*

### GOALS
- Título libre, Points objetivo, fecha opcional (`targetDate`, sin semántica travel).
- Definen hacia dónde quiere avanzar el usuario — **no** deben estar vinculados conceptualmente a viajes.
- `GOAL_PROGRESS_MODEL = WALLET_BALANCE` (`LOCKED`, ver §16): el progreso = saldo actual del Wallet / Points objetivo. Puede **bajar** si el usuario canjea un Reward — es una decisión deliberada, no un bug (ver §17 y §24 para la tensión de UX conocida).
- Máximo 1 Goal `active` por usuario; crear uno nuevo cancela automáticamente el anterior (garantizado por índice único parcial en DB).

### POINTS
- Unidad de progreso/recompensa. **NO son dinero**, no son retirables, no son transferibles a cuenta bancaria.
- `POINTS_PER_EURO = 100` (RW1, `LOCKED`) — conversión de visualización/cálculo interno, nunca una promesa de valor real.
- El modelo económico protege el valor real de los Points mediante límites explícitos (RW5, RW6 — ver §16).

### MISSIONS
- Incentivan comportamientos concretos. Deben estar alineadas con el Core (Goals/Points/Rewards/Partners), nunca con Travel.
- Estado actual: **2 de 4 Missions activas siguen dependiendo de Travel** (`hotel_viewed`, `search_started`) — ver §9, es la pieza más urgente de resolver de todo este documento.

### REWARDS
- Beneficios que el usuario puede canjear. Deben tener economía sostenible.
- Financiados por VIAO (`funding_type='viao'`, acotado por RW5+RW6) o por Partners (`funding_type='partner'`, sin techo de VIAO) según el Decision Lock de Rewards.

### PARTNERS
- Pieza económica central del nuevo modelo. Partner activity es el mecanismo **principal previsto** para generar Points (Beta = €0 para el Partner, sin comisión — ver §16).
- El ecosistema local/cotidiano debe tener papel central — es lo que sustituye estructuralmente a lo que antes era "buscar/reservar un hotel".

### WALLET
- Muestra el balance actual de Points (`SUM(rewards_transactions.amount)`, vista derivada `rewards_wallets`, nunca tabla con saldo editable).
- Bajo `WALLET_BALANCE`, el Wallet **es** el progreso del Goal — no son dos cifras distintas, es la misma fuente leída dos veces con dos propósitos de UI.

---

## 4. Principios de producto

1. VIAO debe tener valor incluso si el usuario nunca viaja.
2. Travel no es el núcleo.
3. Partners son una pieza económica central, no un extra.
4. Goals dan propósito al progreso — sin Goal, Points no significan nada.
5. Points representan progreso, no dinero — nunca presentarlos como cashback monetario.
6. Missions refuerzan hábitos y actividad real, nunca acciones vacías para "rellenar un número".
7. Rewards hacen tangible el valor acumulado.
8. El loop cotidiano debe funcionar **sin Hotelbeds** — verificado en código (ver §9-13).
9. Primero cerrar el loop de valor real, después ampliar funcionalidades.
10. No añadir complejidad antes de validar comportamiento real de usuarios/Partners.
11. Producto primero, código después — ninguna decisión técnica debe forzar una decisión de producto.
12. Ninguna decisión antigua debe prevalecer sobre esta nueva dirección si existe contradicción (ver §24).

---

## 5. Estado actual

**VIAO V1 / Beta**, actualmente en un proceso de **CORE RESET / Travel Decommission** (fases J-B1 → J-B3 → Product Decision Lock, todas dentro de esta misma sesión, del 2026-08-27, sin commitear todavía).

**Navegación Core actual** (verificada en código, no aspiracional):

```
MAIN                    ACCOUNT
- Inicio                - Perfil
- Mi objetivo
- Missions
- Wallet
```

Mobile (bottom bar, 5 items): Inicio · Mi objetivo · Missions · Wallet · Perfil — idéntico al grupo MAIN+ACCOUNT de desktop.

Partners NO aparece en navegación — mantiene acceso directo vía token (`resolvePartnerAccess()`), por diseño (L12, `LOCKED`).

---

## 6. Qué ya se limpió (historial detallado)

### J-B1 — Implementación Premium Foundation + Navigation
- Formalización de Design System (sin nuevos tokens visuales), migración de `PageContainer` a más páginas, estados de loading añadidos.
- Reagrupación del Sidebar/MainNav en MAIN/SECONDARY/ACCOUNT.
- Corrección estratégica posterior (mismo bloque de sesión): eliminó por completo el grupo SECONDARY (Explorar, Mi viaje) — Travel deja de tener **cualquier** punto de entrada en navegación, no solo menor peso visual.
- Eliminó `TripHero`, viajes destacados, destinos y búsqueda de Home.

### J-B2.5 — Travel Legacy Purge + Product Identity Reset
- Eliminado `app/home-search-form.tsx` (huérfano, cero consumidores).
- Eliminado el bloque "Mis viajes" de `/profile` (único CTA visible restante hacia Travel desde una pantalla core).
- Corregida la metadata (`app/layout.tsx`): el `description` decía "compañero de viaje inteligente" — era la referencia Travel más visible de todo el producto (pestaña del navegador, buscadores).
- Corregido el copy de Goals (`goals.createCta`: "Crear objetivo de viaje"→"Crear objetivo"; `titlePlaceholder`: "¿A dónde quieres ir?"→"¿Qué quieres conseguir?"; `validationError`, `progressMotivation`) y de Onboarding (`onboarding.concept`, `dateOptional`).
- Eliminadas ~24 claves i18n de Home ya autodocumentadas como muertas desde una fase anterior ("Fase C").
- **Hallazgo crítico no resuelto todavía**: 2 de 4 Missions (`hotel_viewed`, `search_started`) siguen mostrando copy Travel en Home, porque sus nombres están hardcodeados en `lib/missions/rules.ts` **y** en la función SQL `complete_mission()` — protegido explícitamente, no tocado.

### J-B3 — Travel Decommission Audit (auditoría pura, sin implementación)
Ver §9-15 para el contenido completo. Resumen: confirmó que Core→Travel = **cero** dependencias funcionales, y que Travel→Core tiene exactamente **tres puntos de enganche reales** (Missions ×2, Rewards/Booking, Referrals) — ninguno más. No implementó nada, no creó migraciones, no tocó Rewards/Goals/Missions/Partners, no borró Travel.

### Product Decision Lock (2026-08-27, misma sesión, posterior a J-B3)
Análisis de producto puro (sin implementación) que dio recomendaciones concretas para los 5 puntos abiertos de J-B3: diseño de Missions de reemplazo, modelo de Referrals, destino de Vision (DECOUPLE), lifecycle de Booking Rewards (eliminar cuando se borre Booking), destino de AI Recommendation (eliminar), y propuesta de copy nuevo para `home.greetingTitle`/`rewards.pointsExplainer`/`rewards.emptyMessage`. **Ninguna de estas recomendaciones está implementada todavía** — son propuestas pendientes de aprobación formal.

---

## 7. Estado exacto de Missions

4 Missions existen hoy en `lib/missions/rules.ts` (array `MISSIONS`), con RPC espejo en `supabase/migrations/20260824101000_create_complete_mission_rpc.sql`:

| Mission key | Trigger real | ¿Depende de Travel? |
|---|---|---|
| `search_started` | `app/search/actions.ts:167` | ❌ Sí depende |
| `return_visit` | `lib/analytics/record-return-visit.ts` (login) | ✅ Independiente |
| `hotel_viewed` | `app/properties/[id]/resolve.ts:85` | ❌ Sí depende |
| `goal_created` | `lib/goals/create-goal.ts` | ✅ Independiente (copy ya corregido) |

Cambiar esto requiere: (1) decisión de producto sobre qué las sustituye, (2) modificar `lib/missions/rules.ts`, (3) **nueva migración SQL** (el RPC tiene los 4 keys hardcodeados en un `CASE WHEN`), (4) validación completa. **No asumir que esto ya está aprobado — no lo está.**

### Candidatas de reemplazo (propuestas en J-B3, refinadas en el Product Decision Lock — NO aprobadas todavía)

| # | Mission | Trigger | Complejidad | Riesgo |
|---|---|---|---|---|
| 1 | "Registra tu primera actividad con un Partner" | `complete_partner_activity()` RPC ya existente | Baja | Bajo |
| 2 | "Visita un Partner nuevo esta semana" | Partner distinto a los de la semana | Media — toca lógica de Partners | Medio |
| 3 | "Canjea tu primer Reward" | `redeemReward()` con éxito | Baja | Bajo |
| 4 | "Comparte tu código de referido" | Nuevo evento cliente | Media — tracking nuevo | Bajo |
| 5 | "Completa tu perfil" | `name`+`avatar_url` guardados | Baja | Bajo |

**Recomendación del Product Decision Lock**: sustituir `hotel_viewed`→#1 y `search_started`→#5 (no #1 y #2 juntas, para no depender el 100% de las 2 misiones de reemplazo de la densidad real de Partners, todavía baja en el piloto). Secuencia sugerida por J-B3: 1+3 primero, 5 después, 2+4 solo con razón de producto. **Sigue siendo una propuesta, no una decisión aprobada.**

---

## 8. Estado exacto de Referrals

`VALID_REFERRAL_ACTION_TRIGGER = "booking_confirmed"` (`lib/referrals/rules.ts:26,32`) es la ÚNICA condición que dispara el pago de una recompensa de referido — y **el programa de referidos está roto en producción ahora mismo**, porque Booking ya no tiene entrada de navegación. La UI de Perfil sigue mostrando el código de referido como si funcionara; nadie puede completar la acción que paga.

- Es una constante **TypeScript pura** — el propio archivo documenta que ningún trigger SQL depende de ella. Cambiarla no requiere migración.
- El auto-referido (`referrer_id = referred_id`) ya está bloqueado por una constraint real de DB — verificado, no es un vector de fraude abierto.
- **No hay** protección conocida contra multi-cuenta/mismo dispositivo — gap real, no resuelto, fuera del alcance de cualquier decisión tomada hasta ahora.

**Recomendación del Product Decision Lock**: sustituir el modelo de evento único por un modelo de **umbral** — el referido completa **2 Partner activities confirmadas** (no 1, para resistir colusión de una sola visita fabricada). Una sola constante ya no es suficiente; se necesita un pequeño objeto de configuración, no una migración SQL. **No implementado. N no está decidido de forma definitiva por Andrés todavía.**

---

## 9. Estado exacto de Vision

Vision (`lib/vision/*`, `app/vision/*`, wrapper OpenAI en `lib/openai/vision.ts`) **no es intrínsecamente Travel**: su capacidad real es imagen → OCR → traducción vía OpenAI, agnóstica de dominio. Su único acoplamiento a Travel es un campo opcional `tripId` y su único punto de entrada visible actual (`app/trips/[id]/page.tsx`, enlace "Abrir Vision").

**Clasificación J-B3**: Clase C (desacoplar, conservar temporalmente).

**Recomendación del Product Decision Lock**: **DECOUPLE** — no significa invertir ahora en reencajarlo en Partners (sería especulativo, sin caso de uso validado), significa dejar de tratarlo como parte de Travel cuando llegue el momento, sin construir ningún entry point nuevo hasta que exista una razón de producto validada. **No KEEP** (no genera Points, no conecta con Goals, tiene coste OpenAI recurrente, no refuerza el loop hoy). **No REMOVE** total (su núcleo es técnicamente reutilizable, sin urgencia de borrarlo). **Decisión final: pendiente de Andrés.**

---

## 10. Estado exacto de AI Recommendation

`app/search/ai-recommendation` + `lib/openai/build-prompt.ts` — a diferencia de Vision, **no tiene un núcleo agnóstico de dominio**: el prompt entero está construido para rankear/describir alojamientos. No hay una capacidad genérica reutilizable escondida debajo.

**Recomendación del Product Decision Lock**: **eliminar**, junto con Search, cuando llegue esa fase — no reutilizar. Cualquier futura "IA que recomiende Partners" se construiría desde cero. **Decisión final: pendiente de Andrés.**

---

## 11. Travel Legacy — qué código permanece y por qué

Congelado, presente en el repo, **sin ningún punto de entrada visible**, pero no confundir presencia en código con dirección de producto:

```
lib/hotelbeds/*            (42 archivos — integración API Hotelbeds)
lib/travel-provider/*      (capa de abstracción de proveedor)
lib/properties/*           lib/searches/*        lib/bookings/*
lib/destinations/*         lib/trips/*           lib/integration/*
app/search/*  app/properties/*  app/booking/*  app/trips/*  app/vision/*
types/travel.ts (36 importadores — el archivo más ampliamente referenciado del clúster)
components/property/*      components/search/destination-input.tsx
```

**Por qué sigue ahí** (verificado, no asumido): tres puntos de enganche real con el Core (§7-8), todos protegidos de tocar sin autorización explícita. Borrar el clúster hoy rompería 2 Missions y dejaría el sistema de Referrals sin ninguna vía de arreglo simple. El código en sí no tiene código muerto interno — todo lo que exporta cada módulo tiene consumidor dentro del propio clúster.

---

## 12. Clasificación A/B/C/D (J-B3)

**Clase A — eliminarse** (cuando se resuelvan §7/§8): `app/search/*`, `app/properties/*`, `app/booking/*`, `lib/hotelbeds/*`, `lib/travel-provider/*`, `lib/properties/*`, `lib/searches/*`, `lib/bookings/*`, `lib/destinations/*`, `lib/integration/*`, `types/travel.ts` (al final, por su volumen de importadores), `components/property/*`, `components/search/destination-input.tsx`, ~100 claves i18n de Trips/Search/Booking. Ya ejecutado: `app/home-search-form.tsx`.

**Clase B — reemplazarse**: `hotel_viewed`/`search_started` (Missions), `VALID_REFERRAL_ACTION_TRIGGER`, copy de `home.greetingTitle`/`rewards.pointsExplainer`/`rewards.emptyMessage`.

**Clase C — desacoplarse, decidir futuro**: `lib/vision/*`, `app/vision/*`, `lib/trips/*`, `app/trips/*` (hoy sostienen a Vision), `app/search/ai-recommendation`.

**Clase D — congelarse, no tocar todavía**: el resto del clúster Hotelbeds/Travel-provider/Properties/Searches/Bookings/Destinations, mientras no se resuelvan §7-8.

---

## 13. Roadmap de decommission (propuesto, no ejecutado)

```
STEP 1  — Core protection (ya vigente, verificado)
STEP 2  — Missions redesign (decisión de producto + migración SQL)
STEP 3  — Nuevos triggers implementados
STEP 4  — Referrals + Booking/Rewards resueltos
STEP 5  — Vision resuelto (decisión + desacople si procede)
STEP 6  — Retirar rutas Travel
STEP 7  — Retirar librerías Travel
STEP 8  — Limpiar tipos/imports (types/travel.ts AL FINAL — 36 importadores)
STEP 9  — Limpiar analytics/referrals
STEP 10 — Limpiar i18n (~100 claves, tras borrar el código que las usa)
STEP 11 — Revisar dependencias npm (ya auditado: ninguna es exclusiva de Travel)
STEP 12-13 — Tests/build, incremental en CADA step, nunca solo al final
STEP 14 — Auditoría final de "Travel leakage" (repetir la búsqueda de §11)
```

**Regla no negociable**: nunca borrar Travel masivamente. Cada paso: modificar lo mínimo, validar, revisar diff, `tsc`, `lint`, `build`, tests cuando el entorno lo permita.

---

## 14. Core protection — reglas de seguridad vigentes

**REWARDS** (`docs/02_DECISION_LOCKS/rewards/VIAO_REWARDS_V1_DECISION_LOCK.md`, `LOCKED`):
- Ledger append-only (`rewards_transactions`, sin GRANT de UPDATE/DELETE).
- `rewards_wallets` es VIEW derivada, nunca tabla con saldo editable.
- Idempotencia real vía `UNIQUE(user_id, reason, reference_type, reference_id)`.
- Concurrencia: lock por usuario + `pg_advisory_xact_lock` para pool VIAO.
- Kill-switch / fail-closed en múltiples capas.
- RW1 `POINTS_PER_EURO=100` · RW5 `MAX_REWARD_REAL_COST_PERCENT=30%` (solo `funding_type='viao'`) · RW6 pool VIAO = 100€/mes.
- RW7 (`POINTS_PERCENTAGE_OF_COMMISSION=25%`) dormant, no activo. RW8 (50/50) `DEPRECATED` formalmente.
- **No modificar sin auditoría explícita.**

**GOALS** (`docs/02_DECISION_LOCKS/goals/VIAO_GOALS_V1_DECISION_LOCK.md`, `LOCKED`, `APPROVED/IMPLEMENTED`):
- `GOAL_PROGRESS_MODEL = WALLET_BALANCE` — progreso = saldo Wallet actual / target, puede bajar al canjear (decisión deliberada, ver §17/§24).
- Auto-cancelación al crear un Goal nuevo, máximo 1 activo por usuario (índice único parcial).
- `GOAL_COMPLETION_SEMANTICS`: **abierta, sin resolver** — "completado" es hoy puramente derivado en lectura, nunca se escribe `status='completed'`.
- No requiere ni requirió cambios en Rewards ni Missions.

**PARTNERS** (`docs/02_DECISION_LOCKS/partners/VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md`, `LOCKED`):
- PMM3: atribución por código fijo + confirmación explícita del Partner (nunca el usuario confirma).
- PMM4: P1/P2 emisión, P3 = máx. 2 actividades/usuario/Partner/día, P4 = pool 3.000 Points/mes (agotado → `points_awarded=0`, sin deuda, sin bloqueo).
- Beta = **€0** para el Partner — sin comisión, sin cofinanciación, sin facturación. Precio futuro (€49-79/mes) es `PROPOSAL`, no decidido.
- Modelo 50/50 histórico — `DEPRECATED` formalmente, no reinterpretable.
- PMM6: dashboard Beta mínimo, 6 métricas exactas, solo lectura.
- PMM10: `partner_activities` es append-only, sin `status`; correcciones vía transacción compensatoria en `rewards_transactions`, nunca editando la actividad original.
- **Mecanismo económico principal previsto del nuevo Core** — no tocar la RPC protegida sin autorización.

**MISSIONS**: cualquier cambio debe considerar que el RPC SQL (`complete_mission()`) tiene los keys hardcodeados — no es solo un cambio de TypeScript.

**Tres pools mensuales independientes, nunca combinar**: Rewards (100€/mes), Missions (3.000 Points/mes), Partners (3.000 Points/mes) — la coincidencia numérica Missions/Partners es casualidad de diseño, no relación funcional.

---

## 15. Historial de auditorías importantes

**FASE D** (histórica, previa a esta sesión visible): 724 tests, 720 pass, 0 fail, 4 skipped; `tsc` EXIT 0, `lint` EXIT 0, `build` EXIT 0. Correcciones aplicadas: protección contra UPDATE directo en `goals`, restricción económica de Rewards `funding_type=viao` ≤30% del valor nominal (esto es RW5, hoy `LOCKED`).

**FASE E**: auditoría independiente, veredicto **PASS WITH CONDITIONS** — detectó que el modelo de progreso de Goal vigente en ese momento (HYBRID) podía inflarse artificialmente vía `reason='redemption_refund'`.

**FASE F**: corregido `lib/goals/get-goal.ts` para excluir explícitamente `redemption_refund` del cálculo de progreso bajo el modelo HYBRID.

**Nota de continuidad importante** (verificada contra el Decision Lock real de Goals, no asumida): el modelo HYBRID que motivó la corrección de Fase F **ya no es el modelo vigente**. Goals V1 fue posteriormente re-decidido y **implementado** como `GOAL_PROGRESS_MODEL = WALLET_BALANCE` (§14) — bajo este modelo, la exclusión especial de `redemption_refund` **deja de ser necesaria** (el saldo real ya refleja la operación correctamente sin caso especial), según el propio Decision Lock de Goals, sección 8. Fase F sigue siendo un hecho histórico real y correcto en su momento — solo ya no describe el comportamiento actual del código.

**J-B1 / J-B2.5 / J-B3**: ver §6 y §9-15 (esta sesión, 2026-08-27, sin commitear).

---

## 16. Competencia

Investigación verificada (`docs/02_DECISION_LOCKS/product/VIAO_COMPETITIVE_AUDIT_DECISION_LOCK.md`), con niveles de confianza explícitos por dato:

| Empresa | Modelo | Escala/financiación | Ángulo de viaje | Riesgo para VIAO |
|---|---|---|---|---|
| **Loyapp** (Barcelona) | QR, sellos por comercio, silados | 20.000+ usuarios, 750+ comercios (declarado), €6-36/mes | No | 🟠 Medio — escala real, sin viaje |
| **Silk** (Madrid) | Automático vía open banking, sin QR | €770.000 confirmados (prensa financiera) | Sí — Iberia como partner de canje confirmado | 🔴 Alto — más frictionless, financiado |
| Lealy | Clon de Loyapp | Sin tracción confirmada | No | 🟡 Bajo-medio |
| GutXain | Cashback multi-categoría | ~€205.000 | No | 🟡 Bajo |
| Travel Club | Coalición clásica española | Establecida | Sí | Prueba que el modelo de coalición funciona en España |
| Booksy / Treatwell / TheFork | Reservas + fidelización | Establecidas | No | Referencia de modelos de coste compartido y comisión |

**Veredicto sin filtrar**: VIAO **no tiene un moat real hoy** — todo lo construido es replicable por un competidor bien financiado en semanas. Ningún competidor investigado combina Goal de viaje único + Points pooled + Travel + AI + Vision — pero **ese hueco específico ya no está vacío**: Silk se mueve hacia el mismo punto desde el lado del earning frictionless, Loyapp desde el lado de la escala local.

**Contradicción estratégica a resolver (ver §24)**: la diferenciación descrita en esta auditoría (`§14` del documento original) se apoyaba explícitamente en "Travel, Hotels, AI, Vision, Goals — la combinación completa no existe en ningún competidor" como ventaja de VIAO frente a Loyapp. Con Travel fuera del núcleo, **esa diferenciación específica ya no aplica tal cual está escrita** — nadie ha vuelto a formular todavía cuál es la diferenciación de VIAO frente a Loyapp/Silk **sin** el ángulo de viaje. Es un hueco real, no resuelto por ningún documento existente.

---

## 17. GTM

Canales ya considerados (sin cambio de dirección): Barcelona Activa, asociaciones de comerciantes locales, Partners locales, referidos.

**Piloto**: objetivo inicial de **50-100 testers**, no más — validar el loop antes de escalar.

**Importante**: una comunidad de referencia de ~8.000 personas mencionada en contexto previo es **únicamente un canal potencial de referidos**, no una base de usuarios actual de VIAO. No presentar 8.000 como usuarios actuales en ningún documento ni conversación con Partners/inversores.

**Matiz de la auditoría competitiva**: Loyapp también nació de Barcelona Activa/INICIA — es probable que comercios objetivo de VIAO ya conozcan o usen Loyapp. Cualquier pitch comercial a un Partner debe anticipar la pregunta "¿en qué te diferencias de Loyapp?" explícitamente.

---

## 18. Prioridad estratégica

**La prioridad NO es borrar Travel por borrar código.**

Orden real de prioridad:

1. Construir y validar el Core (Goals/Points/Missions/Rewards).
2. Cerrar el loop de valor de principio a fin.
3. Conseguir actividad real de Partners (no sintética).
4. Validar Missions con comportamiento real.
5. Validar Rewards con canjes reales.
6. Validar repetición/retención real.
7. **Solo después**, eliminar físicamente el legacy Travel.

Secuencia económica/producto ya definida en fases previas de esta sesión (research/validation, fuera de este documento pero consistente con él): **Rewards reales → Goals → Missions mínimas → Partners + QR → Antifraude + caducidad.** Travel queda fuera del núcleo en toda esta secuencia.

---

## 19. Hotelbeds

Permanece **congelado**. Caso de certificación `#60019483` sin respuesta oficial externa. **No debe convertirse nuevamente en prioridad** y **no se debe conectar un proveedor hotelero real para validar el nuevo Core** — el Core (Goals/Points/Missions/Rewards/Partners) no necesita ni debe necesitar ningún proveedor de viajes para funcionar ni para validarse. El acceso a un proveedor real de Travel queda explícitamente fuera del núcleo estratégico actual.

---

## 20. Estado exacto a fecha 2026-08-27

- **VIAO V1 / Beta.**
- **Core visible**: Inicio / Mi objetivo / Missions / Wallet / Perfil.
- **Travel**: visiblemente retirado de toda navegación y de Home; técnicamente presente y congelado en el repositorio.
- **J-B3**: auditoría de dependencias Travel completada. Product Decision Lock: recomendaciones de producto entregadas para los 5 puntos abiertos.
- **Nada de lo siguiente está commiteado** — todo sigue en working tree.

**Pendientes explícitos (A-G), ninguno aprobado todavía**:

A. Corregir copy Travel restante en Home (`home.greetingTitle`).
B. Corregir copy Travel restante en Rewards (`rewards.pointsExplainer`, `rewards.emptyMessage`).
C. Decidir formalmente qué Missions sustituyen a `hotel_viewed`/`search_started`.
D. Redefinir `VALID_REFERRAL_ACTION_TRIGGER`.
E. Decidir futuro de Vision (KEEP/DECOUPLE/REMOVE — recomendado DECOUPLE, no decidido por Andrés).
F. Decidir futuro de AI Recommendation (recomendado eliminar, no decidido por Andrés).
G. Ejecutar, en su momento y por fases, el decommission físico de Travel (§13).

**No asumir que A-G ya están aprobados.** Son recomendaciones documentadas, no decisiones cerradas.

---

## 21. Reglas para futuros chats

Instrucciones literales que cualquier Claude/ChatGPT nuevo debe seguir al leer este documento:

- Si este documento contradice una idea antigua de VIAO sobre su identidad (Travel como núcleo), **este documento prevalece**.
- **NO volver a convertir VIAO en producto de viajes** bajo ninguna futura fase sin una nueva decisión estratégica explícita de Andrés, en su propio turno.
- **NO asumir que el código Travel existente representa la visión actual del producto** — es legacy congelado, no dirección.
- **NO implementar sin autorización explícita**, en cada turno, aunque el paso parezca "obviamente el siguiente".
- **NO modificar Rewards/Goals/Missions/Partners/Supabase "para limpiar código"** — cualquier cambio a esos dominios requiere su propia autorización, aunque esté motivado por retirar Travel.
- **Primero analizar dependencias, siempre** — nunca asumir que una palabra como "search" implica Travel sin verificar el contexto real en código.
- Separar siempre tres capas distintas: **DECISIÓN DE PRODUCTO** → **PLAN TÉCNICO** → **IMPLEMENTACIÓN**. No saltar de la primera a la tercera.
- Si una decisión está marcada aquí como `PENDIENTE`/`RECOMENDADO, NO APROBADO`, **no decidirla unilateralmente** — preguntar o esperar instrucción explícita.
- Si Andrés dice **NO IMPLEMENTAR**, detenerse ahí, sin excepciones ni "solo esto pequeño".
- Si Andrés pide una auditoría, **auditar antes de modificar** — nunca combinar ambas cosas en el mismo turno salvo que él lo pida explícitamente.
- Si Andrés pide un prompt para Claude, generar un **prompt operativo** con límites explícitos, validaciones concretas y condiciones de STOP — igual que los prompts que ya ha usado en esta sesión (J-B1 a J-B3, Product Decision Lock).
- Ante cualquier contradicción entre dos documentos con autoridad (dos Decision Locks, o un Decision Lock vs. este documento), **no elegir arbitrariamente** — reportar el conflicto y esperar decisión del propietario (regla ya establecida en `00_VIAO_HANDOFF.md` §15).

---

## 22. Contradicciones detectadas (documentadas, no resueltas silenciosamente)

1. **Modelo de progreso de Goal**: `VIAO_COMPETITIVE_AUDIT_DECISION_LOCK.md` (§9, checkpoint del 24/08) recomendó un progreso "acumulado desde creación" (monotónico, nunca baja) por riesgo de goal-gradient-effect. El posterior `VIAO_GOALS_V1_DECISION_LOCK.md` (mismo día, más deliberado, `APPROVED/IMPLEMENTED`) decidió lo contrario: `WALLET_BALANCE`, que sí puede bajar al canjear. **Prevalece WALLET_BALANCE** — es la decisión LOCKED, posterior y explícitamente implementada; el riesgo de UX señalado por la auditoría competitiva sigue siendo válido y su mitigación (mensaje transaccional en el momento del canje) **no está implementada todavía** — sigue siendo un follow-up abierto, no descartado.

2. **Travel como ventaja competitiva vs. Travel como legacy retirado**: la misma auditoría competitiva construyó parte de la diferenciación de VIAO frente a Loyapp sobre "Travel + AI + Vision + Goals, combinación que nadie más tiene". La decisión posterior de esta sesión retira Travel del núcleo por completo. **Prevalece la retirada de Travel** (decisión estratégica explícita y más reciente) — pero esto deja un hueco real y no resuelto: **nadie ha reformulado todavía la diferenciación de VIAO frente a Loyapp/Silk sin el ángulo de viaje.** Ver §16.

3. **Travel "FROZEN, pendiente de respuesta externa de Hotelbeds" vs. Travel "legacy en decommissioning"**: `00_VIAO_HANDOFF.md` (2026-08-25) y `VIAO_MASTER_PRODUCT_CONTEXT.md` describen Travel como pausado a la espera de una respuesta externa (implicando que podría reactivarse cuando esa respuesta llegue). La dirección de esta sesión (2026-08-27) es más definitiva: Travel no vuelve a ser núcleo salvo nueva decisión explícita, independientemente de qué responda Hotelbeds. **Prevalece la dirección de esta sesión** — la respuesta de Hotelbeds, si llega, no reabre automáticamente Travel como prioridad.

No se ha encontrado ninguna contradicción entre este documento y las reglas económicas LOCKED de Rewards/Goals/Partners — todas se han verificado directamente contra los Decision Locks reales antes de escribir este documento.

---

## 23. Fuentes consultadas para este documento

`docs/00_GOVERNANCE.md`, `docs/00_VIAO_HANDOFF.md`, `docs/02_DECISION_LOCKS/rewards/VIAO_REWARDS_V1_DECISION_LOCK.md`, `docs/02_DECISION_LOCKS/goals/VIAO_GOALS_V1_DECISION_LOCK.md`, `docs/02_DECISION_LOCKS/partners/VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md`, `docs/02_DECISION_LOCKS/product/VIAO_COMPETITIVE_AUDIT_DECISION_LOCK.md`, más el trabajo verificado directamente en código durante esta misma sesión (J-B1, J-B2.5, `docs/ux/FASE_J-B3_TRAVEL_DECOMMISSION_AUDIT.md`, y el Product Decision Lock del 2026-08-27). No se leyó en profundidad `docs/01_CURRENT/product/VIAO_MASTER_PRODUCT_CONTEXT.md` ni `docs/01_CURRENT/missions/VIAO_MISSIONS_V1.md` en esta sesión — cualquier detalle de esos documentos no citado aquí explícitamente no debe asumirse incorporado; consultarlos directamente si se necesita ese nivel de detalle.

---

## Regla de no implementación

Este documento es exclusivamente de continuidad y contexto. No se ha modificado, creado (salvo este archivo) ni borrado ningún otro archivo del repositorio. No se ha tocado código, migraciones, Rewards, Goals, Missions ni Partners para producir este documento.
