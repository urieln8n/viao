---
STATUS: VALIDATION
ERA: Esta sesión
DOMAIN: Partners/Comercial
AUTHORITY: Investigación de mercado — VERDICT 🟡
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-25
---

# VIAO Partners — Investigación comercial profunda: Value Proposition B2B + Modelo Económico

### Estado: INVESTIGACIÓN / DISEÑO CONCEPTUAL — NO IMPLEMENTAR. No se ha modificado código, Supabase, migraciones, RLS, UI ni ningún archivo del repositorio.
### No se reabre ninguna decisión LOCKED (L1-L19 del Master V2, P1-P8 del Decision Lock Económico) salvo que se etiquete explícitamente `CONTRADICCIÓN REAL` con justificación.
### Fuentes leídas antes de investigar: `docs/01_CURRENT/partners/VIAO_PARTNERS_MASTER_V2.md`, `docs/01_CURRENT/partners/VIAO_PARTNERS_TECHNICAL_SPEC.md` (ya en profundidad en turnos anteriores de esta misma sesión — schema, RPC, P1-P8, todo verificado directamente contra el código real).

**Taxonomía usada en todo el documento**: `DATO DE MERCADO` (fuente externa verificable) · `HIPÓTESIS VIAO` (razonamiento propio, no verificado externamente) · `SUPUESTO` (asunción explícita necesaria para un cálculo) · `EXISTENTE`/`LOCKED` (ya construido/decidido) · `OPEN` · `NUEVO` · `BLOCKED` · `VALIDATION REQUIRED`.

---

## 1. Executive Summary

El mercado de herramientas de fidelización/marketing/CRM para pequeño comercio local está **polarizado en dos bandas**, con un hueco real en medio: herramientas básicas de tarjeta-sello digital a ~$15-20/mes (sin analítica real), y suites "serias" de loyalty/reputación/CRM a $150-450+/mes (Fivestars, Podium, Birdeye, LoyaltyLion en sus tiers altos, Toast Loyalty ya bundled con POS). **Entre medio existe una banda real y poblada de $49-99/mes** (Kangaroo Rewards Starter $79, Preferred Patron $79, Sinch $49, Mindbody Starter $99) — es exactamente donde VIAO propone situarse (€50-90). Esto no es un precio inventado: es un precio que el mercado ya ha validado como "razonable para un negocio pequeño que quiere algo más que una tarjeta de sellos mensual, pero no puede/quiere pagar $300+/mes".

Lo que VIAO puede vender de forma honesta hoy, con lo ya construido (Partners Beta, LOCKED), es **atribución de visitas + medición de recurrencia real**, no un CRM completo, no reservas, no garantía de resultados. Es una propuesta B2B real pero que requiere validarse con datos de Beta antes de fijar precio definitivo — el veredicto final de este documento es 🟡, no 🟢, y se explica por qué.

---

## 2. Lo que realmente compra un Partner

No compra "un programa de puntos". `DATO DE MERCADO`: la investigación de por qué fracasan los programas de loyalty (Restaurant Business Online, NRN, DataCandy) converge en 4 causas: fricción de descarga de app, datos aislados del POS, ejecución pobre (sin triggers de recuperación), y ausencia de un objetivo de negocio claro detrás del programa. Ninguna de esas 4 causas es "el programa no tenía suficientes funcionalidades" — son causas de **falta de resultado medible**, no de falta de features.

Por tanto, lo que un Partner compra de verdad, cuando paga, es la respuesta a una pregunta muy concreta: *"¿esto trae clientes que vuelven, y puedo verlo?"* — no el mecanismo (QR, Points, tarjeta), sino la prueba del resultado.

---

## 3. Dolores económicos del Partner

### Restaurantes

