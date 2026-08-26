---
STATUS: CURRENT
ERA: Partners/V2 (esta sesión)
DOMAIN: Producto global/Meta
AUTHORITY: Síntesis y mapa de navegación entre los documentos vigentes — declara explícitamente en su propia sección 24 que "no los sustituye"
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-25 (fecha propia)
NOTA: relación con docs/VIAO_MVP_MASTER.md resuelta (auditoría de coherencia documental, 2026-08-25) — documentos complementarios, sin contradicción lógica. Este documento es la fuente de verdad de producto/estrategia global; VIAO_MVP_MASTER.md es la fuente de verdad del estado técnico/ingenieril granular (checkpoint ligado a un commit concreto). Ninguno sustituye al otro.
---

# VIAO — Contexto Maestro de Producto (fuente de verdad)

### Estado: DOCUMENTO DE REFERENCIA — reconstruido a partir de conversación, código real verificado y documentos existentes. No autoriza ninguna implementación por sí mismo.
### Fecha de esta reconstrucción: 2026-08-25.
### Regla de lectura: cada afirmación está etiquetada `FACT` (existe/verificado en código o migración real), `DECISION` (decidido explícitamente, con fuente), `PROPOSAL` (recomendado, no aprobado), `VALIDATION` (necesita evidencia), `FUTURE` (previsto, no actual), `FROZEN` (existe, no se trabaja ahora), `DEPRECATED` (ya no representa la dirección actual). Ninguna hipótesis de este documento se convierte en `DECISION` por el hecho de aparecer aquí.

---

## 1. Estado actual

VIAO es, hoy, un producto en transición documentada de propósito: nació como una app de viajes con recompensas (Travel + Rewards) y está evolucionando hacia un propósito más amplio: **"VIAO ayuda a que tu vida diaria financie tus objetivos reales"** — el viaje sigue siendo el ejemplo más natural de ese objetivo para los primeros usuarios, pero deja de ser la única razón de ser del producto. `DECISION`, turno de esta sesión "VIAO — INVESTIGACIÓN DE NUEVA DIRECCIÓN DE PRODUCTO", sin oponerse a nada LOCKED anterior.

El núcleo técnico ya construido (Rewards, Goals, Missions, Partners) es, verificado directamente contra el código, **suficientemente genérico para soportar este cambio sin modificaciones de schema** — hallazgo confirmado en la auditoría de impacto de esta misma sesión.

---

## 2. Historia / evolución de VIAO

| Fase | Qué era | Estado hoy |
|---|---|---|
| **A. Travel/Hotels original** | VIAO como app de reservas de hoteles con Points — `HotelProvider`, `MockHotelProvider`, `HotelbedsProvider`, Search, `booking_intents`/`bookings` | `FROZEN` — código intacto, no se trabaja activamente |
| **B. Transición estratégica** | Hallazgo de que el acceso a APIs de hoteles (Hotelbeds, RateHawk, Travelgate) depende de aprobación comercial externa, no de capacidad técnica — no se debía dejar que fuera la condición para validar VIAO | `DECISION`, turno "VIAO — CAMBIO ESTRATÉGICO — Abandonar temporalmente la dependencia de APIs Travel" |
| **C. Nuevo propósito** | "VIAO ayuda a que tu vida diaria financie tus objetivos reales" | `DECISION`, ver sección 3 |
| **D-G. Rewards/Goals/Missions/Partners** | Ya existían antes del cambio de propósito; se confirmó que ya eran genéricos | Ver secciones 7-11 |
| **H. Modelo actual de Partners** | De "expansión futura de monetización" a motor central del nuevo propósito | `DECISION`, ver sección 10 |
| **I. Qué queda de Travel** | Arquitectura completa, sin tocar, congelada como aceleración futura | `FROZEN`, ver sección 15 |
| **J. Qué está congelado** | Ver sección 15 y 21 | — |

---

## 3. Propósito actual

> **"VIAO ayuda a que tu vida diaria financie tus objetivos reales."**

```
Vida cotidiana → actividad real (Partner) → Points → Goal → progreso visible → repetición
```

`DECISION` (turno "Nueva dirección de producto" + auditoría de impacto + investigación de las 5 direcciones alternativas, que concluyó que esta síntesis — objetivo generalizado, viaje como ejemplo dominante no exclusivo — es la más defendible frente a mantener el viaje como único propósito o abandonarlo del todo).

