# VIAO — Auditoría Competitiva + Validación del Decision Lock

**Estado:** Documento de decisión — NO implementado. Investigación + auditoría crítica, no confirmación automática.
**Regla aplicada**: cada dato de competencia marcado como `CONFIRMADO` / `DECLARADO POR LA EMPRESA` / `ESTIMACIÓN` / `NO ENCONTRADO`.

---

## 1. Resumen ejecutivo

La investigación **cambia el mapa competitivo de forma material**. Loyapp no es un competidor pequeño y estancado — se declara con 20.000+ usuarios y 750+ comercios (dato de la empresa, no verificado de forma independiente, pero consistente con una app activa con actualizaciones recientes). Más importante: aparece **Silk** (Madrid, €770.000 de financiación confirmada por prensa financiera independiente), con un mecanismo de earning **automático vía open banking** (sin QR, sin fricción) y **ya asociado con Iberia** como partner de canje de viajes — es el competidor que más directamente amenaza el hueco específico que VIAO quiere ocupar ("gasto cotidiano → recompensa de viaje"), y lo hace con un producto técnicamente más frictionless que el diseño QR que VIAO tiene planeado.

Ningún competidor investigado (Loyapp, Silk, Lealy, GutXain, Booksy, Treatwell, TheFork, Travel Club) combina: earning local + Goal de viaje único + canje pooled + AI + Vision. Ese hueco sigue libre. Pero **ya no está vacío de competidores serios cerca de él** — está vacío en el centro exacto, con Silk avanzando desde un lado (financiado, frictionless, ya con Iberia) y Loyapp desde el otro (escala real en comercio local, aunque sin ángulo de viaje).

## 2. Loyapp — investigación profunda

| | Dato | Confianza |
|---|---|---|
| Fundadores | Silvia Romero Jarque (CEO) y Carlos Expósito, Barcelona | CONFIRMADO |
| Origen | Programa INICIA de Barcelona Activa (2021), incubación puntual, sin dependencia operativa actual | CONFIRMADO |
| Financiación | Ninguna ronda ni inversor identificado | NO ENCONTRADO |
| Equipo | 2-10 empleados (LinkedIn) | CONFIRMADO (rango amplio) |
| Actividad actual | App activa, actualizada mayo 2025 (consumidor) y julio 2026 (comercio) | CONFIRMADO |
| Cobertura de prensa reciente | Sin prensa independiente encontrada 2025-2026 | NO ENCONTRADO (gap, no prueba de declive) |

**Producto usuario**: QR (mostrado por el usuario, escaneado por el comercio) — **no OCR, no foto de ticket**. Canje automático al completar la tarjeta de sellos de **ese comercio concreto** — **rewards silados por comercio, sin bolsa común entre comercios**. Sin ángulo de viaje, sin AI, sin Vision — **confirmado ausente en los tres casos**. Sí tiene programa de referidos (€15 al referidor, 25% al comercio referido) — actualmente "en rediseño" según su propia web, contradice la suposición previa de que no existía.

**Producto comercio**: registro en minutos, sin contrato, planes €6-36/mes (gratis hasta 10 clientes). Precio muy bajo — un competidor real en la conversación de precio con cualquier comercio al que VIAO se acerque.

**Escala** (declarada por la empresa, cronología completa para mostrar la evolución real, no un único snapshot):

| Fecha | Usuarios | Comercios |
|---|---|---|
| Jul 2022 | 1.000+ | — |
| Mar 2023 | ~2.500 | 4 (piloto) |
| Ago 2023 | 4.000+ | 80 |
| **Hoy (web actual)** | **20.000+** | **750+** |

El dato de "80 comercios/4.000 usuarios" de la auditoría anterior tiene **casi dos años de antigüedad** — la cifra actual declarada es casi 10 veces mayor. Esto es una corrección importante a la baja de nuestra confianza previa en que Loyapp fuera un competidor menor.

