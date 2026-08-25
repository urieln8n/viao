---
STATUS: CURRENT
ERA: Partners/V2 (esta sesión)
DOMAIN: Partners
AUTHORITY: Fuente de verdad de producto de Partners — DECISION LOCK FINAL (L1-L19)
SUPERSEDES: docs/VIAO_PARTNERS_MASTER.md (parcialmente, "donde entran en conflicto" — declaración propia del documento, sección "Documentos relacionados")
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-25
---

# VIAO PARTNERS — MASTER V2
### Estado: DISEÑO — NO IMPLEMENTADO
### Fuente de verdad: DECISION LOCK FINAL (turno anterior a este documento)

> Este documento consolida 3 auditorías estratégicas (Auditoría 1: modelo inicial; Auditoría 2: investigación competitiva y corrección de pricing/atribución; Auditoría 3: Business Model + Willingness-to-Pay) y el DECISION LOCK FINAL derivado de ellas. Es autocontenido: puede copiarse a cualquier chat nuevo sin contexto previo. Ninguna decisión marcada `LOCKED` en el Decision Lock se reabre aquí. Ningún punto `OPEN` se convierte en decisión. Cero código, cero migraciones, cero configuración de Supabase.

---

## 1. Executive Summary

VIAO Partners busca convertirse en una de las principales vías de monetización de VIAO mientras Hotelbeds permanece congelado y `MockHotelProvider` sigue siendo el único proveedor de viajes activo. La tesis validada por evidencia externa (no solo hipótesis interna) es: **un negocio local paga por clientes y ventas reales, medibles, no por visibilidad, Points, diseño o "comunidad"**. La diferenciación defendible de VIAO no es tecnológica — es de enfoque: pequeños negocios sin recursos para construir su propio programa de fidelización, canje simple ligado a un objetivo de viaje personal (no un catálogo abierto), e integración ya construida con el Rewards ledger existente de VIAO.

Este documento fija lo que está **LOCKED** (decidido con evidencia suficiente), lo que está **OPEN** (pendiente de datos que solo el propio Beta puede producir) y lo que está **BLOCKED** (una pieza de arquitectura real, sin resolver, que la especificación técnica deberá abordar antes de cualquier migración).

---

## 2. Product Thesis

**HYPOTHESIS** validada parcialmente por evidencia de mercado (TheFork/Fever, ver sección 4):

```
Partner:  VISIBILIDAD → CLIENTES → CONVERSIÓN → FIDELIZACIÓN → DATOS → RETORNO
Usuario:  ACTIVIDAD → CONSUMO → POINTS → GOAL → VIAJE/EXPERIENCIA
```

**Problema del Partner**: un negocio pequeño en Barcelona elige hoy entre herramientas genéricas y caras (CRM enterprise), herramientas gratuitas pero sin medición real (Instagram, Google Business), o nada. Ninguna opción le dice con certeza "esto te trajo N clientes reales y esto es lo que gastaron".

**Propuesta de valor**: *"VIAO te trae clientes reales y medibles, sin que tengas que construir tu propio programa de fidelización."*

**Diferenciación real** (no exagerada — ver sección 4 para el contraste honesto con competidores): la conexión entre gasto local y un objetivo de viaje personal del usuario. Esta categoría de producto (coalition loyalty) **no es nueva** — tiene décadas de historia y al menos un fracaso público bien documentado (Plenti, EE.UU.). **`HYPOTHESIS`**: la combinación específica de (a) foco en SMB sin alternativa propia realista, (b) canje simple ligado a un único objetivo personal en vez de un catálogo abierto, y (c) integración ya construida con Goals/Missions/Rewards, reduce — sin eliminar — los riesgos que hundieron a Plenti.

**El moat NO es tecnológico ni estructural.** Es una ventaja de enfoque y ejecución, replicable por cualquier competidor con suficiente capital y disciplina. Si la pregunta es "¿es defendible contra un competidor con más recursos?", la respuesta honesta es no, de forma fuerte.

**Limitaciones y riesgos** (ver también secciones 14 y 22-23):
- El schema actual de Rewards no tiene forma de representar un importe en euros (`BLOCKED`, sección 9).
- El mecanismo de atribución de Beta (QR) depende de la ejecución consistente del staff del Partner — la causa #1 documentada de fracaso de programas de loyalty reales.
- El pricing de V1+ depende de datos que Beta todavía no ha producido.