| Dolor | Impacto económico | Frecuencia | Urgencia | Disposición a pagar | Dificultad de resolver hoy |
|---|---|---|---|---|---|
| Coste de adquisición de cliente nuevo | Alto — `DATO DE MERCADO`: CAC medio de restaurante $30-80 por cliente (BlueCart/7shifts/DoorDash for Merchants), y hasta 10x más caro vía Instagram Ads tras cambios de algoritmo (Robb Report) | Constante | Alta | Alta | Media-alta — depende de canales externos que no controla |
| Baja recurrencia / clientes que no vuelven | Muy alto — `DATO DE MERCADO`: solo 20-30% de la facturación viene de clientes nuevos, 65-80% de habituales (múltiples fuentes de la industria); atrición anual típica del 18% | Constante | Alta | Alta | Media — sabe que importa, pero no mide bien quién vuelve y quién no |
| Horas/días flojos | Alto pero localizado | Semanal (predecible) | Media | Media | Baja-media — palancas conocidas (descuentos early bird) pero poco medibles |
| Dependencia de Instagram/plataformas externas | Medio-alto, creciente | Constante | Media | Media | Alta — no tiene alternativa real hoy |
| No saber quiénes son sus clientes reales | Alto (indirecto — impide todo lo demás) | Constante | Media | Media-alta | Alta — el POS no está pensado para esto |

### Experiencias (clases, wellness, ocio, cultura)

Mismos dolores estructurales que restaurantes, con dos matices `HIPÓTESIS VIAO` (no verificado con la misma profundidad en esta pasada): (1) el ticket medio suele ser mayor, lo que hace un cliente recurrente proporcionalmente más valioso; (2) la oferta ya está mucho más servida por herramientas verticales caras (Mindbody desde $99/mes, con comisión adicional del 20% sobre clientes captados vía su marketplace, `DATO DE MERCADO`) — un negocio pequeño de experiencias puede sentir que "ya paga demasiado" en herramientas de gestión, lo que hace más difícil justificar un gasto adicional de captación/fidelización sin resultado claro.

---

## 4. Investigación competitiva — qué paga hoy un pequeño negocio local

| Producto | Qué vende realmente | Precio (`DATO DE MERCADO`) | Cliente objetivo | Qué hace que paguen | Métrica de valor que usa |
|---|---|---|---|---|---|
| Loopy Loyalty | Tarjeta-sello digital, sin analítica real | $18/mes | Micro-negocio, primer paso | Precio casi simbólico | Ninguna real — solo sellos |
| Sinch (mensajería/automatización) | SMS/WhatsApp marketing básico | Desde $49/mes | Pequeño negocio con lista de contactos | Automatización de campañas | Envíos/aperturas |
| Kangaroo Rewards | Loyalty con analítica, multi-tier | $79 / $199 / $349 por mes | Retail y restaurantes pequeños-medianos | Analítica + automatización de campañas | Reportes de recurrencia |
| Preferred Patron | Loyalty con POS/analítica | Desde $79/mes (hasta 500 miembros) | Restaurantes/retail independiente | Integración con su propio POS | Analítica de miembros |
| Mindbody (Starter) | Reservas + pagos + gestión, no solo loyalty | $99/mes + 2.99-3.6% procesamiento + 20% comisión sobre clientes de su marketplace | Estudios de wellness/clases | Todo-en-uno operativo, no solo marketing | Reservas, ocupación |
| Toast Loyalty (bundle) | Loyalty integrado a su propio POS | $185/mes de bundle, ~$250-350/mes todo incluido | Restaurantes que ya usan Toast POS | Integración nativa con el POS (dato unificado) | Repeat visits, AOV |
| Smile.io | Loyalty e-commerce, no local/físico | Gratis-$49/mes | Tiendas online, no aplica bien a restaurantes físicos | Setup rápido, sin fricción | Puntos canjeados |
| LoyaltyLion | Loyalty e-commerce avanzado | $159-$1.650/mes | E-commerce establecido, no encaja con negocio físico local | Analítica profunda, personalización | LTV, segmentación |
| Fivestars | Loyalty + marketing automatizado, terminal físico incluido | Desde $299/mes | Retail/restaurante con volumen medio-alto | Terminal físico en el punto de venta, automatización total | Visitas recurrentes, campañas |
| Podium / Birdeye | Reputación online + mensajería + reseñas | $299-$999/mes | Negocios con varias ubicaciones o alta dependencia de reseñas | Gestión centralizada de reputación/reseñas | Volumen de reseñas, respuesta |

**Qué compite directamente con VIAO**: Kangaroo Rewards y Preferred Patron son los más cercanos en precio y propuesta (loyalty + analítica para negocio físico independiente). **Qué queda desatendido**: ninguno de estos conecta la actividad del negocio local con un objetivo PERSONAL y visible del cliente final (un viaje, una meta) — todos son "Points → descuento en el mismo negocio", nunca "Points → algo que el cliente final ya quería lograr". Esto es una oportunidad real, no forzada — es la única diferencia estructural genuina frente a toda la lista.

