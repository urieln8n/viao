---
STATUS: CURRENT
ERA: Partners V2 — Fase de auditoría e investigación (pre-decisión)
DOMAIN: Partners
AUTHORITY: Documento de investigación/auditoría. NO es un Decision Lock. Ninguna afirmación de este documento fija una decisión de producto por sí misma — cada afirmación está etiquetada individualmente (LOCKED / OPEN / HYPOTHESIS / FUTURE / DEPRECATED / FROZEN / CONTRADICTION) siguiendo el principio 3 de docs/00_GOVERNANCE.md. Cuando este documento cita un Decision Lock, ese Decision Lock — no este documento — es la autoridad.
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-26
---

# VIAO PARTNERS V2 — RESEARCH

## 1. Metadata documental

Ver bloque de cabecera arriba, conforme al formato estándar de `docs/00_GOVERNANCE.md`. Este documento no modifica, reinterpreta ni supersede `VIAO_PARTNERS_MASTER_V2.md`, `VIAO_PARTNERS_TECHNICAL_SPEC.md`, `VIAO_PARTNERS_IMPLEMENTATION_STATUS.md` ni `VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md`. Los cuatro continúan siendo, sin cambios, la fuente de verdad de Partners V1.

## 2. Propósito del documento

Persistir documentalmente la auditoría de Partners V1 y la investigación/exploración de la hipótesis "Partners V2" realizadas en un bloque de chat de esta sesión, para que ese trabajo no dependa del contexto de la conversación. Este documento **no autoriza ninguna implementación**, **no crea ningún Decision Lock**, y **no elige ninguna dirección de producto**. Es un registro de auditoría e investigación, orientado a que el propietario tome decisiones futuras con la información completa por escrito.

## 3. Estado real de Partners V1

| Bloque | Estado | Fuente |
|---|---|---|
| PB0 — Pre-flight | ✅ DONE | `docs/01_CURRENT/partners/VIAO_PARTNERS_IMPLEMENTATION_STATUS.md` |
| PB1 — Schema + RLS | ✅ DONE | `supabase/migrations/20260825120000_create_partners.sql`, `20260825121000_create_partner_activities.sql` |
| PB2 — RPC + tests | ✅ DONE | `supabase/migrations/20260825130000_create_complete_partner_activity_rpc.sql`, `lib/partners/complete-partner-activity.test.ts` |
| PB3 — Partner Access | ✅ DONE | `lib/partners/resolve-partner-access.ts` |
| PB4 — Actividad QR + Reserva | ✅ DONE | `lib/partners/register-partner-activity.ts`, `app/partners/actions.ts` |
| PB5 — UI Partner (ops) | ✅ DONE | `app/partners/ops/[accessToken]/` |
| PB6 — Dashboard | ✅ DONE | `lib/partners/get-partner-dashboard.ts`, `app/partners/dashboard/[accessToken]/` |
| PB7 — E2E / integración | ✅ DONE | `lib/partners/e2e-integration.test.ts` (10 tests) |

Commit de producción: `517088c` "feat: complete partners v1" (`git log`, verificado en este mismo bloque de auditoría). Suite completa al cierre de PB7: 816 tests, 812 pass, 0 fail, 4 skipped (`VIAO_PARTNERS_IMPLEMENTATION_STATUS.md`, sección "PARTNERS V1 — COMPLETADO"). Cero Partners reales confirmados en producción (no verificable directamente por este entorno; ausencia de evidencia, no evidencia de ausencia). Cero páginas públicas, cero entrada de navegación — verificado con grep directo sobre `components/` en un bloque anterior de esta sesión: cero coincidencias de "partner".

## 4. Auditoría de Partners V1

**A. Problema que resolvía**: dar a VIAO un mecanismo para generar Points a partir de actividad económica real y verificable en comercios físicos (Restaurantes/Experiencias), permitiendo medir para el Partner clientes nuevos/recurrentes y ventas.

