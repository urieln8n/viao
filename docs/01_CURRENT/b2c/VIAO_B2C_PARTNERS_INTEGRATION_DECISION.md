---
STATUS: CURRENT
ERA: Esta sesión
DOMAIN: B2C↔Partners
AUTHORITY: Contrato entre B2C y Partners — no autoriza implementación
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-25
---

# VIAO — Contrato de Integración B2C ↔ Partners

### Estado: DOCUMENTO DE DECISIÓN — define el contrato antes de implementar. NO autoriza implementación. Solo tras su aprobación se crea el prompt de implementación.
### Fecha: 2026-08-25.
### Auditoría de código real realizada antes de escribir esta sección: `Glob`/`Grep` contra `supabase/migrations/*partner*`, `lib/partners/`, `app/partners/` — **sin resultados en los tres casos**. Ninguna tabla, RPC ni ruta de Partners existe hoy en el repositorio. Todo lo relativo a Partners en este documento es diseño (`PENDING`), nunca `FACT`, salvo donde se indique explícitamente lo contrario.
### Taxonomía: `FACT` (existe, verificado) · `LOCKED` (decidido, no reabrir) · `PENDING` (diseñado, no implementado) · `CONTRADICTION` · `NOT IMPLEMENTED` · `FROZEN`.

---

## Auditoría de las 14 piezas pedidas

| Pieza | Clasificación | Evidencia |
|---|---|---|
| 1. Tabla `partners` | `NOT IMPLEMENTED` | Sin migración — verificado por Glob |
| 2. Tabla `partner_activities` | `NOT IMPLEMENTED` | Sin migración — verificado por Glob |
| 3. RPC `complete_partner_activity()` | `NOT IMPLEMENTED` | Sin migración — verificado por Grep |
| 4. `rewards_transactions` | `FACT` / `LOCKED` | Existe, append-only, Patrón B, verificado en sesiones anteriores contra la migración real |
| 5. `rewards_wallets` | `FACT` | Existe, usado por `get-wallet-balance.ts` |
| 6. Goals | `FACT` / `LOCKED` | `WALLET_BALANCE`, `VIAO_GOALS_V1_DECISION_LOCK.md`, APPROVED/IMPLEMENTED |
| 7. Missions | `FACT` / `LOCKED` (sistema); `OPEN` (2 de 4 keys) | `lib/missions/rules.ts`, verificado |
| 8. Attribution | `PENDING` | Diseño en Technical Spec §8-9, sin código |
| 9. Recurrence | `PENDING` | Fórmula diseñada (Technical Spec §14), sin código |
| 10. Partner dashboard | `NOT IMPLEMENTED` | Sin rutas (`app/partners/` vacío) |
| 11. RLS Partners | `PENDING` | Diseño Patrón B (Technical Spec §11), no aplicable — la tabla no existe |
| 12. Antifraude (P3/P4) | `PENDING` | Umbrales `LOCKED`, código del RPC no escrito |
| 13. P1-P8 | `LOCKED` (decisión) / `PENDING` (implementación) | Decision Lock Económico, Technical Spec §25 |
| 14. L1-L19 | `LOCKED` (decisión) / `PENDING` (implementación) | Master V2 §21 |

---

## 1. Evento central — `complete_partner_activity()` (diseño, `PENDING`)

- **Qué evento la crea**: confirmación de una interacción real (QR en restaurantes, reserva en experiencias) por parte del Partner.
- **Quién puede crearla**: el Partner, vía su token de acceso (P7, LOCKED) — nunca el cliente final directamente. Patrón B: invocación solo por `service_role`, tras que la capa de aplicación ya resolvió `p_user_id`/`p_partner_id` reales — mismo criterio que `complete_mission()`.
- **Cómo se confirma**: Server Action → RPC, dentro de una única transacción con `pg_advisory_xact_lock(hashtext('viao_partners_pool'))`.
- **Campos** (Technical Spec §6, `PENDING`): `id, partner_id, user_id, attribution_mechanism, declared_amount_eur, amount_confidence, points_awarded, reservation_reference, attempt_id, created_at`.
- **Cómo se evita duplicarla**: `UNIQUE(attempt_id)`, mismo patrón de idempotencia que `redeem_reward()`.
- **P3 (máx. 2/día)**: `COUNT` de `partner_activities` de `(user_id, partner_id, hoy)` bajo el mismo lock — si se supera, `raise exception`, bloqueo total (a diferencia de P4).
- **P1/P2**: `CASE` en SQL según `amount_confidence` — 2 Points/€ (`confirmed_by_reservation`), 1 Point/€ (`declared`).
- **P4**: `SUM(points_awarded)` del mes contra el techo de 3.000 — si se agota, la actividad se inserta igual con `points_awarded=0` (P5/P6, LOCKED), sin bloquear la captura de dato económico.