---

## 5. Productos €30-€100+/mes — qué prometen (síntesis)

- **$15-50/mes**: promesa mínima — "digitaliza tu tarjeta de sellos". Sin atribución real, sin analítica seria.
- **$50-100/mes**: promesa media — "sabemos quién vuelve y podemos automatizar que vuelva más". Analítica básica + campañas automatizadas. **Esta es la banda de VIAO.**
- **$100-300/mes**: promesa alta — gestión operativa completa (reservas, pagos, POS) con loyalty integrado como parte de un todo-en-uno.
- **$300+/mes**: promesa enterprise — reputación multicanal, multi-ubicación, terminal físico, soporte dedicado.

---

## 6. Oportunidad de VIAO

VIAO no puede (ni debe, en Beta) competir en la banda de $100-300+ (requeriría POS, reservas reales, reputación multicanal — nada de eso existe ni está LOCKED). Sí puede competir de forma honesta en la banda $50-90 **si** ofrece lo que esa banda promete: atribución + analítica de recurrencia + automatización básica — que es exactamente lo que `partner_activities`/dashboard de la Technical Spec ya está diseñado para producir. La oportunidad diferencial real (no una feature más) es el vínculo con el objetivo personal del cliente final (Goals) — ningún competidor de la lista lo tiene.

---

## 7. Propuestas de valor alternativas

| Propuesta | Valor económico | Diferenciación | Facilidad de explicar | Facilidad de demostrar ROI | Dificultad de construir | Disposición a pagar | Retención Partner | Escalabilidad |
|---|---|---|---|---|---|---|---|---|
| A. Customer acquisition ("te traigo clientes nuevos") | Alta si se cumple | Baja — todo el mundo lo promete | Alta | Baja — VIAO Beta no puede demostrar causalidad de adquisición, solo actividad declarada | Media | Alta si se cree | Baja si no se demuestra rápido | Media |
| B. Customer retention ("hago que vuelvan") | Alta | Media | Alta | Media — sí puede medir recurrencia real (`clientes_recurrentes`, ya en el dashboard LOCKED) | Baja (ya existe) | Media-alta | Alta si funciona | Alta |
| C. Acquisition + retention | Muy alta | Media | Media | Baja-media — combina el problema de A | Media-alta | Alta | Media | Media |
| D. Customer growth system ("cada cliente nuevo se convierte en oportunidad de recurrencia") | Alta | Alta | Media | Media-alta — es medible con lo ya LOCKED (`clientes_nuevos` + `clientes_recurrentes` + evolución en el tiempo) | Baja (ya existe) | Alta | Alta | Alta |
| E. "Tus clientes financian objetivos reales, no descuentos" (diferenciador VIAO) | Media-alta, emocional más que transaccional | Muy alta — nadie más lo tiene | Media (requiere explicar el concepto de Goal) | Baja en Beta (efecto en el comportamiento del cliente final no medible todavía) | Ya existe (Goals) | Desconocido — `VALIDATION REQUIRED` | Desconocido | Alta si funciona |

**Ranking**: D > B > E > C > A. La propuesta A (adquisición pura) es la más fácil de vender pero la más peligrosa de prometer en Beta (ver Parte 10). D es la más defendible con lo que YA existe y ya está LOCKED.

---

## 8. ROI del Partner

`DATO DE MERCADO` de base: CAC restaurante $30-80/cliente nuevo; 65-80% de la facturación viene de clientes habituales; 18% de atrición anual.

**Modelo conceptual, Partner que paga €80/mes**:

| Escenario | Clientes nuevos atribuibles/mes | Clientes recurrentes activados/mes | Valor asumido por visita (`SUPUESTO`) | Ingreso incremental estimado | Cubre los €80 |
|---|---|---|---|---|---|
| Conservador | 1 | 2 | €15 (`SUPUESTO`, ticket medio bajo) | ~€45 | No, por poco |
| Base | 2 | 4 | €20 (`SUPUESTO`, ticket medio restaurante Barcelona) | ~€120 | Sí (1.5x) |
| Optimista | 4 | 8 | €25 (`SUPUESTO`) | ~€300 | Sí (3.75x) |

