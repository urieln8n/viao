---
STATUS: SUPERSEDED PARTIALLY
ERA: Esta sesión
DOMAIN: Partners
AUTHORITY: El documento conserva valor como auditoría/estructura del bloque MVP Partners (secciones 1-14, 16-18, 20 y siguientes). Su antiguo veredicto BLOCKED y las cuatro decisiones que dejaba abiertas (PMM3, PMM4, PMM6, PMM10) quedaron superados por decisiones posteriores. NO debe tratarse como fuente de decisiones abiertas para PMM3/PMM4/PMM6/PMM10 — para esas cuatro, la autoridad es exclusivamente VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md.
SUPERSEDES: —
SUPERSEDED BY: docs/02_DECISION_LOCKS/partners/VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md (únicamente para PMM3/PMM4/PMM6/PMM10 — el resto del documento no está sustituido)
LAST REVIEWED: 2026-08-25
---

# VIAO Partners — MVP Master (referencia operativa)

### Estado: AUDITORÍA + DISEÑO + PLANIFICACIÓN — NO autoriza implementación. No se ha modificado código, Supabase, migraciones, RLS, componentes ni rutas.
### Fecha: 2026-08-25.
### Auditoría realizada antes de escribir: lectura completa de `VIAO_V1_LOOP_DECISION.md`; lectura real de `supabase/migrations/20260823150000_create_rewards_catalog.sql`, `20260824091000_add_rewards_catalog_real_cost_limit.sql`, `20260823151000_create_reward_redemptions.sql`; `Glob`/`Grep` confirmando de nuevo ausencia total de `partners`/`partner_activities`/`complete_partner_activity()` en el repositorio.
### Taxonomía: `FACT` · `DECISION` · `LOCKED` · `PROPOSAL` · `VALIDATION` · `FUTURE` · `FROZEN` · `DEPRECATED` · `CONTRADICTION`.

---

## CONTRADICTION — encontradas en esta auditoría, no corregidas

Entre `VIAO_V1_LOOP_DECISION.md` (Decision Lock, 2026-08-19, previo a todo el trabajo de Partners de esta sesión) y `VIAO_PARTNERS_MASTER_V2.md`/`VIAO_PARTNERS_TECHNICAL_SPEC.md` (LOCKED, esta sesión):

1. **Modelo económico**: V1_LOOP_DECISION locked "financiación 50/50 Partner/coste real, VIAO nunca 100%" como regla del earning vía Partner. **Verificado en el schema real** (`rewards_catalog.funding_type`, migración `20260823150000`): el mecanismo implementado es un **binario** `'viao'`/`'partner'`, sin ningún porcentaje de reparto — el 50/50 nunca se implementó. Además, el modelo LOCKED en P1-P8 (Points por € declarado, pool de 3.000/mes) es una mecánica completamente distinta — una tasa de emisión, no un reparto de coste de canje — y no menciona ningún porcentaje de cofinanciación del Partner en absoluto.
2. **Dashboard del Partner**: V1_LOOP_DECISION locked explícitamente "sin dashboard de Partner en V1 — con 3-5 partners, gestión manual es más rápida". El Technical Spec (§14, esta sesión) diseña un dashboard como pieza central del producto Beta, y toda la investigación comercial posterior lo trata como el "momento WOW"/producto real. Es un giro real de 180°, nunca reconciliado explícitamente entre ambos documentos.
3. **Mecanismo de atribución**: V1_LOOP_DECISION diseña un **token que rota diariamente**, escaneado por el **usuario**, como antifraude (obliga presencia física ese día). El Technical Spec (§8) diseña un **código fijo por Partner**, escaneado/confirmado por el **Partner**, con antifraude vía `attempt_id`+P3+P4 en su lugar. Son dos mecanismos distintos para el mismo problema.
4. **`createRewardTransaction()`**: el pseudocódigo de esta auditoría (sección 8) confirma que el patrón real ya usado por `complete_mission()`/`redeem_reward()` **no llama** a `createRewardTransaction()` (`lib/rewards/create-reward-transaction.ts`) — cada RPC hace su propio INSERT atómico en `rewards_transactions` dentro de la misma función SQL. Un futuro `complete_partner_activity()` seguiría ese mismo patrón, no el de la función TypeScript.