**Papel de cada pieza, reconstruido, no reinventado**:

| Pieza | Papel actual |
|---|---|
| Missions | Motor de hábito — genérico del núcleo, NO específico de Partners (`DECISION`: no construir Partner Missions) |
| Rewards | Ledger económico de Points, invisible para el Partner, visible e incentivador para el usuario |
| Points | Unidad del ledger, nunca convertible a dinero de forma prometida al usuario |
| Goals | Ancla emocional — un objetivo libre del usuario, ya NO acoplado a viaje por diseño (`FACT`, verificado en schema) |
| Partners | Mecanismo de generación de Points a partir de actividad económica real y verificable |
| Partner Activities | Registro append-only de cada actividad confirmada con un Partner |
| Attribution | Cómo VIAO sabe que una visita/actividad es real y de qué usuario |
| Recurrence | La métrica que demuestra que el modelo funciona — el "momento WOW" tanto para el usuario (vuelve por su Goal) como para el Partner (ve clientes que repiten) |

---

## 4-5. Modelo de producto y usuario

**Loop usuario**: `Usuario → actividad cotidiana → Partner Activity → Points → Rewards ledger → Goal → progreso → repetición`. Missions NO está entre Partner Activity y Points como paso obligatorio — es un motor de hábito paralelo, independiente (`FACT`, verificado: `complete_partner_activity()` y `complete_mission()` son RPCs separadas, sin dependencia mutua).

**Loop Partner**: `Partner → actividad → atribución → cliente nuevo/recurrente → valor económico`.

**Dónde se conectan ambos lados**: en `partner_activities` → `rewards_transactions` (Points del usuario) y, en paralelo, en el dashboard del Partner (`clientes_nuevos`/`clientes_recurrentes`, agregación sobre la misma tabla `partner_activities`). Es la MISMA fila de datos la que alimenta ambos lados — no hay dos sistemas paralelos.

**Confirmado explícitamente** (`DECISION`, no reabrir): Partner **no controla** Missions. No existen ni se van a construir "Partner Missions" — decisión ya tomada en la investigación comercial de Partners de esta sesión, con razonamiento: ninguna Mission específica de Partner aporta valor incremental sobre lo que ya aportan Rewards+Goals+atribución.

---

## 6. Missions — estado LOCKED reconstruido

`FACT`, verificado directamente en `supabase/migrations/20260824101000_create_complete_mission_rpc.sql`:

| `mission_key` | Points | Periodicidad | Disparador | Estado bajo el nuevo propósito |
|---|---|---|---|---|
| `search_started` | 10 | Semanal | Inicio de una búsqueda de hotel | **Acoplado al flujo Travel — huérfano si Search deja de ser central** |
| `hotel_viewed` | 10 | Semanal | Visita a una ficha de propiedad | **Mismo problema** |
| `return_visit` | 10 | Semanal | Visita recurrente genérica a la app | Genérico, sin cambios |
| `goal_created` | 50 | `lifetime` (una sola vez por usuario, para siempre) | Creación exitosa de un Goal | Genérico, sin cambios |

**Techo mensual (`LOCKED`, verificado)**: 3.000 Points/mes, pool propio e independiente del de Rewards, mediante `pg_advisory_xact_lock(hashtext('viao_missions_pool'))`. Idempotencia real vía constraint `UNIQUE(user_id, mission_key, period_key)`.

**`VALIDATION`**: qué 2 Missions sustituyen a `search_started`/`hotel_viewed` — abierto, no decidido, ya señalado en la auditoría de impacto.

**`DECISION` (no reabrir)**: no construir Missions específicas de Partner.

---

## 7-8. Rewards y Points

`FACT`, verificado: `rewards_transactions` (append-only, `CHECK` de signo según `type`, `UNIQUE(user_id, reason, reference_type, reference_id)` para idempotencia), Patrón B (`service_role` únicamente, sin UPDATE/DELETE). Wallet = `SUM(amount)` sobre esa tabla, vía `rewards_wallets`.