**Ninguna decisión P1-P8 se modifica aquí** — solo se describe cómo el diseño ya LOCKED se traduciría en código, todavía no escrito.

---

## 2. Flujo B2C — verificado contra implementación real donde existe

```
Partner Activity → Rewards Transaction → Wallet → Goal progress
```

**Hallazgo importante, verificado con precisión**: el lado "de bajada" de este flujo **ya está completo y no requiere ningún cambio**:
- `rewards_wallets`/`get-wallet-balance.ts` ya suma `SUM(amount)` sobre `rewards_transactions` de forma agnóstica al `reason` — `FACT`. En cuanto exista una fila `reason='partner_activity'`, el wallet la sumará automáticamente, sin ningún cambio de código.
- `lib/goals/get-goal.ts`/`calculate-progress.ts` (`WALLET_BALANCE`) lee el saldo total, también agnóstico al origen — `FACT`, mismo razonamiento.

**El lado "de subida" es 100% `PENDING`**: `partner_activity` produciría Points de forma **automática, dentro de la misma transacción del RPC** (diseño, INSERT condicional en `rewards_transactions` solo si hay margen en el pool P4) — **no existe ningún paso intermedio manual diseñado**, pero tampoco existe código todavía.

---

## 3. Flujo B2B — definido, no implementado

```
Partner Activity → Attribution → nuevo/recurrente → dashboard
```

Definiciones canónicas (`LOCKED`, Master V2 §7):
- **Cliente**: usuario con ≥1 Actividad válida con ese Partner.
- **Cliente nuevo**: la primera Actividad válida del par `(usuario, Partner)`.
- **Cliente recurrente**: cualquier Actividad adicional con al menos una previa.
- **Actividad confirmada**: la propia fila de `partner_activities` — nace siempre ya confirmada, deliberadamente sin columna `status` (diseño, §6).

**Estado**: enteramente `PENDING` — definiciones ya decididas, cero código.

---

## 4. Misma actividad, dos lados — principio arquitectónico confirmado

**Sí, es correcto y se declara como principio**: una única fila de `partner_activities` (cuando exista) alimentaría simultáneamente:
- **B2C**: Points (`rewards_transactions`) → Wallet → progreso del Goal.
- **B2B**: atribución, cálculo de nuevo/recurrente, dashboard.

**Sin contradicción encontrada** — es el mismo dato, no dos sistemas paralelos, confirmado tanto en el diseño (Technical Spec) como en el hecho de que ninguna pieza ya existente (Wallet, Goal) necesita modificarse para recibirlo.

**Missions NO es intermediario obligatorio** — confirmado: `complete_mission()` y el futuro `complete_partner_activity()` son RPCs independientes, sin llamada mutua. **No existen ni se construirán Partner Missions** — `LOCKED`, no reabrir.

---

## 5. User Experience — comportamiento que el modelo debe soportar (no implementado, solo documentado)

1. El usuario tiene un Goal activo (`FACT`, ya soportado hoy).
2. Realiza una actividad real con un Partner (`PENDING` — no hay ningún Partner real con quien hacerlo todavía).
3. La actividad queda confirmada por el Partner (`PENDING`).
4. Recibe Points automáticamente, en la misma transacción (`PENDING`, diseño confirmado en la sección 2).
5. Su progreso cambia — **esto ya funcionaría hoy sin ningún cambio**, en cuanto el paso 4 exista (`FACT` del lado receptor).
6. Puede volver y repetir (`FACT`, ya soportado por el modelo de Goal/Wallet existente).

---

## 6. Partner Experience — comparado contra lo que existe hoy