Estas cifras son **HIPÓTESIS VIAO construidas sobre supuestos explícitos**, no una previsión — el propio dato de CAC ($30-80/cliente) ya sugiere que, si VIAO genera aunque sea 1-2 clientes nuevos reales al mes, el argumento económico existe en teoría. Lo que Beta debe producir es evidencia de que esos clientes nuevos/recurrentes son reales y no solo actividad declarada sin repetición real (ver Parte 15).

---

## 9. El "momento €80"

`HIPÓTESIS VIAO`: el momento no es un evento único, es una **combinación de dos señales vistas juntas en el dashboard**: (1) un cliente que ya había venido antes vuelve por segunda vez atribuible a VIAO, Y (2) el Partner puede ver, en la misma pantalla, cuántos clientes así lleva acumulados en el mes. El primer cliente nuevo no convence a nadie (podría ser casualidad); el primer cliente que **vuelve** y que el Partner puede atribuir con confianza es la señal que cambia la percepción de "esto es un experimento" a "esto genera negocio real". Este momento debe ser el centro literal del dashboard (Parte 13), no una métrica más entre otras.

---

## 10. Producto conceptual "VIAO Partner"

1. **Qué compra**: acceso a un canal de clientes reales de VIAO + visibilidad de cuántos de ellos vuelven.
2. **Qué recibe**: un enlace de acceso (`access_token`, P7 LOCKED), un QR físico para el local, un panel de solo lectura.
3. **Qué hace cada semana**: confirmar actividades cuando un cliente VIAO visita (QR o reserva), revisar el panel.
4. **Qué resultado obtiene**: visibilidad de clientes nuevos vs. recurrentes atribuibles a VIAO, en euros declarados/confirmados.
5. **Qué ve en el dashboard**: ver Parte 13.
6. **Cómo VIAO demuestra el ROI**: comparando recurrencia de clientes-VIAO frente al dato genérico de mercado (65-80% recurrencia normal) — sin prometer causalidad que Beta no puede probar.
7. **Qué hace el Partner para obtener valor**: confirmar actividades reales, nada más — sin CRM que gestionar.
8. **Qué hace VIAO automáticamente**: atribución, cálculo de Points, cálculo de recurrencia, agregación del dashboard.
9. **Qué NO debemos construir**: CRM de contactos, campañas automatizadas de recuperación, reservas reales, reputación/reseñas — todo esto pertenece a la banda de $150+ y no está LOCKED ni construido.

---

## 11. Función → beneficio → resultado económico

| Función | Beneficio | Resultado económico |
|---|---|---|
| QR | Permite atribuir una visita a VIAO | Demuestra qué negocio real está generando el canal |
| `partner_activity` | Registro append-only de cada visita real | Historial verificable, no una promesa vacía |
| Points | Incentivo que el cliente final recibe | Motivo real para que el cliente vuelva a ese Partner en concreto |
| Rewards ledger | Registro económico serio, auditado | Confianza de que el sistema no "infla" números artificialmente |
| Goals | El cliente final tiene un motivo emocional para volver | Recurrencia con causa, no solo descuento |
| Missions | Mantiene activo al cliente final entre visitas | Más frecuencia de uso de VIAO, más oportunidades de atribución |
| Referrals | Cada cliente trae potencialmente a otro | Reduce el CAC real del Partner sin coste extra |
| `clientes_nuevos` (métrica) | El Partner ve si VIAO le trae gente nueva de verdad | Decisión: ¿sigo pagando o no? |
| `clientes_recurrentes` (métrica) | El Partner ve si esos clientes vuelven | La métrica que más se acerca al "momento €80" |
| Ventas declaradas/confirmadas | Volumen económico real atribuido | Argumento cuantitativo para justificar el pago mensual |
| `actividad_reciente` | El Partner ve movimiento, no un panel vacío | Percepción de "esto está vivo", reduce el riesgo de churn temprano |

---

## 12. Dashboard mínimo

Cada métrica debe responder a una decisión, no "quedar bonita":

| Métrica | Decisión que permite tomar | Ya existe en el contrato de datos LOCKED |
|---|---|---|
| Clientes nuevos (mes) | ¿VIAO me trae gente que no tenía? | Sí (`clientes_nuevos`, Technical Spec sección 14) |
| Clientes recurrentes (mes) | ¿Esa gente vuelve? — el "momento €80" | Sí (`clientes_recurrentes`) |
| Ventas declaradas vs. confirmadas (€) | ¿Cuánto volumen real hay detrás? | Sí (`ventas_declaradas_eur`, `ventas_confirmadas_reserva_eur`) |
| Evolución mes a mes de recurrencia | ¿Va a mejor o a peor? — decide si renovar | `NUEVO` — no está en el contrato actual, es solo agregación de lo ya existente |
| Actividad reciente | ¿Está vivo esto? | Sí (`actividad_reciente`) |
| Partner activo (últimos 14 días) | Alerta interna de VIAO, no del Partner | Sí (`partner_activo`) |