`DECISION` (histórica, ya cerrada): Points ≠ dinero — nunca se muestra al usuario una equivalencia Points→euros en la UI (aunque existe internamente `POINTS_PER_EURO=100` como constante informativa/de cálculo, `lib/rewards/rules.ts`).

`DECISION`, `redeem_reward()`/`cancel_redemption()`: dual-lock (por-usuario + pool global condicional a `funding_type='viao'`), `attempt_id` generado por el llamante. Refund de un canje cancelado se inserta como `type='earned', reason='redemption_refund'` — este dato es relevante para la sección 9 (Goals), no un tema abierto en sí mismo.

---

## 9. Goals — reconstruido y verificado directamente en código

`FACT`, `supabase/migrations/20260823153000_create_goals.sql`: `title text NOT NULL` (texto libre, sin ninguna referencia a viaje/hotel/trip), `target_points integer`, `target_date date` (opcional), `status`. **Sin ninguna FK a `trips`.** Confirmado también en `lib/goals/create-goal.ts`: el único campo de texto es `title`, sin validación temática — soporta viaje, compra, experiencia, curso, producto o ahorro puro sin ningún cambio técnico.

### Historia del cálculo de progreso (`DECISION`, ya cerrada — no reabrir, corrección ya aplicada, no pendiente)

1. **Modelo original** (`progress = saldo actual`): descartado porque retrocedía al canjear — señal desmotivadora. No fue un error, fue una decisión de producto legítima en su momento.
2. **Modelo HYBRID** (`points_at_goal_creation + SUM(earned) excluyendo reason='redemption_refund'`): resolvía el problema anterior, pero eliminaba el coste visible de canjear, rompiendo la tesis del loop V1 (guardar vs. gastar debe tener consecuencia real).
3. **Modelo actual, `GOAL_PROGRESS_MODEL = WALLET_BALANCE`** (`DECISION`, **APPROVED / IMPLEMENTED**, `docs/02_DECISION_LOCKS/goals/VIAO_GOALS_V1_DECISION_LOCK.md`, verificado directamente en `lib/goals/get-goal.ts` y `lib/goals/calculate-progress.ts`): `progress_percent = min(100, round(wallet_balance / target_points * 100))`. Ya no lee `rewards_transactions` en absoluto — la pregunta de `redemption_refund` queda resuelta por diseño (no hay suma de eventos que pueda inflarse), no por una exclusión manual. **Esto ya está implementado, no es una corrección pendiente.**

`FACT`: auto-cancelación del Goal activo anterior al crear uno nuevo (`20260824110000_goals_auto_cancel_active_on_create.sql`); `protect_goal_immutable_fields()` solo permite `active → cancelled`; `completed` sigue siendo **`OPEN` — DERIVED ONLY, sin persistencia automática** (ningún trigger lo escribe).

---

## 10-13. Partners, Partner Activities, Attribution, Recurrence

Fuente de verdad: `docs/01_CURRENT/partners/VIAO_PARTNERS_MASTER_V2.md`, `docs/01_CURRENT/partners/VIAO_PARTNERS_TECHNICAL_SPEC.md`, más 4 documentos de investigación comercial de esta sesión (`VIAO_PARTNERS_B2B_VALUE_PROPOSITION.md`, `VIAO_PARTNERS_B2B_AI_STRATEGY.md`, y los dos turnos de validación comercial sin archivo propio).

**`LOCKED`, sin reabrir**:
- L1-L19 (Master V2): 3-5 Partners piloto, categorías Restaurantes+Experiencias, onboarding manual/curado, Beta 6-8 semanas, atribución QR+Reserva, Beta gratis, reutilización del ledger existente, sin OCR en Beta, sin POS/API antes de V2, CRM mínimo, sin lead-sharing, sin catálogo de canje abierto, Points≠dinero, definiciones canónicas, "venta atribuida" no se usa en Beta, antifraude reutilizado, 6+1 métricas, criterios de éxito, CTA por categoría.
- P1-P8 (Decision Lock Económico): 2 Points/€ (`confirmed_by_reservation`), 1 Point/€ (`declared`), máx. 2 actividades/día por (usuario, Partner), pool de 3.000 Points/mes, comportamiento al agotarse (registrar con `points_awarded=0`, sin backfill), semántica de `points_awarded`, acceso Beta vía `access_token` sin login, neutralidad total respecto a FREE/PREMIUM.