**B. Problema que NO resolvía**: descubrimiento del Partner por el usuario, presencia digital del comercio, cualquier mecanismo de canje específico del Partner, cualquier relación entre "dónde gano Points" y "qué puedo canjear".

**C. Funcionalidades reales existentes**: ver sección 5.

**D. Decisiones económicas existentes**: P1=2 pts/€ (`confirmed_by_reservation`), P2=1 pt/€ (`declared`), P3=máx. 2 actividades/(usuario,Partner)/día, P4=pool de 3.000 Points/mes propio de Partners, P5/P6=semántica de agotamiento (`points_awarded=0`, sin backfill), Beta=0€ para el Partner, L7=reutiliza `rewards_transactions` sin ledger paralelo. Fuente: `docs/02_DECISION_LOCKS/partners/VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md`, `supabase/migrations/20260825130000_create_complete_partner_activity_rpc.sql`.

**E. Decisiones técnicas existentes**: Patrón B puro (`service_role` + RPC `SECURITY DEFINER`); `partner_activities` append-only sin columna `status` (PMM10); correcciones vía transacción compensatoria, nunca edición; acceso del Partner vía `access_token` opaco, sin Supabase Auth (P7).

**F. Mecanismo de actividad existente**: QR (Restaurantes, `amount_confidence='declared'`) o Reserva (Experiencias, `amount_confidence='confirmed_by_reservation'`) — el Partner confirma y declara el importe; el usuario nunca confirma su propia actividad (PMM3, `LOCKED`).

**G. Loop verificado**: `partner_activities` (INSERT siempre) → si hay margen en el pool, INSERT en `rewards_transactions` (`reason='partner_activity'`) → `rewards_wallets` (SUM derivado) → `Goal` (`progress = wallet_balance/target_points`). Verificado con 10 tests de integración reales (PB7, `lib/partners/e2e-integration.test.ts`) usando la capa de aplicación real, nunca el RPC como atajo.

**H. Valor actual para el Partner**: dashboard de solo lectura con 6 métricas — sin presencia digital, sin canal de adquisición de usuarios nuevos vía VIAO.

**I. Valor actual para el usuario**: Points hacia el mismo catálogo genérico (`rewards_catalog`) que ya existía antes de Partners — ninguna conexión entre el Partner donde ganó Points y lo que puede canjear.

**J. Dependencias**: ver sección 7.

**K. Limitaciones**: ver sección 8.

**L. Qué no debe tocarse**: ver sección 9.

**M. Decisiones que siguen siendo válidas**: todas las L1-L19 y P1-P8/PMM3-10 — ninguna evidencia técnica nueva las contradice.

**N. Decisiones que podrían necesitar revisión futura**: exactamente L12 — ver sección 10.

## 5. Funcionalidades realmente existentes

| Elemento | Fuente exacta |
|---|---|
| Tabla `partners` (`id`,`name`,`slug`,`category CHECK IN ('restaurant','experience')`,`status`,`access_token`,`contact_email`,`contact_phone`,`address`) | `supabase/migrations/20260825120000_create_partners.sql` |
| Tabla `partner_activities` (append-only, sin `status`) | `supabase/migrations/20260825121000_create_partner_activities.sql` |
| RPC `complete_partner_activity()` | `supabase/migrations/20260825130000_create_complete_partner_activity_rpc.sql` |
| `resolvePartnerAccess(accessToken)` | `lib/partners/resolve-partner-access.ts` |
| `registerQrActivity()` / `registerReservationActivity()` | `lib/partners/register-partner-activity.ts` |
| Server Actions | `app/partners/actions.ts` |
| UI staff (registrar actividad) | `app/partners/ops/[accessToken]/page.tsx`, `partner-ops-view.tsx` |
| UI dashboard (dueño) | `app/partners/dashboard/[accessToken]/page.tsx`, `partner-dashboard-view.tsx`, `lib/partners/get-partner-dashboard.ts` |
| Código QR real (generación/escaneo) | **No existe** — "qr" es solo una etiqueta interna de `attribution_mechanism`, verificado por ausencia en todo el repo |
| Página pública / discovery para el usuario final | **No existe** |
| Entrada de navegación (Sidebar/MobileNav) | **No existe** — grep directo sobre `components/`, cero coincidencias |