---

## 3. Partner Value Proposition

| Lo que NO es la propuesta de valor (Feature Value) | Lo que SÍ es la propuesta de valor (Business Value) |
|---|---|
| Visibilidad | Clientes nuevos reales y medibles |
| Points | Ventas declaradas/confirmadas en €, no en Points |
| "Comunidad" | Recurrencia medible |
| Mini-web bonita, fotos, diseño | Recuperación de clientes inactivos (futuro, V1.1) |
| Badges, seguidores, vanity metrics | — |

Ningún elemento de la columna izquierda genera, por sí solo, disposición a pagar (`LOCKED`, ver sección 5).

---

## 4. Competitive Positioning

VIAO Partners **no se presenta como superior** en CRM, marketplace de experiencias ni loyalty general — en esos terrenos, competidores con más recursos ya hacen mejor trabajo. La tabla resume el posicionamiento real, no aspiracional:

| Competidor | Qué hace mejor que VIAO | Dónde VIAO puede diferenciarse |
|---|---|---|
| **TheFork Manager** | Reservas + CRM + distribución ya con volumen real en España (~30-75€/mes + 2-5€/comensal) | No conecta el gasto con nada fuera del propio restaurante |
| **Fever** | Distribución de experiencias a escala (450 ciudades, +500M€/año, comisión 10-25%) | Mismo límite: sin conexión externa al gasto |
| **Toast Loyalty** | Loyalty bundleado con POS — stack completo $254-379/mes antes del primer punto | VIAO no tiene POS que ofrecer como ancla — **esto es una debilidad real de VIAO frente a Toast, no una ventaja** |
| **FiveStars / Punchh / SpotOn** | Loyalty maduro, suscripción sin comisión | No conectan con nada externo al negocio |
| **QR loyalty (StampMe, BonusQR, Loopy, Loyapp)** | Coste de entrada mínimo, ya validado sin integración técnica | Loyalty aislado, sin CRM ni conexión a un objetivo externo |
| **OCR providers (Klippa, FormX, Talon.One, Tabscanner)** | Tecnología de atribución ya madura y externalizable | VIAO puede integrarla, no necesita construirla |
| **Coalition loyalty (Payback, Valuedynamx, PulseID, Arrivia)** | Categoría establecida con jugadores de escala | VIAO se diferencia por foco SMB + Barcelona + un único objetivo personal, no por ser la primera coalición |
| **Plenti (caso de advertencia, EE.UU., cerrado)** | — | Fracasó por partners grandes con recursos para irse, catálogo de canje confuso, baja awareness. VIAO mitiga (no elimina) estos riesgos por diseño — ver sección 2 |

---

## 5. Business Value vs Feature Value

`LOCKED`: un Partner paga por un resultado económico medible, nunca por una herramienta bonita. Confirmado por evidencia de mercado (ningún competidor investigado cobra por estética aislada) y por el test de 5 preguntas aplicado en Auditoría 3: *¿qué problema resuelve? ¿cuánto valor económico genera? ¿cómo se mide? ¿por qué no lo resuelve ya otra herramienta? ¿pagaría por ello?* — "visibilidad", "Points" y "comunidad" fallan las 5 preguntas; "clientes y ventas reales atribuidos" es la única respuesta que las supera todas.

---

## 6. Product Scope by Phase

### BETA
3-5 Partners (2-3 Restaurantes + 1-2 Experiencias). Onboarding manual/curado. 6-8 semanas. Gratis con fecha de fin conocida por el Partner. Mecanismo: QR (Restaurantes) + Reserva cuando aplique (Experiencias). Mini-web. Presencia en "Explorar". Points vía ledger existente. Panel mínimo con "Ventas declaradas" / "Ventas confirmadas por reserva" según categoría.

### V1
Activación de comisión sobre resultado económico real (umbral exacto: `OPEN`). CRM mínimo (Nuevo/Recurrente/Inactivo). Campañas de tiempo/demanda (hora valle, día concreto, temporada baja, multiplicador de Points).

### V1.1
SaaS opcional (además de la comisión). OCR vía proveedor externo si los datos de Beta lo justifican (`OPEN`, ver sección 16). Campañas de comportamiento (primera visita, cumpleaños, recurrencia, win-back — requieren el CRM de V1 ya funcionando). Analytics de ROI/CAC.

