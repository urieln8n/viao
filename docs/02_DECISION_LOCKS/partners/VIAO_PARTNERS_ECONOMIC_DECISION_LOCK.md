---
STATUS: LOCKED
ERA: Partners/V2 (esta sesión, la más reciente)
DOMAIN: Partners/Economía
AUTHORITY: Fuente de verdad económica de Partners — PMM3/PMM4/PMM6/PMM10
SUPERSEDES: Modelo de cofinanciación 50/50 (docs/VIAO_V1_LOOP_DECISION.md, DEPRECATED); mecanismo de token rotativo; regla "sin dashboard en V1"
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-25
---

# VIAO Partners — Economic Decision Lock

### Estado: LOCKED (documentación/decisión). No autoriza implementación — no hay código, Supabase, migraciones, RLS, tablas, RPCs, componentes ni rutas asociadas a este documento.
### Fecha: 2026-08-25.
### Alcance: fija las decisiones económicas y operativas de Partners (PMM3, PMM4, PMM6, PMM10) aprobadas por el owner en el bloque P0. Precede a P2 (diseño de schema, aún no iniciado).
### Taxonomía: `LOCKED` · `DEPRECATED` · `FUTURE` · `VALIDATION` · `PROPOSAL`.

---

## 1. PMM3 — Atribución — `LOCKED`

**Decisión definitiva: D — código de atribución fijo por usuario, no rotativo, con confirmación explícita del Partner.**

Flujo:
1. El Partner identifica al usuario mediante el código.
2. El Partner confirma explícitamente la actividad.
3. El Partner declara el importe.
4. Esa confirmación es, conceptualmente, el evento que dispara `complete_partner_activity()`.

**LOCKED**:
- Código fijo, sin rotación diaria, sin expiración como requisito de diseño.
- El Partner es la autoridad de confirmación; el Partner declara el importe.
- El usuario NO confirma la actividad.
- `attempt_id` continúa siendo la clave de idempotencia.
- P3/P4 siguen siendo los controles económicos primarios frente al farming, no el mecanismo de atribución.

**DEPRECATED**: el token rotativo diario de `docs/VIAO_V1_LOOP_DECISION.md`.

**FUTURE / VALIDATION**: OCR, integración POS/TPV, verificación automática del importe, rotación de código si VIAO escala a Partners no curados manualmente, capas antifraude adicionales si los datos reales de Beta las justifican. Nada de esto se diseña ni se implementa aquí.

---

## 2. PMM4 — Modelo económico — `LOCKED`

Se mantiene el diseño P1-P8 ya definido para Partners, documentado aquí con la separación de conceptos que antes faltaba.

### P1/P2 — Emisión

Los Points se calculan sobre el importe declarado, según las tasas ya definidas en el diseño Partners vigente:
- Actividad declarada: tasa correspondiente ya fijada (P1/P2).
- Actividad confirmada por reserva: tasa correspondiente ya fijada (P1/P2).

No se inventan tasas nuevas en este documento — este documento no es la fuente de las tasas exactas, solo confirma que se mantienen sin cambios.

### P3 — Límite diario

Máximo **2 actividades / usuario / Partner / día**, según el diseño ya auditado.

### P4 — Pool mensual

Pool propio e independiente: **3.000 Points/mes**.

Cuando el pool se agota:
- La `partner_activity` se registra igualmente.
- `points_awarded = 0`.
- NO se crea `rewards_transaction`.
- NO existe deuda.
- NO existe backfill posterior.
- NO se bloquea la actividad.

Control mecánico ya documentado (no se cambia su implementación en este bloque): `pg_advisory_xact_lock(hashtext('viao_partners_pool'))`.

---

## 3. Beta = 0 € — `LOCKED`

