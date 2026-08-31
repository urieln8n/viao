---
STATUS: EVIDENCE
ERA: Partners V2 — auditoría 360º independiente (pre-decisión)
DOMAIN: Producto / Negocio / Legal / Competencia
AUTHORITY: Documento de investigación y validación. NO es un Decision Lock, NO modifica L12, NO autoriza implementación. Cada afirmación está etiquetada FACT / HYPOTHESIS / ASSUMPTION / UNKNOWN / INFERENCE / RECOMMENDATION (producto/negocio) o CONFIRMADO / PROBABLE / POSIBLE / UNKNOWN / REQUIERE ABOGADO (legal), conforme al principio 3 de docs/00_GOVERNANCE.md.
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-26
---

# VIAO — 360º BUSINESS / PRODUCT / LEGAL / COMPETITIVE AUDIT

## 1. Executive Summary

Esta auditoría evalúa, de forma independiente y adversarial, si la visión estratégica actual de VIAO (Goals+Points+Rewards+Missions+Partners, inspirada en principios de retención de Duolingo, con una hipótesis de Reward parcial cross-Partner) tiene sentido de producto, potencial económico, viabilidad legal y defensibilidad competitiva.

**Conclusión adelantada** (desarrollada en la sección 20): **GO WITH CONDITIONS** para el núcleo de la visión (loop de hábito Partner-específico + Duolingo-inspired mechanics), **INSUFFICIENT EVIDENCE / NO-GO todavía** para la variante cross-Partner específicamente — no solo por el precedente de mercado ya investigado (Plenti, V2-F1), sino por un hallazgo **nuevo e independiente** de esta auditoría: el modelo cross-Partner interactúa directamente con la exclusión de "red limitada" del derecho de pagos de la UE (PSD2, Art. 3(k)) — cuanto más abierta y numerosa sea la red de canje, mayor el riesgo de que los Points dejen de calificar como programa de fidelización exento y pasen a tratarse como instrumento de pago regulado. Esta es una línea de evidencia distinta a la ya recogida en V2-F1/F2 (que era económica/de mercado), y apunta en la misma dirección de cautela.

## 2. Current Strategic Thesis

`FACT` (verificado contra el propio prompt de esta fase y contra `docs/01_CURRENT/product/VIAO_MASTER_PRODUCT_CONTEXT.md`): VIAO combina Goals (ancla personal), Points (unidad de progreso, no dinero), Rewards (beneficio tangible), Missions (motor de hábito genérico) y Partners (generador de actividad económica real). `HYPOTHESIS`: los Points ganados en un Partner podrían contribuir parcialmente a un Reward asociado a otro Partner. `FACT`: Travel/Hotels permanece `FROZEN`, no se reintroduce en ningún punto de este documento.

## 3. Duolingo Audit