## 6. Decisiones LOCKED existentes

| ID | Decisión | Fuente |
|---|---|---|
| L1-L19 | Ver `VIAO_PARTNERS_MASTER_V2.md` §21 | Master V2 |
| P1-P8 | Ver `VIAO_PARTNERS_TECHNICAL_SPEC.md` §24 | Technical Spec |
| PMM3, PMM4, PMM6, PMM10 | Atribución, economía, dashboard mínimo, refunds | `VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md` §10 |
| GOALS-V1 | `GOAL_PROGRESS_MODEL = WALLET_BALANCE` | `docs/02_DECISION_LOCKS/goals/VIAO_GOALS_V1_DECISION_LOCK.md` |
| RW1-RW6 | Economía de Rewards (Points/€, pool, coste máx. real) | `docs/02_DECISION_LOCKS/rewards/VIAO_REWARDS_V1_DECISION_LOCK.md` |

**L12, específicamente** (`VIAO_PARTNERS_MASTER_V2.md`, §21 y reconfirmada en §20 "What We Will NOT Build"): *"No catálogo de canje abierto (estilo Plenti)"*. Ver sección 10 — es el punto central de contradicción de este documento.

## 7. Dependencias

`rewards_transactions` (ledger único de Points, Patrón B), `profiles`, patrón de Server Actions ya usado en `app/trips/actions.ts` / `app/rewards/actions.ts`, `rewards_catalog` (con `funding_type ∈ {'viao','partner'}`, ya existente — ver sección 20).

## 8. Limitaciones

Sin descubrimiento del usuario; sin página pública; sin vínculo Partner↔Reward; importe declarado sin verificación real (riesgo aceptado explícitamente en `VIAO_PARTNERS_MASTER_V2.md` §14); `category` limitada por `CHECK` a `restaurant`/`experience` (no cubre café, barbería, gimnasio, etc. sin una migración nueva — no propuesta en este documento).

## 9. Qué no debe tocarse

Todas las tablas/RPC/tests de Partners V1; `rewards_transactions`/`rewards_catalog`/`reward_redemptions`; Missions; Goals; los 3 pools independientes (Missions 3.000 Points/mes, Partners 3.000 Points/mes, Rewards 100€/mes — coincidencia numérica entre Missions y Partners, no relación funcional, `VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md` §6); P7 (mecanismo de acceso del Partner); L12.

## 10. CONTRADICTION / HARD STOP — L12 vs. hipótesis Reward cross-Partner

**L12** (`VIAO_PARTNERS_MASTER_V2.md`, LOCKED): *"No catálogo de canje abierto (estilo Plenti)"*.

La hipótesis planteada para Partners V2 — un Partner publica una oferta (ej. "1.000 Points → Cena para 2 personas") canjeable por un usuario que puede haber ganado esos Points en un Partner distinto, o mediante Missions/gamificación — es, estructuralmente, el mismo modelo (coalition loyalty con canje abierto cruzado) que L12 ya excluyó explícitamente por nombre. La propia investigación competitiva ya documentada en `VIAO_PARTNERS_MASTER_V2.md` §4 analizó el caso Plenti (EE.UU., cerrado) y registró como causas de fracaso: *"partners grandes con recursos para irse, catálogo de canje confuso, baja awareness"* — es precedente directo de esa misma decisión L12.

**Estado**: `HYPOTHESIS / OPEN / CONFLICTED WITH L12`. No se resuelve en este documento. No se reinterpreta L12. No se asume que L12 esté obsoleta. No se asume que la hipótesis cross-Partner haya sido aprobada. La decisión corresponde exclusivamente al propietario, en un bloque futuro explícito.

