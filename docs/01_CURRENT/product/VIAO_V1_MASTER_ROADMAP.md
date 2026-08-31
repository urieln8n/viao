---
STATUS: CURRENT
ERA: V1 / Beta — Core Reset / Travel Decommission
DOMAIN: Producto / Roadmap / Continuidad
AUTHORITY: Roadmap de continuidad — NO sustituye ningún Decision Lock ni documento CURRENT de dominio. Ver §2 (Authority).
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-27
---

# VIAO V1 — MASTER ROADMAP

## 1. STATUS

- **CURRENT** — documento de roadmap/continuidad, no un Decision Lock.
- **Fase de producto**: V1 / Beta.
- **Fase de arquitectura**: Core Reset / Travel Decommission — el Core (Goals/Points/Missions/Rewards/Partners) ya funciona de forma independiente de Travel; queda pendiente resolver las últimas dependencias residuales y retirar Travel físicamente.
- **Fecha de revisión**: 2026-08-27.

**Este documento es roadmap y mapa de continuidad. NO sustituye ningún Decision Lock, ningún documento `CURRENT` de dominio, ni el código real.** Si algo aquí parece una decisión nueva, la decisión real vive en el documento fuente citado — este documento solo organiza y secuencia lo que ya existe, más las fases futuras propuestas (marcadas explícitamente como `PENDING`/`PROPOSED`, nunca como aprobadas por el mero hecho de estar aquí).

---

## 2. AUTHORITY

Jerarquía real, heredada de `docs/00_GOVERNANCE.md` — no redefinida aquí:

```
Código + migraciones + tests
        >
Decision Locks (docs/02_DECISION_LOCKS/**)
        >
CURRENT (docs/01_CURRENT/**)
        >
Master Roadmap / documentos de continuidad (este documento, VIAO_MASTER_CONTEXT_V1.md)
        >
Governance (docs/00_GOVERNANCE.md — regla operativa, no de producto)
        >
Archive (docs/99_ARCHIVE_V1/) — referencia histórica, nunca autoridad vigente
```

**Regla de conflicto**: si dos documentos de autoridad se contradicen (dos Decision Locks, o un Decision Lock vs. un CURRENT, o cualquier par de nivel comparable), **no se elige unilateralmente**. Se reporta el conflicto explícitamente y se espera decisión de Andrés — nunca se resuelve en silencio ni se asume cuál "gana" solo por ser más reciente. Ver §16 (Critical Decisions) para los conflictos reales ya detectados al redactar este documento.

---

## 3. PRODUCT IDENTITY

> **VIAO no es Travel.**

Decisión estratégica definitiva, reafirmada de forma explícita y repetida a lo largo de toda esta sesión (J-B1 → Product Decision Lock → J-B4). Travel/Hotels/reservas/alojamientos no forman parte del núcleo de producto ni de la propuesta de valor futura salvo una nueva decisión explícita de Andrés.

**Core**:

```
GOALS
POINTS
MISSIONS
REWARDS
PARTNERS
```

**Sistemas de soporte del Core** (no son el Core en sí, pero lo sostienen):
- **Wallet** — vista derivada del ledger de Points (`rewards_wallets`), muestra el saldo, es la misma fuente que alimenta el progreso del Goal (`WALLET_BALANCE`, `LOCKED`).
- **Referrals** — mecanismo de adquisición, ya migrado en J-B4 a un trigger basado en actividad real con Partners (2 Partner activities confirmadas), independiente de Travel.

**Loop principal**:

```
USER define GOAL
  → realiza ACTIVIDAD real con PARTNERS
  → MISSIONS refuerzan esa actividad
  → gana POINTS
  → canjea REWARDS
  → progresa
  → vuelve
  → más actividad con PARTNERS
```

Travel existente en el repositorio es **LEGACY / EN DECOMMISSIONING** — sigue compilando, sin ningún punto de entrada visible desde J-B1/J-B2.5. No debe volver a convertirse en núcleo por inercia del código existente. Hotelbeds permanece congelado y no debe convertirse nuevamente en prioridad ni conectarse para validar el Core.

---

## 4. CURRENT STATE

