# VIAO V1 — Diseño del Loop y Decisión de Producto

**Estado:** Documento de decisión — NO implementado. Requiere aprobación explícita antes de cualquier código.
**Fuentes:** `VIAO_MVP_v0.1.md`, `VIAO_ARCHITECTURE.md`, `VIAO_DATABASE.md`, `VIAO_ROADMAP.md`, `HOTELBEDS_CERTIFICATION_STATUS.md`, Documento Maestro V1.1, auditoría técnica real del repositorio, auditoría estratégica (mercado/legal/GTM), investigación de APIs de vuelos.
**Regla aplicada en todo el documento:** ninguna cifra económica sin marcar su origen — `[CONFIRMADO EN CÓDIGO]`, `[BENCHMARK DE MERCADO]` o `[HIPÓTESIS]`.

---

## 1. Resumen ejecutivo

VIAO tiene un núcleo técnico real y bien probado (695 tests, TSC/lint/build limpios), pero **el loop estratégico está roto exactamente en los dos pasos de los que depende toda la tesis**: no existe Goal (objetivo de viaje) ni canje de Rewards. Hoy se puede ganar Points pero no hay nada que hacer con ellos ni ninguna razón visual para seguir ganándolos. Partners — el activo más citado en el documento maestro — vale cero en código.

La decisión de este documento **no es pivotar**: es completar el loop con el mínimo código posible, reutilizando al máximo lo ya construido (ledger, rate-limiting, RLS, kill-switches, patrón QR-friendly ya usado en Vision para consentimiento), y explícitamente NO tocar Hotelbeds ni construir Flights, Admin, Premium o Scan/OCR todavía.

## 2. Estado actual real (verificado contra código, no solo repetido de auditorías previas)

Reverificado en este bloque, no solo citado: `git status` sin cambios desde la última auditoría (30 líneas, 13 modificados + 17 nuevos, incluyendo `HOTELBEDS_CERTIFICATION_STATUS.md`). Confirmado por grep directo:
- `reward_redeemed` solo aparece en la declaración de tipo (`lib/analytics/events.ts`) y en un test que confirma que NUNCA se emite (`taxonomy.test.ts`) — cero canje real.
- Cero tablas `partners`/`goals` en las 34 migraciones existentes.
- 34 migraciones totales, las 11 tablas del MVP original + `booking_intents` + `destinations` (FPR-04/FPR-HOTELS-02) — ninguna tabla nueva de Points/Rewards/Partners más allá del ledger ya conocido.

## 3. Contradicciones encontradas entre documentos

No se encontró ninguna contradicción dura. Sí dos tensiones a señalar explícitamente:

1. **`VIAO_ROADMAP.md` Fase 7 dice "no fijar conversión definitiva Points→euros"**, pero el código ya usa y muestra al usuario `100 Points = 1€` (`pointsToEuroValue`) de forma consistente en Wallet y en el preview de reserva. No es un error — está marcado como "provisional" en la UI — pero es una conversión de facto ya fijada, no solo un mecanismo preparado. Este documento la adopta como base de cálculo (sección 6) precisamente porque ya está en producción y cambiarla ahora rompería expectativas ya comunicadas al usuario.
2. **`VIAO_MVP_v0.1.md` sección 7 excluye explícitamente "vuelos"** del MVP original. El Documento Maestro V1.1 reabre la pregunta (Parte 12 de este bloque). La investigación de este documento confirma que la exclusión original seguía siendo correcta — ver sección 14.

Ninguna de las dos bloquea este documento; ambas se resuelven con las decisiones de las secciones siguientes.

## 4. Reconciliación completa — clasificación final