## 3. Competencia Barcelona/España — hallazgo nuevo más relevante: Silk

| Empresa | Ciudad | Modelo | Financiación | Ángulo de viaje | Riesgo para VIAO |
|---|---|---|---|---|---|
| **Silk** | Madrid (expansión a Barcelona planeada) | **Automático vía open banking/tarjeta**, sin QR | **€770.000 confirmados** (prensa financiera independiente) | **Sí — Iberia como partner de canje confirmado** | 🔴 Alto — es quien más se parece a la tesis de VIAO, con más recursos y menos fricción de earning |
| Loyapp | Barcelona | QR, sellos por comercio | No encontrada | No | 🟠 Medio — escala real en comercio local, pero sin ángulo de viaje ni tecnología diferenciada |
| Lealy | Barcelona | Clon directo de Loyapp, MVP ene. 2025 | No encontrada | No | 🟡 Bajo-Medio — muy nuevo, sin tracción confirmada |
| GutXain | Valencia | Cashback multi-categoría | ~€205.000 (ENISA + seed) | No | 🟡 Bajo — actividad de prensa parada desde 2023 |
| Socios/FIU/Fidelizza/StampClub/Stampeo | Varias | Herramientas SaaS genéricas de tarjeta de sellos | No encontrada | No | 🟢 Muy bajo — productos, no competidores estratégicos |

**Silk es el hallazgo más importante de este bloque.** Su mecanismo (detección automática de gasto vía open banking) elimina exactamente la fricción que el diseño QR de VIAO todavía tiene (el usuario debe escanear activamente). Si Silk expande a Barcelona y añade más partners de viaje además de Iberia, ocuparía el hueco de VIAO con una ventaja técnica real.

## 4. Booksy / Treatwell / TheFork — actualización enfocada a VIAO

Sin repetir la investigación completa del bloque anterior. Lo específicamente aplicable:

- **Por qué acepta un comercio**: en los tres casos, porque la comisión es 0% en clientes repetidos (Booksy/Treatwell) o el coste del canje se comparte (TheFork) — nunca porque el comercio paga por "visibilidad" sin retorno medible.
- **Cómo demuestran ROI**: clientes nuevos atribuibles + tasa de repetición — exactamente la métrica ya propuesta para VIAO.
- **Qué aprender**: modelo de coste compartido en el canje (TheFork 50/50) — ya incorporado en el Decision Lock anterior.
- **Qué evitar**: comisión alta en la primera visita (Treatwell 35%+IVA) genera relación adversarial — reforzar la decisión de piloto gratuito.

## 5. Travel Club — ¿VIAO puede ser su versión moderna?

Sí, con matices. Travel Club prueba que el modelo de coalición (muchos comercios no relacionados financian una moneda de puntos común, canjeable en viajes) funciona en España desde hace años. Limitación real: experiencia de catálogo/vale, no app-nativa, sin gratificación instantánea. **La oportunidad de modernización sigue siendo real** — pero, tras esta investigación, **Silk ya está más cerca de ejecutarla con tecnología moderna (open banking) que Travel Club**, aunque Silk todavía no tiene un Goal de viaje único como mecánica central, solo un catálogo de canje con Iberia como una marca más.

## 6. Diferenciación de VIAO — evaluación honesta

**Hipótesis**: *"VIAO convierte el consumo cotidiano en progreso hacia experiencias y objetivos que el usuario realmente quiere conseguir. Para el Partner, VIAO convierte ese progreso en clientes nuevos y recurrencia medible."*

**Veredicto: 🟡 interesante pero insuficiente hoy — no 🟢.**