### DONE
- Navegación Core limpia (Sidebar/MainNav: Inicio, Mi objetivo, Missions, Wallet, Perfil — sin Travel).
- Home sin módulos Travel (TripHero, destinos, búsqueda de alojamiento retirados).
- Copy Travel corregido en: metadata (`app/layout.tsx`), Perfil, Goals, Onboarding, `home.greetingTitle`, `rewards.pointsExplainer`, `rewards.emptyMessage`.
- 2 de 4 Missions sustituidas por versiones independientes de Travel (`partner_activity_registered`, `profile_completed`).
- Referrals migrado a un trigger basado en actividad real con Partners (umbral de 2 activities), sin migración SQL.
- `app/home-search-form.tsx` eliminado (huérfano, cero consumidores).
- Auditoría completa de dependencias Travel↔Core (J-B3), con clasificación A/B/C/D.
- Recomendaciones de producto para Vision, AI Recommendation, Booking Rewards, Missions, Referrals (Product Decision Lock).
- Decisión de producto sobre Vision: **`DECOUPLE` APPROVED** (2026-08-27, J-B6) — ver §8 para las condiciones exactas. Implementación todavía no autorizada.
- J-B7 (Travel Pre-Decommission Audit): **`DONE — PASS WITH CONDITIONS`** (2026-08-27) — ver §9.
- Condición de salida J-B7 #1 (`isValidUuid`): **`APPROVED (2026-08-27): Opción A`** — mover a módulo neutral compartido. Implementación todavía no autorizada.
- Condición de salida J-B7 #2 (nueva entrada de Vision): **`APPROVED (2026-08-27): Perfil`**. Implementación todavía no autorizada.

### IN PROGRESS
- Ninguna fase de implementación abierta ahora mismo — este documento es puramente de planificación.