**Deliberadamente NO se incluye**: ROI en euros exacto (no se puede demostrar causalidad en Beta, ver Parte 10), ranking frente a otros Partners (genera comparación tóxica sin base), ninguna proyección futura.

---

## 13. Qué podemos automatizar

| Tarea | Estado |
|---|---|
| Atribución de visita (QR/reserva) | `EXISTENTE` — ya diseñado en `complete_partner_activity()` |
| Cálculo de Points | `EXISTENTE` — P1/P2 LOCKED |
| Identificación de cliente nuevo vs. recurrente | `EXISTENTE` — ya definido en el contrato de dashboard (sección 14 Technical Spec) |
| Agregación del dashboard | `POSIBLE CON CAMBIOS MENORES` — los datos ya existen, falta la vista agregada mes a mes |
| Recordatorio al Partner de confirmar actividades pendientes | `NUEVO` |
| Campaña de recuperación de clientes que dejaron de venir | `FUTURO` — requeriría mensajería al usuario final, no diseñado |
| Informe mensual automático al Partner | `NUEVO` — sencillo de construir sobre datos ya existentes |

---

## 14. Qué NO debemos prometer

- Garantizar clientes nuevos, facturación, o ROI — nada de esto es medible con certeza en Beta.
- Afirmar que una venta fue "causada por VIAO" cuando solo fue declarada (mismo principio ya LOCKED en Master V2 L15 — "venta declarada", nunca "atribuida" sin evidencia).
- Antifraude que no existe — el propio Master V2 ya acepta explícitamente el riesgo de importe declarado incorrecto (sección 14).
- Un CRM completo — no lo tenemos ni está diseñado.
- Reservas reales para Experiencias — no existe ningún sistema de reservas propio (ya verificado en la Technical Spec, sección 9: "no es un sistema de reservas real").
- OCR — explícitamente `NO IMPLEMENTADO`, V1.1+ (Master V2 O3).

---

## 15. Propuesta de valor final

**ONE-LINER**: "VIAO te trae clientes que vuelven, y te lo demuestra."

**ELEVATOR PITCH (30s)**: "VIAO es una app donde la gente ahorra para sus objetivos con lo que gasta en su día a día. Cuando alguien viene a tu negocio y confirmas su visita, gana Points hacia su objetivo — y tú ves en tu panel cuántos son nuevos y cuántos vuelven. No es una tarjeta de sellos más: es la prueba de si estás generando clientes reales o no."

**PROPUESTA DE VALOR**:
- Ves quién es cliente nuevo y quién repite — no una intuición, un dato.
- Cada visita queda registrada, sin gestionar nada tú mismo.
- El cliente vuelve por un motivo real (su propio objetivo), no solo por un descuento.
- Sin instalar nada, sin terminal físico, sin coste de arranque.
- Onboarding manual y acompañado (3-5 Partners piloto, no autoservicio genérico).

**¿POR QUÉ PAGAR €80?**: porque el coste real de conseguir un cliente nuevo por tu cuenta ronda €30-80 (`DATO DE MERCADO`) — si VIAO te trae aunque sea 2-3 clientes nuevos reales al mes y ves que alguno vuelve, ya se paga solo. Y a diferencia de una tarjeta de sellos de $18/mes, tienes el dato para saber si de verdad está funcionando.

**¿POR QUÉ NO INSTAGRAM/WHATSAPP/UN PROGRAMA DE PUNTOS?**: Instagram no te dice quién de tus seguidores compró de verdad ni si repite — solo alcance. WhatsApp requiere que tú gestiones cada contacto a mano. Un programa de puntos genérico (Loopy Loyalty, $18/mes) no mide nada, es solo un sello digital. VIAO combina la atribución que Instagram no te da con la automatización que WhatsApp no tiene, a una fracción del precio de las herramientas "serias" ($150-450/mes).

---

## 16. Objeciones del Partner