1. Partner tiene acceso — **`PENDING`**, P7 (token opaco) diseñado, sin implementar, sin ninguna ruta `app/partners/`.
2. Usuario realiza actividad — depende del paso 1.
3. Partner confirma — `PENDING`, sin UI ni RPC.
4. VIAO registra la actividad — `PENDING`.
5. Partner ve la actividad atribuida — `NOT IMPLEMENTED`, no hay dashboard.
6. VIAO determina nuevo/recurrente — `PENDING`, fórmula definida, sin código.
7. Dashboard refleja el dato — `NOT IMPLEMENTED`.

**Comparación honesta**: el lado Partner completo (los 7 pasos) es hoy inexistente en código — 100% diseño.

---

## 7. Rewards / Goals — confirmado, sin reabrir

Points ≠ dinero — `LOCKED`, sin excepción. `GOAL_PROGRESS_MODEL = WALLET_BALANCE` — `LOCKED`, APPROVED/IMPLEMENTED, sin reabrir. Cómo entra Partner Activity: exactamente como cualquier otro `reason` de `rewards_transactions` — sin ningún tratamiento especial, sin ningún cambio necesario en Goals ni en Rewards (sección 2).

---

## 8. Missions — confirmado

Sistema paralelo de hábito, independiente de Partners (`LOCKED`). `search_started`/`hotel_viewed` acopladas a Travel, pendientes de sustitución (`OPEN`, no decidido aquí). `return_visit`/`goal_created` genéricas. **No se construyen Partner Missions** — `LOCKED`.

---

## 9. Travel — sin dependencia, sin contradicción

Verificado: ningún campo diseñado de `partner_activities` ni del RPC hace referencia a `trips`, `bookings`, `HotelProvider` ni ningún elemento de Travel. **La integración B2C↔Partners no depende de Travel — confirmado, sin `CONTRADICTION`.** Travel permanece `FROZEN`, sin tocar: `Trips`, `Search`, `HotelProvider`, `Hotelbeds`, `Bookings`, `Booking Intents`, `Vision`.

---

## 10. Matriz final

| Componente | Existe | Estado | B2C | B2B | Pendiente | Acción |
|---|---|---|---|---|---|---|
| `partners` (tabla) | No | `NOT IMPLEMENTED` | — | Sí | Migración | Crear cuando se apruebe |
| `partner_activities` (tabla) | No | `NOT IMPLEMENTED` | Sí (origen de Points) | Sí (origen de atribución) | Migración | Crear |
| `complete_partner_activity()` | No | `NOT IMPLEMENTED` | Sí | Sí | Migración + RPC | Crear |
| `rewards_transactions` | Sí | `FACT`/`LOCKED` | Sí | — | Ninguno | Reutilizar tal cual |
| Wallet (`rewards_wallets`) | Sí | `FACT` | Sí | — | Ninguno | Ya listo para recibir Partners |
| Goals | Sí | `FACT`/`LOCKED` | Sí | — | Ninguno | Ya listo |
| Missions | Sí | `FACT`/`LOCKED` (sistema) | Sí | No | Sustituir 2 keys | Decisión futura, `OPEN` |
| Attribution | No | `PENDING` | — | Sí | Migración + RPC | — |
| Recurrence | No | `PENDING` | — | Sí | Migración + dashboard | — |
| Dashboard Partner | No | `NOT IMPLEMENTED` | — | Sí | Backend + UX | — |
| QR | No | `PENDING` (concepto) | — | Sí | UX + físico | — |
| Reservation attribution | No | `PENDING` (concepto) | — | Sí | UX | — |
| RLS Partners | No | `PENDING` | — | Sí | Migración | — |
| Antifraude (P3/P4) | No | `PENDING` (umbrales `LOCKED`) | — | Sí | RPC | — |

---

## 11. Gap Analysis