**Nota sobre discusión previa no persistida**: en los bloques de chat inmediatamente anteriores a la auditoría de Partners V2 (dentro de esta misma sesión de trabajo, sin archivo propio hasta este documento), se exploró una dirección de producto distinta: un hito de visitas **financiado y entregado por el mismo Partner** donde el usuario genera la actividad, con los Points como capa secundaria de reconocimiento — explícitamente sin canje cruzado entre Partners. Esa dirección es coherente con L12; la hipótesis cross-Partner de este bloque no lo es. Se documenta aquí como:

> **CONCLUSIÓN DE DISCUSIÓN / NO PERSISTIDA PREVIAMENTE / NO DECISION LOCK.**

No es una decisión formal del propietario hasta que se documente y autorice como tal en su propio bloque.

## 11. Mapa de User Value (hipótesis)

Descubrir comercios locales dentro de VIAO; ganar Points por actividad diaria + mecánicas de motivación (Missions, rachas — existentes o futuras); poder canjear esos Points por una oferta publicada por cualquier Partner, no solo aquel donde generó la actividad; sensación de "red" de recompensas en vez de un solo comercio aislado. **Estado: HYPOTHESIS, no validada.**

## 12. Mapa de Partner Value (hipótesis)

Presencia digital sin coste de construirla; aparecer como destino de canje como reclamo de marketing/adquisición; datos de quién canjea su oferta. **Riesgo no resuelto**: puede recibir canjes de usuarios que nunca generaron actividad ni gasto real con ese Partner — riesgo central, documentado como causa de fracaso de Plenti (sección 10). **Estado: HYPOTHESIS, no validada.**

## 13. Mapa de VIAO Value (hipótesis)

VIAO se convierte en la capa de orquestación entre usuarios y comercios (descubrimiento + Points + Missions + Goals + Rewards), con potencial de monetización vía SaaS/comisión ya contemplado en el roadmap de negocio existente (V1/V1.1/V2, `VIAO_PARTNERS_MASTER_V2.md` §6). **Refuerzo mutuo entre los tres mapas: no demostrado** — el punto de fricción es el Partner Value (sección 12), condicionado a un problema de arranque (usuarios↔Partners) ya identificado como riesgo `CRITICAL` (PVB19, `docs/01_CURRENT/product/VIAO_MASTER_PRODUCT_CONTEXT.md` §19/21).

## 14. Investigación de producto — REUTILIZADA, no nueva

**Aviso explícito**: ninguna investigación externa en vivo se realizó en el bloque que originó este documento, ni en este bloque de persistencia. Todo lo listado en las secciones 14-15 proviene de una auditoría competitiva ya existente en el repositorio, realizada en una sesión de trabajo anterior sobre Partners y documentada con fuente en `docs/01_CURRENT/partners/VIAO_PARTNERS_MASTER_V2.md`, sección 4 ("Competitive Positioning"). Se reproduce aquí para consolidar el contexto de Partners V2 en un único documento, no como hallazgo nuevo.

**Gap identificado explícitamente**: no existe, en ningún documento del proyecto, investigación de ningún caso de coalition loyalty exitoso a escala local/pequeña — toda la evidencia documentada es de escala nacional (Payback) o de fracaso (Plenti). Es una laguna de evidencia real, no resuelta aquí.

## 15. Competidores y patrones ya documentados (fuente: `VIAO_PARTNERS_MASTER_V2.md` §4)