**No se resuelve ninguna aquí.** El documento asume, por ser el más reciente y el más específico, que Master V2/Technical Spec prevalecen — pero esto requiere confirmación explícita, no se da por hecho.

---

## 1. Qué es un Partner

**Qué representa**: un negocio local (Restaurante/Experiencia, `LOCKED` L2) cuya actividad económica real genera Points para el usuario y datos de atribución para VIAO.
**Problema que resuelve para el Partner**: no saber quién de sus clientes llega vía VIAO ni cuáles repiten (ya investigado extensamente, `VIAO_PARTNERS_B2B_VALUE_PROPOSITION.md`).
**Qué recibe el usuario**: Points hacia su Goal por una actividad real, verificable.
**Qué recibe VIAO**: datos de actividad económica real (ventas declaradas/confirmadas), y en el futuro, ingreso B2B.
**Qué recibe el Partner**: visibilidad de clientes nuevos/recurrentes (Beta, gratis, `LOCKED` L6).
**Qué NO es Partner**: no es un canal de reservas, no es un CRM, no es un proveedor de Travel.
**Tipos necesarios en V1**: `LOCKED` L2 — Restaurantes + Experiencias, 3-5 piloto (L1).

---

## 2. Propuesta de valor para el Partner

| | Beta | MVP comercial | Futuro |
|---|---|---|---|
| Dashboard | `PROPOSAL` — clientes nuevos/recurrentes, ventas declaradas/confirmadas, actividad reciente | Mismo, sin cambios de fondo | Evolución mes a mes, `FUTURE` |
| Coste para el Partner | `LOCKED` — 0€ (L6) | `PROPOSAL` — €49-79/mes (no `LOCKED`, ver `VIAO_PARTNERS_B2B_VALUE_PROPOSITION.md`) | — |
| ROI en €/ranking/proyecciones | Explícitamente excluido | Igual | — |
| Comisión/impacto de campañas | No existe en Beta | `FUTURE`, no diseñado | — |

No se asume que habrá cobro — Beta es exclusivamente de validación (`LOCKED` L6).

---

## 3. Modelo económico

**Auditado, no modificado**:
- `POINTS_PER_EURO = 100` — `FACT`, `lib/rewards/rules.ts`, ya en producción (Home/Wallet).
- `POINTS_PERCENTAGE_OF_COMMISSION = 25%` — `FACT` (constante existe), pero inaplicable en Beta porque la comisión de Partners es 0€ (ya identificado en el Decision Lock Económico de esta sesión) — **no contradice** P1-P8, simplemente no se usa todavía.
- Co-financiación 50/50 — `CONTRADICTION #1` arriba, no vigente en el schema real.
- `rewards_transactions` como ledger único — `FACT`/`LOCKED`, sin excepción.

**Flujo propuesto** (`PROPOSAL`, siguiendo P1-P8, `LOCKED` en su forma, `PENDING` en su código):

```
Partner Activity → cálculo P1/P2 (Points por € declarado)
  → comprobación P3 (máx. 2/día) y P4 (pool 3.000/mes)
  → INSERT partner_activities (siempre)
  → INSERT rewards_transactions (solo si hay margen en P4)
  → Wallet (ya agnóstico, sin cambios)
  → Goal (ya agnóstico, sin cambios)
```

**Separación explícita**: dinero real (no existe en Beta, Partners no paga ni cobra), comisión (0€ en Beta), Points (P1/P2), coste de Rewards (ya gobernado por `rewards_catalog`/`MAX_REWARD_REAL_COST_PERCENT`, sin relación directa con Partners), financiación (100% del coste de Points vía Partners recae en el pool P4, acotado — no hay financiación Partner en Beta, a diferencia de lo que proponía V1_LOOP_DECISION).

**Ninguna regla económica existente se modifica.**

---

## 4. Modelo de actividad (conceptual, `PENDING`)