| Área | Estado | Razón |
|---|---|---|
| Auth, Home, Profile, Navegación, i18n | 🟢 MANTENER | Reales, probados, sin gaps |
| Search/Availability (Hotelbeds) | 🟢 MANTENER | Real, arquitectura completa |
| Booking/Cancellation (Hotelbeds) | 🟡 MEJORAR (bloqueado externo) | Completo pero nunca validado real — depende de #60019483, no tocar |
| Points ledger + Wallet (ganancia) | 🟢 MANTENER | Idempotente, auditable, real |
| Referidos | 🟢 MANTENER | End-to-end real |
| Mi viaje, Fotos (guardar/ver) | 🟢 MANTENER | Real, Storage real |
| Fotos (borrado individual) | 🟡 MEJORAR | Backend/RLS ya lo soportan, falta botón — no prioritario |
| VIAO Vision | 🟢 MANTENER | La funcionalidad más completa del proyecto |
| VIAO AI | 🟢 MANTENER | Real, con kill-switch y rate limit |
| Analytics (11/12 eventos) | 🟢 MANTENER | — |
| Seguridad/RLS | 🟢 MANTENER | Sin fallos encontrados en dos pasadas |
| **Rewards — canje** | 🔵 NUEVO MVP | No existe, es P0 |
| **Goals** | 🔵 NUEVO MVP | No existe, es P0 |
| **Missions** | 🔵 NUEVO MVP | No existe, es P0 (mínimo) |
| **Partners + QR** | 🔵 NUEVO MVP | No existe, es P0/P1 |
| Antifraude ampliado | 🔵 NUEVO MVP | Solo constraints de unicidad hoy |
| Caducidad de Points | 🔵 NUEVO MVP | No existe — riesgo de pasivo sin límite |
| Streak diario | 🔴 ELIMINAR de la hipótesis inicial | Ver Parte 8 — sustituido por racha semanal no diaria |
| Partner Dashboard UI | 🔴 ELIMINAR de V1 | Con 3-5 partners, gestión manual es más rápida que construir UI — ver Parte 6 |
| Admin panel | ⚪ V2 | No bloquea el piloto de 30 usuarios |
| Premium/Suscripciones | ⚪ V2 | Sin base de usuarios que lo justifique todavía |
| Scan/OCR de tickets | ⚪ V2 (condicionado) | Ver Parte 10 — mayor riesgo de fraude, mayor complejidad, Partners+QR cubre la necesidad de earning ahora |
| VIAO Dream Trip | ⚪ V2 | Ver Parte 16 |
| Flights | ⚪ V2, revisar en Serie A | Ver Parte 12 — ahora MÁS complejo y MÁS cerrado que Hotelbeds |

---

## 5. Producto mínimo recomendado (Parte 2)

Cuestionando la hipótesis inicial punto por punto:

**Usuario — se mantiene**: Registro, Home, Goal, Points, Wallet, Rewards, Canje, Partners, QR, Hotels. **Se retira**: "Missions" como sistema separado complejo — se reduce a 3-5 misiones hardcodeadas reutilizando eventos ya existentes (no un motor de misiones configurable, eso es sobreingeniería para 30 usuarios).

**Partner — se recorta significativamente**: Se mantiene Oferta, QR, Validación, Points, Reward. **Se elimina "Perfil" y "Dashboard" como UI**: con 3-5 partners, una fila en una tabla gestionada manualmente (por ti, directamente en Supabase o un script simple) es más rápida de construir y de operar que una UI completa — construir un dashboard para 3-5 usuarios humanos es esfuerzo mal invertido. Métricas mínimas sí se necesitan, pero como una consulta/reporte, no una pantalla interactiva.

## 6. Goal V1

**Modelo de datos** (nueva tabla `goals`, Patrón A — el usuario gestiona el suyo bajo RLS, igual que `trips`):

| Columna | Tipo | Nota |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK a `profiles` |
| `title` | text | ej. "Roma" |
| `target_points` | integer | objetivo en Points |
| `target_date` | date, NULL | opcional |
| `status` | text | `active`/`completed`/`cancelled` |
| `created_at`/`completed_at` | timestamptz | — |

**Un único Goal activo por usuario** (constraint parcial única, mismo patrón que `booking_intents_dedup`) — confirmado como la decisión correcta: la literatura de goal-setting es consistente en que diluir el foco entre varios objetivos reduce el compromiso con cada uno.

**Cálculo de progreso — decisión de diseño más importante de esta sección**: el progreso es el **saldo actual del Wallet, capado al target** — NO un sub-ledger aislado desde la fecha de creación del Goal. Esto significa que **canjear un Reward pequeño (café, corte de pelo) reduce visiblemente el progreso hacia el Goal grande (Roma)**.

Esto no es un defecto — es la mecánica central de "Compra. Gana. Elige.": el usuario elige entre gratificación inmediata y el objetivo de viaje. Segregar los Points en "los del Goal" vs. "los canjeables" añadiría una tabla y una lógica de reparto que contradice la regla `rewards_wallets` = vista derivada de un único ledger, ya aprobada en `VIAO_DATABASE.md`. Se mantiene una única fuente de verdad.