| Competidor/patrón | Qué hace mejor que VIAO | Dónde VIAO podría diferenciarse |
|---|---|---|
| TheFork Manager | Reservas+CRM+distribución con volumen real en España (~30-75€/mes + 2-5€/comensal) | No conecta el gasto con nada externo al restaurante |
| Fever | Distribución a escala (450 ciudades, +500M€/año) | Mismo límite: sin conexión externa al gasto |
| Toast Loyalty | Loyalty bundleado con POS, $254-379/mes | VIAO no tiene POS que ofrecer — debilidad real, no ventaja |
| FiveStars / Punchh / SpotOn | Loyalty maduro, sin comisión | No conectan con nada externo al negocio |
| QR loyalty (StampMe, BonusQR, Loopy, Loyapp) | Coste de entrada mínimo, ya validado | Loyalty aislado, sin CRM ni conexión a un objetivo externo |
| OCR providers (Klippa, FormX, Talon.One, Tabscanner) | Tecnología de atribución madura y externalizable | VIAO puede integrarla, no necesita construirla |
| Coalition loyalty (Payback, Valuedynamx, PulseID, Arrivia) | Categoría establecida con jugadores de escala | Es la categoría exacta de la hipótesis Partners V2 |
| **Plenti (EE.UU., cerrado)** | — | Fracasó por partners grandes con recursos para irse, catálogo de canje confuso, baja awareness — precedente directo de L12 |

## 16. Propuestas de valor A-E — hipótesis, ninguna elegida

| Propuesta | Valor Partner | Valor usuario | Dificultad | Riesgo | Estado |
|---|---|---|---|---|---|
| A. "Clientes nuevos reales y medibles" | Alto si es cierto | Bajo directo | Alta (requiere discovery real) | Promesa incumplible sin tráfico real | HYPOTHESIS — única ya validada por el test de 5 preguntas de `VIAO_PARTNERS_MASTER_V2.md` §5 |
| B. "Ocasional → recurrente" | Medio-alto | Bajo directo | Media | Ninguno nuevo — base de Partners V1 | HYPOTHESIS, coincide con lo ya construido |
| C. "Presencia + discovery + fidelización" | Medio | Medio | Alta | Se solapa con competidores más maduros | HYPOTHESIS, no validada |
| D. "Objetivos/recompensas que incentivan visitas" | Depende de si el Reward es Partner-específico o cruzado | Alto si el Reward es deseable | Media | Bajo si es Partner-específico; alto (Plenti) si es cross-Partner | HYPOTHESIS, parcialmente en conflicto con L12 según la variante |
| E. "Discovery + loyalty + gamificación" | Bajo hasta que exista tráfico | Medio | Muy alta | Acumula todos los riesgos anteriores | HYPOTHESIS, ninguna ventaja competitiva clara |

Ninguna propuesta queda seleccionada por este documento.

## 17. Partner Page / Discovery — clasificación conceptual

| Elemento | Clasificación |
|---|---|
| Nombre, categoría | NECESARIO |
| Ubicación, teléfono | NECESARIO (ya existen como columnas en `partners`) |
| Fotografías/logo, descripción | ÚTIL |
| Productos/carta/precios | ÚTIL — ya contemplado como "mini-web MVP" en `VIAO_PARTNERS_MASTER_V2.md` §13 |
| Horarios estructurados | OPCIONAL — excluido de Beta en `VIAO_PARTNERS_TECHNICAL_SPEC.md` §5 |
| Reseñas | NO JUSTIFICADO — ningún dato lo respalda, riesgo de contenido falso sin antifraude diseñado |
| CTA por categoría | NECESARIO si existe página — ya LOCKED (L19) |
| Rewards disponibles / Goals relacionados | ÚTIL solo si se resuelve la contradicción L12; si no, NO JUSTIFICADO |
| Distancia/disponibilidad en tiempo real | FUTURE |

## 18. Partner Admin / Panel — clasificación conceptual

| Capacidad | Fase |
|---|---|
| Ver actividad, clientes, recurrencia | Ya LOCKED/implementado (PB6) |
| Editar perfil, imágenes, carta, precios | V2 — depende de si se construye página pública |
| Gestionar ofertas / Rewards propios | V2, condicionado a resolver L12 |
| ROI en €, exportaciones, comparativas | FUTURE — ya excluido explícitamente (`VIAO_PARTNERS_MASTER_V2.md` §20) |

## 19. Discovery + Notifications — área de investigación