| Objeción | Respuesta | Evidencia necesaria | Riesgo |
|---|---|---|---|
| "Ya tengo Instagram" | Instagram te da alcance, no te dice quién repite | Dashboard con recurrencia real | Si el dashboard no lo demuestra rápido, la objeción gana |
| "Ya tengo WhatsApp" | WhatsApp no atribuye ni mide, lo gestionas tú a mano | Comparación directa de esfuerzo | Bajo |
| "Ya tengo clientes" | La pregunta no es si tienes clientes, es si sabes cuáles vuelven | Dato de recurrencia genérico del sector (65-80%) como referencia | Medio — puede sonar teórico sin dato propio del Partner |
| "No quiero pagar por otro programa" | No es un programa de puntos más, es medición — y Beta es gratis, LOCKED (Master V2 L6) | Ninguna en Beta — es gratis | Ninguno en Beta |
| "¿Cómo sé que me traes clientes?" | Panel con clientes nuevos/recurrentes verificables, no una promesa | El propio dashboard, ya LOCKED en su diseño de datos | Alto si el dashboard tarda en mostrar señal real |
| "¿Qué pasa si nadie usa VIAO?" | Beta es gratis precisamente para probarlo sin riesgo | Datos reales de los 3-5 piloto | Real — es el riesgo central de toda la Beta |
| "¿Por qué €80?" | Ver Parte 15 | CAC real del sector como referencia | Medio si no hay dato propio todavía |
| "¿Qué pasa si tengo pocos clientes?" | El coste es fijo pero el valor generado depende de tu volumen real — honesto, no se oculta | Ninguna — se dice claramente | Puede filtrar candidatos poco encajados, es correcto que lo haga |
| "¿Qué tengo que hacer yo?" | Solo confirmar la visita (QR/reserva) — nada más | Demo del flujo real | Bajo |

---

## 17. Modelo económico VIAO

### B2B (lo que paga el Partner)
€50-90/mes (rango a validar, no fijado) por el acceso descrito en la Parte 10.

### B2C (Premium, futuro, NO diseñado aquí)
Explícitamente fuera de alcance — P8 ya LOCKED confirma neutralidad total de Partners respecto a FREE/PREMIUM. No se mezcla con lo anterior.

### Coexistencia con costes conocidos
- Coste de Points: acotado por el pool de 3000 Points/mes (P4, LOCKED) — techo de coste conocido y fijo, independiente de cuántos Partners paguen.
- Coste de operación/soporte: `HIPÓTESIS VIAO` — bajo en Beta (3-5 Partners, onboarding manual ya LOCKED).
- Coste de adquisición de Partners: `SUPUESTO` — el mayor coste real no está en la tecnología sino en el tiempo de ventas/relación (ya señalado en el turno anterior de esta sesión).

---

## 18. Unit economics conceptual

`SUPUESTO` explícito: ARPU = €70/mes (punto medio del rango €50-90, no una decisión de pricing).

| Objetivo MRR | Partners necesarios a ARPU €70 | Partners necesarios a ARPU €50 | Partners necesarios a ARPU €90 |
|---|---|---|---|
| €1.000 | ~14 | 20 | 11 |
| €5.000 | ~71 | 100 | 56 |
| €10.000 | ~143 | 200 | 111 |
| €50.000 | ~714 | 1.000 | 556 |

Esto es mecánica pura, no una previsión financiera — el propio Master V2 ya fija Beta en 3-5 Partners (ni de lejos estos volúmenes); el ejercicio solo sirve para entender la escala de negocio que un ARPU de esta banda implicaría a futuro, y confirma que **el modelo depende de volumen de Partners, no de un ARPU alto** — coherente con el posicionamiento "accesible" frente a las herramientas de $150-450/mes.

---

## 19. Beta — qué demostrar con 3-5 Partners

**Experimento**: ¿genera VIAO clientes nuevos reales y recurrencia medible en un negocio local, sin coste para el Partner, durante 6-8 semanas (ya LOCKED, Master V2 L4)?

**Métricas**: las 6 ya LOCKED (Master V2 L17) — Partners activos, tiempo de onboarding, clientes nuevos atribuidos, ventas declaradas/confirmadas, recurrencia, retención del Partner a 60 días.

**Señales de éxito**: al menos un Partner con clientes recurrentes reales visibles en su panel antes del fin de Beta; al menos un Partner que pregunte espontáneamente "¿y esto cuándo lo puedo tener pagando de verdad?".