- **Quién la crea**: el Partner (o quien opere con su token de acceso), nunca el usuario directamente.
- **Cuándo**: al confirmar una interacción real (QR o reserva).
- **Qué datos contiene**: `partner_id`, `user_id`, `attribution_mechanism`, `declared_amount_eur`, `amount_confidence`, `points_awarded`, `reservation_reference` (opcional), `attempt_id` — diseño Technical Spec §6.
- **Identificación**: `id` generado por el propio INSERT, nunca por el cliente.
- **Atribución al usuario**: `user_id` resuelto por la capa de aplicación (`auth.getUser()`), nunca confiado del cliente.
- **Relación con la compra**: `declared_amount_eur`, declarado por el Partner, sin verificación en Beta (riesgo ya aceptado, Master V2 §14).
- **Cálculo de la recompensa**: P1/P2 sobre `declared_amount_eur`.
- **Evitar duplicados**: `UNIQUE(attempt_id)`.
- **Estados posibles**: **ninguno** — deliberadamente sin columna `status` (diseño ya justificado: cada fila nace confirmada).
- **Disputa**: `NOT IMPLEMENTED` / `FUTURE` — no diseñado, Beta no lo necesita.
- **Cancelación**: `NOT IMPLEMENTED` — coherente con la ausencia de `status`; una Actividad, una vez creada, es definitiva en Beta.
- **Devolución de compra**: `NOT IMPLEMENTED` / `VALIDATION` — no resuelto en ningún documento hasta ahora; riesgo real no cubierto, digno de nota explícita (nuevo hallazgo de esta auditoría, no estaba señalado antes).

---

## 5. Atribución — comparación de mecanismos

| Mecanismo | Facilidad usuario | Facilidad Partner | Fraude | Coste | Trazabilidad | Escalabilidad |
|---|---|---|---|---|---|---|
| A. QR fijo, escaneado por Partner (Technical Spec, actual) | Alta | Media (requiere confirmar) | Medio — sin verificación de importe | Bajo | Alta | Alta |
| B. Token rotativo diario, escaneado por usuario (V1_LOOP_DECISION, superseded) | Media | Alta (pasivo) | Bajo — exige presencia física ese día | Bajo | Alta | Media |
| C. Enlace/código manual | Baja | Alta | Alto | Muy bajo | Baja | Baja |
| D. QR + confirmación del comercio (híbrido) | Alta | Media | Bajo | Medio | Alta | Alta |

**Recomendación** (`PROPOSAL`, no `LOCKED`): mantener el diseño A ya presente en el Technical Spec (más reciente, más detallado, ya integrado con P1-P8) — pero **la contradicción #3 debe resolverse explícitamente por Andrés antes de implementar**, no asumirse por omisión.

---

## 6. Modelo de datos conceptual

| Entidad | Propósito | Ownership | Quién escribe | Quién lee | Estado |
|---|---|---|---|---|---|
| `partners` | Identidad del negocio | VIAO | `service_role` | Público (lectura, Patrón B como `destinations`) | `NOT IMPLEMENTED` |
| `partner_activities` | Puente B2C/B2B | VIAO | `service_role` (vía RPC) | `service_role` | `NOT IMPLEMENTED` |
| `partner_users`/`members` | — | — | — | — | **No necesario** — acceso vía token único (P7), sin usuarios propios del Partner |
| `partner_locations` | — | — | — | — | **No necesario en Beta** — 3-5 Partners, una ubicación cada uno, no justifica una tabla propia |
| `partner_events`/attribution | — | — | — | — | Cubierto por `partner_activities` en sí — no se necesita una tabla separada |
| `partner_metrics` | — | — | — | — | **No necesario** — el dashboard es agregación en lectura sobre `partner_activities`, no una tabla materializada |

**Principio de simplicidad confirmado**: de las 6 entidades evaluadas, solo 2 (`partners`, `partner_activities`) se justifican para V1 — el resto sería sobre-ingeniería para 3-5 Partners.

---

## 7. Supabase / RLS (conceptual, `PENDING`)

- Usuario: sin lectura ni escritura directa de `partners`/`partner_activities` — nunca cliente-directo (Patrón B).
- Partner: lectura de sus propios datos vía token opaco (no vía Supabase Auth/RLS de usuario — el acceso es a nivel de aplicación, no de policy de Postgres).
- Todo lo económico: `service_role` + `SECURITY DEFINER`, mismo patrón que `complete_mission()`/`redeem_reward()`.
- Nunca acepta escritura directa: `partner_activities`, `rewards_transactions` (sin cambios, ya `LOCKED`).
- **No se crea un segundo ledger** — confirmado como principio no negociable en la sección 8.

