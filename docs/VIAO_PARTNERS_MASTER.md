---
STATUS: HISTORICAL / SUPERSEDED PARTIALLY
ERA: Partners (25/08), previa a V2
DOMAIN: Partners
AUTHORITY: Ninguna como fuente de verdad — ver nota de supersesión abajo
SUPERSEDES: —
SUPERSEDED BY: docs/01_CURRENT/partners/VIAO_PARTNERS_MASTER_V2.md (parcial, solo donde entran en conflicto); docs/02_DECISION_LOCKS/partners/VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md (específicamente la cofinanciación 50/50)
LAST REVIEWED: 2026-08-25
---

> **NOTA DE SUPERSESIÓN PARCIAL** (añadida en la reorganización documental, no reescribe el contenido original que sigue a continuación):
> - `VIAO_PARTNERS_MASTER_V2.md` identifica explícitamente a este documento como "versión 1, hipótesis inicial (superada parcialmente por este documento donde entran en conflicto)".
> - `VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md` supersede específicamente cualquier referencia de este documento a la cofinanciación 50/50 Partner/VIAO (§11 más abajo) — ese modelo queda `DEPRECATED`.
> - El mecanismo de atribución (§8, §16, §20 — validación manual sin QR) y la recomendación de arquitectura (§17 — reutilizar únicamente `rewards_transactions` sin tabla nueva) también evolucionaron en documentos posteriores (`VIAO_PARTNERS_MASTER_V2.md`, `VIAO_PARTNERS_TECHNICAL_SPEC.md`).
> - El resto del contenido — mini-web pública (§6), análisis de riesgos de OCR (§10), comparativa de 8 modelos de ingresos (§13), categorías (§15), guiones comerciales (§26) y cualquier otro punto que no entre en conflicto con `VIAO_PARTNERS_MASTER_V2.md` — **no ha sido sustituido** y se conserva como referencia histórica/hipótesis previa.
> - Este documento permanece en `docs/` raíz, sin archivar, a la espera de una decisión explícita del propietario.

---

# VIAO — PARTNERS MASTER
## Documento maestro de producto y negocio
### Estado: DISEÑO — NO IMPLEMENTADO

> Este documento es la referencia oficial de la fase Partners. Es autocontenido: puede copiarse a cualquier chat nuevo (Claude, ChatGPT) sin contexto previo. No contiene código, no autoriza ninguna implementación, no crea ninguna migración. Todo lo que aquí aparece como "recomendación" requiere aprobación explícita del propietario antes de convertirse en trabajo.

**Fecha:** 2026-08-25
**Estado del proyecto en el momento de este documento:** `main` = `origin/main` = `330419d`. Home Beta y Sidebar Beta cerrados. Hotelbeds congelado (caso `#60019483`). `MockHotelProvider` es el único proveedor activo. Partners: `[PENDIENTE]`, cero código, cero tabla.

---

## 1. Resumen ejecutivo

VIAO nació como travel + loyalty. Este documento propone que Partners deje de ser "una función más" y se convierta en la **pieza que sostiene el negocio mientras VIAO no tiene inventario de viajes real**: un marketplace bilateral donde el usuario gana Points por su actividad cotidiana en comercios/experiencias locales, y el negocio local compra visibilidad, adquisición de clientes y medición — algo que hoy la mayoría de negocios pequeños no puede permitirse.

La pregunta que gobierna todo el documento: **¿qué construimos para que un restaurante, un cine, un karting o una experiencia digan "yo pagaría por esto"?** La respuesta no es "una página dentro de una app de viajes" — es una herramienta de adquisición y fidelización de clientes que, además, conecta con un producto de viajes con el que el negocio no compite.

Este documento cubre visión, problema, propuesta de valor (ambos lados), modelo económico, UX, arquitectura conceptual, MVP, roadmap y decisiones pendientes. No se implementa nada hasta su aprobación explícita.

---

## 2. Tesis de Partners

```
USUARIO:  ACTIVIDAD → CONSUMO → POINTS → GOAL → VIAJE/EXPERIENCIA
PARTNER:  VISIBILIDAD → CLIENTES → CONVERSIÓN → FIDELIZACIÓN → DATOS/ANALYTICS → RETORNO
```

VIAO se sitúa en el cruce de ambos loops. No vende "Points" al usuario ni "una ficha" al Partner — vende la **conexión** entre ambos loops, y monetiza dos cosas distintas:

1. **La herramienta que usa el Partner** (visibilidad, CRM ligero, analytics) — ingreso tipo SaaS.
2. **El flujo de valor que pasa por VIAO** (compra atribuida → Points → Goal) — ingreso tipo comisión/co-financiación.

Ningún modelo de ingresos se fija en este documento (ver sección 13) — pero la tesis de que **ambos** loops deben monetizarse, no solo uno, es la base de todo lo que sigue.

---

## 3. Problema

**Lado usuario:** hoy, sin Hotelbeds activo, el "loop económico" de VIAO está casi vacío. Un usuario que ya buscó, ya volvió, ya vio un alojamiento y ya creó su Goal (las 4 Missions V1) no tiene ninguna razón para volver a abrir VIAO hasta su próximo viaje real — que puede ser dentro de meses. La tesis "tu actividad cotidiana te acerca a tu próximo viaje" necesita actividad cotidiana real que ganar, y hoy no la hay.

**Lado Partner:** un restaurante, cine o negocio de experiencias en Barcelona hoy tiene que elegir entre: (a) herramientas genéricas y caras (CRM enterprise, suites de marketing) que no están pensadas para su tamaño, (b) herramientas gratuitas pero débiles (Google Business, redes sociales) sin medición real de retorno, o (c) nada. Ninguna opción le dice con claridad "esto te trajo N clientes nuevos y esto es lo que gastaron".

**La oportunidad:** VIAO puede resolver ambos problemas a la vez con la misma pieza de producto — el Partner obtiene adquisición+fidelización+medición accesible, el usuario obtiene una razón diaria para usar VIAO, y ambos alimentan el mismo ledger de Points ya construido.

---

## 4. Propuesta de valor — Usuario

> "Tu vida cotidiana ya construye tu próximo viaje."

Cenar, ver una película, hacer una experiencia — actividades que el usuario ya hace — generan Points reales sin cambiar de hábito, sin necesidad de estar ya planificando un viaje. El Goal deja de depender exclusivamente de reservar (algo esporádico) y empieza a alimentarse de la vida diaria (algo frecuente).

---

## 5. Propuesta de valor — Partner

> "VIAO te trae clientes nuevos, te ayuda a que vuelvan, y te dice qué está funcionando."

Tres promesas concretas, en este orden de madurez de producto:
1. **Visibilidad real** — una página profesional, gratuita desde el primer día, con la que el negocio ya puede hacer marketing hoy (enlace en Instagram/Google Business), exista o no todavía tráfico de VIAO.
2. **Clientes medibles** — cada Point entregado es una actividad real atribuida a VIAO — algo que hoy la mayoría de negocios pequeños no puede afirmar de ningún canal de marketing.
3. **Herramienta de fidelización** — sin construir su propio programa de puntos desde cero.

---

## 6. Mini-web del Partner

### 6.1 Ruta: `/partners/[slug]` vs `/p/[slug]`

| Criterio | `/partners/[slug]` | `/p/[slug]` |
|---|---|---|
| Claridad/SEO | Alta — el término "partners" refuerza contexto | Baja — opaco fuera de VIAO |
| Jerarquía natural | Permite un futuro `/partners` como directorio/listado, con `/partners/[slug]` como detalle — estructura convencional | No tiene un "padre" natural sin introducir ambigüedad |
| Uso en marketing externo (impreso, redes) | Más largo | Más corto, más "linktr.ee" |

**Recomendación**: `/partners/[slug]` como ruta canónica dentro de la app (mejor jerarquía, mejor SEO). Un alias corto tipo `/p/[slug]` podría añadirse más adelante como redirect para marketing impreso/social — no es una decisión bloqueante, se puede introducir después sin romper nada.

### 6.2 Contenido (agrupado, no una lista plana)

- **Identidad**: logo, portada, fotos, descripción, categoría.
- **Ubicación**: dirección, mapa, horarios, contacto, redes/web.
- **Oferta**: productos/servicios, precios, promociones, experiencias.
- **VIAO**: Points obtenibles por esta actividad + explicación breve de cómo funciona VIAO (para quien llega desde fuera, sin cuenta).
- **CTA principal**: iniciar la actividad/compra/reserva (el mecanismo exacto depende del MVP, ver sección 19).

### 6.3 El test de valor real

*"Si yo fuera dueño de un restaurante, ¿me gustaría que esta página existiera aunque VIAO todavía fuera pequeño?"*

La respuesta debe ser sí por sí sola: una página gratuita, rápida, con buena presentación visual y sin fricción de alta, ya es útil el día uno, independientemente del tráfico que VIAO aporte todavía. Esto es lo que hace que Partners sea vendible desde el primer Partner, no solo desde el Partner número 1000.