### V2
SaaS + comisión como modelo estándar. POS/API para Partners de volumen alto. CRM con segmentación avanzada. Automatización de campañas. Multi-ubicación.

---

## 7. Canonical Definitions

- **Actividad**: registro que VIAO crea cuando el mecanismo de atribución habilitado para ese Partner (QR o reserva) capta una señal real **y** esa señal viene acompañada de una confirmación de que hubo consumo/compra. Un escaneo QR sin confirmación de compra no es una Actividad. **Aclaración (`LOCKED`, Decision Lock Económico Final, 25/08/2026, P5)**: una Actividad puede registrarse correctamente sin otorgar Points, cuando el pool mensual de emisión de Partners está agotado — esto no significa que VIAO deba Points posteriormente por esa Actividad; no hay backfill ni emisión retroactiva. Detalle técnico completo en `docs/01_CURRENT/partners/VIAO_PARTNERS_TECHNICAL_SPEC.md`, secciones 6, 10 y 25.
- **Cliente**: usuario que ha completado al menos 1 Actividad válida con un Partner específico — siempre relativo a un Partner, no a VIAO en general.
- **Cliente nuevo**: la primera Actividad válida de un par `(usuario, Partner)`.
- **Cliente recurrente**: cualquier Actividad válida adicional de un usuario que ya tenía al menos una Actividad previa con ese mismo Partner.
- **Venta declarada**: importe introducido manualmente por el Partner al confirmar una Actividad, sin verificación adicional. Único nivel disponible para Restaurantes en Beta.
- **Venta confirmada por reserva**: importe ya fijado por el sistema de reserva en el momento de crearla. Más fiable que la declarada libre, pero sigue sin ser una factura verificada. Disponible para Experiencias en Beta.
- **Venta atribuida** (sin calificativo): **reservado exclusivamente** para cuando exista evidencia verificable (OCR de ticket u otro mecanismo con prueba real). **No se usa este término en Beta.**
- **Recurrencia**: proporción de clientes de un Partner con ≥2 Actividades válidas en el período medido.
- **Partner activo**: Partner con al menos 1 Actividad válida en los últimos 14 días.

---

## 8. Beta Attribution Model

```
RESTAURANTES:
  usuario
    → muestra QR
    → Partner escanea
    → Partner confirma la Actividad
    → Partner declara un importe
    → VIAO crea la Actividad
    → Points calculados sobre el importe declarado
    → rewards_transactions (reason='partner_activity')
    → dashboard del Partner ("Ventas declaradas")

EXPERIENCIAS:
  usuario reserva (importe ya conocido por el sistema de reserva)
    → confirmación de la Actividad/reserva
    → VIAO crea la Actividad
    → Points
    → rewards_transactions (reason='partner_activity')
    → dashboard del Partner ("Ventas confirmadas por reserva")
```