- Durante Beta, el Partner paga **€0**.
- No existe comisión económica de Partner en Beta.
- No existe cofinanciación económica Partner/VIAO en Beta.
- No existe facturación.
- No existe deuda del Partner por Points otorgados.
- El precio futuro (**€49-79/mes**) sigue siendo `PROPOSAL`/`VALIDATION` — no queda decidido como precio definitivo por este documento.

---

## 4. Modelo 50/50 — `DEPRECATED` formalmente

El modelo antiguo — *"financiación 50/50 Partner/coste real, VIAO nunca 100%"* (`docs/VIAO_V1_LOOP_DECISION.md`) — queda formalmente **DEPRECATED**:

- No es una alternativa vigente.
- No se implementa.
- No se reinterpreta como `FUTURE`.
- No se introduce ninguna columna de porcentaje de reparto.
- No se añade lógica 50/50 a `partner_activities`, `rewards_catalog` ni `rewards_transactions`.

**Por qué se retira**: mezclaba dos conceptos económicos distintos — (1) la emisión de Points por una actividad Partner, y (2) la financiación/coste económico de un Reward al canjearse. Son eventos separados en el tiempo, con reglas y responsables distintos; tratarlos como un único porcentaje de reparto era un error de diseño, no una simplificación válida.

---

## 5. Separación económica obligatoria — Conceptos A-F

| Concepto | Descripción | Estado | Gobierno |
|---|---|---|---|
| **A — Points por Partner Activity** | Points que gana el usuario por una actividad real con un Partner | `LOCKED` | P1/P2 (emisión), P3 (diario), P4 (mensual) |
| **B — Comisión económica de VIAO** | `POINTS_PERCENTAGE_OF_COMMISSION = 0.25` (`lib/rewards/rules.ts`) | `FUTURE` / dormida para Partners Beta | No se usa: Beta = €0, no existe comisión de Partner, no existe earning ligado a comisión en Beta. No se elimina ni modifica la constante. |
| **C — Coste real de un Reward** | `rewards_catalog.real_cost_eur` + `MAX_REWARD_REAL_COST_PERCENT = 0.30` | Ya existente, sin cambios | Aplicable solo al mecanismo de `funding_type='viao'` |
| **D — Financiación del Reward** | `rewards_catalog.funding_type` ∈ {`viao`, `partner`} | Ya existente, sin cambios | Pertenece al catálogo de Rewards; NO representa quién originó los Points que el usuario gasta |
| **E — Precio de suscripción del Partner** | Beta = €0; futuro €49-79/mes | `PROPOSAL`/`VALIDATION`, no `LOCKED` | — |
| **F — Cofinanciación Partner/VIAO (50/50)** | Modelo antiguo | `DEPRECATED` | Nunca implementado en el schema real |

---

## 6. Pools independientes — advertencia explícita

Existen **tres pools mensuales distintos** en el proyecto. No deben combinarse, sumarse ni reutilizarse entre sí:

| Pool | Constante/mecanismo | Unidad | Dominio |
|---|---|---|---|
| Missions | `MISSIONS_POOL_MONTHLY_LIMIT_POINTS = 3000` (`lib/missions/rules.ts`) | Points | Missions |
| Partners | 3.000 Points/mes, `pg_advisory_xact_lock('viao_partners_pool')` | Points | Partners |
| Rewards | `VIAO_REWARD_POOL_MONTHLY_LIMIT_EUR` | EUR | Rewards |

Que Missions y Partners coincidan numéricamente en 3.000 Points es una coincidencia de diseño, no una relación funcional — son mecanismos de bloqueo y reseteo completamente independientes.

---

## 7. PMM6 — Dashboard Beta — `LOCKED`

El dashboard Beta **sí forma parte del producto**, pero debe ser extremadamente mínimo: solo lectura, sin self-service, sin filtros, sin exportaciones, sin ranking, sin comparativas, sin ROI proyectado.

Exactamente estas seis métricas, ninguna más:

1. `clientes_nuevos`
2. `clientes_recurrentes`
3. `ventas_declaradas_eur`
4. `ventas_confirmadas_reserva_eur`
5. `actividad_reciente`
6. `partner_activo`

**Núcleo del valor**: `clientes_nuevos` y `clientes_recurrentes` — responden directamente a la pregunta que el Partner necesita responder para percibir valor.
**Contexto/apoyo**: `ventas_declaradas_eur`, `ventas_confirmadas_reserva_eur`, `actividad_reciente`, `partner_activo`.

El dashboard es una agregación de lectura sobre `partner_activities` — no requiere una tabla `partner_metrics`. La UI no se implementa en este bloque.

---

## 8. PMM10 — Refunds / disputas — `LOCKED`

`partner_activities` es **append-only**:
- No tiene `status`.
- No se edita.
- No se convierte en una máquina de estados.

Si existe un error posterior, la corrección se hace mediante una **nueva transacción compensatoria en `rewards_transactions`**:
- Es negativa cuando revierte Points.
- Usa un `reason` distintivo (ejemplo ilustrativo: `partner_activity_correction`).
- Referencia la actividad original — el mecanismo exacto de esa referencia se determina en el diseño posterior (P2/P4), no aquí.
- Se ejecuta manualmente por VIAO/`service_role`.
- NO es autoservicio del Partner.
- NO es autoservicio del usuario.

El schema exacto de la referencia y de la RPC correspondiente pertenece a P2/P4, no a este documento.

---

## 9. Reglas no negociables

Partners **no crea un segundo sistema económico**.

`rewards_transactions` continúa siendo **el único ledger de Points**.

**No se toca**: `rewards_transactions`, `rewards_catalog`, `reward_redemptions`.
**Tampoco se toca**: Wallet, Goals, Missions.

`partner_activities` es un registro de actividad, **no** un ledger.

---

## 10. Decision Register

| ID | Decisión | Estado | Consecuencia |
|---|---|---|---|
| PMM3 | Atribución: código fijo por usuario + confirmación explícita del Partner | `LOCKED` | Sustituye al token rotativo; sin impacto en Rewards/Goals/Missions/Wallet |
| PMM4 | Modelo económico: P1/P2 emisión, P3 diario (2/día), P4 mensual (3.000 Points), agotamiento → `points_awarded=0` sin bloqueo ni deuda | `LOCKED` | Confirma P1-P8 sin cambios; retira el 50/50 |
| PMM6 | Dashboard Beta: 6 métricas exactas, solo lectura | `LOCKED` | Producto Beta mínimo, sin tabla nueva |
| PMM10 | Refunds/disputas: transacción compensatoria en `rewards_transactions`, sin `status` en `partner_activities` | `LOCKED` | Sin segundo ledger, sin máquina de estados |
| — | Beta = €0 para el Partner (sin comisión, sin cofinanciación, sin facturación) | `LOCKED` (ya vigente, reconfirmado aquí) | Base de toda la economía de Partners V1 |
| — | Modelo 50/50 Partner/coste real | `DEPRECATED` | Formalmente retirado, no reinterpretable como `FUTURE` |
| — | No Partner Missions | `LOCKED` (ya vigente, reconfirmado aquí) | Missions y Partners permanecen paralelos |

---

## 11. FUTURE / VALIDATION consolidado

### FUTURE
- OCR.
- Integración POS/TPV.
- Verificación automática del importe declarado.
- Antifraude adicional más allá de P3/P4 y la confirmación del Partner.
- Rotación de código si VIAO escala a Partners no curados manualmente.
- Evolución mensual del dashboard, comparativas.
- Posibles modelos de comisión (activación de `POINTS_PERCENTAGE_OF_COMMISSION`).
- Posibles modelos de cofinanciación (distintos del 50/50 ya deprecado).