---

## 7. Partner Dashboard

No es "nombre + editar perfil" — es el conjunto de herramientas que justifica, a medio plazo, un pago recurrente. Clasificado por madurez:

| Módulo | Beta/MVP | V1 | V1.1 | V2 |
|---|---|---|---|---|
| Perfil / mini-web editable (fotos, productos, horarios, ubicación) | ✅ | | | |
| Productos/servicios (lista simple: nombre, precio, descripción) | ✅ (sin inventario/disponibilidad) | disponibilidad, promoción por producto | | |
| Panel mínimo (clientes totales, Points entregados) | ✅ | | | |
| Dashboard de actividad (visitas, conversiones, ventas atribuidas) | | ✅ | | |
| Clientes (nuevos/recurrentes, frecuencia) | | ✅ básico | segmentación | |
| Promociones/campañas (fechas, beneficio, límites) | | ✅ | | |
| Fidelización (recompensas/incentivos propios del Partner) | | | ✅ | |
| Analytics (CAC, ROI, retorno) | | | ✅ | predictivo |
| Tickets/recibos + OCR | | | ✅ (piloto) | ✅ (escalado) |
| CRM con segmentación avanzada | | | | ✅ |
| Automatización de campañas | | | | ✅ |

**Principio explícito**: nada de esto se construye en Beta salvo lo marcado ✅ en esa columna. El resto es aspiracional y debe tratarse como tal.

---

## 8. CRM (mínimo)

No se construye un HubSpot. Se busca el 20% de funcionalidades que dan el 80% del valor a un negocio pequeño:

- Clientes nuevos vs. recurrentes (derivable directamente del ledger existente, sin tabla nueva — ver sección 17).
- Última actividad y frecuencia.
- Histórico de Points entregados.
- Conversión (actividad → Points → ¿repite?).

**Fuera del CRM mínimo** (V1.1/V2): segmentación avanzada, campañas automatizadas por segmento, scoring de clientes, integraciones externas.

---

## 9. Analytics

**Disponibles en Beta**: ninguna dedicada — el panel mínimo del Partner (sección 7) ya cubre "clientes totales" y "Points entregados", derivado directamente del ledger.

**V1**: visitas a la mini-web, clics al CTA, conversión (visita → actividad realizada), ticket medio si se captura el importe.

**V1.1**: clientes nuevos vs. recurrentes con tendencia temporal, frecuencia media, Points generados por campaña.

**V2**: coste de adquisición (si se puede calcular con datos de pricing del Partner), retorno estimado, analítica predictiva.

Ninguna métrica se implementa antes de que exista el volumen de datos real que la haga significativa — una tabla de analytics vacía no es un producto.

---

## 10. Recibos / OCR

Estudio de producto, sin diseño técnico.

**Ventaja principal**: permite arrancar el earning sin QR físico ni integración de punto de venta — el usuario ya tiene el ticket en la mano.

**Flujo conceptual**: usuario fotografía el ticket → VIAO extrae Partner/fecha/importe/productos → se valida → se otorgan Points → el Partner ve una venta atribuida.

**Riesgos a resolver antes de construir nada** (no resueltos en este documento):
- **Tickets duplicados**: la misma foto/ticket usada más de una vez.
- **Tickets falsos o manipulados**: edición de importe, ticket de otro comercio.
- **Colusión**: el propio Partner y un usuario fabricando actividad falsa para farmear Points.
- **Privacidad**: un ticket puede contener datos de terceros (otros comensales, otros productos) — hay que decidir qué se conserva y qué se descarta tras la extracción.
- **Coste**: OCR real (aunque sea vía un proveedor externo) tiene coste por imagen — debe modelarse contra el valor de los Points que desbloquea.
- **UX de validación**: ¿instantánea (arriesga fraude) o con demora (mejor validación, peor experiencia)?

**Mitigación conceptual, reutilizando patrones YA existentes en VIAO** (no nuevos): idempotencia real vía `UNIQUE` constraint (mismo criterio que `mission_completions`), kill-switch mensual independiente (mismo patrón que Missions/Rewards), límite de actividad por Partner/usuario/día.

**Recomendación de fase**: NO en MVP/Beta. Validación manual primero (ver sección 19); OCR como piloto en V1.1, con un único Partner de prueba, antes de generalizar.

---

## 11. Modelo de Points