**`PROPOSAL` de la investigación comercial (NO `LOCKED`, pendiente de aprobación explícita)**:
- Propuesta de valor: atribución + recurrencia medible ("customer growth system").
- Partner ideal reponderado por velocidad del momento WOW: cafeterías > restaurantes > barberías/peluquerías > wellness > estética > experiencias > retail.
- Precio inicial €49/mes, precio objetivo €79/mes, sin comparable real por encima de €79 sin inventar alcance nuevo.
- Un único plan (sin ejes reales de diferenciación sin IA).
- IA (texto y voz) registrada como `FUTURE`, explícitamente fuera del producto/pricing/roadmap actual.
- Activation Event (primera actividad confirmada) ≠ Value Event (primer cliente recurrente) — no son el mismo evento.
- PVB19-PVB23 (ver sección 18).

**`VALIDATION`**: densidad real de usuarios VIAO por zona — identificado como el riesgo más importante de todo el proyecto (sección 19).

---

## 14. Modelo económico

`DECISION` (LOCKED): desarrollo = €0 de coste directo en caja (lo realiza Andrés personalmente) — distinto de coste operativo real (infraestructura, procesamiento de pago ~1,7% Stripe EU, tiempo de Andrés en ventas/soporte, no en caja pero sí un recurso finito real).

`PROPOSAL`: margen de caja muy alto a cualquier escala modelada (10-1.000 Partners), porque el coste variable real identificado hoy es casi exclusivamente procesamiento de pago — el límite real no es económico, es operativo (onboarding manual, sección 18/19) y de densidad de usuarios (sección 19).

Coste de Points de Partners ya acotado por P4 (LOCKED) — no es un coste nuevo, comparte techo con el pool ya existente de Rewards (100€/mes, `VIAO_REWARD_POOL_MONTHLY_LIMIT_EUR`).

---

## 15. Travel — estado congelado, reconstruido sin eliminar nada

`FROZEN`, código intacto, verificado que sigue existiendo sin tocar en esta sesión:

| Elemento | Estado |
|---|---|
| `Trips` (tabla) | `FROZEN` — independiente de `Goals`, sin FK, `destination` obligatorio. Puede seguir existiendo como destino opcional del ahorro de un usuario, no como núcleo |
| `TravelProvider`/`HotelProvider` (abstracción) | `FROZEN` — contrato completo, sin cambios necesarios para ningún trabajo de esta sesión |
| `HotelbedsProvider` | `FROZEN` — implementado y funcionando, pendiente de respuesta comercial de Hotelbeds (sin cambios de estado en esta sesión) |
| `MockHotelProvider` | `FROZEN` |
| `Search` | `FROZEN` — deja de ser el flujo principal de Home, código sin tocar |
| `Bookings` / `Booking Intents` | `FROZEN` — arquitectura completa, sin activar |
| `Vision` | `FROZEN` — **corrección importante de esta sesión**: NO es un escáner de recibos/OCR, es un traductor de texto en contexto de viaje (`vision_scans`: `source_language`/`target_language`/`translated_text`). No es directamente reutilizable para verificación de Partner Activities sin construir algo nuevo |
| Premium/FREE | `FUTURE` — `FACT` verificado: no existe ningún concepto de tier/suscripción en ningún punto del schema actual (grep directo contra `supabase/migrations/*.sql`). Partners Beta es arquitectónicamente neutral respecto a esto (P8, LOCKED) |
| Travelgate (auditoría + sandbox validado en vivo) | `FROZEN` — VERDICT GREEN para prueba de sandbox, no para producción |
| RateHawk (auditoría documental) | `FROZEN` — VERDICT YELLOW, sandbox requiere credenciales privadas no obtenidas todavía |
| Hotelbeds | `FROZEN` — pendiente de respuesta comercial, no descartado |

**Ninguno de estos elementos se ha modificado, eliminado, ni se elimina ahora.**

---

## 16. Arquitectura conceptual — mapa

```
USUARIO
  actividad cotidiana
    → Partner Activity
    → Points (ledger Rewards)
    → Goal (objetivo libre)
    → progreso visible
    → repetición

  (en paralelo, independiente)
  Missions → hábito → Points

PARTNER
  actividad confirmada (QR/reserva)
    → atribución (partner_activities)
    → cliente nuevo / cliente recurrente
    → dashboard
    → valor económico / decisión de pago
```