### VALIDATION
- Precio real que el Partner estaría dispuesto a pagar.
- Si el dashboard efectivamente cambia el comportamiento del Partner.
- Si el Partner percibe valor suficiente para pagar en el futuro.
- Si la recurrencia de clientes aparece realmente vía Partners.
- Si el modelo P1-P4 funciona económicamente sostenido en Beta.

Ninguna de estas hipótesis se convierte en `LOCKED` por este documento.

---

## 12. Qué NO se construye

Token rotativo · expiración diaria · Partner Missions · segundo ledger · `status` en `partner_activities` · disputas autoservicio · POS · ERP · CRM · OCR · WhatsApp automatizado · ranking entre Partners · ROI en € · exportaciones · múltiples planes de precio · multi-location · integraciones externas · comisión activa en Beta · cofinanciación 50/50.

---

## 13. Relación con documentos existentes

**Este documento DEROGA FORMALMENTE**: la regla de cofinanciación 50/50 de `docs/VIAO_V1_LOOP_DECISION.md`.

**Este documento CIERRA**: las decisiones PMM3, PMM4, PMM6 y PMM10 dejadas abiertas por `docs/01_CURRENT/partners/VIAO_PARTNERS_MVP_MASTER.md` (§16-17, veredicto `BLOCKED`).

**Este documento NO sustituye**: `docs/01_CURRENT/partners/VIAO_PARTNERS_MASTER_V2.md` ni `docs/01_CURRENT/partners/VIAO_PARTNERS_TECHNICAL_SPEC.md` — ambos continúan siendo la referencia del diseño técnico de Partners; este documento fija las decisiones económicas/operativas que esos documentos dejaban en contradicción con `VIAO_V1_LOOP_DECISION.md`.

**Tampoco sustituye**: `docs/01_CURRENT/b2c/VIAO_B2C_PRODUCT_DEFINITION.md`, ni la documentación de Goals, Missions o Rewards — cada dominio conserva su propia fuente de verdad.

---

## 14. Numeración canónica P1-P8

Existe una diferencia menor de etiquetado entre documentos anteriores del proyecto (por ejemplo, versiones previas de la numeración P1-P8 asignaban el kill-switch diario y el pool mensual a posiciones distintas). Este documento no inventa reglas nuevas — fija la numeración de referencia para futuras discusiones:

- **P1/P2** = emisión de Points (tasa por € declarado / confirmado por reserva).
- **P3** = límite diario (2 actividades/usuario/Partner/día).
- **P4** = pool mensual (3.000 Points/mes).
- **P5-P8** = resto de controles del diseño Partners ya documentados en `VIAO_PARTNERS_TECHNICAL_SPEC.md`.

Cuando exista diferencia de numeración histórica entre documentos, esta es la numeración canónica. Los documentos históricos no se modifican en este turno.

---

## 15. Próximo paso

**P2 — Diseño del schema Supabase.**

Diseñar ≠ implementar. P2 deberá diseñar (no escribir SQL, no crear migraciones):
- `partners`
- `partner_activities`
- sus relaciones, ownership, escritura, lectura, constraints e idempotencia.

P2 no se ejecuta en este documento.

---

## 16. Criterio de cierre

1. Archivo creado: `docs/VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md`. ✅
2. Las cuatro decisiones (PMM3, PMM4, PMM6, PMM10) quedan documentadas como `LOCKED`. ✅
3. El 50/50 aparece como `DEPRECATED` formal (sección 4). ✅
4. Separación clara entre emisión de Points (Concepto A) y financiación/coste de Rewards (Conceptos C/D) (sección 5). ✅
5. Los tres pools independientes quedan explícitos (sección 6). ✅
6. Beta = €0 para Partners queda claro (sección 3). ✅
7. El dashboard mínimo sí es producto Beta (sección 7). ✅
8. Refunds/correcciones no modifican `partner_activities` (sección 8). ✅
9. `rewards_transactions` continúa siendo el único ledger (sección 9). ✅
10. No se ha implementado nada — cero código, cero Supabase, cero migraciones. ✅

---