**Riesgos aceptados explícitamente en Beta** (`HYPOTHESIS` de mitigación futura, no resueltos ahora):
- QR no es garantía antifraude absoluta.
- Existe riesgo real de ejecución del staff del Partner (causa #1 documentada de fracaso de programas de loyalty).
- Existe riesgo de importe declarado incorrectamente (por error o por incentivo).
- OCR (futuro, `OPEN` en cuanto a fase exacta) reduciría la dependencia del Partner al eliminar la necesidad de que declare nada — el usuario solo fotografía el ticket.

---

## 9. Rewards & Ledger Relationship

`LOCKED`: se reutiliza `rewards_transactions`, el ledger de Points ya existente. **No se crea ningún ledger paralelo.**

- `reason = 'partner_activity'`
- `referenceType = 'partner_activity'`
- `referenceId` = identificador único de la Actividad (nunca reusable — garantiza idempotencia junto con `user_id`+`reason`+`referenceType`, mismo mecanismo ya usado por Missions y Referidos).

### `BLOCKED` — importe en euros

**El schema actual de `rewards_transactions` no tiene ningún campo adecuado para almacenar el importe en euros de una Actividad.** La columna `amount` de esa tabla es un entero restringido por `CHECK` a representar Points (`type='earned' AND amount>0`), verificado directamente contra la migración real (`supabase/migrations/20260817140005_create_rewards_transactions.sql`) — no es una suposición.

**Relación conceptual**:
```
Rewards = Points (ya resuelto, reutilizando el ledger existente)
Actividad = evento económico/operativo futuro (venta declarada/confirmada en €)
```

La relación entre ambos —cómo y dónde se almacena el importe en euros de cada Actividad— **debe diseñarse en una futura "VIAO Partners — Technical Specification"**. Este documento no decide si será una columna nueva, una tabla `partner_activities`, un snapshot, un tipo `decimal` o `integer`, ni ningún otro detalle de implementación. Ninguna migración se crea a partir de este documento.

---

## 10. Partner Dashboard

El panel prioriza **ventas**, no vanity metrics:

- Restaurante: *"Ventas declaradas esta semana"*
- Experiencia: *"Ventas confirmadas por reserva esta semana"*
- Clientes nuevos, clientes recurrentes, actividad reciente.

**No se prioriza**: seguidores, badges, fotos, vanity metrics, ni Points como KPI económico principal — Points es la unidad interna de VIAO, no el lenguaje en el que un negocio mide su propio resultado.

---

## 11. CRM

**No se construye un CRM enterprise.** V1 introduce únicamente 3 segmentos: **Nuevo / Recurrente / Inactivo**. Win-back simple (acción manual/plantilla para reactivar inactivos) queda para después de V1, condicionado a que exista recurrencia real que gestionar. No se construye scoring complejo, automatización avanzada ni segmentación enterprise en ninguna fase de este documento.

---

## 12. Campaigns

**V1 — campañas de tiempo/demanda**: hora valle, día concreto, temporada baja, multiplicador de Points. No requieren CRM — solo una fecha/rango y un multiplicador definido por el Partner.

**V1.1 — campañas de comportamiento**: primera visita, cumpleaños, recurrencia, win-back. Requieren que el CRM mínimo de V1 ya esté funcionando, porque dependen de saber el estado histórico del cliente respecto a ese Partner — no son construibles antes.

---

## 13. Mini-Web

**MVP**: identidad (logo, portada, fotos, descripción, categoría), ubicación (dirección, mapa, horarios, contacto), oferta (productos/servicios/precios simples), un CTA diferenciado por categoría, explicación breve de VIAO, Points estimables.

**CTA por categoría** (`LOCKED`, taxonomía mínima, no un sistema abierto):
- Restaurante: reservar (si el Partner soporta reservas) o visitar.
- Experiencia: reservar o comprar entrada.
- Comercio (fuera de Beta, referencia futura): contactar o visitar.

**La mini-web NO es el argumento económico principal** — es feature value (sección 5). El argumento económico vive en el Partner Dashboard (sección 10), no en la mini-web.

---

## 14. Antifraud Principles

Se reutilizan exclusivamente patrones ya existentes en VIAO — no se diseña una arquitectura antifraude nueva:

| Riesgo | Mitigación (patrón ya existente) |
|---|---|
| QR reusado / misma compra registrada dos veces | Idempotencia real vía `UNIQUE(user_id, reason, reference_type, reference_id)` — mismo mecanismo de Missions/Referidos |
| Múltiples actividades falsas del mismo usuario | Límite diario por `(usuario, Partner)`, mismo patrón `period_key` anti-farming de Missions |
| Abuso de Points / auto-recompensas | Kill-switch mensual propio de Partners, independiente de los pools ya existentes de Rewards/Missions |

**Riesgos que Beta NO resuelve completamente** (`HYPOTHESIS` de mitigación futura, riesgo aceptado explícitamente ahora): Partner declarando ventas inexistentes; staff introduciendo un importe incorrecto. Ninguno de los dos se resuelve técnicamente en Beta — se resuelven de verdad con evidencia real (OCR, V1.1+).

---

## 15. Business Model

| Fase | Modelo | Qué paga el Partner |
|---|---|---|
| Beta | Gratis, fecha de fin conocida | Nada |
| V1 | "Gratis-hasta-resultado + comisión" (Modelo J) | Comisión sobre venta declarada/confirmada, solo tras alcanzar el umbral de resultado sostenido |
| V1.1 | Comisión + SaaS opcional | Comisión + cuota opcional si quiere más herramientas |
| V2 | SaaS + comisión estándar | Modelo maduro, con upsells (campañas, destacados) |

`OPEN` explícitamente, sin cifra inventada: porcentaje de comisión, umbral de facturación/resultado sostenido que activa el cobro, cuota de los tiers Premium/Pro. Todo depende de datos reales que solo Beta puede producir (ratio entre Points otorgados y venta declarada/confirmada).

---

## 16. Beta Experiment

3-5 Partners (2-3 Restaurantes + 1-2 Experiencias). Onboarding manual/curado. 6-8 semanas. Mecanismo: QR (+ Reserva en Experiencias). Gratis con fecha de fin conocida.

**OCR — V1 vs V1.1**: `OPEN`. Depende directamente de cómo se comporte la ejecución del QR durante Beta — si funciona de forma consistente, no hay urgencia de adelantar OCR; si falla por ejecución del staff del Partner (el riesgo documentado como causa #1 de fracaso de loyalty real), OCR gana prioridad para V1. No se construye OCR propio en ningún caso — solo vía proveedor externo, si se decide implementarlo.

---

## 17. Metrics

`LOCKED` — exactamente estas, ninguna más:

1. **Partners activos** = Partners con ≥1 Actividad en los últimos 14 días.
2. **Tiempo de onboarding** = mediana(fecha primera Actividad − fecha de alta), por Partner.
3. **Clientes nuevos atribuidos** = usuarios cuya primera Actividad con ese Partner ocurrió en el período de Beta.
4. **Ventas declaradas/confirmadas €** = suma del importe, siempre con su etiqueta de confianza correspondiente (nunca mezcladas sin distinguir nivel).
5. **Recurrencia** = % de clientes de un Partner con ≥2 Actividades en el período.
6. **Retención del Partner a 60 días** = ¿sigue con ≥1 Actividad en los últimos 14 días al llegar al día 60?

Opcional: usuarios únicos por Partner.

Filosofía explícita: **medir poco, pero medir bien** — no se añaden dashboards con métricas adicionales sin que el volumen real de Beta las justifique.

---

## 18. Success / Failure Criteria

- **FRACASO**: 0 Partners con recurrencia real tras 6-8 semanas, **o** 0 Partners dispuestos a considerar pagar después de ver sus datos reales.
- **SEÑAL DÉBIL**: exactamente 1 de 3-5 Partners cumple ambas condiciones. Interpretación: continuar investigando, pero no comprometer inversión fuerte de V1 todavía.
- **SEÑAL FUERTE**: 3 o más de 3-5 Partners muestran recurrencia real **y** disposición a pagar. Interpretación: justifica avanzar a V1 con confianza.

No se invoca significancia estadística formal ni benchmarks externos — el razonamiento es directo sobre el tamaño de muestra ya fijado (3-5 Partners), sin inventar comparaciones que esta investigación no respalda.

---

## 19. Categories

**Prioridad Beta** (`LOCKED`): 1. Restaurantes — 2. Experiencias/Ocio.
**Siguientes** (fuera de Beta, referencia de expansión futura): 3. Bienestar — 4. Cine — 5. Retail.

No se amplían categorías durante Beta.

---

## 20. What We Will NOT Build

CRM enterprise. OCR propio (solo proveedor externo, si se decide). POS universal. Automatización prematura. Dashboards sin volumen real detrás. Features decorativas. Badges. Contadores de seguidores. Descuentos directos (rompería Points≠dinero). Lead-sharing competitivo entre Partners. Catálogo de canje abierto (estilo Plenti). Gamificación sin valor económico. Ledger paralelo al ya existente. Schema improvisado para el importe en euros fuera de una especificación técnica formal. Cualquier funcionalidad no justificada por datos reales de Beta.

---

## 21. Locked Decisions

| ID | Decisión |
|---|---|
| L1 | 3-5 Partners piloto |
| L2 | Categorías Beta: Restaurantes + Experiencias |
| L3 | Onboarding manual/curado |
| L4 | Duración Beta: 6-8 semanas |
| L5 | Mecanismo de atribución Beta: QR (+ Reserva en Experiencias) |
| L6 | Pricing Beta: gratis, fecha de fin conocida |
| L7 | Reutilizar `rewards_transactions`, sin ledger paralelo |
| L8 | No OCR en Beta |
| L9 | No POS/API antes de V2 |
| L10 | CRM mínimo (no enterprise), 3 segmentos |
| L11 | No lead-sharing competitivo |
| L12 | No catálogo de canje abierto |
| L13 | No descuentos directos — Points ≠ dinero |
| L14 | Definiciones canónicas de Actividad/Cliente/Recurrencia (sección 7) |
| L15 | "Venta atribuida" no se usa en Beta — "declarada"/"confirmada por reserva" en su lugar |
| L16 | Antifraude: reutilizar patrones existentes, sin arquitectura nueva |
| L17 | Métricas Beta: exactamente 6 + 1 opcional |
| L18 | Criterios de éxito/fracaso/señal débil-fuerte (sección 18) |
| L19 | CTA por categoría, taxonomía mínima (sección 13) |

## 22. Open Decisions

| ID | Decisión | Depende de |
|---|---|---|
| O1 | % de comisión en V1+ | Datos reales de Beta (ratio Points otorgados / venta declarada) |
| O2 | Umbral de "resultado sostenido" que activa el cobro | Datos reales de Beta |
| O3 | OCR en V1 vs V1.1 | Cómo falle (o no) la ejecución del QR durante Beta |
| O4 | Cuota de tiers Premium/Pro | Datos de Beta + V1 |

## 23. Blocked Decisions

| ID | Decisión | Por qué está bloqueada |
|---|---|---|
| B1 | Diseño técnico exacto del almacenamiento del importe en euros de una Actividad | El schema actual de `rewards_transactions` no tiene ningún campo adecuado (verificado directamente contra la migración real, sección 9) — requiere una especificación técnica formal, no se resuelve en un documento de producto |

---

## 24. Future Technical Specification Requirements

Cuando se apruebe avanzar de este documento a una especificación técnica ("VIAO Partners — Technical Specification"), esa especificación deberá resolver como mínimo:

- El diseño exacto de almacenamiento del importe en euros (B1) — columna, tabla nueva, u otro mecanismo.
- El esquema mínimo real de una entidad "Partner" (columnas exactas).
- El diseño RLS/GRANT de cualquier tabla nueva, siguiendo el mismo criterio de auditoría ya aplicado a cada bloque anterior de VIAO (Patrón A o Patrón B, según corresponda).
- El mecanismo exacto de generación de `referenceId` único por Actividad.
- El diseño del kill-switch mensual propio de Partners (independiente de los de Rewards/Missions).

Ninguno de estos puntos se resuelve en este documento.

---

## 25. Decision Register

| ID | Decisión | Estado | Fuente | Próximo momento de revisión |
|---|---|---|---|---|
| L1-L19 | Ver sección 21 | **LOCKED** | Auditorías 1-3 + Decision Lock Final | No se revisan salvo evidencia nueva que las contradiga |
| O1 | % de comisión | **OPEN** | Decision Lock Final, punto crítico #8 | Al cierre de Beta, con datos reales |
| O2 | Umbral de resultado sostenido | **OPEN** | Decision Lock Final, punto crítico #8 | Al cierre de Beta |
| O3 | OCR V1 vs V1.1 | **OPEN** | Decision Lock Final, punto crítico #6 | A mitad de Beta, según ejecución real del QR |
| O4 | Cuota Premium/Pro | **OPEN** | Auditoría 3, Fase 11 | Tras V1 con datos reales |
| B1 | Schema del importe en euros | **BLOCKED** | Verificación directa del schema real (sección 9) | Al iniciar la especificación técnica, antes de cualquier migración |

---

## Documentos relacionados

- `docs/VIAO_PARTNERS_MASTER.md` — versión 1, hipótesis inicial (superada parcialmente por este documento donde entran en conflicto).
- `docs/VIAO_MVP_MASTER.md` — estado operativo global de VIAO.
- `docs/VIAO_V1_LOOP_DECISION.md` — origen de la co-financiación 50/50 y `POINTS_PERCENTAGE_OF_COMMISSION`.
- `supabase/migrations/20260817140005_create_rewards_transactions.sql` — schema real verificado del ledger reutilizado.
- `lib/rewards/create-reward-transaction.ts` — único punto de escritura del ledger, patrón a reutilizar para `partner_activity`.

---

**Fin del documento. Ningún código, componente, migración, configuración de Supabase, RLS, tabla, campo, dependencia ni ruta fue creado o modificado para producir este documento.**