---

## 8. Relación con Rewards — crítico

**Confirmado, prohibición explícita respetada**: no se crea ningún ledger nuevo. `partner_activities` es un registro de actividad; `rewards_transactions` sigue siendo el único ledger de Points.

**Corrección importante de esta auditoría** (`CONTRADICTION #4` de arriba, ya explicada): el patrón real no es "llamar a `createRewardTransaction()`" — esa función TypeScript la usan otros flujos (registro, referidos), pero **`complete_mission()` y `redeem_reward()` no la usan**: cada uno hace su propio `INSERT INTO rewards_transactions` dentro de su función SQL `SECURITY DEFINER`. Un futuro `complete_partner_activity()` seguiría ese mismo patrón — no una llamada a la función TS.

```
partner_activity → validación (usuario/partner activos)
  → cálculo (P1/P2)
  → INSERT partner_activities (siempre)
  → INSERT rewards_transactions (condicional a P4) — dentro de la MISMA transacción SQL
  → Wallet (lectura agnóstica, ya existente)
  → Goal (lectura agnóstica, ya existente)
```

**Idempotencia**: `UNIQUE(attempt_id)`, mismo patrón que `redeem_reward()`. **Concurrencia**: `pg_advisory_xact_lock(hashtext('viao_partners_pool'))`, mismo patrón que `complete_mission()`.

---

## 9. Relación con Goals

`WALLET_BALANCE` no se modifica. El Goal sigue leyendo el saldo total de `rewards_transactions` — un Point de Partners es indistinguible de cualquier otro Point para el cálculo de progreso. **No existe ni se propone lógica paralela.** `FACT`, ya verificado en `lib/goals/get-goal.ts`/`calculate-progress.ts`.

---

## 10. Missions

Respetado sin excepción: **no se crean Partner Missions** (`LOCKED`). Partner Activity convive con Missions como sistemas paralelos, sin dependencia mutua — mismo hallazgo ya confirmado en `VIAO_B2C_PARTNERS_INTEGRATION_DECISION.md`. Ninguna Mission nueva se decide en este documento; siguen `OPEN` las candidatas para sustituir `search_started`/`hotel_viewed`.

---

## 11. Dashboard del Partner (conceptual, `PENDING` — y sujeto a `CONTRADICTION #2`)

**Beta MVP** (`PROPOSAL`, Technical Spec §14): `clientes_nuevos`, `clientes_recurrentes`, `ventas_declaradas_eur`, `ventas_confirmadas_reserva_eur`, `actividad_reciente`, `partner_activo`.
**Futuro**: evolución mes a mes, comparativas — nada de esto se decide aquí.
**No construir UI en este bloque** — solo el contrato de datos ya diseñado.

---

## 12. Beta Partners

- **Qué necesita el Partner**: acceso vía token (P7), QR físico, aceptar el mecanismo de confirmación manual.
- **Onboarding**: manual/curado (`LOCKED` L3).
- **Activación**: primera actividad confirmada (Activation Event, ya definido en bloques anteriores).
- **Qué recibe**: dashboard de solo lectura, gratis.
- **Qué medimos**: las 6 métricas `LOCKED` (Master V2 L17) + densidad de usuarios por zona (`VALIDATION`, ya identificado como el riesgo más importante en toda la investigación previa).
- **Qué consideramos éxito**: al menos un Value Event real (cliente recurrente) por Partner dentro de las 6-8 semanas (`LOCKED` L4).
- **Qué NO prometemos**: clientes garantizados, facturación garantizada, ROI garantizado — ya establecido en la investigación comercial.

**Objetivo explícito de Beta**: no maximizar ingresos — validar que (1) el Partner acepta el mecanismo, (2) los clientes lo usan, (3) la atribución funciona, (4) los datos tienen valor, (5) la economía tiene sentido, (6) existe recurrencia.

---

## 13. MVP vs. Futuro