### PENDING
- J-B8 a J-B12 (ver §10-§14) — J-B8 sigue sin iniciar; no queda desbloqueado por este registro.
- Plan técnico de implementación del decouple de Vision (J-B6) — a presentar y aprobar por separado.
- Plan técnico de implementación de `isValidUuid` → módulo neutral (J-B7, Condición #1) — a presentar y aprobar por separado.
- Plan técnico de implementación de la nueva entrada de Vision en Perfil (J-B7, Condición #2) — a presentar y aprobar por separado.
- Decisión sobre `VALID_REFERRAL_ACTION_TRIGGER`/`app/booking/actions.ts` (¿se tocan alguna vez, o quedan congelados indefinidamente?).
- UX/UI roadmap completo (§17-§21).

### BLOCKED
- Retirada física de rutas/librerías Travel (J-B8/J-B9) — J-B8 sigue sin iniciar. B8.2 (Properties) requiere primero implementar la Condición #1 de J-B7 (`isValidUuid` → módulo neutral); B8.4 (Trips) requiere primero implementar la Condición #2 (nueva entrada de Vision en Perfil). Ambas: `APPROVED — IMPLEMENTATION PENDING`.

### FROZEN
- `app/booking/*`, `calculateHotelBookingRewardPoints`/`HOTEL_BOOKING_REWARD_RATE` (`lib/rewards/rules.ts`), `VALID_REFERRAL_ACTION_TRIGGER`/`"booking_confirmed"`.
- `app/vision/*`, `lib/vision/*` (código sin cambios — decisión de producto ya tomada, `DECOUPLE` APPROVED en J-B6, pero implementación todavía no autorizada).
- Hotelbeds (certificación externa pendiente, caso `#60019483`).

### LEGACY
- `app/search/*`, `app/properties/*`, `app/trips/*`, `lib/hotelbeds/*`, `lib/travel-provider/*`, `lib/properties/*`, `lib/searches/*`, `lib/bookings/*`, `lib/destinations/*`, `lib/integration/*`, `types/travel.ts`, `components/property/*`, `components/search/destination-input.tsx` — código intacto, sin entrada de navegación, pendiente de decisión de retirada física.

---

## 5. COMPLETED PHASES

### J-B1 — Implementación Premium Foundation + Navigation
- **Objetivo**: formalizar Design System, migrar `PageContainer`, añadir loading states, reagrupar navegación.
- **Resultado**: navegación reagrupada en MAIN/SECONDARY/ACCOUNT; corrección estratégica posterior (mismo bloque) eliminó SECONDARY por completo — Travel sin ningún punto de entrada.
- **Implementación**: `components/nav/sidebar.tsx`, `components/nav/main-nav.tsx`, `app/page.tsx` (Home simplificada), 4 `loading.tsx` nuevos, migración de `PageContainer` en 4 páginas.
- **Validación**: `tsc`/`lint`/`build` limpios, tests sin regresiones nuevas.
- **Estado**: `DONE`.

### J-B2.5 — Travel Legacy Purge + Product Identity Reset
- **Objetivo**: purga controlada de residuos Travel visibles (copy, componentes huérfanos).
- **Resultado**: `app/home-search-form.tsx` eliminado; "Mis viajes" retirado de Perfil; metadata, copy de Goals y Onboarding corregidos; ~24 claves i18n muertas eliminadas.
- **Implementación**: cambios acotados, sin tocar Rewards/Goals/Missions/Partners.
- **Validación**: `tsc`/`lint`/`build` limpios; hallazgo crítico documentado (2 Missions seguían con copy Travel) — no resuelto en esta fase.
- **Estado**: `DONE`.

### J-B3 — Travel Decommission Audit
- **Objetivo**: auditoría pura de dependencias Travel↔Core, sin implementación.
- **Resultado**: confirmó Core→Travel = 0 dependencias funcionales; Travel→Core = exactamente 3 puntos de enganche real (2 Missions, Rewards/Booking, Referrals). Clasificación A/B/C/D completa de rutas y librerías. Propuesta de 5 Missions candidatas de reemplazo.
- **Implementación**: ninguna — documento `docs/ux/FASE_J-B3_TRAVEL_DECOMMISSION_AUDIT.md`.
- **Validación**: N/A (auditoría, no código).
- **Estado**: `DONE`.

### Product Decision Lock (2026-08-27)
- **Objetivo**: análisis de producto puro para las 5 decisiones abiertas de J-B3.
- **Resultado**: recomendaciones concretas — Missions (`partner_activity_registered` + `profile_completed`), Referrals (umbral de 2 Partner activities), Vision (`DECOUPLE`, recomendado no aprobado), Booking Rewards (`eliminar posteriormente`, no ahora), AI Recommendation (`eliminar`, no reutilizar), copy nuevo para 3 claves i18n.
- **Implementación**: ninguna — solo análisis en chat.
- **Validación**: N/A.
- **Estado**: `DONE` (como fase de decisión) — **las recomendaciones en sí son `RECOMMENDED`, no `APPROVED`**, salvo las que J-B4 ya implementó explícitamente (ver abajo).

### J-B4 — Core Reset / Dependency Exit (Missions + Referrals + Copy)
- **Objetivo**: implementar las recomendaciones del Product Decision Lock para Missions, Referrals y copy — únicamente eso.
- **Resultado**: `hotel_viewed`→`partner_activity_registered`, `search_started`→`profile_completed` (`return_visit`/`goal_created` sin cambios); nueva migración SQL para `complete_mission()`; Referrals migrado a `PARTNER_ACTIVITY_REFERRAL_TRIGGER` (umbral=2), sin tocar `VALID_REFERRAL_ACTION_TRIGGER` ni `app/booking/actions.ts`; copy de `home.greetingTitle`/`rewards.pointsExplainer`/`rewards.emptyMessage` corregido; tests nuevos para ambos dominios; un test de Core (`lib/partners/e2e-integration.test.ts`) corregido tras detectar que se rompía por el cambio de Missions.
- **Implementación**: 12 archivos modificados, 1 migración nueva, cero archivos eliminados. Booking, Vision, Rewards core, Goals, Partners economics **no tocados**.
- **Validación**: `tsc`/`lint`/`build` limpios; 501 pass / 319 fail (baseline previo 501/311 — los 8 fallos nuevos son los 8 tests nuevos, todos bloqueados por la misma causa ambiental que los 311 preexistentes, cero regresiones reales); `git diff --check` limpio.
- **Estado**: `DONE` (`IMPLEMENTED`, con una decisión de diseño explícita a revisar — ver §16).

---

## 6. ROADMAP MAP

```
J-B1          ✅
J-B2.5        ✅
J-B3          ✅
PDL           ✅
J-B4          ✅
              ↓
J-B5          ⬜  (Booking / Referral Residual Audit)
J-B6          ✅  (Vision Product Decision — DECOUPLE APPROVED, implementación pendiente)
J-B7          ✅  (Travel Pre-Decommission Audit — PASS WITH CONDITIONS, ambas condiciones ya decididas, implementación pendiente)
J-B8          ⬜  (Travel Routes Decommission)
J-B9          ⬜  (Travel Libraries Decommission)
J-B10         ⬜  (Types + Dependencies Cleanup)
J-B11         ⬜  (Analytics + i18n Cleanup)
J-B12         ⬜  (Final Travel Leakage Audit)
              ↓
CORE V1 CLEAN
              ↓
UX/UI (UX-1 → UX-5)
              ↓
CORE V1 VALIDATION
              ↓
PILOT (50-100 testers)
              ↓
V2 GATE
```

---

## 7. J-B5 — BOOKING / REFERRAL RESIDUAL AUDIT

**Estado: `PENDING`. No aprobado para implementación.**

**Objetivo**: determinar exactamente qué queda de Booking dentro del modelo Referral/Rewards tras J-B4, y decidir qué hacer con ello.

**Debe auditar**:
- `VALID_REFERRAL_ACTION_TRIGGER` (`lib/referrals/rules.ts`) — sigue definida, sigue consultada solo por `app/booking/actions.ts`, no tocada en J-B4.
- `app/booking/actions.ts` — no tocado en J-B4, explícitamente fuera de alcance por HARD RULE.
- `calculateHotelBookingRewardPoints()` / `HOTEL_BOOKING_REWARD_RATE` (`lib/rewards/rules.ts`) — sin cambios.
- Consumidores reales (código que efectivamente se ejecuta hoy) vs. consumidores inertes (código presente pero sin entrada de navegación que lo dispare).
- Dependencias Core → Booking (verificar que sigan siendo cero, tras J-B4).
- Dependencias Booking → Core (la relación inversa: qué necesita Booking del Core para seguir compilando).

**Debe presentar opciones — no elegir por Andrés**:
- Mantener `VALID_REFERRAL_ACTION_TRIGGER` como constante inerte indefinidamente (estado actual tras J-B4).
- Reemplazarla/retirarla formalmente, lo que requeriría tocar `app/booking/actions.ts` (HARD RULE de J-B4 lo impidió).
- Retirar `app/booking/actions.ts` por completo como parte de una fase posterior de decommission de rutas (J-B8).

**No implementar. HARD STOP al terminar J-B5.**

---

## 8. J-B6 — VISION PRODUCT DECISION

**Estado: `DECISION APPROVED — IMPLEMENTATION PENDING`** (decisión tomada 2026-08-27; la implementación es un bloque propio, todavía sin autorizar).

**Opciones auditadas**: `KEEP` / `DECOUPLE` / `REMOVE` — auditoría completa en el informe J-B6 (imports, dependency map, entradas reales, comparativa de las tres opciones).

**Decisión aprobada por Andrés**: **`DECOUPLE`**.

**Condiciones explícitas de la aprobación original** (2026-08-27), registro histórico sin reescribir:
1. Vision se conserva como capacidad independiente.
2. Se elimina su dependencia estructural de Trips (única dependencia real detectada en la auditoría — Vision no depende del resto de Travel: Search/Properties/Booking/Hotelbeds).
3. No inventar un nuevo caso de uso para Vision.
4. ~~No decidir todavía dónde vivirá la nueva entrada de Vision~~ — **RESUELTO en J-B7 (2026-08-27, ver §9, Condición #2): la nueva entrada será Perfil, `APPROVED`.** Trips sigue siendo el punto de entrada técnico actual únicamente hasta que esa implementación se ejecute y B8.4 se autorice — eso no significa que la ubicación futura esté sin decidir.
5. La implementación de este decouple NO está autorizada todavía — requiere que se presente primero un plan técnico exacto, para aprobación explícita separada.
6. No toca J-B7, J-B8 ni ningún otro bloque del roadmap.
7. No elimina Trips todavía (`app/trips/*` permanece intacto).

**Estado consolidado tras J-B7**: `Vision DECOUPLE = APPROVED`. `Vision entry = Perfil = APPROVED`. Lo único pendiente es el `Technical Plan + Implementation Approval` (bloque separado, todavía no producido). **No implementar. HARD STOP al terminar J-B6 (registro de decisión).**

---

## 9. J-B7 — TRAVEL PRE-DECOMMISSION AUDIT

**Estado: `DONE — PASS WITH CONDITIONS`** (auditoría 2026-08-27). Ambas condiciones de salida ya tienen decisión aprobada — implementación de ambas todavía `PENDING`, en un bloque separado.

**Gate de salida confirmado por evidencia**:
```
CORE → TRAVEL = 0 dependencias funcionales
TRAVEL → CORE = 0 dependencias necesarias para conservar
```

**Condición de salida #1 — `isValidUuid` (Properties ↔ Booking ↔ Vision)**: `app/properties/[id]/resolve.ts` define `isValidUuid()`, una utilidad pura sin ninguna dependencia de `types/travel.ts`, reutilizada por 8 archivos reales fuera de sí misma — incluido `app/vision/actions.ts` (Vision, que debe sobrevivir al Travel Decommission). **Decisión aprobada (2026-08-27): Opción A** — mover `isValidUuid` a un módulo neutral compartido (p. ej. `lib/utils/is-valid-uuid.ts`). Protege tanto a Booking como a Vision. **Estado: `APPROVED — IMPLEMENTATION PENDING`.**

**Condición de salida #2 — nueva entrada de Vision**: el único punto de descubrimiento de Vision sigue siendo `app/trips/[id]/page.tsx:409`. **Decisión aprobada (2026-08-27): Opción B** — la entrada vivirá en Perfil, reutilizando el patrón visual/estructural ya existente en `app/profile/page.tsx` (mismo patrón que la sección "Rewards" → `/rewards`). Explícitamente: sin tocar Sidebar, sin desplazar ningún ítem del MainNav móvil, sin tocar la jerarquía de Home, sin ningún caso de uso nuevo ni conexión con otro dominio del Core. **Estado: `APPROVED — IMPLEMENTATION PENDING`.**

**No se eliminó nada durante J-B7 ni durante el registro de estas decisiones** — ambas siguen siendo puramente documentales hasta su propio bloque de implementación.

---

## 10. J-B8 — TRAVEL ROUTES DECOMMISSION

**Estado: `PENDING / NOT STARTED`.** No iniciado — este registro documental no lo desbloquea ni lo autoriza.

**Orden y condiciones de bloqueo por bloque**, ya afinadas por las decisiones de J-B7 (2026-08-27):
```
B8.1  Search     → puede continuar cuando corresponda (sin condición adicional).
B8.2  Properties → puede continuar después de resolver isValidUuid (Opción A, ver §9).
B8.3  Booking    → mantiene la decisión J-B5 (Opción C): retirar app/booking/actions.ts aquí, no antes.
B8.4  Trips      → condicionado a que la nueva entrada de Vision en Perfil (Opción B, ver §9) esté implementada y validada.
```

Cada bloque, sin excepción: `Audit → Implement → Tests → tsc → lint → build → diff review → STOP`. **Nunca borrar todo Travel de una sola vez.**

---

## 11. J-B9 — TRAVEL LIBRARIES DECOMMISSION

**Estado: `PENDING / BLOCKED BY J-B8`.**

**Orden**:
```
hotelbeds → travel-provider → properties → searches → bookings → destinations → integration → Travel components
```

Misma regla incremental que J-B8 — un módulo por bloque, validación completa entre cada uno.

---

## 12. J-B10 — TYPES + DEPENDENCIES CLEANUP

**Estado: `PENDING / BLOCKED BY J-B9`.**

**Atención especial**: `types/travel.ts` — el archivo más ampliamente importado del clúster (36 importadores confirmados en J-B3). **No eliminar hasta eliminar todos sus importadores primero.** Revisar `package.json`/`package-lock.json` solo si corresponde (auditoría previa en J-B3 no encontró ninguna dependencia npm exclusiva de Travel — a reconfirmar en este bloque).

---

## 13. J-B11 — ANALYTICS + I18N CLEANUP

**Estado: `PENDING / BLOCKED BY J-B10`.**

**Regla explícita**: no borrar eventos de analytics solo porque tengan nombres Travel (`hotel_viewed`, `booking_clicked`, etc.). Primero determinar, por cada evento: consumidor real, utilidad, valor histórico, si alimenta algún dashboard, dependencia. Después limpiar únicamente lo confirmado como muerto. Después, y solo después, limpiar las ~100 claves i18n de Trips/Search/Booking.

---

## 14. J-B12 — FINAL TRAVEL LEAKAGE AUDIT

**Estado: `PENDING / BLOCKED BY J-B11`.**

**Objetivo**: auditoría global final. Buscar: `travel`, `hotel`, `hotelbeds`, `booking`, `trip`, `destination`, `property`, `search`. **No asumir que cualquier coincidencia significa dependencia Travel** — analizar cada resultado individualmente (mismo criterio ya aplicado en J-B3).

**Gate de cierre**: Travel ya no forma parte funcional del Core.

---

# UX/UI ROADMAP

**No tratar UI/UX como una fase que ocurre solamente después de eliminar todo Travel.** UX-1 (auditoría) puede y debe ejecutarse en paralelo a J-B5-J-B12, ya que audita la experiencia actual, no depende de que Travel esté físicamente borrado. Separar siempre: **UX AUDIT → UX DESIGN → UI IMPLEMENTATION** — nunca combinar las tres en un mismo bloque de autorización.

## UX-1 — CORE UX AUDIT

**Estado: `PENDING`. No implementar inicialmente — auditoría únicamente.**

**Auditar**: Home, Mi objetivo, Missions, Wallet, Rewards, Partners, Perfil, Onboarding, navegación, estados vacíos, loading, errores, feedback, mobile, desktop, accesibilidad, consistencia visual.

**Pregunta principal**: ¿la interfaz actual comunica claramente Goals/Points/Missions/Rewards/Partners, o todavía conserva mentalidad visual de Travel (heredada de cuando VIAO sí era una app de viajes)?

## UX-2 — PRODUCT / VISUAL IDENTITY RESET

**Estado: `PENDING`.**

Definir: personalidad visual, jerarquía, componentes, spacing, typography, cards, progress, Points, Goals, Missions, Rewards, Partner activity, feedback states, navegación mobile/desktop.

**Regla explícita**: no inventar un nuevo Design System desde cero — ya existe uno vigente (formalizado parcialmente en J-B1). Auditar primero el existente (UX-1) antes de proponer cambios.

## UX-3 — CORE SCREEN DESIGN

**Estado: `PENDING`.**

**Orden recomendado**: 1. Home · 2. Mi objetivo · 3. Missions · 4. Wallet · 5. Rewards · 6. Partners · 7. Perfil · 8. Onboarding.

**Por qué ese orden**: Home es la primera impresión y ya concentra Goal+Missions+Points (máximo impacto por esfuerzo); Mi objetivo/Missions/Wallet/Rewards son el loop económico central, en el orden en que el usuario los recorre; Partners es la pantalla con menos superficie hoy (acceso por token, sin UI de usuario propia) y depende de decisiones aún pendientes (J-B5/J-B6); Perfil y Onboarding son las de menor frecuencia de uso recurrente, coherente con dejarlas al final.

## UX-4 — PARTNER UX

**Estado: `PENDING`.**

Diseñar la experiencia del Partner por separado de la del usuario:

```
Partner → QR → actividad → confirmación → Points del usuario → retorno
```

**Separar claramente User UX y Partner UX** — son audiencias, objetivos y pantallas distintas; no deben diseñarse como una extensión menor de la experiencia de usuario.

## UX-5 — MOBILE / DESKTOP / ACCESSIBILITY

**Estado: `PENDING`.**

Validar: mobile first, desktop, responsive, accesibilidad, estados vacíos, loading, error, success, confirmación.

---

# CORE V1 VALIDATION

Tras estabilizar el Core (post J-B12 + UX-1 a UX-5), la secuencia de validación de producto ya definida en fases previas de esta sesión:

```
Rewards reales → Goals → Missions mínimas → Partners + QR → Anti-fraud → Expiration → Pilot
```

**Esta secuencia es `PRODUCT VALIDATION`, no se convierte automáticamente en implementación.** Cada paso requiere su propia autorización explícita en su turno correspondiente.

---

# PILOT

**Objetivo**: 50-100 testers.

**No presentar la comunidad potencial de ~8.000 personas como usuarios actuales de VIAO** — es únicamente un canal potencial de referidos, no una base de usuarios existente (ya señalado en `VIAO_MASTER_CONTEXT_V1.md`, §17).

**Métricas y qué pregunta responde cada una**:

| Métrica | Pregunta que responde |
|---|---|
| Activation | ¿El usuario completa el primer paso real (crear un Goal, primera actividad con un Partner)? |
| Conversion | ¿Cuántos registros llegan a generar Points reales? |
| Retention | ¿El usuario vuelve sin que se le empuje activamente? |
| Partner activity | ¿Hay actividad económica real y recurrente con los Partners piloto? |
| Mission completion | ¿Las Missions actuales generan el hábito que se diseñaron para generar? |
| Reward redemption | ¿El progreso acumulado se traduce en canjes reales, cerrando el loop? |

---

# V2 GATE

```
ANALYZE → IDENTIFY BOTTLENECKS → PRODUCT DECISION → V2
```

**No asumir todavía qué funcionalidades entrarán en V2** — se decide con evidencia real del piloto, no antes.

---

# MASTER CHECKLIST

| Fase | Tipo | Estado | Implementación permitida | Gate |
|---|---|---|---|---|
| J-B1 | IMPLEMENTATION | DONE | — | — |
| J-B2.5 | IMPLEMENTATION | DONE | — | — |
| J-B3 | AUDIT | DONE | — | — |
| Product Decision Lock | DECISION | DONE (recomendaciones `RECOMMENDED`) | — | — |
| J-B4 | IMPLEMENTATION | DONE | — | — |
| J-B5 | AUDIT + DECISION | PENDING | NO | Andrés decide qué hacer con Booking/`VALID_REFERRAL_ACTION_TRIGGER` |
| J-B6 | DECISION | DONE — DECOUPLE APPROVED (2026-08-27) | NO (implementación requiere plan técnico + aprobación separada) | Vision pierde su dependencia de Trips; nueva entrada `APPROVED: Perfil` (J-B7, ver §9); implementación pendiente, no la ubicación |
| J-B7 | AUDIT + DECISION | DONE — PASS WITH CONDITIONS (2026-08-27) | NO | Ambas condiciones (isValidUuid, entrada de Vision) ya `APPROVED — IMPLEMENTATION PENDING` |
| J-B8 | IMPLEMENTATION | PENDING / NOT STARTED | NO | B8.2 requiere isValidUuid resuelto; B8.4 requiere entrada de Vision en Perfil implementada y validada |
| J-B9 | IMPLEMENTATION | BLOCKED (por J-B8) | NO | Cada librería valida antes de la siguiente |
| J-B10 | IMPLEMENTATION | BLOCKED (por J-B9) | NO | `types/travel.ts` sin importadores antes de borrarlo |
| J-B11 | IMPLEMENTATION | BLOCKED (por J-B10) | NO | Analytics/i18n muertos confirmados, no solo "con nombre Travel" |
| J-B12 | AUDIT | BLOCKED (por J-B11) | NO | Cero fugas Travel en el Core |
| UX-1 | AUDIT | PENDING (puede correr en paralelo) | NO | — |
| UX-2 | DECISION | PENDING | NO | Andrés aprueba dirección visual |
| UX-3 | IMPLEMENTATION | PENDING | NO | Pantalla por pantalla, con validación |
| UX-4 | IMPLEMENTATION | PENDING | NO | Partner UX diseñada y aprobada por separado |
| UX-5 | VALIDATION | PENDING | NO | — |
| CORE V1 VALIDATION | VALIDATION | PENDING | NO | Evidencia real, no simulada |
| PILOT | VALIDATION | PENDING | NO | 50-100 testers reales |
| V2 GATE | DECISION | PENDING | NO | Con evidencia del piloto |

---

# CRITICAL DECISIONS

Decisiones que requieren a Andrés — **ninguna se resuelve unilateralmente en este documento**:

1. **Booking residual / `VALID_REFERRAL_ACTION_TRIGGER`** — J-B4 dejó la constante antigua intacta (por HARD RULE de no tocar `app/booking/*`) en vez de reemplazarla literalmente. ¿Se queda así indefinidamente, o se aborda en J-B5 aunque implique tocar `app/booking/actions.ts`?
2. **Vision — decisión de producto**: **`DECOUPLE` = APPROVED (2026-08-27)** (decisión cerrada; auditoría original comparó KEEP/DECOUPLE/REMOVE, ver §8), con las condiciones registradas en §8. **Nueva entrada de Vision = `Perfil` = APPROVED (2026-08-27)** (ver §9, Condición #2). Ambas decisiones están cerradas. Lo único pendiente es el **`Technical Plan + Implementation Approval`** (bloque separado, no producido todavía) — no queda ninguna opción de producto ni de ubicación por elegir.
3. **`DOCUMENT AUTHORITY CONFLICT — REQUIRES ANDRÉS DECISION`** — `docs/01_CURRENT/product/VIAO_MASTER_PRODUCT_CONTEXT.md` (`CURRENT`, 2026-08-25) en conflicto con decisiones posteriores de esta sesión:
   - **(A) Qué afirma el CURRENT que contradice lo implementado**: *"Missions: motor de hábito genérico del núcleo, NO específico de Partners (`DECISION`: no construir Partner Missions)"* y describe el viaje como *"el ejemplo más natural"* del propósito de VIAO, no como algo retirado del núcleo.
   - **(B) Dónde viven las decisiones posteriores que lo contradicen**: J-B4 (2026-08-27, autorizado explícitamente por Andrés en esta misma sesión, registrado en §6/Master Checklist de este documento) implementó exactamente lo contrario — una Mission de Partner (`partner_activity_registered`) — y toda la secuencia J-B1→J-B7 (este documento) ejecuta la retirada definitiva de Travel del núcleo.
   - **(C) ¿Existe ya una decisión formal que deje al CURRENT obsoleto?**: **No.** Las autorizaciones de J-B1→J-B4 son autorizaciones de implementación explícitas de Andrés dentro de esta sesión, pero ninguna constituye un Decision Lock formal ni una actualización autorizada del `STATUS`/contenido de `VIAO_MASTER_PRODUCT_CONTEXT.md`. Por jerarquía formal (`CURRENT` > documentos de continuidad), ese documento sigue siendo la autoridad documental vigente pese a estar en tensión con lo ya implementado.
   - **(D) Resolución**: **no resuelta.** Este documento no marca el CURRENT como `SUPERSEDED`, no edita su contenido/metadata/`STATUS`, y no inventa una jerarquía documental nueva. Recomienda (sin decidir) que `VIAO_MASTER_PRODUCT_CONTEXT.md` se actualice o se marque `SUPERSEDED` formalmente — esa actualización requiere autorización explícita de Andrés, no se ha hecho aquí.
4. **Gap documental heredado** (`00_GOVERNANCE.md`, "Gap identificado"): no existe todavía un documento `CURRENT` dedicado para Missions (Rewards ya lo tiene). Con las Missions ya rediseñadas en J-B4, este gap se vuelve más relevante — ¿se prioriza cerrarlo antes de seguir avanzando el roadmap Travel?
5. Cualquier decisión de producto adicional que aparezca durante J-B5-J-B12 o UX-1-UX-5 debe reportarse aquí en la siguiente actualización de este documento, nunca resolverse en el propio bloque de auditoría que la descubre.
6. **`isValidUuid` (Properties ↔ Booking ↔ Vision)** — **`APPROVED (2026-08-27): Opción A`**, mover a un módulo neutral compartido (ver §9, Condición #1). Pendiente: plan técnico de implementación (bloque separado, no producido todavía).

---

# RULES FOR FUTURE CLAUDE SESSIONS

- No implementar sin autorización explícita, en cada turno.
- No asumir que `RECOMMENDED` significa `APPROVED`.
- No borrar Travel masivamente — siempre incremental, con validación entre cada bloque.
- Auditar antes de modificar.
- Separar siempre: **Product Decision → Technical Plan → Implementation**.
- Si Andrés dice NO IMPLEMENTAR, detenerse ahí, sin excepciones.
- Si existe contradicción entre documentos, reportarla — nunca resolverla unilateralmente.
- No tocar Rewards/Goals/Missions/Partners "para limpiar código" — cualquier cambio a esos dominios necesita su propia autorización, aunque esté motivado por Travel.
- No reintroducir Travel como núcleo bajo ninguna fase futura sin una nueva decisión estratégica explícita.
- No conectar Hotelbeds para validar el Core.
- No crear funcionalidades especulativas (ver el caso de Vision — no diseñar un nuevo caso de uso solo porque es técnicamente posible).
- Cada implementación debe terminar con validación real (`tsc`/`lint`/`build`/tests, comparados contra el baseline conocido, no presentados como regresiones si el fallo es puramente ambiental).
- Cada fase debe terminar con HARD STOP explícito — nunca encadenar automáticamente a la siguiente fase del roadmap.

---

## Regla de no implementación de este documento

Este documento es exclusivamente de planificación y continuidad. No se ha modificado, creado (salvo este archivo) ni borrado ningún otro archivo del repositorio. No se ha tocado código, migraciones, tests, Rewards, Goals, Missions, Partners, Booking ni Vision para producir este documento.