*Fuentes: [Duolingo Q1 FY2026 Shareholder Letter — SEC](https://www.sec.gov/Archives/edgar/data/1562088/000162828026029790/q1fy26duolingo3-31x26share.htm), [Q4 FY2024 Shareholder Letter — SEC](https://www.sec.gov/Archives/edgar/data/1562088/000156208825000039/q4fy24duolingo12-31x24shar.htm), [Duolingo 10-K 2026 — investor relations](https://investors.duolingo.com/static-files/f19d76fb-dee4-4f13-96ae-138ebfd0f2d3), [The Psychology of the Streak — Medium](https://medium.com/@deekshitha_seeramdas/the-psychology-of-the-streak-why-duolingo-wins-an-aspiring-pms-breakdown-d8839ad34f4d), [StriveCloud — Duolingo gamification](https://www.strivecloud.io/duolingo-gamification-explained)*

**Datos financieros/de producto (`FACT`, con fuente)**: 52,7M DAU y 133M MAU al cierre de 2025; ratio DAU/MAU de 41,0% en Q1 2026 (frente al 10-15% típico de apps educativas); más de 10M de usuarios con rachas de 1 año o más; un tercio de los DAU tiene "Friend Streak"; más de la mitad de los usuarios diarios tiene una racha de ≥7 días. Usuarios con racha de 7 días son 2,4x más propensos a volver al día siguiente que usuarios sin racha (`FACT`, mismo origen).

**Mecanismo psicológico central (`FACT`, citando literatura de referencia — Kahneman, BJ Fogg)**: el streak funciona por **aversión a la pérdida** (perder algo duele ~2x más de lo que gratifica ganarlo) — no por la satisfacción de ganar, sino por el miedo a perder lo ya acumulado. StriveCloud reporta (fuente secundaria, no verificada de forma independiente) que el streak elevó la retención de 12% a 55% — cifra de un proveedor comercial de gamificación, tratada aquí como `PROBABLE`, no `FACT`, por ser marketing de un tercero con interés en el resultado.

**Diferenciar mecanismos universales de mecanismos específicos de educación**:

| Mecanismo | Universal (transferible) | Específico de educación |
|---|---|---|
| Streak (aversión a pérdida) | Sí, en principio | La frecuencia "diaria" es natural para estudiar 5 min; no lo es para visitar una barbería — `INFERENCE`, ya identificado en Bloque 4/5 de esta sesión |
| XP como progreso interno sin promesa económica | Sí | — |
| Leagues (comparación social semanal) | Parcialmente | Requiere una base de usuarios activos suficientemente grande y homogénea — `UNKNOWN` si VIAO la tendrá en Beta |
| Notificaciones de recuperación | Sí | — |
| Dificultad progresiva (lecciones más difíciles) | No aplica de forma directa | Es específico de una curva de aprendizaje; VIAO no tiene un equivalente natural salvo umbrales de hito ajustables (`HYPOTHESIS`, no diseñado) |
| Free-to-paid (Plus/Max) | Sí, como principio de negocio | El contenido premium específico (sin anuncios, práctica ilimitada) no traslada — VIAO necesitaría su propio gancho premium, `UNKNOWN` |

**¿Puede VIAO crear un loop equivalente?** `INFERENCE`, no `FACT`: los mecanismos de aversión a la pérdida y progreso visible son transferibles en principio, pero **la condición que los hace funcionar en Duolingo — una acción de coste casi cero (5 minutos, gratis, en cualquier momento) — no se cumple igual en VIAO**, donde la "acción" (visitar un comercio, gastar dinero real) tiene fricción y coste real por diseño. Esto limita la fuerza con la que el streak puede aplicarse sin generar presión de consumo indeseada — riesgo no resuelto en este documento, señalado como `UNKNOWN` de diseño.

## 4. Product Loop Audit

El loop `ACTIVIDAD → POINTS → GOAL → MISSION → REWARD → RETURN` **es, término por término, el mismo ya definido y evaluado como Hipótesis H en V2-F3/V2-F4** (`FACT`, verificable contra esos documentos de esta misma sesión) — estado `YELLOW`: precedente de mercado real (Fivestars) que confirma que no es estructuralmente inviable, pero sin validación a la escala de VIAO. No se reevalúa desde cero; se hereda esa clasificación.

## 5. Cross-Partner Audit (intento de falsación)

| Pregunta | Respuesta | Etiqueta |
|---|---|---|
| A. ¿Por qué el usuario querría esto? | Mayor utilidad percibida de sus Points, más opciones de destino — pero condicionado a que exista contenido real (Rewards reales) en ambos Partners | `HYPOTHESIS` |
| B. Valor para Partner B | Adquisición potencial de un cliente que nunca le generó actividad — no demostrado a la escala de VIAO (V2-F1) | `HYPOTHESIS`, `UNKNOWN` su magnitud |
| C. Valor para Partner A | Ninguno directo — A no recibe nada por que su usuario gaste en B | `INFERENCE` |
| D. Valor para VIAO | Narrativa de red más fuerte, mayor complejidad y riesgo regulatorio (sección 15) | `INFERENCE` |
| E. ¿Quién financia el Reward? | Ambiguo por diseño — Partner A, Partner B, o VIAO, según la variante (ver V2-F5/sección E-F de esa fase) | `OPEN` |
| F. ¿Quién asume el coste? | El financiador — sin settlement diseñado hoy entre Partners | `FACT` (ausencia confirmada de mecanismo) |
| G. A genera mucha actividad, B recibe muchos canjes | Free-riding económico — A subsidia, B se beneficia sin reciprocidad | `INFERENCE`, ya documentado en V2-F1/F2 |
| H. Al revés | B sin canjes, sin coste — pero también sin el beneficio de adquisición prometido | `INFERENCE` |
| I. ¿Puede existir free-riding? | Sí, confirmado conceptualmente y con precedente de mercado (Plenti) | `HYPOTHESIS` respaldada por evidencia previa |
| J. ¿Coste del Reward pequeño frente a valor incremental? | Posible en teoría (Reward parcial reduce la exposición), pero no elimina el riesgo estructural (V2-F5, sección E-F) | `HYPOTHESIS` |
| K. ¿Tráfico nuevo compensa el coste? | `UNKNOWN` — sin datos de conversión real a la escala de VIAO |
| L. ¿Incentivos racionales para todos? | Solo si el settlement es proporcional al valor aportado (principio académico de Stanford GSB, ya citado en V2-F1) — no diseñado | `HYPOTHESIS` |
| M. Partners pequeños | Mayor vulnerabilidad al free-riding (menos margen para subsidiar) | `INFERENCE` |
| N. Partners grandes | Menor incentivo a participar si ya tienen su propio programa — precedente Macy's/AT&T saliendo de Plenti | `EVIDENCE` (V2-F1) |
| O. Verticales de frecuencia distinta | Café (alta) vs. barbería (baja) generan desequilibrio estructural de actividad, agravando G | `EVIDENCE` (ya identificado en Bloque 4/5 y V2-F2) |

**Conclusión de la falsación**: no se encuentra ningún elemento que invalide por completo el modelo, pero tampoco ninguno nuevo que lo valide — se confirma, con matices, la misma conclusión ya alcanzada en V2-F1/F2.

## 6. Modelo 1 vs. Modelo 2 — "Behavioral Loyalty Network"

**Modelo 1 (Coalition Loyalty clásico)**: Points fungibles + settlement financiero real entre Partners — PAYBACK, Nectar, Plenti (V2-F1).
**Modelo 2 (VIAO propuesto)**: Points como progreso + Rewards parcialmente controlados + adquisición + descubrimiento + software — no es lo mismo estructuralmente.

**¿Existe una tercera categoría, "Behavioral Loyalty Network"?** `INFERENCE`, no confirmada por ninguna fuente externa como categoría reconocida de la industria — no se encontró ese término usado formalmente en ninguna búsqueda de esta sesión (V2-F1, V2-F4, esta auditoría). Es una etiqueta interna útil para describir la combinación específica de VIAO (progreso no-fungible + descubrimiento + herramientas de gestión), **pero no debe presentarse como una categoría de mercado ya validada** — sería una afirmación sin evidencia. Se mantiene como `HYPOTHESIS de nomenclatura interna`, no como hecho de mercado.

**¿VIAO necesita comportarse como coalition loyalty clásica?** `INFERENCE`: no — el Modelo A (Partner-specific) ya demostró, en V2-F2, mayor solidez económica sin necesitar ningún settlement cross-Partner. La pregunta relevante no es "¿coalition sí o no?" sino "¿cuánta de la variante cross-Partner (si alguna) es indispensable para el valor de red, frente a lo que ya aporta el Modelo A + Discovery (H)?" — sin resolver.

## 7-8. Partner Economics / User Economics / VIAO Economics — Economía unitaria

Variables conceptuales (sin inventar cifras de mercado, `UNKNOWN` donde no hay dato):

```
Partner activity → Points issued → redemption rate (UNKNOWN) → Reward cost →
incremental visits (UNKNOWN) → incremental revenue (UNKNOWN) →
Partner contribution → VIAO cost → Partner monthly fee
```

| Escala (nº Partners) | LOW | BASE | HIGH |
|---|---|---|---|
| 3 | Concentración extrema de actividad esperable (ya analizado en V2-F2, Fase 8) | Igual | Igual — la escala no cambia el riesgo estructural a este nivel |
| 5-10 | Riesgo de concentración algo menor, sin evidencia de mercado a esta escala (V2-F1) | — | — |
| 20-50 | Empieza a acercarse al límite inferior de coaliciones documentadas, sigue órdenes de magnitud por debajo de PAYBACK/Nectar | — | — |
| 100-1000 | Fuera de cualquier horizonte de Beta — especulativo, `UNKNOWN` total | — | — |

**Condición mínima para que un Partner diga "me compensa estar en VIAO"** (`INFERENCE`, no dato): que el valor medible en su propio Dashboard (clientes nuevos/recurrentes, PB6, ya `LOCKED`) supere, de forma perceptible, el coste de los Rewards que financia — condición ya definida cualitativamente en `VIAO_PARTNERS_MASTER_V2.md` §5 ("test de 5 preguntas de negocio"), no cuantificada aquí por falta de datos reales.

## 9. Competition (investigación nueva + reutilizada, señalada como tal)

**Reutilizada** (V2-F1: Plenti, PAYBACK, Nectar, Puntos Colombia, Air Miles, Dotz; V2-F4: Fivestars, Stocard, Groupon, Rakuten/Honey, Cardlytics/Empyr) — no repetida aquí.

**Nueva en este bloque**: ninguna búsqueda adicional de competidores fue necesaria más allá de lo ya cubierto — la combinación de casos ya investigados (coalition clásico, discovery+loyalty separado, card-linked offers merchant-funded) cubre el espacio conceptual relevante para esta pregunta. Señalado explícitamente para no simular una investigación que no se hizo.

## 10. Network Effect — auditoría crítica

**Distinción exigida**:
- **Network effect (fuerte/liquidez)**: cada participante adicional aumenta el valor económico de los ya existentes (ej. una moneda fungible, un marketplace de dos lados).
- **Aggregation / discovery**: el valor crece por mayor superficie de contenido/opciones, sin que el valor económico de las relaciones existentes cambie.
- **Marketplace effect**: dos lados (usuarios y Partners) se benefician mutuamente de la escala del otro lado — condicional a que ambos lados crezcan.

**¿VIAO tiene network effect real?** `INFERENCE`, ya fundamentada en V2-F3 (sección B): **no en el sentido fuerte**. Es un efecto de agregación/discovery — cada Partner adicional añade "inventario" (más opciones de descubrimiento), pero **no aumenta el valor económico** de la relación que un usuario ya tiene con los Partners 1..N-1, porque no hay moneda fungible entre ellos bajo el Modelo A. El cross-Partner (Modelo 2/variante b) **sí** introduciría un componente de efecto de red más fuerte (cada Partner nuevo aumenta la utilidad de los Points ya ganados en cualquier otro) — **pero es exactamente esa propiedad la que reactiva el riesgo económico (V2-F1/F2) y el riesgo regulatorio (sección 15) simultáneamente**. No hay forma de obtener el efecto de red fuerte sin asumir esos dos riesgos a la vez — hallazgo central de esta auditoría.

1→3→5→10→20→50→100: bajo Modelo A, el valor crece linealmente (suma de relaciones independientes); bajo Modelo 2, crecería de forma más que lineal en teoría, pero sin ningún caso de mercado que lo confirme a esta escala (V2-F1).

## 11. Fraude y abuso

*Fuente: [Accertify — Inside Loyalty Fraud 2.0](https://www.accertify.com/resource/inside-loyalty-fraud-2-0-the-growing-threat-to-airline-retail-and-hotel-rewards-systems/), [F5 — Protecting Loyalty Point Programs](https://www.f5.com/company/blog/protecting-loyalty-point-programs-fraud-5-key-tips)*

`FACT` (industria general, no específico de VIAO): los tres vectores de ataque dominantes en programas de loyalty son (1) farming de cuentas falsas, (2) account takeover (ATO, 48% de empresas afectadas según una fuente citada, coste >$2.300M globalmente), (3) explotación de cuentas inactivas con saldo acumulado sin vigilancia.

| Control | ¿Imprescindible para Beta? |
|---|---|
| Límite diario/mensual por (usuario, Partner) | Sí — **ya implementado** (P3/P4, `LOCKED`) |
| Idempotencia de actividad (`attempt_id`) | Sí — **ya implementado** |
| Confirmación del Partner (no autodeclaración del usuario) | Sí — **ya implementado** (PMM3) |
| MFA en el login del usuario | Puede esperar — Beta de 3-5 Partners, bajo volumen |
| Monitorización de cuentas inactivas con saldo alto | Puede esperar a Beta posterior — bajo volumen esperado |
| Detección de colusión Partner-usuario | No resuelto en ningún bloque anterior — `OPEN`, riesgo aceptado explícitamente ya en Master V2 §14 |

## 12-15. Legal Spain/EU — clasificación regulatoria, GDPR, protección al consumidor

*Fuentes: [PSD2, Directive 2015/2366, Art. 3(k) — vía LCA Studio Legale/EBA](https://www.lcalex.it/en/psd2-e-strumenti-a-spendibilita-limitata/), [EBA Guidelines on limited network exclusion (EBA/GL/2022/02) — Banco de España](https://www.bde.es/f/webbde/INF/MenuHorizontal/Normativa/guias/EBA-GL-2022-02-EN.pdf), [EU Vouchers Directive 2016/1065 — EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32016L1065), [Unfair Commercial Practices Directive 2005/29/EC — European Commission](https://commission.europa.eu/law/law-topic/consumer-protection-law/unfair-commercial-practices-and-price-indication/unfair-commercial-practices-directive_en), [AEPD enforcement — Amadeus case, Data Protection Report](https://www.dataprotectionreport.com/2026/06/record-e18m-fine-for-amadeus-from-spanish-data-protection-agency-for-gdpr-violations-related-to-use-of-traveller-data-without-consent/), [DSA scope and SME exemptions — Trolley/ACT Online](https://trolley.com/learning-center/how-are-online-marketplaces-impacted-by-the-dsa/), [Ley General para la Defensa de los Consumidores y Usuarios — BOE](https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555)*

**HALLAZGO CENTRAL DE ESTA AUDITORÍA — clasificación bajo PSD2**: el texto exacto del Artículo 3(k) de PSD2 (Directiva 2015/2366) exime del régimen de servicios de pago a los *"instrumentos que permiten al titular adquirir bienes o servicios únicamente en las instalaciones del emisor o dentro de una red limitada de proveedores de servicios en virtud de un acuerdo comercial directo con un emisor profesional"* — la llamada **"exclusión de red limitada"**. Las Guías EBA de 2022 (EBA/GL/2022/02) existen precisamente para determinar cuándo una red deja de ser "limitada" (evaluando, entre otros factores, el número de proveedores, la sustituibilidad de los bienes/servicios, y el alcance geográfico).

| Escenario | Clasificación probable | Etiqueta |
|---|---|---|
| Modelo A (Partner-specific, Reward solo en el mismo Partner) | Encaja con claridad en la exclusión de red limitada — un solo emisor/proveedor | `PROBABLE` (bajo riesgo) |
| Modelo 2 variante cross-Partner con pocos Partners curados manualmente (3-5, Beta) | Probablemente sigue dentro de la exclusión ("red limitada" bajo acuerdo comercial directo con cada Partner) | `PROBABLE`, pero **no CONFIRMADO** — depende del diseño exacto |
| Cross-Partner a escala creciente (10, 20, 50+ Partners, categorías variadas) | Riesgo creciente de que la red deje de considerarse "limitada" bajo las Guías EBA, acercándose al perfil de un instrumento de pago general que requeriría licencia de entidad de pago/dinero electrónico | `POSIBLE`, **REQUIERE ABOGADO** para una determinación exacta |

**Esta es la razón por la que el riesgo de cross-Partner no es solo económico — crece exactamente en la misma dirección (más Partners, más apertura) tanto el riesgo de mercado ya documentado (V2-F1) como el riesgo regulatorio aquí identificado.**

| Punto del prompt | Respuesta | Etiqueta |
|---|---|---|
| A. Points = e-money/instrumento de pago | Bajo Modelo A: no. Bajo cross-Partner creciente: riesgo aumenta | `PROBABLE` / `POSIBLE` según modelo |
| B. Cross-Partner cambia la clasificación | Sí | `PROBABLE` |
| C. Rewards = promoción/fidelización | Sí, sujeto a la Directiva de Prácticas Comerciales Desleales (2005/29/CE) | `CONFIRMADO` |
| D. Expiración de Points | Riesgo real: en España, vales/bonos/tarjetas-regalo **no pueden tener fecha de caducidad** (nota de la Junta de Andalucía citando el TRLGDCU, arts. 87.5/87.6) — si un Point/Reward se asimila legalmente a un vale, la caducidad sería cláusula abusiva | `PROBABLE`, calificación exacta `REQUIERE ABOGADO` |
| E. Reembolsos/devoluciones | Sin mecanismo legal ni técnico definido para reversión tras devolución de compra | `UNKNOWN` |
| F. Protección del consumidor (general) | Aplica en su totalidad (TRLGDCU, UCPD) | `CONFIRMADO` |
| G. Transparencia de condiciones | Exigencia general aplicable | `CONFIRMADO` |
| H. GDPR/RGPD | Aplica en su totalidad | `CONFIRMADO` |
| I. Profiling | Cualquier recomendación personalizada (Discovery) probablemente constituye profiling (Art. 4(4) GDPR); la AEPD ha adoptado postura restrictiva sobre "interés legítimo" en contextos comerciales — probablemente se necesite consentimiento explícito, no solo interés legítimo | `PROBABLE`, `REQUIERE ABOGADO` para el diseño exacto de base legal |
| J. Personalización | Mismo tratamiento que I | `PROBABLE` |
| K. Marketing | Requiere base legal propia (LSSI-CE + GDPR) | `CONFIRMADO` |
| L. Consentimiento | Marco general aplicable | `CONFIRMADO` |
| M. Datos de Partners | Si el Partner es autónomo/persona física, podría ser también interesado GDPR, no solo contraparte B2B | `UNKNOWN` |
| N. CRM ofrecido al Partner | Requeriría acuerdo de encargado de tratamiento (Art. 28 GDPR) entre VIAO y el Partner por los datos de clientes de ese Partner — no diseñado hoy | `PROBABLE` |
| O. Web de Partners | Posibles obligaciones adicionales de aviso legal/cookies según diseño técnico | `POSIBLE`, `UNKNOWN` sin diseño |
| P/Q. DSA | El DSA regula intermediarios/marketplaces; micro/pequeñas empresas (<50 empleados, <10M€) están exentas de la mayoría de obligaciones costosas — dado el tamaño actual de VIAO, la mayoría de obligaciones pesadas probablemente no aplican todavía, aunque transparencia básica sí podría | `PROBABLE` (bajo riesgo actual, crece con escala) |
| R. IVA de Rewards | La Directiva de Vales (UE 2016/1065) distingue vales de propósito único (IVA conocido al emitir) de propósito múltiple (IVA solo al canjear) — un Reward de VIAO probablemente se comporta como vale de propósito múltiple, pero si un "Point" se califica siquiera como "vale" a estos efectos no está resuelto | `POSIBLE`, `REQUIERE ABOGADO fiscal` |
| S. Facturación de la cuota mensual del Partner | Servicio SaaS B2B estándar, IVA general español | `CONFIRMADO` |
| T. Responsabilidad de VIAO por el Reward del Partner | Probablemente recae principalmente en el Partner como oferente, con posible responsabilidad de transparencia para VIAO como intermediario | `POSIBLE`, `REQUIERE ABOGADO` |
| U. Partner cierra | Riesgo de pérdida de valor percibido por el usuario, mitigable con comunicación clara, sin garantía legal automática | `POSIBLE` |
| V. Reward desaparece | Mismo tratamiento que U | `POSIBLE` |
| W. Usuario reclama | Canales generales de consumo español (OMIC, arbitraje de consumo) | `CONFIRMADO` |

## 16-17. Unit Economics del Partner / Monetización

Variables sin cifra inventada: CAC evitado (`UNKNOWN`) + clientes incrementales (`UNKNOWN`) + frecuencia incremental (`UNKNOWN`) + ticket incremental (`UNKNOWN`) + valor de CRM/software (`INFERENCE`: bajo coste marginal para VIAO ≠ alto valor percibido por el Partner, distinción ya señalada en V2-F5) + valor de visibilidad (ya descartado como argumento de venta por sí solo, `VIAO_PARTNERS_MASTER_V2.md` §5) − coste de Rewards − coste operativo. **Ninguna variable tiene dato real hoy** — el ~50€/mes sigue siendo `HYPOTHESIS`, consistente con investigación comercial previa ya documentada (PVB15, `VIAO_MASTER_PRODUCT_CONTEXT.md`), no una cifra nueva ni validada.

MRR, ARPU, churn, CAC, LTV, gross margin, payback: todos `UNKNOWN` — Beta = 0€, sin datos de facturación real todavía.

## 18. Scalability

`INFERENCE`: el Modelo A escala sin depender de densidad (funciona igual con 1 o con 1.000 Partners). El componente Discovery (H) y, más aún, cualquier variante cross-Partner, sí dependen de densidad y escala — sin evidencia de que funcionen bien por debajo de las decenas/cientos de Partners (V2-F1, V2-F4).

## 19. Falsification Matrix

| H | Hipótesis | Evidencia a favor | Evidencia en contra | UNKNOWN | Métrica | Experimento | GO | NO-GO |
|---|---|---|---|---|---|---|---|---|
| H1 | Users want Points | Precedente amplio en la industria (loyalty en general) | Bloques 1-5 de esta sesión: Points solos no son suficientemente deseables sin un beneficio concreto detrás | Deseabilidad específica en VIAO | Interacción repetida con el saldo/progreso | Beta con Partners reales | Uso repetido sin necesidad de recordatorio | Abandono tras la primera visita |
| H2 | Users understand Goals | `WALLET_BALANCE` ya implementado y probado (código) | Ninguna | Comprensión real por usuarios no técnicos | Tasa de creación de Goal tras onboarding | Ya en producción | Creación espontánea | Confusión reportada |
| H3 | Missions increase recurrence | Diseño ya `LOCKED`, coherente con literatura general de habit loops | Sin dato específico de VIAO | Magnitud del efecto | `return_visit` completion rate | Ya en producción | Completion rate sostenido | Caída tras la novedad inicial |
| H4 | Rewards create motivation | Principio de goal-gradient ya usado en Bloque 1 de esta sesión | Sin validar con Rewards reales (catálogo hoy sin contenido real confirmado) | Si el contenido real (no hipotético) motiva igual | Reward redemption rate | Piloto con 1-2 Rewards reales | Redención dentro de la ventana de Beta | Cero redenciones |
| H5 | Cross-Partner increases utility | Hallazgo académico Marketing Science 2024 (V2-F1) | Ausencia de casos exitosos a escala pequeña (V2-F1) | Magnitud a escala VIAO | % usuarios con ≥2 Partners | Experimento de V2-F4 | Conversión clara superior a control | Sin diferencia |
| H6 | Cross-Partner generates traffic for Partners | Precedente Fivestars (discovery, no cross-currency) | Precedente Plenti (cross-currency específico) | Cuál de los dos mecanismos domina en VIAO | `clientesNuevos` atribuible | Mismo experimento | Cambio medible en Dashboard | Sin cambio |
| H7 | Partner accepts Reward economics | Card-Linked Offers demuestran aceptación cuando el pagador = beneficiario (V2-F4) | Plenti: partners grandes se fueron a controlar su propio programa | Reacción real de los Partners piloto | Aceptación explícita ante propuesta concreta | Conversación comercial directa | Compromiso real, no hipotético | Rechazo o exigencia de condiciones adicionales |
| H8 | Partner values dashboard/CRM | Dashboard ya construido y con métricas reales (PB6) | Sin dato de uso real del dashboard por los Partners piloto | Engagement real con el dashboard | Frecuencia de acceso al dashboard | Ya disponible, sin tracking de uso todavía | Acceso recurrente | Cero accesos tras el alta |
| H9 | Partner would eventually pay ~50€/mes | Consistente con PVB15 (investigación previa) | Ninguna disposición a pagar confirmada todavía | Disposición real a pagar | Respuesta a una oferta real, no hipotética | Conversación comercial post-Beta | Aceptación o negociación real | Rechazo categórico |
| H10 | VIAO can control fraud | Controles ya `LOCKED` (P3/P4/PMM3) cubren los vectores conocidos de bajo volumen | Sin control de ATO/cuentas múltiples todavía | Suficiencia a escala mayor | Incidentes detectados en Beta | Monitorización manual en Beta | Cero incidentes significativos | Incidentes recurrentes no detectados a tiempo |
| H11 | Model is legally viable | Modelo A encaja `PROBABLE` en la exclusión PSD2 | Cross-Partner en riesgo creciente bajo Guías EBA | Calificación exacta | — | Consulta legal profesional | Confirmación de exención | Requerimiento de licencia |
| H12 | Model is economically viable | Modelo A no depende de densidad, coste bajo | Cross-Partner sin caso exitoso a pequeña escala | Unit economics reales | MRR/ARPU/LTV | Beta + primeras suscripciones | Datos positivos sostenidos | Sin disposición a pagar |
| H13 | Model can scale | Modelo A escala sin settlement | Discovery/cross-Partner requieren densidad no garantizada | Densidad real de usuarios (PVB19) | % usuarios activos por zona | Medición directa en Beta | Densidad suficiente confirmada | Densidad insuficiente |
| H14 | VIAO can create habit like Duolingo (en principio) | Mecanismos de aversión a la pérdida y progreso visible son transferibles en teoría | La acción de bajo coste que sostiene el streak de Duolingo no existe igual en VIAO (visitar un comercio tiene coste real) | Fuerza real del efecto en un contexto de consumo, no de estudio | Retención semanal/mensual | Beta con métricas de retorno | Retención comparable a benchmarks de habit apps | Retención cercana a apps sin mecanismo de hábito |

## 20. GO / NO-GO / CONDITIONS

**GO WITH CONDITIONS** para el núcleo: Modelo A (Partner-specific) + Duolingo-inspired mechanics adaptadas por vertical + Business Model gratis→suscripción.

**INSUFFICIENT EVIDENCE / NO-GO todavía** para: (a) cross-Partner en cualquier variante que implique settlement entre Partners (H5/H6/H7/H11); (b) cualquier caducidad de Points sin resolver la incertidumbre legal de la sección 12-15 (D); (c) cualquier personalización/Discovery con profiling real sin resolver la base legal GDPR (I/J).

**Condiciones explícitas antes de avanzar cross-Partner**:
1. Resolución explícita de L12 vía el procedimiento de Governance ya descrito en V2-F5.
2. Consulta legal profesional sobre clasificación PSD2/exclusión de red limitada — `REQUIERE ABOGADO`, no resoluble por este documento.
3. Ejecución del experimento piloto ya diseñado en V2-F4 antes de cualquier Product Spec.
4. Confirmación de disposición real a pagar por al menos algunos Partners piloto (H9) antes de fijar cualquier precio.

## 21. L12 Impact Analysis

**Salida requerida: KEEP / REOPEN / REFORMULATE / UNKNOWN, con argumentos.**

## **KEEP** (por ahora) — con reformulación futura condicionada, no automática.

Argumentos: (a) la evidencia de mercado (V2-F1) sigue sin mostrar ningún caso exitoso de coalition Points cross-Partner a la escala de VIAO; (b) esta auditoría añade una **nueva línea de evidencia independiente** (riesgo regulatorio PSD2/EBA) que no existía en el análisis de V2-F1/F2 y que apunta en la misma dirección de cautela; (c) el Modelo A ya es suficiente para sostener el negocio en Beta sin ninguno de estos dos riesgos. Si en el futuro el propietario decide **REOPEN**, debe hacerlo mediante el procedimiento ya descrito en V2-F5 (nuevo Decision Lock explícito, con `SUPERSEDES` declarado), nunca por acumulación silenciosa de documentos de investigación.

## 22. Critical Unknowns

Densidad real de usuarios VIAO por zona (PVB19, la más importante de todo el proyecto, sin cambios); disposición real de un Partner a pagar ~50€/mes; calificación legal exacta de los Points bajo PSD2 si el modelo creciera más allá de unos pocos Partners; si un Point se califica como "vale" a efectos de la Directiva de Vales y de la prohibición de caducidad de bonos en España; magnitud real del efecto Duolingo-like fuera de un contexto de estudio diario de bajo coste.

## 23. Recommended Validation Experiments

1. El experimento de discovery ya diseñado en V2-F4 (sección H de ese documento) — sin repetir aquí.
2. Encuesta/conversación comercial directa y no hipotética con los Partners piloto sobre disposición a pagar ~50€/mes (H9).
3. Consulta con un abogado especializado en servicios de pago/PSD2 antes de diseñar cualquier variante cross-Partner, incluso a pequeña escala.
4. Piloto de un único Reward Partner-específico real (no hipotético) para medir H4 (motivación real) antes de construir el mecanismo de hito completo.

## 24. Proposed Strategic Direction

`RECOMMENDATION`, no `LOCKED`: mantener el Modelo A como base de producto inmediata; tratar los principios Duolingo-transferibles (progreso visible, feedback inmediato, aversión a la pérdida bien calibrada por vertical) como guía de diseño para el mecanismo de hito ya en investigación (Bloques 1-5); tratar Discovery (H) como `YELLOW`, pendiente del experimento ya diseñado; tratar cross-Partner como `KEEP L12` por ahora, con la puerta abierta a `REOPEN` solo tras resolver las tres condiciones de la sección 20 y con autorización explícita del propietario.

---

**Validación Git**: `git status` antes y después de este bloque muestra únicamente el nuevo archivo creado (autorizado explícitamente en el prompt de esta fase, sección 21) más los documentos ya existentes de bloques anteriores (`VIAO_PARTNERS_V2_RESEARCH.md`, `VIAO_PARTNERS_V2_L12_RESEARCH.md`) y `.gstack/` preexistente. Ningún archivo trackeado fue modificado. No se hizo commit. No se tocó código, migraciones, tests, ni ningún Decision Lock existente.

HARD STOP.