Razones: (1) no es todavía verificable — cero evidencia de que sea cierto para VIAO específicamente; (2) Travel Club ya prueba que la mecánica de coalición funciona sin que eso garantizara tracción masiva por sí sola — la ejecución/UX es la apuesta real, no la idea; (3) **Silk ya está ejecutando una versión de esta misma tesis, con financiación y menos fricción de earning** — la hipótesis sigue siendo defendible, pero ya no es un espacio vacío de competidores serios, es un espacio con un competidor financiado avanzando hacia el mismo punto desde una dirección técnica más fuerte.

## 7. El "moat" — análisis sin genericidades

| Posible ventaja | ¿Defendible hoy? | Por qué |
|---|---|---|
| Red de Partners | 🔴 No | Ningún comercio tiene exclusividad — un mismo comercio puede estar en VIAO, Loyapp y Silk a la vez, sin coste de cambio real |
| Datos de comportamiento | 🔴 No todavía | Solo se convierte en activo a escala real (miles de usuarios, meses de datos) — a 30-500 usuarios no es un moat, es un activo en formación |
| Goal de viaje único + Points pooled | 🟡 Parcial | Es la pieza más diferenciada frente a Loyapp (silos por comercio) — pero Silk ya se mueve hacia el mismo terreno con más recursos |
| VIAO Vision + AI | 🟡 Parcial | Genuinamente único hoy (nadie más lo combina) — pero no está claro que sea la razón por la que un usuario cambiaría de app |
| Switching cost del usuario | 🔴 No todavía | Solo aparece una vez que existan saldos de Points acumulados con sentido — hoy no hay coste real de abandonar VIAO |
| Efectos de red | 🔴 No | VIAO no es un marketplace clásico de dos lados con efectos de red fuertes — un comercio no gana más por tener más comercios vecinos en la app |

**Veredicto honesto: VIAO no tiene un moat real hoy.** Todo lo construido es replicable por un competidor bien financiado (Booking, TheFork, o el propio Silk) en semanas. El único camino a un moat real es la combinación sostenida en el tiempo (Goal de viaje + gasto local + datos acumulados + saldos con coste de abandono) — se gana con ejecución y tiempo, no existe todavía.

## 8. Economía competitiva

Confirmado y reforzado: el modelo de coste compartido (TheFork 50/50) sigue siendo el más trasladable. Loyapp demuestra que el precio de suscripción al comercio puede ser muy bajo (€6-36/mes) y aun así sostener 750+ comercios — esto **presiona a la baja** cualquier intento futuro de VIAO de cobrar más que eso a un comercio pequeño.

## 9. Goal audit — reconsideración crítica (Parte 11 del bloque)

**Decisión previa**: progreso = saldo actual del Wallet, capado al target. Canjear reduce el progreso visible.

**Análisis honesto, no defensa automática**:

Desde UX/psicología de objetivos, esto tiene un **problema real que subestimé en el documento anterior**: la literatura de "goal gradient effect" (Duolingo, millas aéreas, apps de fitness) muestra que las barras de progreso motivan precisamente porque *solo avanzan*. Una barra que puede **retroceder** cuando el usuario hace algo positivo (canjear un Reward, un momento de éxito) envía una señal contradictoria — se castiga visualmente una acción que se quiere fomentar. Los programas de loyalty clásicos (millas aéreas, estatus élite) mantienen **el estatus/progreso separado de la moneda gastable** exactamente para evitar este conflicto: no pierdes tu nivel élite por canjear millas.

**Riesgo concreto**: un usuario a 9.500/10.000 hacia Roma ve un buen Reward de Partner por 500 Points, lo canjea, y ve su progreso caer un 5% — esto puede generar **atesoramiento de Points** (el usuario deja de canjear para no "perder" progreso), lo cual **socava directamente el Bloque 4 (Partners)**, cuya propuesta de valor depende de que los usuarios canjeen con frecuencia para generar recurrencia real en el comercio.