Ambos lados comparten la misma fila de dato en `partner_activities` — no son dos sistemas paralelos.

---

## 17. MVP actual

**USER MVP**: un usuario puede crear un Goal libre (cualquier objetivo), acumular Points vía Missions genéricas y (cuando se migre) vía Partner Activities reales, y ver su progreso mediante `WALLET_BALANCE`.

**PARTNER MVP**: un Partner (3-5 piloto, Beta gratis) recibe un enlace de acceso, confirma actividades reales, y ve en un panel clientes nuevos/recurrentes y ventas declaradas/confirmadas.

**Loop mínimo a demostrar**: que el momento WOW (Value Event — un cliente que repite) ocurre realmente dentro de la ventana de Beta, condicionado a que exista densidad suficiente de usuarios VIAO cerca del Partner (sección 19, riesgo más importante identificado).

---

## 18. Decision Register global (consolidado, no repite IDs de documentos previos, referencia su origen)

| ID | Decisión | Estado | Fuente | Impacto | ¿Reabrible? | Próximo paso |
|---|---|---|---|---|---|---|
| L1-L19 | Ver Master V2 sección 21 | `LOCKED` | Master V2 | Base de todo Partners | Solo con contradicción real | — |
| P1-P8 | Ver Decision Lock Económico | `LOCKED` | Technical Spec sección 25 | Parámetros económicos de Partners | Solo con contradicción real | — |
| GOALS-V1 | `GOAL_PROGRESS_MODEL = WALLET_BALANCE` | `LOCKED` / `IMPLEMENTED` | `VIAO_GOALS_V1_DECISION_LOCK.md`, verificado en código | Progreso del Goal en toda la app | No — ya implementado y verificado | — |
| PVB1-PVB13 | Ver `VIAO_PARTNERS_B2B_VALUE_PROPOSITION.md`/`AI_STRATEGY.md` | `PROPOSED`/`VALIDATION` según ID | Investigación comercial | Pricing, producto B2B | Sí, son propuestas | Validar en Beta |
| PVB14 | Desarrollo = €0 cash cost | `DECISION` | Instrucción explícita del propietario | Unit economics | No | — |
| PVB15 | Un único plan (no 3 tiers) | `PROPOSED` | Sin IA, sin eje real de diferenciación | Simplifica pricing | Sí | Validar en Beta |
| PVB16 | Sin Missions de Partner | `DECISION` | Investigación comercial, sin valor incremental | Reduce alcance | Sí, con evidencia nueva | — |
| PVB19 | Densidad de usuarios VIAO es la variable crítica | `VALIDATION` | Modelo ilustrativo, no verificado con datos reales | **Bloqueante para elegir Partners piloto** | — | Obtener el dato real antes de seleccionar Partners |
| PVB20 | Cafeterías > Restaurantes en ranking de Partner ideal | `PROPOSED` | Velocidad de ciclo de revisita | Selección del piloto | Sí | — |
| PVB21 | Experiencias = mayor riesgo de no mostrar recurrencia en Beta | `VALIDATION` | No contradice L2, matiza ejecución | Elegir Partner de Experiencias con oferta recurrente | — | Aplicar al elegir el piloto |
| PVB22 | Selección de Partners ancla a densidad de usuarios existente | `PROPOSED` | Consecuencia directa de PVB19 | Criterio de selección del piloto | Sí | Verificar antes de cerrar la lista |
| NEWDIR-1 | Nuevo propósito general, viaje como ejemplo no exclusivo | `DECISION` | Turno "Nueva dirección de producto" | Redefine posicionamiento, no arquitectura | Sí, con evidencia | — |

---

## 19. Unknown / Validation Required

- **Densidad real de usuarios VIAO por zona** — no verificable desde el código ni la documentación, es un dato interno que solo el propietario tiene. **La variable más importante sin resolver de todo el proyecto.**
- Validación real del Value Event (recurrencia) con Partners reales — no ha ocurrido todavía, Beta no ha empezado.
- Disposición real a pagar (`"lo estoy pagando"` vs. cualquier señal más débil) — sin evidencia propia todavía.
- Comportamiento real de usuarios ante Goals no-travel — sin datos, es una hipótesis de la nueva dirección de producto.
- Contenido exacto de `VIAO_V1_LOOP_DECISION.md`/`VIAO_V1_EXECUTION_LOCK.md` más allá de lo referenciado aquí — no releído íntegro en esta reconstrucción, solo citado a través del Decision Lock de Goals que sí se verificó directamente.