**Principio no negociable, ya establecido en el resto de VIAO**: Points ≠ dinero. Nunca se comunica una equivalencia en euros en la UI (regla ya vigente en Home desde el checkpoint Beta).

**Variables a decidir** (no fijadas aquí):
- Points por compra: ¿porcentaje del importe (como ya existe para reservas de hotel, `HOTEL_BOOKING_REWARD_RATE = 2%`) o un monto fijo por actividad?
- Bonus de primera visita a un Partner nuevo.
- Bonus de recurrencia (ej. tercera visita al mismo Partner en un mes).
- Points ligados a campaña/promoción específica del Partner, distintos del Point base.

**Quién financia los Points**: ya existe una decisión conceptual aprobada (no implementada) en `docs/VIAO_V1_LOOP_DECISION.md` — co-financiación 50% Partner / 50% VIAO en el canje, y `POINTS_PERCENTAGE_OF_COMMISSION = 0.25` (25%, ya en código en `lib/rewards/rules.ts`, sin ningún flujo real que lo ejercite todavía). Este documento **no** cambia esas cifras — las hereda como punto de partida para Partners, sujetas a validación con datos reales.
>
> **⚠️ NOTA DE SUPERSESIÓN (añadida posteriormente, no reescribe el párrafo anterior)**: la cofinanciación 50% Partner / 50% VIAO aquí citada quedó formalmente `DEPRECATED` por `docs/02_DECISION_LOCKS/partners/VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md` — nunca se implementó en el schema real (`rewards_catalog.funding_type` es un binario `viao`/`partner`, sin ninguna columna de reparto porcentual). **No debe leerse como modelo económico vigente.** `POINTS_PERCENTAGE_OF_COMMISSION = 0.25` permanece `FUTURE`/dormant, sin cambios respecto a lo ya citado.

**Protecciones económicas necesarias, reutilizando patrones ya construidos**: techo mensual específico para el pool de Partners (mismo patrón que `VIAO_REWARD_POOL_MONTHLY_LIMIT_EUR` y el pool de 3000 Points/mes de Missions, pero un pool propio — nunca mezclado con esos dos), límite de Points por transacción, límite de transacciones por usuario/Partner/día.

---

## 12. Antifraude (conceptual)

Reutilizar exactamente los principios que VIAO ya aplica en Rewards/Missions — no inventar un mecanismo nuevo:

- **Idempotencia real** vía `UNIQUE constraint` (nunca solo lógica de aplicación) — ej. `UNIQUE(user_id, partner_id, external_reference)` para que la misma actividad nunca genere dos entregas de Points.
- **Kill-switches** con techo fijado en SQL (fail-closed), independientes del resto de pools.
- **Locks transaccionales** (`pg_advisory_xact_lock`) si existe contención real (ej. validaciones concurrentes del mismo Partner).
- **Límites por usuario/Partner/día** para frenar abuso sin bloquear el uso legítimo.

**Vectores de fraude específicos de Partners** (a mitigar, no resueltos aquí): autoatribución (usuario simula actividad sin gasto real), colusión Partner-usuario, tickets duplicados/falsos (sección 10), múltiples cuentas del mismo usuario, abuso de promociones de "primera visita" repitiendo con cuentas nuevas.

---

## 13. Modelo de ingresos

Comparativa de los 8 modelos planteados — sin decidir uno definitivo:

| Modelo | Facilidad de venta | Ingresos potenciales | Escalabilidad | Dificultad técnica | Atractivo negocio pequeño | Margen VIAO | Dependencia de volumen |
|---|---|---|---|---|---|---|---|
| A. Suscripción mensual | Media-baja (resistencia sin ROI probado) | Predecible | Alta | Baja | Bajo al inicio | Alto | Baja |
| B. Comisión por venta | Alta (sin riesgo para el Partner) | Variable, escala con actividad | Buena | Alta (necesita atribución fiable) | Alto | Depende del volumen | Alta |
| C. Pago por campaña | Media (concepto ya conocido) | Buena | Buena | Media | Medio-alto | Alto | Baja-media |
| D. Premium Analytics | Baja aislado | Bajo aislado | — | Media | Bajo aislado | — | — |
| E. CRM Premium | Baja aislado | Bajo aislado | — | Media | Bajo aislado | — | — |
| F. Promoción destacada | Alta (concepto validado) | Variable/estacional | Media | Baja | Alto | Alto | Media |
| G. SaaS + comisión combinado | Media (dos conceptos a explicar) | Alto y robusto | Alta | Alta | Medio | Alto | Media |
| H. Freemium + premium | Muy alta (barrera cero) | Bajo al inicio | Alta si convierte | Media | Muy alto | Variable | Alta |