**A. Ya implementado**: Rewards ledger, Wallet, Goals (`WALLET_BALANCE`), Missions (sistema, 4 keys).
**B. Diseñado pero no implementado**: `partners`, `partner_activities`, `complete_partner_activity()`, Attribution, Recurrence, RLS Partners, antifraude P3/P4.
**C. Requiere migración**: todo lo de B — es una única migración coherente (Technical Spec §19, 3 archivos: `partners`, `partner_activities`, `complete_partner_activity()`).
**D. Requiere UX**: Dashboard del Partner, flujo de QR físico, panel de acceso vía token.
**E. Requiere decisión** (no técnica): qué 2 Missions sustituyen a las de Travel; cuándo corregir el copy de Home; precio final post-Beta.
**F. No debe tocarse**: toda la arquitectura Travel; Rewards/Goals/Missions ya `LOCKED` en su diseño (solo se añade Partners, no se modifican).

---

## 12. Decisiones que no se reabren

L1-L19 (Master V2) · P1-P8 (Decision Lock Económico) · GOALS-V1 (`WALLET_BALANCE`) · No Partner Missions · Travel `FROZEN` · Points ≠ dinero · el principio de esta misma integración (sección 4: una fila alimenta ambos lados).

---

## 13. Decisiones abiertas (solo las que realmente siguen abiertas — ninguna nueva inventada)

- Qué 2 Missions sustituyen a `search_started`/`hotel_viewed`.
- Cuándo corregir las 3 contradicciones de copy/UX de Home (ya documentadas en `VIAO_B2C_PRODUCT_DEFINITION.md`).
- Precio final post-Beta (€49/€79, `PROPOSAL`, no `LOCKED`).
- Arquitectura de acceso Partner V1+ (Technical Spec §11.4).
- Densidad real de usuarios VIAO por zona (`VALIDATION`, condiciona la selección de los 3-5 Partners piloto).

---

## 14. Resultado final

**A. Contrato B2C ↔ Partners**: una única fila de `partner_activities` (cuando exista) es la fuente simultánea de Points/Goal (B2C) y de atribución/recurrencia/dashboard (B2B) — confirmado como principio, sin contradicción, sin dependencia de Missions ni de Travel.

**B. Flujo exacto de datos**: `Partner confirma actividad → RPC (lock, idempotencia, P3, cálculo P1/P2, P4) → INSERT partner_activities (siempre) → INSERT rewards_transactions (condicional a P4) → Wallet (ya agnóstico, sin cambios) → Goal progress (ya agnóstico, sin cambios) → Dashboard Partner (agregación sobre partner_activities)`.

**C. Qué existe hoy**: todo el lado receptor B2C (Rewards, Wallet, Goals, Missions) — verificado, `FACT`. Nada del lado Partner.

**D. Qué falta**: la migración completa de `partners`/`partner_activities`/`complete_partner_activity()`, y todo el dashboard/UX del Partner — nada de esto tiene diseño pendiente de resolver, solo implementación pendiente de autorizar.

**E. Contradicciones**: ninguna nueva en este documento — las 3 ya conocidas (copy de Home) siguen documentadas en `VIAO_B2C_PRODUCT_DEFINITION.md`, no se repiten aquí porque no son parte del contrato Partners en sí.

**F. Qué NO tocar**: Travel completo; Rewards/Goals/Missions en su diseño actual (se conectan, no se modifican).

**G. Próximo bloque recomendado**: si se aprueba este contrato, el siguiente bloque natural es el prompt de implementación de la primera migración real de Partners (`partners`, `partner_activities`, `complete_partner_activity()`) — explícitamente NO autorizado por este documento, solo preparado conceptualmente para cuando se apruebe.

---

## Fuentes

`docs/01_CURRENT/partners/VIAO_PARTNERS_MASTER_V2.md`, `docs/01_CURRENT/partners/VIAO_PARTNERS_TECHNICAL_SPEC.md` (§6, §8-9, §11, §14, §19, §25), `docs/01_CURRENT/b2c/VIAO_B2C_PRODUCT_DEFINITION.md`, `docs/01_CURRENT/product/VIAO_MASTER_PRODUCT_CONTEXT.md`, `docs/02_DECISION_LOCKS/goals/VIAO_GOALS_V1_DECISION_LOCK.md`. Código verificado directamente: `lib/rewards/get-wallet-balance.ts`, `lib/goals/get-goal.ts`, `lib/goals/calculate-progress.ts`, `lib/missions/rules.ts`, y ausencia confirmada de `supabase/migrations/*partner*`, `lib/partners/`, `app/partners/`.

---