**Distinción explícita pedida**: "no sabemos" (densidad de usuarios, disposición a pagar) es distinto de "no está implementado" (Missions de Partner, IA, campañas de recuperación) y distinto de "no está decidido" (precio final, arquitectura de acceso Partner V1+).

---

## 20. Do Not Build (respaldado por decisiones ya tomadas, nada nuevo añadido aquí)

Missions de Partner, múltiples planes, CRM completo, POS, reservas reales, contabilidad/ERP, gestión de redes sociales, WhatsApp automatizado, cualquier IA (registrada como `FUTURE`), generación de contenido ilimitada, soporte humano ilimitado, integración con Booksy/Fresha, multi-location, OCR (Master V2 O3, `OPEN` para V1.1+, no Beta).

---

## 21. Riesgos (consolidado)

| Riesgo | Nivel |
|---|---|
| Densidad insuficiente de usuarios VIAO cerca del Partner | **CRITICAL** |
| Momento WOW no ocurre dentro de la ventana de Beta (especialmente en Experiencias) | **CRITICAL** |
| Onboarding manual no escala más allá de ~50 Partners | HIGH |
| Importe declarado sin verificación (riesgo ya aceptado, Master V2 sección 14) | HIGH |
| Competencia ya instalada (Booksy/Fresha) | MEDIUM |
| Infraestructura a escala Beta | LOW |

---

## 22. Próximos pasos

1. Obtener el dato real de densidad de usuarios VIAO por zona (PVB19) — antes de cualquier otra decisión de Partners.
2. Seleccionar los 3-5 Partners piloto anclados a esa densidad real, priorizando cafeterías/restaurantes.
3. Avanzar la primera migración real de `partners`/`partner_activities`/`complete_partner_activity()` (ya LOCKED, sin cambios pendientes de diseño).
4. Decidir las 2 Missions que sustituyen a `search_started`/`hotel_viewed`.
5. Ejecutar Beta según el experimento semana a semana ya diseñado, con los criterios GO/CONDITIONAL GO/NO-GO propuestos.

---

## 23. Estado Git de este turno

Sin cambios en código, schema, Supabase, migraciones, componentes, UX. Único archivo creado: este documento.

---

## 24. Fuentes de verdad (jerarquía)

1. Código real y migraciones (`supabase/migrations/*.sql`, `lib/`) — siempre por encima de cualquier documento si hay discrepancia.
2. `docs/02_DECISION_LOCKS/goals/VIAO_GOALS_V1_DECISION_LOCK.md` — Goals, LOCKED e implementado.
3. `docs/01_CURRENT/partners/VIAO_PARTNERS_MASTER_V2.md` + `docs/01_CURRENT/partners/VIAO_PARTNERS_TECHNICAL_SPEC.md` — Partners, LOCKED (L1-L19, P1-P8).
4. `docs/03_RESEARCH_VALIDATION/partners_commercial/VIAO_PARTNERS_B2B_VALUE_PROPOSITION.md` + `docs/03_RESEARCH_VALIDATION/partners_commercial/VIAO_PARTNERS_B2B_AI_STRATEGY.md` — investigación comercial, `PROPOSED`/`VALIDATION`.
5. `docs/03_RESEARCH_VALIDATION/providers/VIAO_TRAVELGATE_AUDIT.md`, `VIAO_TRAVELGATE_SANDBOX_VALIDATION.md`, `VIAO_RATEHAWK_AUDIT.md`, `VIAO_HOTEL_PROVIDERS_SCREENING.md` — Travel, `FROZEN`.
6. Este documento — síntesis y mapa de navegación entre todos los anteriores, no los sustituye.
7. `docs/VIAO_MVP_MASTER.md` — para estado técnico/ingenieril granular (archivos, RPC, RLS, migraciones, tests, checkpoint de commit) fuera del alcance de este documento. Complementario, no sustituido por este documento ni lo sustituye.

---