**Corrección propuesta**: el progreso del Goal debe calcularse como **puntos ganados acumulados desde la creación del Goal** (un contador que solo avanza), no el saldo neto actual — sin crear un segundo ledger: basta con guardar `points_at_goal_creation` en la fila de `goals` y sumar las transacciones de tipo `earned` posteriores. El Wallet (saldo gastable real) se sigue mostrando por separado, honestamente, y puede ser menor que el "progreso" — la distinción entre "lo que has ganado hacia tu objetivo" y "lo que tienes disponible ahora" es clara y evita el efecto desmotivador.

**Clasificación: 🟡 APROBAR CON CAMBIO** — no se rechaza la mecánica de fondo (fungibilidad de Points), se corrige el cálculo de progreso.

## 10. Rewards / Partner audit — resto del Decision Lock

| # | Decisión | Veredicto | Riesgo | Alternativa | Coste de cambiar después |
|---|---|---|---|---|---|
| 1 | Goals: single, wallet-based | 🟡 APROBAR CON CAMBIO | Ver sección 9 | Progreso = acumulado desde creación | Bajo (un campo + query distinta) |
| 2 | Rewards: catálogo 10-20, canje real | 🟢 APROBAR | Ninguno significativo | — | Bajo |
| 3 | Partners: piloto 3-5, gratis | 🟢 APROBAR | Si los 5 son de una sola categoría, el aprendizaje no generaliza | Exigir diversidad mínima (barbería + cafetería + restaurante) | Bajo |
| 4 | QR con token rotativo diario | 🟡 APROBAR CON CAMBIO | Depende de que alguien entregue el código nuevo cada día manualmente — un fallo humano rompe la confianza del Partner el día 1 | Automatizar el envío diario (mensaje programado simple) | Bajo, pequeña adición al Bloque 4 |
| 5 | Sin Partner Dashboard | 🟢 APROBAR para el piloto, con umbral explícito | Sin decir en qué momento deja de ser sostenible | Fijar el umbral: revisar en cuanto se superen ~8-15 partners | — |
| 6 | Scan/OCR diferido | 🟢 APROBAR | Ninguno nuevo | — | — |
| 7 | Flights solo investigar | 🟢 APROBAR | Reforzado por la investigación previa (Amadeus cerrado, más complejo que Hotelbeds) | — | — |
| 8 | Hotelbeds congelado | 🟢 APROBAR | Sin cambios | — | — |
| 9 | Dream Trip diferido | 🟢 APROBAR | Reforzado por hallazgo legal previo | — | — |
| 10 | Premium no todavía | 🟢 APROBAR | Ninguno | — | — |

## 11. Partners antes o después de Missions

Confirmado: el orden ya definido en el documento anterior (Rewards → Goals → **Missions** → **Partners**) era correcto y esta investigación lo refuerza, no lo contradice. Razón reforzada por los nuevos hallazgos: Missions no depende de ningún tercero externo y permite validar el loop completo (Goal→ganar→canjear→volver) con los primeros 30 usuarios usando solo lo que ya existe en código — generando evidencia real ("ya tenemos usuarios activos que vuelven") antes de negociar con comercios, que es exactamente el argumento de venta que Booksy/TheFork usan con éxito frente a un comercio escéptico. Ir a Partners sin esa evidencia previa debilita el pitch de la sección 14 (Venta al Partner).

## 12. Tráfico / GTM — actualización

Sin cambio de canal recomendado (Barcelona Activa + asociaciones de comerciantes + referidos). **Matiz nuevo importante**: dado que Loyapp también nació de Barcelona Activa/INICIA y hoy declara 750+ comercios, **es probable que algunos comercios objetivo de VIAO ya conozcan o usen Loyapp** — el pitch de venta al Partner (sección 14) debe anticipar explícitamente la pregunta "¿en qué te diferencias de Loyapp?", no solo de Booksy.

## 13. Venta al Partner — pitch actualizado