| | MUST HAVE | SHOULD HAVE | FUTURE | DO NOT BUILD |
|---|---|---|---|---|
| Partners | Tabla básica, categoría, status | — | Multi-ubicación | POS, ERP |
| Partner Activities | Tabla + RPC (P1-P4) | — | Disputas/cancelación | Segundo ledger |
| Atribución | QR fijo (mecanismo A) | — | — | Token rotativo (salvo que se decida reabrir #3) |
| Dashboard | Contrato de datos §14 | Vista real | Evolución mensual | Ranking entre Partners, ROI en € |
| Antifraude | P3 (diario) + P4 (mensual) | — | Verificación real de importe (OCR) | — |
| Missions | Ninguna nueva de Partner | — | — | Partner Missions |
| Precio | Ninguno (Beta gratis) | — | €49-79 (`PROPOSAL`) | Múltiples planes |

---

## 14. Roadmap por fases

| Fase | Objetivo | Tablas/RPCs potenciales | Dependencias | Riesgo | Criterio de salida | Qué NO tocar |
|---|---|---|---|---|---|---|
| P0 — Auditoría/Pre-flight | Cerrar contradicciones #1-#4 | Ninguna | Ninguna | Bajo | Andrés resuelve las 4 contradicciones explícitamente | Código |
| P1 — Modelo económico | Confirmar P1-P8 vs. schema real | Ninguna | P0 | Bajo | Confirmación explícita de que P1-P8 prevalece sobre el 50/50 antiguo | Rewards |
| P2 — Schema Supabase | `partners`, `partner_activities` | 2 tablas | P1 | Medio | Migraciones revisadas, no aplicadas todavía | Rewards/Goals |
| P3 — Partner identity/onboarding | Token de acceso (P7) | Columna `access_token` en `partners` | P2 | Bajo | — | — |
| P4 — Partner Activity | `complete_partner_activity()` | 1 RPC | P2, P3 | Medio | Idempotencia y locks verificados en tests | `rewards_transactions` en su forma actual |
| P5 — Attribution | Resolver contradicción #3 | — | P0, P4 | Medio | Decisión explícita del mecanismo | — |
| P6 — Points integration | Confirmar Wallet/Goal reciben Points sin cambios | — | P4 | Bajo (ya `FACT`) | Test de integración real | Goals, Wallet |
| P7 — Dashboard Beta | Vista de solo lectura | — | P4, P6 | Medio | Resolver contradicción #2 primero | — |
| P8 — QR/experiencia física | — | — | P5 | Medio | — | — |
| P9 — Antifraude mínimo | P3/P4 en código | Dentro del RPC de P4 | P4 | Medio | Tests de kill-switch | — |
| P10 — Tests/E2E | — | — | P4-P9 | — | Cobertura equivalente a `complete_mission()`/`redeem_reward()` | — |
| P11 — Beta | 3-5 Partners reales | — | Todo lo anterior | Alto (densidad de usuarios, `VALIDATION`) | Ver sección 12 | — |

**Ninguna fase se implementa en este turno.**

---

## 15. Orden de implementación

`PROPOSAL`, justificado: **economía → schema → seguridad → actividad → atribución → rewards → dashboard → QR → antifraude**, coincide en esencia con el orden ya propuesto arriba, con una corrección: **la resolución de las 4 contradicciones (P0) debe preceder a la economía**, no puede asumirse resuelta. Justificación: sin resolver qué modelo económico prevalece (P1-P8 vs. el 50/50 antiguo), cualquier schema construido después heredaría una ambigüedad real, no solo teórica.

---

## 16. Decision Register

| ID | Decisión | Estado | Evidencia | Impacto | Requiere aprobación |
|---|---|---|---|---|---|
| PMM1 | Modelo de Partner (Restaurantes+Experiencias, 3-5 piloto) | `LOCKED` | Master V2 L1-L2 | Base de todo | No |
| PMM2 | Modelo de Activity (sin `status`, siempre confirmada) | `LOCKED` | Technical Spec §6 | Diseño de schema | No |
| PMM3 | Mecanismo de atribución final | `CONTRADICTION`, no resuelta | Sección 5, #3 | Bloqueante para P5 | **Sí** |
| PMM4 | Modelo económico final (P1-P8 vs. 50/50 antiguo) | `CONTRADICTION`, no resuelta | Sección 3, #1 | Bloqueante para P1 | **Sí** |
| PMM5 | Quién confirma la compra | `LOCKED` (el Partner, no el usuario) | Technical Spec §8 | — | No |
| PMM6 | Dashboard Beta como producto central | `CONTRADICTION` con V1_LOOP_DECISION, no resuelta | Sección 2/11, #2 | Bloqueante para P7 | **Sí** |
| PMM7 | Gratuidad de Beta | `LOCKED` | Master V2 L6 | — | No |
| PMM8 | Antifraude mínimo (P3/P4) | `LOCKED` en umbrales, `PENDING` en código | Decision Lock Económico | — | No |
| PMM9 | Estados de Activity (ninguno) | `LOCKED` | Technical Spec §6 | — | No |
| PMM10 | Refunds/disputas de una Activity | `VALIDATION` — sin resolver en ningún documento | Sección 4, hallazgo nuevo | Riesgo real no cubierto | **Sí, antes de producción real** |
| PMM11 | Onboarding manual/curado | `LOCKED` | Master V2 L3 | — | No |

---

## 17. Contradicciones / preguntas abiertas — resumen

Las 4 de la cabecera del documento, más PMM10 (refunds/disputas, nunca resuelto en ningún documento anterior — hallazgo nuevo de esta auditoría). Ninguna se corrige aquí.

---

## 18. Qué NO hacer

No tocar Rewards sin auditoría (ya hecha aquí, sin cambios necesarios). No crear un segundo ledger. No crear Partner Missions. No tocar Goals. No modificar `WALLET_BALANCE`. No reactivar Hotelbeds. No Flights. No IA nueva. No sobrearquitectura (ver sección 6, principio de simplicidad). No implementar QR antes de resolver PMM3. No migraciones en este turno.

---

## 19. Criterio de cierre

# PARTNERS MVP MASTER

## Estado: **BLOCKED**

No por falta de diseño — el diseño (Master V2, Technical Spec) es sólido y detallado. **Bloqueado porque existen 4 contradicciones reales entre el diseño más antiguo (V1_LOOP_DECISION, con su propio Decision Lock) y el diseño más reciente (Master V2/Technical Spec), nunca reconciliadas explícitamente**, más un hallazgo nuevo (refunds/disputas, PMM10) sin resolver en ningún documento.

**Qué está decidido**: el modelo de Partner, el modelo de Activity (sin estados), quién confirma, la gratuidad de Beta, el onboarding manual, los umbrales de antifraude (aunque no el mecanismo exacto de atribución que los aplica).

**Qué está pendiente y necesita aprobación de Andrés**: PMM3 (mecanismo de atribución), PMM4 (modelo económico definitivo), PMM6 (si el dashboard es o no el producto central), PMM10 (qué pasa con una devolución/disputa).

**Próximo bloque después de aprobar este documento**: **NO es código.** Es un bloque de decisión corto y específico — resolver PMM3/PMM4/PMM6/PMM10, uno por uno, con la misma disciplina de Decision Lock ya usada en todo el proyecto — antes de escribir la primera migración real.

---

## Fuentes auditadas

`docs/01_CURRENT/product/VIAO_MASTER_PRODUCT_CONTEXT.md`, `docs/01_CURRENT/b2c/VIAO_B2C_PRODUCT_DEFINITION.md`, `docs/01_CURRENT/b2c/VIAO_B2C_PARTNERS_INTEGRATION_DECISION.md`, `docs/VIAO_V1_LOOP_DECISION.md` (leído completo en esta auditoría), `docs/02_DECISION_LOCKS/goals/VIAO_GOALS_V1_DECISION_LOCK.md`, `docs/01_CURRENT/partners/VIAO_PARTNERS_MASTER_V2.md`, `docs/01_CURRENT/partners/VIAO_PARTNERS_TECHNICAL_SPEC.md`, `docs/03_RESEARCH_VALIDATION/partners_commercial/VIAO_PARTNERS_B2B_VALUE_PROPOSITION.md`. Código verificado directamente: `supabase/migrations/20260823150000_create_rewards_catalog.sql`, `20260824091000_add_rewards_catalog_real_cost_limit.sql`, `20260823151000_create_reward_redemptions.sql`, `lib/rewards/rules.ts`, `lib/goals/get-goal.ts`; ausencia confirmada de `supabase/migrations/*partner*`, `lib/partners/`, `app/partners/`.

---