**Cambio de objetivo**: crear un Goal nuevo cancela automáticamente el activo (mismo patrón que `booking_intents`: transición explícita, nunca dos activos a la vez). **Expiración**: si `target_date` pasa sin completarse, NO se cancela automáticamente — se muestra como atrasado, la decisión de continuar o cambiar es del usuario (una cancelación automática sería punitiva). **Al alcanzarlo**: `status → completed`, momento de celebración en UI (sin lógica de backend adicional necesaria para V1).

## 7. Points Economy V1

Regla aplicada: **NO POINTS SIN LEDGER + NO POINTS SIN RAZÓN ECONÓMICA.**

| Fuente | Financiación | Estado |
|---|---|---|
| Registro | VIAO, pool mensual con techo duro | Ya existe, mantener |
| Reserva de hotel | Autofinanciado por comisión Hotelbeds | **Bloqueado** — comisión real desconocida (#60019483), no tocar |
| Referido | VIAO, mismo pool que registro | Ya existe, mantener |
| Visita a Partner | **Partner financia el 50% del coste del canje** (modelo TheFork/Yums, confirmado como el más trasladable en la investigación de mercado) | Nuevo |
| Canje de Reward | El coste real lo asume quien lo financia (Partner o VIAO según origen) | Nuevo |

**Emisión**: cap mensual por usuario y por fuente. **Financiación**: VIAO nunca es la fuente principal a escala — solo bono de bienvenida y un pool capado, con el mismo patrón de kill-switch ya usado para el presupuesto de OpenAI (`lib/openai/config.ts`). **Caducidad — gap real, se corrige aquí**: 12-18 meses desde la fecha de ganancia (campo `expires_at` nuevo en `rewards_transactions`), con aviso previo al usuario. **Canje**: nunca 100% financiado por VIAO — el Partner cubre el coste real de lo que regala. **Límites**: por usuario/mes, por Partner/mes, y un techo global con kill-switch. **Antifraude**: rate-limit por fuente (reutilizando `lib/rate-limit/*`, patrón ya existente) + dedup por constraint único (patrón ya existente).

**Hipótesis del documento maestro que se corrige aquí**: no se menciona ninguna hipótesis económica incorrecta del documento previo — sí se completa el vacío de caducidad, que no estaba resuelto.

## 8. Rewards V1

**10-20 Rewards reales máximo**, dos tablas nuevas:

- `rewards_catalog`: `id`, `partner_id` (NULL si lo financia VIAO), `title`, `points_cost`, `funding_split` (`partner_50_50`/`viao_capped`), `limit_per_user` (nullable), `active`.
- `reward_redemptions`: `id`, `user_id`, `reward_catalog_id`, `points_spent`, `status` (`pending`/`fulfilled`/`cancelled`), `redemption_code` (código de un solo uso que el usuario muestra al Partner), `created_at`, `expires_at` (plazo para usar el código, distinto de la caducidad de los Points).

**Cambio de código necesario (documentado, no implementado)**: `createRewardTransaction()` hoy rechaza cualquier `amount <= 0` — deliberadamente, porque el gasto nunca se implementó. Para V1 esto debe ampliarse para aceptar `amount < 0` (gasto), siempre a través del mismo escritor único del ledger — nunca un segundo camino de escritura.

**Fraude**: el `redemption_code` lo valida el Partner (nunca autodeclaración del usuario) — ver mecanismo QR en la Parte 9. **Cancelación/devolución**: si un canje se cancela antes de `fulfilled`, se revierte con una transacción de signo contrario en el ledger (nunca se edita ni se borra la fila original — append-only, mismo principio ya aplicado en todo el proyecto). **`reward_redeemed`**: se dispara exactamente cuando `status → fulfilled`.

**Regla de la deuda ilimitada — cómo se evita**: el 50/50 con el Partner acota el pasivo de VIAO a la mitad de lo emitido por actividad de Partners; el pool VIAO-financiado tiene techo duro con kill-switch; no hay ninguna fuente de Points sin un techo o una financiación externa identificada.

## 9. Partners V1 + QR

**Modelo de datos**: `partners` (`id`, `business_name`, `category`, `city`, `contact_info`, `status`: `pilot`/`active`, `monthly_fee` NULL en piloto). La "oferta" del partner vive en `rewards_catalog.partner_id`, no en una tabla nueva separada.

**Flujo QR — diseño minimalista, evita construir TPV**:
1. El Partner recibe (impreso o por WhatsApp) un código que **rota diariamente** — codifica `partner_id` + un token del día.
2. El usuario, físicamente en el local, escanea/introduce el código en la app.
3. Se registra la visita → se otorgan Points según la regla de esa Partner.

Esto evita que el Partner necesite ningún hardware ni app propia (excluido explícitamente: "NO construir TPV") y evita el fraude trivial de "capturar el QR y reusarlo desde casa" sin necesitar que el comercio valide activamente cada visita — el token rotativo obliga a estar físicamente presente ese día.

**Antifraude**: 1 canje de ese tipo por usuario/partner/día (constraint único), rate-limit reutilizado. **Métricas mínimas** (consulta, no dashboard): visitas/mes, nuevos vs. recurrentes (por primera aparición de `user_id` en ese partner), Points emitidos.

## 10. Propuesta de valor del Partner (Parte 7)

Mensaje: **"Te ayudamos a conseguir clientes nuevos y hacer que vuelvan"** — defendible, según la investigación de mercado (Booksy/Treatwell usan exactamente este framing con éxito comercial demostrado).

| | Detalle |
|---|---|
| Qué recibe | Clientes nuevos atribuibles + Points que financian su propia recurrencia |
| Qué paga | **0€/mes en el piloto** (3-5 primeros) — validación antes que ingreso |
| Cuándo paga | Solo tras demostrar retorno real medible (no antes) |
| Riesgo del Partner | Bajo — solo financia el 50% del coste de lo que él mismo decide regalar |
| Métrica de ROI | Visitas nuevas + visitas repetidas atribuibles a VIAO |

## 11. Recurrencia sin gamificación infantil (Parte 8)

| Cadencia | Mecánica | Fuente de Points |
|---|---|---|
| Mensual | Revisión del Goal | — (solo visual) |
| Semanal | 3-5 Missions fijas | Reutiliza `search_started`, `vision_used` (ya existen) + 1 relacionada a Partner |
| Continuo | Actividad real (reserva, visita a Partner) | Ya existente |
| — | **Racha de 3 semanas activas seguidas** (NO diaria) | Ninguna — es un badge, no otorga Points extra para no incentivar actividad artificial |

**Explícitamente evitado**: streak diario tipo Duolingo/Snapchat — se descarta de la hipótesis inicial del documento maestro (sección 20) por sentirse manipulador para una audiencia gestionando dinero/viajes, tal como pidió el criterio de calidad de este bloque.

## 12. Home V1 (Parte 9)

Jerarquía visual exacta:

```
1. QUÉ TENGO       → saldo de Points (ya existe)
2. QUÉ QUIERO      → Goal activo + barra de progreso (NUEVO)
3. QUÉ PUEDO HACER → acciones: Partner cercano / Mission de la semana / buscar hotel (NUEVO, reutiliza datos ya cargados en Home hoy: trip destacado, teaser de Vision)
4. CUÁNTO PUEDO GANAR → "+450 Points esta semana" si completas las Missions pendientes (NUEVO, cálculo simple sobre Missions ya definidas)
```

La Home actual (`app/page.tsx`) ya carga `getUserTrips`/`getWalletBalance`/`getCachedDestinations` server-side — añadir el Goal es una consulta más del mismo tipo, no un rediseño arquitectónico.

## 13. Decisión Scan/OCR (Parte 10)

| Opción | Complejidad | Riesgo de fraude | Reutiliza código existente |
|---|---|---|---|
| A — OCR de tickets ahora | Alta (extracción fiable de comercio/importe/fecha de una imagen es propensa a error) | Alto (recibos falsos/editados, mucho más difícil de detectar que una visita validada por QR) | Parcial (patrón de subida de imagen de Vision, pero la validación es un problema nuevo y difícil) |
| **B — Partners + QR primero** | Baja | Bajo (validación física por presencia + token rotativo) | Alta (rate-limit, dedup, ledger, todo patrón ya existente) |
| C — Ambos en paralelo | Máxima | Máximo | — |

**Recomendación: Opción B.** Construir OCR ahora duplicaría esfuerzo de antifraude exactamente cuando el proyecto no tiene ningún sistema de antifraude real más allá de constraints de unicidad — es la fuente de earning de mayor riesgo, y se estaría priorizando primero. Partners+QR además financia directamente el activo estratégico que hoy vale 0 (sección 12 del documento maestro). Scan/OCR queda para V2, una vez exista una base de antifraude más sólida.

## 14. Hotels — rol estratégico (Parte 11), sin tocar Hotelbeds

Hotels alimenta el loop de dos formas: (a) genera Points reales (2% del valor, ya en código) — la única fuente de earning hoy autofinanciada por una comisión real, aunque esa comisión sigue sin confirmar; (b) es el "gran objetivo" narrativo detrás de cada Goal. **Dependencia real del proveedor**: total — sin certificación ni condiciones comerciales de Hotelbeds, `provider_commission`/`viao_revenue` seguirán NULL indefinidamente, y el earning por reserva seguirá sin base económica confirmada, aunque el código ya lo calcule y muestre. **Si la comisión resulta menor de lo esperado**: el 2% de reward actual podría no estar cubierto por la comisión real — esto es un riesgo económico ya identificado, sin resolver, que depende enteramente de la respuesta al caso #60019483.

## 15. Flights — análisis (Parte 12), NO implementar

Hallazgo más importante de la investigación: **el ecosistema de APIs de vuelos ha cambiado desde que se excluyó "vuelos" del MVP original, y ha cambiado en la dirección equivocada para VIAO.**

- **Amadeus Self-Service** (la vía tradicional de entrada para startups) **se cerró el 17 de julio de 2026** — ya no existe una vía de prototipado abierta y autoservicio como la que sí tuvo Hotelbeds.
- La única vía Amadeus ahora es **Quick Connect (Enterprise)** — requiere proceso comercial, acreditación IATA/BSP, y 4-6 semanas de integración *solo si la acreditación ya existe* — para VIAO, realistamente varios meses.
- **Kiwi.com Tequila API** cerró también el registro autoservicio — ahora requiere solicitud de partner.
- **Skyscanner Travel API** excluye explícitamente "startups sin plan de negocio robusto" y espera 100.000+ visitas/mes — no viable ahora. Su programa de afiliados (solo enlaces, sin reserva real) exige ~5.000 visitas/mes — técnicamente accesible pero es solo un enlace de salida, no una reserva real.
- **Duffel** es la opción más accesible (autoservicio real, sandbox libre, sin acreditación IATA/ARC, precio transparente ~$3/reserva + 1%) — pero el DOMINIO es estructuralmente más complejo que hoteles: gestión de PNR, plazos de emisión de billete, reglas tarifarias, ancilares (maletas/asientos), múltiples fuentes de tarifas — nada de esto existe en la reserva de hoteles al por mayor.
- Estimación de la investigación: integración de reserva completa con Duffel, **2-4+ meses** de ingeniería hasta nivel de producción; con GDS tradicional, **3-6+ meses** solo para empezar a integrar.

**Conclusión: Flights es hoy MÁS cerrado y MÁS complejo de integrar que Hotelbeds — y VIAO todavía no ha conseguido llevar Hotelbeds a producción.** La exclusión original de `VIAO_MVP_v0.1.md` sigue siendo correcta, y con más razón ahora. **Travel-first (Hotels+Flights) NO es mejor que Loyalty-first (Partners+Rewards+Goals+Hotels)** — es una apuesta técnica y comercialmente más difícil, sin evidencia de que el usuario la necesite antes de validar el loop de fidelización. Revisar de nuevo solo tras validar el piloto y, si acaso, con Duffel como única opción realista — nunca Amadeus/Sabre/Travelport a esta escala.

## 16. Modelo económico (Parte 13) — reafirmado del bloque anterior

Los escenarios de 30/100/500/1.000/5.000/10.000 usuarios de la auditoría estratégica previa se mantienen sin cambios — ninguna hipótesis económica nueva invalida esos rangos. Se reafirma la conclusión: **sin la comisión real de Hotelbeds ni el modelo de Partners aún validado, no existe un break-even calculable con precisión real** — solo el coste tecnológico (bajo, <€200-300/mes a esta escala) es una cifra confiable hoy.

## 17. Valor estratégico (Parte 14) — reafirmado

Sin cambios respecto al bloque anterior: el activo con valor de M&A real hoy es tecnología parcial (Vision, ledger, seguridad) — cero usuarios, cero Partners, cero ingresos, cero retención medida. Construir Goals+Rewards+Partners es precisamente lo que empieza a generar los activos citados en la sección 4 del documento maestro (base de usuarios, engagement, partner network).

## 18. Traffic / GTM (Parte 15) — reafirmado, con una advertencia nueva

Canal recomendado: Barcelona Activa (programa INICIA) + asociaciones de comerciantes de barrio + referidos ya construidos. **Advertencia que no estaba en el bloque anterior con suficiente peso**: Loyapp (Barcelona, fidelización digital de comercio local, nacida del mismo programa INICIA, 80 partners/4.000 usuarios) es un **posible competidor directo en el mismo canal de adquisición** — antes de ejecutar GTM, conviene una investigación específica de Loyapp (qué ofrece exactamente, si sigue activa, si compite por los mismos comercios) que este documento no cubre y que debería preceder al Bloque 4 (Partners) de la sección 20.

## 19. VIAO Dream Trip (Parte 16) — reafirmado con hallazgo legal

Confirmado con fuente legal (Ley 13/2011, Art. 2.2.c/3.3.i): un sorteo promocional es legal sin licencia de juego, pero cualquier paso final de azar (incluida la propuesta híbrida "entre los más comprometidos o un sorteo") activa comunicación previa a la Generalitat, tasa autonómica y retención IRPF del 19% sobre el premio. **Recomendación reafirmada**: si se construye, usar mérito puro (sin azar) para evitar todo el régimen — pero **no forma parte del MVP**, se difiere a V2, y su implementación exacta requiere un abogado especializado antes de lanzar, no solo esta investigación.

## 20. Decisión final — máximo 5 bloques

### Bloque 1 — Rewards: catálogo y canje
- **Objetivo**: cerrar "Elige".
- **Problema**: Points sin propósito.
- **Tablas**: `rewards_catalog`, `reward_redemptions`; ampliar `rewards_transactions` con `expires_at`.
- **Rutas**: `app/rewards/*` (añadir catálogo/canje), `lib/rewards/*`.
- **Riesgo**: cambiar `createRewardTransaction` para aceptar gasto — tocar el único escritor del ledger, requiere tests exhaustivos de no-regresión.
- **Dependencia**: ninguna externa.
- **Terminado cuando**: un usuario canjea un Reward real, `reward_redeemed` se dispara, el ledger refleja el gasto correctamente.
- **Tests**: unit del nuevo camino de gasto, idempotencia de canje, no-regresión de ganancia existente.

### Bloque 2 — Goals
- **Objetivo**: cerrar "Objetivo".
- **Problema**: sin destino, los Points son abstractos.
- **Tablas**: `goals`.
- **Rutas**: Home (nueva sección), nueva pantalla de creación/edición de Goal.
- **Riesgo**: bajo — solo lectura de saldo existente, sin tocar el ledger.
- **Dependencia**: ninguna.
- **Terminado cuando**: un usuario define un Goal y ve progreso real (saldo/target) en Home.
- **Tests**: un único Goal activo por usuario, transición al crear uno nuevo, cálculo de progreso.

### Bloque 3 — Missions mínimas
- **Objetivo**: earning adicional sin infraestructura nueva.
- **Problema**: solo 3 formas de ganar Points hoy.
- **Tablas**: ninguna nueva necesariamente (o una tabla mínima `mission_completions` para dedup semanal).
- **Rutas**: Home, `lib/rewards/rules.ts` extendido.
- **Riesgo**: bajo — reutiliza eventos (`search_started`, `vision_used`) ya disparados.
- **Dependencia**: Bloque 1 (el ledger de gasto no es necesario, pero el patrón de otorgar Points ya existe).
- **Terminado cuando**: 3-5 misiones otorgan Points correctamente, sin duplicados.
- **Tests**: idempotencia por usuario/semana/misión.

### Bloque 4 — Partners piloto (3-5) + QR
- **Objetivo**: validar el activo estratégico hoy en 0.
- **Problema**: sin Partners no hay "actividad cotidiana".
- **Tablas**: `partners`; `rewards_catalog.partner_id`.
- **Rutas**: pantalla de validación QR para el usuario; sin dashboard de Partner (gestión manual).
- **Riesgo**: el más alto de los 5 bloques — depende de negociar partners reales fuera del código; investigar primero si Loyapp compite por los mismos comercios (sección 18).
- **Dependencia**: Bloques 1 y 2 (sin Rewards ni Goal, un Partner no tiene qué ofrecer).
- **Terminado cuando**: un Partner real valida una visita, el usuario recibe Points, puede canjearlos.
- **Tests**: antifraude (token rotativo, dedup diario), rate-limit.

### Bloque 5 — Antifraude ampliado + caducidad de Points
- **Objetivo**: proteger la economía antes de escalar earning.
- **Problema**: solo hay constraints de unicidad hoy.
- **Tablas**: `rewards_transactions.expires_at`.
- **Rutas**: `lib/rewards/*`, posible job de expiración.
- **Riesgo**: bajo técnicamente, pero requiere decisión de producto sobre el plazo exacto (12 vs 18 meses).
- **Dependencia**: Bloques 1-4 (protege lo que ya se construyó).
- **Terminado cuando**: existe caducidad real aplicada y al menos un control de antifraude más allá de dedup por constraint.
- **Tests**: expiración correcta, no afecta Points ya canjeados.

## 21. Qué NO hacemos

- Certificación/producción de Hotelbeds — bloqueado externamente, no tocar hasta #60019483.
- Flights — MÁS cerrado y complejo que Hotelbeds hoy, revisar solo post-validación con Duffel.
- Admin panel — no bloquea el piloto de 30 usuarios.
- Premium/Suscripciones — sin base de usuarios que lo justifique.
- Scan/OCR de tickets — mayor riesgo de fraude, Partners+QR cubre la necesidad ahora.
- Partner Dashboard UI — gestión manual es suficiente para 3-5 partners.
- Streak diario — sustituido por racha semanal no diaria.
- VIAO Dream Trip — V2, requiere asesoría legal previa.
- Cualquier motor de Missions configurable — 3-5 misiones hardcodeadas bastan para V1.

## 22. Criterios de éxito de los primeros 30 usuarios

- 30 usuarios reales, 3-5 Partners activos.
- ≥3 acciones de earning/usuario/semana.
- ≥30% de usuarios que vuelven en semana 2.
- ≥50% de usuarios que canjean al menos 1 Reward en 60 días.
- ≥5 visitas repetidas por Partner en 30 días.

---

# DECISION LOCK

Decisiones aprobadas como referencia para los siguientes bloques de desarrollo (sujetas a revisión conjunta antes de implementar):

1. **Producto mínimo**: Registro, Home rediseñada, Goal único activo, Points/Wallet, Rewards con canje real, Partners+QR (sin dashboard), Missions mínimas (3-5, hardcodeadas), Hotels sin tocar.
2. **Goal**: uno solo por usuario; progreso = saldo actual capado al target (sin sub-ledger); canjear Rewards reduce el progreso — es la mecánica central, no un defecto.
3. **Rewards**: 10-20 máximo; financiación 50/50 Partner/coste real, VIAO nunca 100%; caducidad de Points 12-18 meses (nuevo); un único escritor del ledger, ahora también para gasto.
4. **Partners**: piloto gratis (0€/mes) para los primeros 3-5; QR con token rotativo diario, sin hardware ni app para el Partner; gestión manual, sin dashboard en V1.
5. **Recurrencia**: Goal mensual + Missions semanales + racha de 3 semanas (no diaria, sin Points extra).
6. **Scan/OCR**: diferido a V2 — Partners+QR primero.
7. **Flights**: diferido a V2+, revisar solo tras validar el piloto, y solo con Duffel si se retoma — nunca Amadeus/Sabre/Travelport a esta escala.
8. **Dream Trip**: diferido a V2, mecánica de mérito puro (sin azar) si se construye, requiere asesoría legal previa.
9. **Hotelbeds**: sin cambios — congelado hasta respuesta al caso #60019483.
10. **Admin, Premium, Partner Dashboard**: diferidos a V2, no bloquean el piloto de 30 usuarios.
11. **Orden de implementación**: Bloque 1 (Rewards) → Bloque 2 (Goals) → Bloque 3 (Missions) → Bloque 4 (Partners) → Bloque 5 (Antifraude/caducidad) — Partners depende de que 1 y 2 existan primero.

**No se ha modificado código, no se han creado migraciones, no se ha hecho commit.** A la espera de revisión y aprobación conjunta antes de iniciar el Bloque 1.