D y E no funcionan como modelos aislados — son candidatos a **add-on** dentro de un plan superior, no un modelo por sí solos.

**Recomendación** (no una decisión — requiere aprobación):
- **Beta/V1**: **H (Freemium)** para conseguir los primeros Partners reales sin fricción de venta, combinado con **F (promoción destacada)** como primera fuente de ingresos de bajo riesgo técnico.
- **V1.1/V2**: evolución hacia **G (SaaS + comisión combinado)** una vez existan datos reales de ROI que enseñar al Partner para justificar un plan de pago recurrente — es el modelo más robusto a largo plazo, pero requiere ya tener la prueba social/datos que hoy no existen.

---

## 14. Pricing potencial

**No se fija ningún precio en este documento.** Referencia de mercado a investigar antes de decidir (fuera de alcance de este documento): planes de loyalty/CRM ligero para pequeño comercio suelen moverse en rangos de suscripción baja (decenas de euros/mes) más comisión variable de un solo dígito porcentual — cifra a validar con investigación de mercado real, no asumida aquí. **Decisión pendiente explícita** (ver sección 25).

---

## 15. Categorías iniciales — Barcelona

| Categoría | Frecuencia | Ticket medio | Facilidad de atribución | Facilidad de venta al negocio | Margen | Atractivo usuario | Potencial de Points |
|---|---|---|---|---|---|---|---|
| Restaurantes | Alta | Bajo-medio | Difícil sin OCR/QR | Alta (buscan volumen) | Bajo por transacción, alto en agregado | Alto (necesidad diaria) | Alto (frecuencia) |
| Cine | Media | Bajo | Fácil (venta de entrada) | Media (cadenas ya tienen loyalty propio; independientes mejor target) | Bajo | Medio-alto | Medio |
| Karting / experiencias | Baja | Alto | Fácil (reserva explícita) | Alta (alto valor por cliente) | Alto | Alto (aspiracional, encaja con "próximo viaje") | Alto |
| Ocio / bienestar | Media | Medio | Media | Media | Medio | Medio-alto | Medio |
| Comercios (retail) | Variable | Variable | Muy difícil sin POS | Baja-media | Variable | Medio | Bajo-medio |
| Hoteles | — | — | — | — | — | — | — |

Hoteles queda explícitamente fuera de esta comparación — depende de la resolución de Hotelbeds, no de esta fase.

**Recomendación**: empezar con **Restaurantes + Experiencias/Ocio** — restaurantes por frecuencia (sostiene el engagement diario), experiencias por ticket alto y máxima coherencia narrativa con "tu próximo viaje" (karting, escape rooms, actividades ya se sienten como mini-viajes). **Cine** como tercera categoría de expansión rápida y bajo riesgo operativo. **Comercios/retail y hoteles quedan fuera del MVP.**

---

## 16. UX — flujo completo del usuario

```
Usuario abre "Explorar"
      ↓
Ve categorías (Restaurantes, Experiencias, Cine...)
      ↓
Filtra / navega por categoría o ubicación
      ↓
Ve tarjeta de Partner: nombre, foto, categoría, Points estimados
      ↓
Entra a la mini-web del Partner (/partners/[slug])
      ↓
Ve oferta completa: productos, precios, promociones, horarios
      ↓
Inicia la actividad (mecanismo exacto según fase — ver MVP)
      ↓
Realiza la compra/reserva/visita en el mundo real
      ↓
Demuestra la actividad (validación manual en MVP, OCR/QR en fases futuras)
      ↓
Recibe Points (misma `rewards_transaction` de siempre)
      ↓
Vuelve a Home: ve su Goal progresar con el mismo saldo de Wallet
```

Ningún paso de este flujo introduce un concepto nuevo de UI no visto ya en VIAO — reutiliza el mismo lenguaje de Cards/Badges/Progress ya establecido.

---

## 17. Arquitectura conceptual

**Sin migraciones, sin código — solo diseño.** Evaluación de qué entidades son realmente necesarias frente a las propuestas:

| Entidad propuesta | ¿Necesaria en MVP? | Razonamiento |
|---|---|---|
| `partners` | Sí | Identidad mínima: nombre, slug, categoría, descripción, ubicación, contacto. |
| `partner_profiles` | No, por ahora | Fusionable con `partners` en MVP — separar antes de tener datos reales es sobre-normalizar. |
| `partner_products` | Sí, en versión mínima | Puede ser tan simple como una lista/JSON dentro de `partners` en el MVP más ajustado; tabla propia solo si se necesita edición estructurada real (V1). |
| `partner_locations` | No | Un Partner = una ubicación en MVP. Multi-ubicación es V1.1+. |
| `partner_campaigns` | No | V1. |
| `partner_offers` | No | V1 — posiblemente fusionable con `partner_campaigns`. |
| `partner_events` | No está claro que se necesite como entidad separada | Podría ser un tipo de `partner_offers` — decidir en V1, no ahora. |
| `partner_customers` | No | En MVP, "quién es cliente de qué Partner" se deriva directamente de `rewards_transactions` filtrado por un `partner_id` — sin tabla de relación separada. |
| `partner_transactions` | **Decisión de arquitectura real, ver abajo** | |
| `partner_receipts` | No | Ligada a OCR (sección 10) — V1.1/V2. |
| `partner_analytics` | Probablemente nunca como tabla dedicada | Derivable de `rewards_transactions` + `analytics_events` (ya existente) filtrados por Partner. |

### Decisión de arquitectura: ¿tabla nueva o reutilizar el ledger existente?

**Recomendación: reutilizar `rewards_transactions`** (el ledger ya existente, Patrón B: `service_role`, idempotencia real, kill-switches, RLS ya resuelto) añadiendo metadata (`partner_id`, un nuevo valor de `reason`, ej. `'partner_activity'`) en vez de crear `partner_transactions` como tabla paralela. Razón: `rewards_transactions` ya resuelve exactamente los problemas de seguridad/concurrencia/idempotencia que una tabla nueva tendría que reconstruir desde cero — es el mismo criterio que ya se aplicó a Missions (`complete_mission()` escribe al mismo ledger, no a uno propio). Una tabla `partner_transactions` separada solo se justificaría en V1+ si se necesita metadata mucho más rica (líneas de producto, IVA) que no tiene sentido meter en el ledger genérico — y en ese caso sería un complemento, nunca un sustituto del ledger central.

---

## 18. Integración con el sistema actual

```
Partner Activity (validada)
      ↓
rewards_transaction (reason='partner_activity', mismo Patrón B que ya usa Missions)
      ↓
rewards_wallets (view, SUM automático — sin cambios)
      ↓
Goal progress (calculateGoalProgressPercent — sin cambios, ya funciona:
               el progreso se deriva del wallet_balance total, sin
               importar de dónde vienen los Points)
```

Esta es la integración más limpia posible con lo ya construido: **ningún cambio de lógica en Goals/Rewards es necesario**. Partners solo necesita una nueva *fuente* que escriba al mismo ledger con un `reason` nuevo — exactamente el patrón que Missions ya validó.

**Missions**: ¿debería existir una Mission tipo "primera actividad con un Partner"? Candidato razonable para V1, pero `docs/VIAO_MVP_MASTER.md` fija explícitamente "Missions V1 mínima, sin ampliar" — cualquier Mission nueva de Partners requiere reabrir esa decisión explícitamente. **No asumida aquí — decisión pendiente (sección 25).**

**Search / Trips / Home**: sin cambios — Partners no es inventario de viaje, no compite con Search. Home podría, en el futuro, tener una sección "cerca de ti" o similar — no se añade en esta fase (Home Beta ya está cerrada).

---

## 19. Sidebar y navegación

Sidebar actual: Inicio, Mi objetivo, Explorar, Mi viaje, Wallet, Perfil.

**Recomendación**: "Explorar" (`/#travel` hoy) es el candidato natural para absorber Partners — evita una entrada nueva de Sidebar (ya se decidió activamente no inflar la navegación), y conceptualmente "Explorar" ya significa "descubre destinos + busca" — extenderlo a "descubre destinos + Partners + busca" es coherente con la etiqueta ya elegida, no un cambio de significado forzado. Cuando Partners tenga volumen suficiente para justificar una superficie propia, se podría reconsiderar una ruta/entrada dedicada (`/partners` como directorio) — eso sería una decisión de V1/V1.1, no de esta fase.

---

## 20. MVP realista

**Principio explícito: Partners NO se convierte en un segundo proyecto.** El MVP debe demostrar el loop completo con la menor superficie posible:

```
Partner (alta manual/curada, sin self-serve todavía)
    ↓
Mini-web pública (/partners/[slug])
    ↓
Usuario descubre (vía "Explorar")
    ↓
Usuario compra/consume en el mundo real
    ↓
Validación manual de la actividad (un operador de VIAO confirma —
    mismo criterio ya usado hoy para el catálogo de Rewards:
    "con 3-5 partners, gestión manual es más rápida que construir UI")
    ↓
rewards_transaction (reason='partner_activity') — reutiliza el ledger
    ↓
Wallet sube, Goal progresa — sin ningún cambio de lógica existente
    ↓
Partner ve un panel mínimo: cuántos clientes, cuántos Points entregados
```

### Explícitamente DENTRO del MVP
Mini-web pública por Partner (identidad + ubicación + oferta simple). Alta manual/curada de Partners (sin formulario self-serve). Lista simple de productos/servicios (texto, sin inventario ni disponibilidad). Validación manual de actividad — sin OCR, sin QR. Points vía el ledger ya existente, con un `reason` nuevo. Panel mínimo de solo lectura para el Partner (clientes totales, Points entregados).

### Explícitamente FUERA del MVP
OCR/recibos. QR/atribución automatizada. Dashboard completo (analytics, CRM, campañas). Self-serve signup. Facturación/pagos al Partner. Comisiones automatizadas. Cualquier automatización. Multi-ubicación. Segmentación de clientes.

---

## 21. Roadmap

| Fase | Funcionalidades | Objetivo | Dependencia | Valor usuario | Valor Partner | Valor VIAO | Complejidad |
|---|---|---|---|---|---|---|---|
| **Partners Beta** | Mini-web, alta manual, Points vía ledger existente, panel mínimo | Validar que el loop completo genera actividad real | Ninguna nueva (reutiliza Rewards) | Alto (nueva fuente de Points) | Medio (visibilidad + primeros datos) | Validación de tesis | Baja |
| **Partners V1** | Dashboard con analytics básico, clientes nuevos/recurrentes, promociones/campañas simples | Que el Partner perciba retorno medible | Volumen real de Beta | Medio (más categorías/Partners) | Alto (herramienta real) | Primeros ingresos (F/H) | Media |
| **Partners V1.1** | OCR piloto (1 Partner), fidelización propia del Partner, analytics con CAC/ROI | Reducir fricción de atribución, subir el valor del plan pago | Datos reales de V1 | Medio | Alto | Conversión a modelo G | Alta |
| **Partners V2** | CRM avanzado con segmentación, automatización de campañas, OCR escalado, multi-ubicación | Escalar sin escalar operación manual | V1.1 validado | Medio-alto | Muy alto | Ingreso recurrente maduro | Alta |

---

## 22. Métricas

**Disponibles en Beta** (todas derivables del ledger existente + eventos ya instrumentados, sin tablas nuevas): número de Partners activos, Points entregados vía Partners, número de actividades validadas, usuarios únicos que interactuaron con al menos un Partner.

**Futuras** (V1+): conversión visita→actividad, ticket medio, frecuencia de recurrencia por Partner, retención de clientes por Partner, CAC estimado, ROI estimado por categoría.

---

## 23. Riesgos

- **Fraude/abuso** (sección 10, 12) — el riesgo más alto técnicamente, mitigable con patrones ya probados en VIAO, pero requiere disciplina desde el primer Partner, no "ya lo arreglaremos después".
- **Venta B2B lenta**: convencer a negocios pequeños de invertir tiempo (aunque no dinero, en Beta) en dar de alta su Partner es un proceso de ventas real, no solo de producto — subestimarlo retrasaría la validación.
- **Canibalización de foco**: Partners es una superficie de producto grande; el riesgo explícito que este documento busca evitar es que se convierta en "otro proyecto" que descuide Home/Goal/Missions ya construidos.
- **Dependencia de validación manual**: el MVP escala mal por diseño (validación manual) — es una limitación aceptada a propósito para Beta, no un descuido.
- **Expectativa de Points→dinero**: como con Rewards, hay que mantener la disciplina ya establecida de comunicar Points como progreso, nunca como equivalencia monetaria, también en las mini-webs de Partners.

---

## 24. Decisiones

### Bloqueantes (antes de cualquier código de Partners)
1. Modelo de atribución del MVP: ¿validación manual desde el día uno (recomendado en este documento) o algún mecanismo semi-automático desde el principio?
2. ¿Reutilizar `rewards_transactions` (recomendado, sección 17) o construir un ledger paralelo para Partners?
3. Mecanismo de alta de los primeros Partners: manual/curado (recomendado) vs. self-serve desde el inicio.