| Dimensión | Análisis |
|---|---|
| Valor | Real en teoría, no demostrado — depende de densidad de usuarios (riesgo CRITICAL, PVB19) |
| Riesgo/spam | Alto sin límite de frecuencia diseñado |
| Privacidad | Notificaciones por proximidad implican ubicación — sin diseño de consentimiento existente |
| Monetización | Posible upsell futuro (destacados/campañas, V2 de `VIAO_PARTNERS_MASTER_V2.md` §6) |

Estado: HYPOTHESIS / FUTURE. No se diseña nada aquí.

## 20. Rewards + Goals — análisis económico conceptual

`rewards_catalog` ya soporta `funding_type ∈ {'viao','partner'}` (fuente: `docs/VIAO_MVP_MASTER.md`, sección "Rewards"; Concepto D de `VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md` §5) — `partner_name` es hoy texto libre, sin FK a `partners`. Un Reward financiado y entregado por el **mismo** Partner que lo publica es técnicamente compatible con la arquitectura existente y no toca ni el pool de Rewards (100€/mes, RW6) ni el pool de Partners (3.000 Points/mes, P4) — son conceptos separados (Concepto A vs. C, `VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md` §5). **Lo que sí contradice L12** es que ese Reward sea canjeable con Points ganados en un Partner distinto. El riesgo de esa variante no es de "romper la economía de Points" — es puramente de incentivo comercial del Partner que financia el Reward (sección 10, riesgo Plenti). Ningún elemento de esta hipótesis requiere tocar la regla "Points ≠ dinero" (no LOCKED en riesgo). **Contradicción con Decision Lock: SÍ — L12 (sección 10).**

## 21. Economía del ecosistema

Quién aporta valor: el Partner aporta la oferta/reward y el gasto real cuando genera actividad; VIAO aporta usuarios, engagement, atribución y discovery; el usuario aporta actividad y atención. Quién paga: Beta = nadie (0€ Partner, LOCKED); V1+ = OPEN (O1/O2/O4 ya existentes). Reward cross-Partner: sin resolver, bloqueado por L12. Partners que solo reciben canjes sin generar actividad: riesgo de free-riding, precedente Plenti. Partners que generan mucha actividad: hoy los únicos con valor real medible (dashboard); bajo la hipótesis cross-Partner, podrían subsidiar la marca de otros sin retorno directo.

## 22. Riesgos

| Riesgo | Probabilidad | Impacto | Evidencia necesaria |
|---|---|---|---|
| Reapertura de L12 sin reconocerla explícitamente | Alta si se avanza sin autorización | Alto — repite el fracaso ya documentado de Plenti | — |
| Free-riding de Partners | Alta si se implementa cross-Partner | Alto | Datos de comportamiento real |
| Chicken-and-egg (usuarios↔Partners) | Ya CRITICAL (PVB19) | Crítico | Densidad real de usuarios por zona |
| Catálogo de canje confuso (Plenti) | Media-alta si se abre el catálogo | Alto | — |
| Notificaciones invasivas / spam | Media si se construye discovery sin límites | Medio | — |
| Reseñas falsas | Media si se construye página pública con reseñas | Medio | — |
| Marketplace vacío en lanzamiento | Alta — 0 Partners reales confirmados | Alto | — |
| Onboarding manual no escala (~50 Partners) | Ya documentado | Alto | — |

## 23. Registro de preguntas OPEN

¿Debe existir página pública? OPEN. ¿Discovery? OPEN. ¿Búsqueda? OPEN. ¿Notificación local? OPEN. **¿Reward cross-Partner? OPEN, bloqueada por L12 (LOCKED).** ¿Quién financia Rewards? Parcialmente resuelto (`funding_type` ya existe); caso cross-Partner sigue OPEN. ¿Quién entrega Rewards? OPEN. ¿Debe el Partner pagar por estar? OPEN (O1/O2/O4). ¿Qué justificaría un plan de pago? OPEN. ¿Mínimo valor para que un Partner entre? OPEN. ¿Verticales de mejor encaje? Parcialmente investigado (cafeterías>restaurantes, PVB20, PROPOSED no LOCKED). ¿Verticales a excluir? OPEN.