**Señales de fracaso**: Partners que dejan de confirmar actividades a las pocas semanas (fricción operativa real); cero clientes recurrentes atribuibles pasadas 4 semanas; ningún Partner menciona el programa espontáneamente a clientes.

**Qué tendría que decir un Partner para considerar Product-Market Fit inicial**: algo parecido a *"esto me está trayendo gente que no conocía y algunos ya han vuelto"* — dicho sin que se le pregunte directamente. Si solo lo confirman cuando se les pregunta, no es todavía señal fuerte.

---

## 20. Producto mínimo vendible

| Pieza | Estado |
|---|---|
| `partners`, `partner_activities`, `complete_partner_activity()` | `YA DISEÑADO` — LOCKED, pendiente de primera migración |
| Dashboard con clientes nuevos/recurrentes/ventas | `YA DISEÑADO` (contrato de datos, Technical Spec sección 14) — falta construir la vista |
| Acceso Beta vía `access_token` | `YA DISEÑADO` — P7 LOCKED |
| Evolución mes a mes en el dashboard | `FALTA CONSTRUIR` — agregación nueva sobre datos ya existentes |
| Informe/recordatorio automático al Partner | `FALTA CONSTRUIR` — sencillo |
| CRM de contactos, campañas de recuperación, reservas reales | `NO DEBEMOS CONSTRUIR` en Beta |

---

## 21. Riesgos

- El dashboard puede tardar semanas en mostrar recurrencia real (ciclo de visita de un restaurante no es instantáneo) — riesgo de que el Partner pierda interés antes de ver el "momento €80".
- Beta gratis (LOCKED) significa que la disposición real a pagar €50-90 sigue siendo `VALIDATION REQUIRED`, no confirmada por ningún dato propio todavía.
- El precio de mercado real de esta banda ($49-99, `DATO DE MERCADO`) está anclado en negocios anglosajones (EEUU/UK) — no verificado específicamente para Barcelona/España, marcado `NO VERIFICADO`.

---

## 22. Decisiones nuevas necesarias

- Qué mission/campaña de recuperación (si alguna) se construye para Beta — `OPEN`.
- Cómo se presenta la evolución mes a mes en el dashboard — `NUEVO`, no diseñado todavía.
- Precio final de Beta-a-pago — explícitamente `OPEN`, no se fija en este documento.

---

## 23. Recomendación final

# 🟡 Potencial pero falta validar

VIAO tiene una propuesta B2B real y no forzada — el diferenciador (vincular la visita a un objetivo personal del cliente final) no existe en ningún competidor investigado, y el rango €50-90 coincide con una banda de mercado real y poblada, no inventada. Pero no puede ser 🟢 todavía: nada de esto tiene evidencia propia de VIAO — depende enteramente de lo que produzcan los 3-5 Partners piloto de Beta.

1. **Qué deberíamos vender**: atribución + recurrencia medible (Propuesta D, Parte 7), nunca adquisición garantizada.
2. **A quién exactamente**: restaurantes/experiencias independientes en Barcelona, sin trayectoria previa de marketing serio, que hoy no pueden pagar $150-450/mes pero sienten el dolor de no saber quién vuelve.
3. **Qué resultado económico prometemos**: visibilidad real de clientes nuevos y recurrentes atribuibles — nunca una cifra de ROI garantizada.
4. **Qué NO prometemos**: ver Parte 14, íntegra.
5. **Precio recomendado inicial**: rango €50-70/mes para el primer Partner de pago tras Beta — banda inferior del rango investigado, coherente con ser la fase de validación, no de escalado (`HIPÓTESIS VIAO`, no LOCKED).
6. **Qué debemos demostrar con 3-5 Partners**: ver Parte 19.
7. **Qué producto mínimo construir**: ver Parte 20 — nada nuevo de gran envergadura, solo terminar lo ya diseñado.
8. **Qué hacer después**: cerrar Beta, mirar los datos reales de recurrencia/retención de Partner, y SOLO ENTONCES decidir precio definitivo (O1 del Master V2, sigue OPEN, no se cierra aquí).

---

## 24. Decision Register