### Importantes (antes de escalar más allá del primer Partner piloto)
4. Modelo económico definitivo entre los comparados en la sección 13 (o combinación).
5. Categorías de lanzamiento exactas (recomendación: Restaurantes + Experiencias, sección 15).
6. ¿Se reabre la política "Missions V1 mínima, sin ampliar" para incluir actividad de Partners?
7. Ruta canónica: `/partners/[slug]` vs. `/p/[slug]` (recomendación: `/partners/[slug]`, sección 6.1).
8. Diseño exacto del formulario de alta manual de Partner.

### Pueden esperar
9. OCR/recibos (piloto en V1.1 como muy pronto).
10. CRM completo con segmentación.
11. Campañas/promociones complejas.
12. Multi-ubicación por Partner.
13. Pricing definitivo (sección 14).
14. Cualquier automatización.

---

## 25. Checklist de implementación futura

*(Ninguno de estos pasos está autorizado por este documento — es la lista de qué habría que decidir/hacer, en orden, cuando se apruebe avanzar.)*

- [ ] Resolver las 3 decisiones bloqueantes (sección 24).
- [ ] Definir el esquema mínimo real de `partners` (columnas exactas) — en un documento de decisión aparte, no en este.
- [ ] Diseñar la migración de `rewards_transactions` (nuevo valor de `reason`, columna `partner_id` si aplica) — requiere su propia revisión de RLS/seguridad, igual que cada bloque anterior de VIAO.
- [ ] Elegir y dar de alta manualmente el primer Partner piloto (1, no varios).
- [ ] Construir la mini-web mínima (solo lectura, sin dashboard todavía).
- [ ] Construir el flujo de validación manual + escritura al ledger.
- [ ] Construir el panel mínimo de solo lectura del Partner.
- [ ] Validar el loop completo con datos reales antes de dar de alta un segundo Partner.
- [ ] Solo entonces, evaluar V1 (sección 21).

---

## 26. Propuesta comercial — ejemplos

### Restaurante en Barcelona

```
PROBLEMA DEL RESTAURANTE
  "Tengo buena comida pero dependo de que la gente ya me conozca.
   No sé qué campaña funciona ni cuántos clientes nuevos traigo."
        ↓
SOLUCIÓN VIAO
  Una página profesional gratuita + aparición en "Explorar" para
  usuarios que ya buscan experiencias, con Points reales por venir.
        ↓
QUÉ OBTIENE
  Visibilidad inmediata, sin coste, sin integración técnica.
        ↓
QUÉ VE EN EL DASHBOARD (Beta)
  Cuántos clientes de VIAO ha recibido, cuántos Points ha entregado.
        ↓
CÓMO CONSIGUE CLIENTES
  Usuarios de VIAO que buscan "dónde cenar" y ya están motivados
  por ganar Points hacia su próximo viaje.
        ↓
CÓMO FIDELIZA
  El propio sistema de Points ya incentiva la recurrencia sin que
  el restaurante tenga que construir nada.
        ↓
CÓMO MIDE RESULTADOS
  Cada actividad validada es una venta atribuida real, algo que
  hoy no puede afirmar de sus redes sociales.
        ↓
POR QUÉ PAGARÍA (a futuro, no en Beta)
  Porque ver el retorno real cambia la conversación de "otro gasto
  de marketing" a "esto sí funciona, quiero más visibilidad".
```

### Cine
Problema: salas medio vacías en días de semana. VIAO ofrece visibilidad dirigida a un público que busca planes, con Points que incentivan probar el cine independiente sobre la cadena grande. Mide qué días/franjas generan más actividad — algo que hoy no tienen sin sistema de venta digital propio.

### Karting / experiencia
Problema: alto coste de adquisición por cliente (marketing pagado caro para un ticket alto pero infrecuente). VIAO conecta con usuarios que ya tienen una motivación aspiracional ("mi próximo viaje/aventura"), coherente con el propio producto — el fit narrativo es más fuerte que en cualquier otra categoría. Mide conversión real de "interesado" a "reservó".

---

## Documentos relacionados

- `docs/VIAO_MVP_MASTER.md` — estado operativo global de VIAO (Partners aparece ahí como `[PENDIENTE]`).
- `docs/VIAO_V1_LOOP_DECISION.md` — origen de la co-financiación 50/50 y `POINTS_PERCENTAGE_OF_COMMISSION`.
- `lib/rewards/rules.ts` — constantes económicas ya vigentes, heredadas como punto de partida (no modificadas por este documento).

---

**Fin del documento. Ningún código, migración ni configuración de Supabase fue modificado para producir este análisis.**