## 24. Hipótesis y estados — taxonomía consolidada

- **LOCKED**: L1-L19, P1-P8, PMM3/4/6/10, GOALS-V1, RW1-RW6 — ninguno se reabre en este documento.
- **OPEN**: O1-O4, pricing Premium/Pro, discovery, notificaciones, página pública, búsqueda.
- **HYPOTHESIS**: "VIAO como plataforma de descubrimiento", Reward cross-Partner, propuestas A-E, mapas de valor (secciones 11-13).
- **FUTURE**: OCR, POS/API, ROI en €, exportaciones, campañas de comportamiento avanzadas, comisión activa (`POINTS_PERCENTAGE_OF_COMMISSION`).
- **DEPRECATED**: cofinanciación 50/50, token rotativo diario, "sin dashboard en V1".
- **FROZEN**: Travel completo (Trips/TravelProvider/Hotelbeds/Search/Bookings), Vision como dependencia económica.
- **CONTRADICTION / HARD STOP**: L12 vs. hipótesis Reward cross-Partner (sección 10).

## 25. Roadmap V2 propuesto — PROPUESTA NO AUTORIZADA

V2-F0 Auditoría (este documento) → V2-F1 Resolución explícita de la contradicción L12 → V2-F2 Investigación externa ampliada (si L12 se reabre) → V2-F3 Propuesta de valor del Partner (elegir entre A-E) → V2-F4 Economía del ecosistema → V2-F5 Decision Lock V2 → V2-F6 Product Spec → V2-F7 Technical Spec → V2-F8 Implementación.

**Esta numeración es una propuesta, no una secuencia aprobada. Ninguna fase posterior a V2-F0 queda autorizada por este documento.**

## 26. Decisiones que requieren explícitamente al propietario

1. Cómo tratar la contradicción L12 vs. hipótesis cross-Partner: mantener L12, reabrirla explícitamente, o descartar la hipótesis cross-Partner.
2. Si se documenta formalmente (Decision Lock propio) la dirección "hito Partner-financiado, sin canje cruzado" discutida en el chat previo a este documento.
3. Elegir, si procede, entre las propuestas A-E (sección 16) — ninguna elegida aquí.
4. Si se autoriza investigación externa nueva sobre coalition loyalty a escala local (gap identificado en sección 14).

## 27. Contradicciones/anomalías

**L12 (LOCKED) contradice directamente la hipótesis central de Partners V2 tal como fue planteada** — ver sección 10. Es la misma categoría de producto (coalition loyalty cross-Partner) que la investigación previa del proyecto ya analizó y rechazó citando el fracaso real de Plenti. Adicionalmente, la dirección de producto discutida en el chat inmediatamente anterior a este documento (hito Partner-financiado, sin canje cruzado) es coherente con L12 pero no con la hipótesis cross-Partner — y no estaba persistida en ningún archivo hasta la nota de la sección 10 de este documento.

## 28. Conclusión

Partners V1 está completo, probado y desplegado, con una arquitectura económica sólida (P1-P8, PMM3/4/6/10) que **no requiere cambios técnicos** para soportar un Reward financiado por el mismo Partner que lo entrega (`funding_type='partner'` ya existe). Lo que Partners V2 propone adicionalmente — un catálogo de canje abierto entre Partners — **contradice una decisión LOCKED existente (L12)**, tomada precisamente a partir de un caso de fracaso real ya documentado (Plenti). Este documento no resuelve esa contradicción. Deja registrada la auditoría completa, las hipótesis exploradas, los mapas de valor, los riesgos y las preguntas abiertas, para que el propietario decida en un bloque futuro explícito si L12 se mantiene, se reabre, o si Partners V2 avanza únicamente por la vía compatible con L12 (Reward Partner-específico).

---

**Fin del documento. Ningún código, migración, test, componente, Decision Lock ni configuración de Supabase fue creado o modificado para producir este documento.**