| Pregunta | Respuesta |
|---|---|
| ¿Qué gana? | Clientes nuevos atribuibles + recurrencia medible, sin coste hasta demostrarlo |
| ¿Qué le cuesta? | 0€ en el piloto; después, coste compartido solo sobre lo que él mismo regala |
| ¿Qué riesgo tiene? | Mínimo — sin contrato, sin coste por adelantado |
| ¿Cómo sabe si funciona? | Visitas nuevas vs. repetidas atribuibles a VIAO, reportado directamente (sin dashboard, manual en el piloto) |
| ¿Por qué no Booksy? | Booksy cobra desde el primer mes y hasta 30% de la primera visita — VIAO no cobra en el piloto |
| ¿Por qué no Loyapp? | Loyapp fideliza solo dentro de SU propio comercio (sellos silados); VIAO conecta esa visita con un objetivo de viaje del cliente — motivo de vuelta más fuerte que un café gratis aislado |
| ¿Por qué no su propio programa? | Un programa propio no llega a usuarios de otros comercios ni se beneficia de que el cliente esté persiguiendo un objetivo mayor (el viaje) que le da una razón de volver más allá de ese comercio |

## 14. VIAO vs. Loyapp — tabla final

| | Loyapp | VIAO |
|---|---|---|
| Comercio local | 🟢 Sí, 750+ comercios (declarado) | 🔵 3-5 en piloto |
| Loyalty | 🟢 Sí | 🟢 Sí |
| Points | 🟢 Sí, por sello | 🟢 Sí, pooled |
| Rewards | 🟢 Sí, silados por comercio | 🔵 Catálogo cruzado, en construcción |
| Goals | 🔴 No existe | 🔵 Núcleo del producto |
| QR | 🟢 Sí | 🔵 Planeado |
| Travel | 🔴 No | 🟢 Ya integrado (Hotelbeds) |
| Hotels | 🔴 No | 🟡 Bloqueado externamente, arquitectura lista |
| Experiences | 🔴 No | ⚪ Futuro |
| AI | 🔴 No | 🟢 Ya real (VIAO AI) |
| Vision | 🔴 No | 🟢 Ya real, lo más diferenciado del proyecto |
| Partner economics | 🟢 Suscripción €6-36/mes, escala probada | 🔵 Piloto gratis, sin validar |
| User motivation | 🟡 Sellos por comercio, motivación local | 🟡 Objetivo de viaje — más ambicioso, sin validar |
| Recurring use | 🟢 75%+ recurrencia declarada | 🔵 Sin datos todavía |
| Monetización | 🟢 Real, funcionando (suscripción comercio) | 🔴 Ninguna hoy |
| Moat | 🟡 Escala + coste bajo | 🔴 Ninguno todavía (sección 7) |

### ¿Dónde gana VIAO?
Travel, Hotels, AI, Vision, Goals — la combinación completa no existe en ningún competidor investigado.

### ¿Dónde gana Loyapp?
Escala real de comercios y usuarios, monetización ya funcionando, recurrencia ya demostrada con datos propios — todo lo que VIAO todavía no tiene.

### ¿Dónde no tenemos ninguna ventaja?
Moat, precio al comercio (Loyapp ya opera más barato y a más escala), earning sin fricción (Silk ya es más frictionless que el QR planeado).

### ¿Qué debemos cambiar?
El diseño de Goal (sección 9), y anticipar explícitamente la comparación con Loyapp en el discurso comercial (sección 13) — no asumir que el hueco está vacío de competencia cercana.

## 15. Riesgos

🔴 **Críticos (nuevos o reforzados por esta investigación)**: Silk — competidor financiado, frictionless, ya con Iberia como partner de viaje, expansión a Barcelona planeada; ausencia total de moat propio hoy.

🔴 **Ya conocidos, reforzados**: el loop sigue roto en Goals+Rewards; economía de Hotelbeds bloqueada externamente.