| ID | Decisión | Estado | Evidencia | Impacto |
|---|---|---|---|---|
| PVB1 | Rango de precio B2B €50-90/mes coincide con una banda real de mercado ($49-99) | `PROPOSED` | Kangaroo Rewards, Preferred Patron, Sinch, Mindbody Starter (`DATO DE MERCADO`) | Confirma que el rango no es arbitrario, no fija precio final |
| PVB2 | Propuesta de valor recomendada: "customer growth system" (clientes nuevos + recurrentes medibles) | `PROPOSED` | Parte 7, ranking | Orienta el copy comercial, no requiere cambio técnico |
| PVB3 | Diferenciador real: vínculo con objetivo personal del cliente final (Goals) | `PROPOSED` | Comparación competitiva, Parte 4 | Ningún competidor investigado lo tiene |
| PVB4 | Precio final definitivo | `OPEN` | Pendiente de datos de Beta | No se fija en este documento |
| PVB5 | Evolución mes a mes en dashboard | `NUEVO` | Parte 20 | Requiere construcción, no solo diseño |
| PVB6 | Campaña de recuperación de clientes | `FUTURO` / `BLOCKED` | Parte 13 | Requiere mensajería al usuario final, no diseñada |
| PVB7 | Cobertura del rango de precio validada para Barcelona específicamente | `VALIDATION REQUIRED` | Ninguna — datos de mercado son mayoritariamente EEUU/UK | Pendiente de contraste con Beta real |
| P1-P8 (Master V2/Technical Spec) | Sin cambios | `LOCKED` | Ya cerrados en turnos anteriores | Ninguna contradicción real encontrada — ver Parte 24bis |

**Ninguna `CONTRADICCIÓN REAL` encontrada entre Master V2, Technical Spec y esta investigación** — la única tensión detectada es de énfasis narrativo (Master V2 no articulaba explícitamente el "customer growth system" como propuesta de venta), no una contradicción técnica ni económica.

---

## Fuentes consultadas (nuevas en esta sesión)

- [FiveStars Pricing — ITQlick](https://www.itqlick.com/fivestars/pricing)
- [LoyaltyLion vs Smile.io — comparativas de pricing 2026](https://www.swayloyalty.com/blog/loyaltylion-vs-smile-vs-yotpo)
- [Smile.io Pricing 2026 — Mage Loyalty](https://www.mageloyalty.com/blog/smile-io-pricing-in-2026-real-costs-at-every-tier-plus-cheaper-alternatives)
- [The real cost of restaurant loyalty software in 2026 — Medium](https://medium.com/@hello_44288/the-real-cost-of-restaurant-loyalty-software-in-2026-i-checked-every-platform-so-you-dont-have-b109f81a1ecf)
- [Your Toast Loyalty Program Isn't Broken — 5star365](https://go.5star365.com/blog/your-toast-loyalty-program-isnt-broken-its-just-limited.-heres-what-to-do-about-it)
- [Podium vs Birdeye 2026 — RevioReputation](https://revioreputation.com/blog/birdeye-vs-podium-2026-honest-comparison/)
- [Kangaroo Loyalty Rewards Pricing](https://get.kangaroorewards.com/s-app-pricing/)
- [Customer Loyalty by Preferred Patron Pricing — ITQlick](https://www.itqlick.com/customer-loyalty-by-preferred-patron/pricing)
- [Loopy Loyalty — Software Advice](https://www.softwareadvice.com/customer-loyalty/loopy-loyalty-profile/)
- [Mindbody Pricing in the US](https://www.mindbodyonline.com/business/education/blog/mindbody-pricing-united-states)
- [Sinch pricing — mencionado en comparativas WhatsApp marketing tools](https://www.pushwoosh.com/blog/best-whatsapp-marketing-automation-tools/)
- [Why restaurant loyalty is stuck — Restaurant Business Online](https://www.restaurantbusinessonline.com/technology/why-restaurant-loyalty-stuck)
- [Why Restaurant Loyalty Programs Fail — DataCandy](https://datacandy.com/resources/why-restaurant-loyalty-programs-fail-and-what-works-instead)
- [Restaurant Customer Acquisition Cost — BlueCart](https://www.bluecart.com/blog/customer-acquisition-cost)
- [How Instagram's Algorithm Change Hurts Restaurants — Robb Report](https://robbreport.com/food-drink/dining/instagram-algorithm-change-hurting-small-business-1234670309/)
- `docs/01_CURRENT/partners/VIAO_PARTNERS_MASTER_V2.md`, `docs/01_CURRENT/partners/VIAO_PARTNERS_TECHNICAL_SPEC.md` — fuente interna, ya auditada en profundidad en esta sesión.

---