🟠 **Importantes**: Loyapp mucho más grande de lo estimado (750+ comercios) — el mismo canal de adquisición (Barcelona Activa) puede llevar a comercios que ya conocen/usan Loyapp; precio de referencia del mercado (€6-36/mes) presiona a la baja cualquier futura monetización de Partners.

🟡 **Controlables**: diseño de progreso de Goal desmotivador (corregible, sección 9); dependencia manual del token QR diario (corregible, automatizar).

🟢 **Ventajas reales confirmadas**: combinación única de Travel+AI+Vision+Goals que ningún competidor investigado tiene; Silk y Loyapp validan por separado que las dos mitades de la tesis de VIAO (loyalty local y redención en viajes) funcionan como negocio — nadie las ha unido todavía con la ejecución que VIAO puede construir.

## 16. Oportunidades

- El hueco central (Goal de viaje + Points pooled cross-comercio + AI/Vision) sigue vacío — pero hay que ocuparlo con velocidad de ejecución real, no solo con la idea.
- Silk ya prueba comercialmente que "Points cotidianos → recompensa de viaje" atrae inversión y partners de marca — es validación externa de la tesis, no solo un riesgo.
- Loyapp prueba que un comercio pequeño en Barcelona SÍ acepta pagar por fidelización digital una vez ve resultados — la conversación comercial con Partners es más fácil de lo que parecía, el terreno ya está educado.

## 17. Decisión final

### A. ¿Debemos seguir con VIAO?
**Sí.**

### B. ¿La estrategia actual es correcta?
**Sí, con un cambio**: corregir el cálculo de progreso del Goal (sección 9) antes de construirlo.

### C. ¿Qué debe construirse primero? (máximo 3)
1. Rewards (catálogo + canje real).
2. Goals (con el cálculo de progreso corregido).
3. Missions mínimas — antes que Partners, tal como ya estaba decidido y esta investigación reafirma.

### D. ¿Qué NO debemos construir?
Partner Dashboard en el piloto, Scan/OCR, Flights, Admin, Premium, Dream Trip, streak diario, sub-ledger separado para Goals — todo lo ya descartado en el documento anterior, sin cambios.

### E. ¿Qué debemos validar con usuarios?
Si canjear un Reward reduce o no la motivación real (más allá del cálculo corregido, observar comportamiento real); si un único Goal de viaje genera vueltas semanales sin Partners todavía activos.

### F. ¿Qué debemos validar con Partners?
Si el discurso "no somos Loyapp, conectamos tu visita con el objetivo de viaje del cliente" convence realmente a un comercio pequeño frente a la opción, ya conocida y barata, de simplemente usar Loyapp.

### G. ¿Cuál es nuestro principal riesgo?
**Silk** — un competidor financiado, técnicamente más frictionless, ya con un partner de viaje real (Iberia), moviéndose hacia el mismo hueco que VIAO quiere ocupar, con más recursos para llegar primero a escala.

### H. ¿Cuál es nuestra mayor oportunidad?
Nadie combina todavía Travel + AI + Vision + Goals de viaje en un mismo producto — Silk tiene el earning frictionless pero no Goals/AI/Vision; Loyapp tiene escala local pero no viaje; VIAO es la única pieza que junta ambas mitades con tecnología ya construida. La ventana existe, pero no es indefinida.

## Recomendación de los próximos 3 bloques

1. **Bloque 1 (Rewards) + corrección del diseño de Goal** — implementar ambos juntos, ya que la corrección de la sección 9 afecta directamente cómo se construye Goals a continuación.
2. **Bloque 2 (Goals, con progreso corregido) + Bloque 3 (Missions mínimas)** — validar el loop completo con los primeros usuarios reales antes de tocar Partners.
3. **Bloque 4 (Partners piloto)** — solo tras tener evidencia real de Bloques 1-3, y con el discurso comercial de la sección 13 ya preparado para la comparación directa con Loyapp.

---

Sin cambios de código, sin migraciones, sin commits en este bloque. A la espera de revisión y aprobación conjunta.
