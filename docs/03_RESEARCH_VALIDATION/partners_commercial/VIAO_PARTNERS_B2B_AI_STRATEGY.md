---
STATUS: VALIDATION
ERA: Esta sesión
DOMAIN: Partners/IA
AUTHORITY: Investigación de estrategia de monetización de IA
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-25
---

# VIAO Partners — Estrategia B2B + IA: qué vender, a qué precio, con qué IA y por qué

### Estado: INVESTIGACIÓN / DISEÑO CONCEPTUAL — NO IMPLEMENTAR. No se ha modificado código, Supabase, migraciones, RLS, UI ni ningún archivo del repositorio, incluidos los documentos ya existentes.
### No se reabre ninguna decisión LOCKED (L1-L19 Master V2, P1-P8 Decision Lock Económico) salvo `CONTRADICCIÓN REAL` explícita.
### Continúa de `docs/03_RESEARCH_VALIDATION/partners_commercial/VIAO_PARTNERS_B2B_VALUE_PROPOSITION.md` (ya auditada, no repetida aquí salvo donde la IA cambia una conclusión). Fuentes leídas: `VIAO_PARTNERS_MASTER_V2.md`, `VIAO_PARTNERS_TECHNICAL_SPEC.md`, `VIAO_PARTNERS_B2B_VALUE_PROPOSITION.md`.

**Taxonomía**: `DATO DE MERCADO` · `HIPÓTESIS VIAO` · `SUPUESTO` · `EXISTENTE`/`LOCKED` · `OPEN` · `NUEVO` · `BLOCKED` · `VALIDATION REQUIRED`.

---

## 1-2. Contexto y objetivo

No se repiten — ya cubiertos en el documento anterior. La pregunta nueva de esta investigación es específicamente: **¿qué papel real (no de moda) juega la IA en esta propuesta, y cambia eso el precio que se puede cobrar?**

---

## 3. La matriz PROBLEMA → SOLUCIÓN → VALOR

| Problema | Solución VIAO | Valor para el Partner | Métrica | Coste VIAO | Dificultad | Disposición a pagar | Precio posible |
|---|---|---|---|---|---|---|---|
| No sé quién vuelve | Atribución + dashboard | Decisión de negocio real | Clientes nuevos/recurrentes | Bajo — ya `EXISTENTE` | Baja | Alta | Incluido en base |
| Pierdo tiempo respondiendo lo mismo por WhatsApp | Asistente IA de texto (FAQ, horarios, precios) | Tiempo liberado | Consultas atendidas sin intervención | **Muy bajo** — ver Parte 7 | Media | Media-alta | Incluido con límites, o tier medio |
| No sé si estoy perdiendo clientes que dejaron de venir | Detección de caída de recurrencia | Alerta accionable | "N clientes no han vuelto en 60 días" | Bajo — es agregación sobre datos ya existentes | Baja-media | Media | Tier medio |
| No puedo atender llamadas fuera de horario | Recepcionista IA de voz | Captación que hoy se pierde | Llamadas atendidas fuera de horario | **Alto** — ver Parte 8 | Alta | Alta SI funciona bien | Add-on / tier alto, nunca base |
| Mis campañas de recuperación las hago a mano o no las hago | Generación asistida de mensajes de recuperación | Tiempo + recurrencia | Clientes recuperados | Bajo-medio | Media | Media | Tier medio-alto |
| No sé qué está funcionando de verdad | Informe semanal con recomendación accionable | Claridad sin analizar nada él mismo | "Qué debería hacer esta semana" | Bajo — es una capa de presentación sobre datos ya existentes | Baja | Media-alta | Incluido en base o tier medio |

---

## 4-6. Mercado — España/Europa priorizado, después EEUU/UK

*(Amplía la investigación previa con foco explícito en España)*

| Producto | Mercado | Qué vende | Precio | Fuente |
|---|---|---|---|---|
| Booksy | España | Reservas + gestión para peluquerías/estética | Desde €34,99/mes + ~€8/empleado extra | `DATO DE MERCADO` |
| Fresha | España | Reservas wellness, sin cuota fija | 0€/mes + 2,6% procesamiento + ~20% comisión sobre 1ª visita vía su app | `DATO DE MERCADO` |
| CoverManager | España | Reservas restaurante | €99-349/mes según fuentes de terceros (precio no público oficialmente) | `DATO DE MERCADO`, sin cifra oficial |
| TheFork Manager | España | Reservas restaurante + visibilidad | €1-3/comensal + cuota variable | `DATO DE MERCADO` |
| Plataformas WhatsApp todo-en-uno | España | Automatización de reservas/mensajería | €89-150/mes (volumen típico 100-200 citas/mes) | `DATO DE MERCADO` |
| Smith.ai | EEUU (referencia) | Recepción híbrida IA+humano | $195/mes (20 llamadas) hasta $487,50+/mes (50 llamadas) | `DATO DE MERCADO` |
| Ruby Receptionist | EEUU (referencia) | Recepción 100% humana | Desde $235-245/mes (50 min), $2,45/min adicional | `DATO DE MERCADO` |

**Hallazgo clave**: en España, el software de reservas/gestión ya cuesta €35-350/mes según categoría — **VIAO no compite en ese espacio** (no hace reservas reales, LOCKED que no lo intenta en Beta). Lo que sí es nuevo y no cubierto por ninguno de estos: la recepción/atención IA como **producto barato e incluido** en vez de un servicio aparte de $195-487+/mes como Smith.ai.

---

## 7. Investigación específica de IA — el filtro obligatorio

Cada funcionalidad de IA se evalúa contra: problema real, tiempo ahorrado, dinero generado/conservado, coste real de operar, si cabe en €50-90 o debe ser add-on.

### Coste real de IA de texto (chat/WhatsApp) — `DATO DE MERCADO`, verificado contra precios oficiales

| Modelo | Input /1M tokens | Output /1M tokens | Fuente |
|---|---|---|---|
| Claude Haiku 4.5 | $1,00 | $5,00 | Precio oficial Anthropic |
| Claude Sonnet 5 | $2,00 | $10,00 | Precio oficial Anthropic |
| GPT-4o-mini | $0,15 | $0,60 | `DATO DE MERCADO` |
| GPT-4o | $2,50 | $10,00 | `DATO DE MERCADO` |

**Modelo de coste por conversación** (`SUPUESTO`: ~700 tokens de entrada + ~300 de salida por turno, dentro del rango 500-1500 pedido; `SUPUESTO`: conversación típica de atención = 6 turnos):

| Modelo | Coste por turno | Coste por conversación (6 turnos) | 500 conversaciones/mes |
|---|---|---|---|
| GPT-4o-mini | ~$0,0003 | ~$0,0017 (~€0,0016) | ~$0,85/mes |
| Claude Haiku 4.5 | ~$0,0022 | ~$0,013 (~€0,012) | ~$6,50/mes |

**Conclusión honesta**: el coste puro de inferencia de un asistente de TEXTO es prácticamente irrelevante frente a €50-90/mes — incluso 500 conversaciones/mes cuestan menos de $10. **El texto SÍ cabe en el plan base con límites generosos, sin ser un add-on caro.**

### Coste real de IA de voz — `DATO DE MERCADO`

| Proveedor | Tarifa publicitada | Coste real "todo incluido" (STT+LLM+TTS+telefonía) |
|---|---|---|
| Vapi | $0,05/min | $0,10-0,30/min |
| Retell | $0,07/min | $0,07-0,31/min |
| Bland | ~$0,09/min (ahora por plan) | Variable |

**Modelo de coste, `SUPUESTO` llamada media de 3 minutos**: $0,21-1,50 por llamada. A 50 llamadas/mes (`SUPUESTO`, un Partner con actividad media): **$10,50-75/mes solo en infraestructura de voz** — esto por sí solo puede consumir la mitad o más del margen de un plan de €50-90. **La voz NO puede ser gratuita ni ilimitada en ningún plan de esta banda.**

### WhatsApp Business API en España — `DATO DE MERCADO`

Coste directo de Meta: negligible (~€1,33/mes, primeras 1.000 conversaciones de servicio gratis/mes). El coste real está en la capa BSP/plataforma: €89-150/mes todo incluido, o €150-300/mes con desarrollo a medida. **Si VIAO construye su propia integración de WhatsApp (no solo un enlace), este es un coste de infraestructura real a absorber, no a repercutir directamente al Partner en el plan base.**

---

## 8. "VIAO AI Receptionist" — investigado, no decidido

Aplicando el filtro completo:

- **Problema que resuelve**: consultas repetitivas (horarios, precios, disponibilidad) fuera de horario o durante el servicio — `HIPÓTESIS VIAO`, coherente con lo que Smith.ai/Ruby ya monetizan a $195-487+/mes.
- **Tiempo ahorrado**: `HIPÓTESIS VIAO`, no medido — plausible pero no cuantificado sin datos de Beta.
- **Coste tecnológico — TEXTO**: bajo, ver Parte 7 — **cabe en plan base con límites**.
- **Coste tecnológico — VOZ**: alto, ver Parte 7 — **no cabe en plan base**.
- **WhatsApp/BSP**: coste real de infraestructura, no negligible si VIAO lo construye propio.
- **Privacidad/GDPR**: `VALIDATION REQUIRED` — un asistente que capta datos de clientes finales (leads) requiere una política de datos explícita, no diseñada aquí.
- **Riesgo**: un asistente mal entrenado que da información incorrecta (precio erróneo, disponibilidad falsa) daña la confianza del Partner en VIAO de forma directa — riesgo real, no solo teórico.

**Determinación**:
- **A. Incluido en €50-90 (texto)**: SÍ, con límites (`SUPUESTO`, p. ej. 200-300 conversaciones/mes) — coste real es de céntimos.
- **B. Incluido con límites (voz)**: NO recomendable en Beta ni en el primer tier de pago — coste real demasiado alto para el margen de €50-90.
- **C/D. Add-on / plan superior (voz)**: SÍ, es donde la voz encajaría si se construye — coherente con que Smith.ai/Ruby cobran $195-487+/mes solo por esto.
- **E. Servicio separado**: no descartado para el futuro, no diseñado aquí.
- **F. No recomendable todavía**: la voz en Beta — no hay evidencia de demanda real todavía, y el coste/riesgo no está justificado sin validación previa (ver Parte 25).

---

## 9. Inventario de oportunidades de IA — filtradas

| Categoría | Oportunidad | ¿El Partner pagaría? | Veredicto |
|---|---|---|---|
| Atención (texto) | FAQ/WhatsApp AI | Sí — coste bajo, valor claro | **Incluir en base, con límites** |
| Atención (voz) | AI receptionist de voz | Sí, si funciona — pero coste alto | **Add-on futuro, no Beta** |
| Ventas | Lead qualification/follow-up | Posible, no validado | `VALIDATION REQUIRED` |
| Retención | Detección de clientes que dejan de venir | Sí — es agregación barata sobre datos ya existentes | **Incluir, coste casi nulo** |
| Marketing | Generación de textos de campaña | Posible — coste bajo (texto) | Tier medio, no base |
| Operaciones | Resumen/informe semanal accionable | Sí — es la culminación del dashboard | **Incluir en base o tier medio** |
| Inteligencia | Predicción de demanda/horas flojas | Interesante pero requiere volumen de datos que Beta (3-5 Partners) no tendrá | `FUTURO`, no ahora |
| Reputación | Respuestas a reseñas | Fuera de alcance — VIAO no gestiona reseñas, no está LOCKED | **NO construir** |
| Administración | Extracción de datos de documentos (OCR) | Explícitamente `NO IMPLEMENTADO`, Master V2 O3 | **NO construir en Beta** |

---

## 10. No regalar IA — estructura de planes (propuesta, no decidida)

`PROPOSED`, no `LOCKED`:

| Plan | Precio (`SUPUESTO`) | Incluye | Límite | Coste VIAO estimado | Margen |
|---|---|---|---|---|---|
| STARTER | €49/mes | Dashboard + atribución + FAQ IA texto | ~150 conversaciones/mes | <$5/mes en IA | Muy alto |
| GROWTH | €79/mes | + detección de caída de recurrencia + informe semanal | ~300 conversaciones/mes | <$10/mes | Alto |
| PRO | €129/mes | + generación de campañas de recuperación | ~500 conversaciones/mes + campañas | <$20/mes | Alto |
| Add-on: AI Voice | €X (`OPEN`, no investigado a fondo el precio de reventa) | Recepción por voz, límite de minutos | Por minutos, con techo duro | $0,10-0,30/min real | Depende del margen fijado — requiere validación específica |

**No incluir en ningún plan de esta banda**: IA de voz ilimitada, llamadas ilimitadas, WhatsApp ilimitado, CRM completo, generación de contenido ilimitada, soporte humano ilimitado — coherente con la Parte 19.

---

## 11-13. Producto "VIAO Partner" (actualizado con IA) + "momento €80" + dashboard

**Qué obtiene**: todo lo ya descrito en el documento anterior + un asistente de texto que responde preguntas frecuentes cuando el Partner no puede.

**"Momento €80" reconsiderado**: la investigación de IA no cambia el momento central identificado antes (un cliente que vuelve, visible en el dashboard) — pero **añade un segundo momento real y medible**: *"mi asistente respondió 40 consultas por WhatsApp mientras yo atendía la barra"* — `HIPÓTESIS VIAO`, coherente con por qué Smith.ai cobra lo que cobra, pero sin datos propios de VIAO todavía. Ambos momentos juntos (recurrencia + tiempo liberado) son más convincentes que cualquiera de los dos por separado.

**Dashboard, añadido a lo ya diseñado**: "consultas atendidas por el asistente sin tu intervención" — responde a la decisión *"¿me está ahorrando tiempo de verdad?"*. **No añadir** ninguna métrica de IA que no traduzca a una decisión (p. ej. "tokens usados" no le importa al Partner).

---

## 14-15. Modelo de precios + Unit economics con IA

Los escenarios de MRR del documento anterior (Parte 18) **no cambian sustancialmente** — el coste de IA de texto es marginal frente al ARPU de €50-90. Lo que sí cambia es el **techo de margen si se añade voz sin control**: un Partner con 100 llamadas/mes de voz (`SUPUESTO` alto) costaría $21-150/mes solo en infraestructura — en el peor caso, esto **destruye el margen completo de un plan de €79-129**. Por eso la voz debe llevar un límite duro no negociable, nunca "ilimitado", si alguna vez se ofrece.

---

## 16. Qué tipo de Partner buscar

| Tipo de negocio | Dolor | Recurrencia | Ticket | Capacidad de pago | Encaje IA texto | Ranking |
|---|---|---|---|---|---|---|
| Restaurantes/cafeterías | Alto | Alta | Medio | Media | Alto (consultas de horario/mesa) | 1 |
| Barbería/peluquería | Alto | Muy alta (cada 3-4 semanas) | Bajo-medio | Media | Alto (consultas de cita/precio) | 2 |
| Wellness/gimnasios | Medio-alto | Alta | Medio-alto | Media-alta | Alto | 3 |
| Estética | Medio | Media | Alto | Alta | Medio | 4 |
| Experiencias/clases puntuales | Medio | Baja (una vez) | Alto | Media | Medio | 5 |
| Tiendas/retail | Bajo-medio | Baja | Variable | Baja-media | Bajo | 6 |

**Ranking**: restaurantes y barberías/peluquerías son el mejor encaje inicial — alta recurrencia natural (base del propio "momento €80"), volumen de consultas repetitivas suficiente para que el asistente IA de texto tenga sentido.

---

## 17. Modelo de expansión (land and expand)

Sí es viable, y la IA lo hace más claro que antes: **empezar con Loyalty + Goals + Dashboard (ya LOCKED) a €49-70, demostrar el "momento €80", y SOLO ENTONCES ofrecer capas de IA de texto (barata) como upsell hacia €79-129** — nunca empezar vendiendo IA de voz cara sin validar primero el núcleo. Ver Parte 24 para el análisis completo entrar-bajo vs entrar-alto.

---

## 18. Diferenciación — honesta

**Por qué elegir VIAO**: precio de entrada muy inferior a las herramientas "serias" (€49-90 vs $195-487+ de un Smith.ai, o $150-450 de Fivestars/Podium/Birdeye), con el diferenciador único (objetivo personal del cliente final) que ninguno tiene.

**Por qué NO elegir VIAO**: si el Partner necesita reservas reales (Fresha/Booksy/CoverManager lo hacen, VIAO no); si necesita recepción de voz seria hoy mismo (Smith.ai/Ruby ya lo hacen, VIAO no lo tiene construido); si necesita gestión de reputación/reseñas (Podium/Birdeye, VIAO no lo hace); si desconfía de una herramienta en fase Beta con solo 3-5 referencias.

---

## 19. Qué NO debemos construir (ampliado con IA)

IA de voz ilimitada, llamadas ilimitadas, WhatsApp ilimitado, CRM gigante, POS propio, reservas complejas, contabilidad, ERP, gestión completa de redes sociales, generación de contenido ilimitada, soporte humano ilimitado — todo confirmado por el propio análisis de coste de esta investigación, no solo por instrucción.

---

## 20. Regla de oro — aplicada a IA de texto vs voz

| Filtro | IA texto (FAQ WhatsApp) | IA voz |
|---|---|---|
| ¿Resuelve problema real? | Sí | Sí, si funciona bien |
| ¿Partner entiende el valor? | Sí, fácil | Sí, fácil |
| ¿Se puede medir? | Sí (consultas atendidas) | Sí (llamadas atendidas) |
| ¿Dispuesto a pagar? | Sí, como parte del plan | Sí, pero como add-on/premium |
| ¿Coste de operar? | Muy bajo | Alto |
| ¿Deja margen? | Sí, amplio | Solo con límites estrictos |
| ¿Aumenta retención? | Probable | Probable, si funciona |
| ¿Aumenta ARPU? | No por sí sola (va en base) | Sí, es la palanca real de subir a €129+ |
| ¿Difícil de copiar? | No — cualquiera puede montar un bot de FAQ | Medio — la calidad de ejecución sí diferencia |
| ¿Encaja con VIAO? | Sí | Sí, en fase posterior |

**Conclusión**: texto pasa el filtro para ir en el plan base. Voz pasa el filtro solo como add-on futuro, nunca en Beta.

---

## 21-23. Propuesta comercial, pitch y oferta

*(Ver el documento anterior, `VIAO_PARTNERS_B2B_VALUE_PROPOSITION.md`, Partes 15/21/22/23 — siguen vigentes. Añadido, específico de esta investigación:)*

**Frase añadida al pitch**: *"Y cuando alguien te escribe por WhatsApp preguntando el horario a las 11 de la noche, no tienes que estar tú para responder — VIAO responde por ti."*

**Objeción nueva y respuesta**:

| Objeción | Respuesta | Riesgo |
|---|---|---|
| "¿Y si la IA responde mal a un cliente?" | El asistente solo responde preguntas frecuentes predefinidas (horario, precio, disponibilidad) — nunca inventa información, y siempre puede derivar a ti | Real — requiere que el diseño del asistente sea conservador, no ambicioso, en Beta |

---

## 24. Land and expand vs entrar alto

**Analizado ambos**:
- **Entrar bajo (€49-70) y subir**: menor fricción de venta, coherente con Beta gratuita → primer pago; permite validar el "momento €80" antes de pedir más dinero; riesgo de anclar el precio percibido demasiado bajo.
- **Entrar directo a €80**: mensaje más fuerte ("esto vale más que un programa de puntos"), pero mayor fricción inicial sin ninguna referencia todavía (Beta = 0 casos de éxito propios).

**Recomendación** (`HIPÓTESIS VIAO`, no LOCKED): entrar bajo — coherente con la recomendación ya dada en el documento anterior (€50-70 inicial) — y usar la capa de IA de texto (coste marginal) como la palanca natural para subir a €79-90 sin fricción, reservando €129+ para cuando exista voz IA real y validada.

---

## 25. Beta — cuándo pedir dinero

**Qué preguntar al Partner** (además de lo ya definido): *"¿usarías algo que responda automáticamente a tus clientes por WhatsApp cuando no puedes?"* — antes de construir nada de IA, para no construir sobre una suposición.

**Qué medir**: todo lo ya definido + si el Partner pregunta espontáneamente por un asistente automático (señal de demanda real de IA, no inducida).

**Comportamiento PMF**: un Partner que dice espontáneamente *"esto me ahorra tiempo"* además de *"esto me trae clientes"*.

**Comportamiento de fracaso**: ningún Partner menciona el ahorro de tiempo sin que se le pregunte directamente — señal de que la capa de IA no es todavía el motivo de pago.

**¿Cuándo pedir dinero?**: solo después de que al menos un Partner haya visto el "momento €80" (recurrencia real) — nunca antes, y nunca condicionado a que la IA de texto ya esté construida (el núcleo LOCKED de Partners no depende de IA para justificar precio, la IA es una palanca adicional, no el motivo principal).

---

## 26. Decision Register (nuevo, continúa PVB1-PVB7 del documento anterior)

| ID | Decisión | Estado | Evidencia | Impacto | Próximo paso |
|---|---|---|---|---|---|
| PVB8 | IA de texto (FAQ/WhatsApp) cabe en el plan base €50-90 por coste marginal | `PROPOSED` | Coste real Claude Haiku 4.5 / GPT-4o-mini, Parte 7 | Justifica incluirla sin add-on | Validar demanda en Beta (Parte 25) antes de construir |
| PVB9 | IA de voz NO debe incluirse en Beta ni en el primer tier de pago | `PROPOSED` | Coste real $0,07-0,50/min, Parte 7 | Evita destruir margen | Reconsiderar solo tras validar demanda y con límites duros |
| PVB10 | Estructura de planes STARTER/GROWTH/PRO (€49/€79/€129) | `PROPOSED` | Parte 10 | Orienta futura discusión de pricing, no la fija | `VALIDATION REQUIRED` con datos de Beta |
| PVB11 | Precio de reventa del add-on de voz | `OPEN` | No investigado a fondo | Ninguno todavía | Requiere investigación específica si se decide construir voz |
| PVB12 | Ranking de Partner ideal: restaurantes y barberías/peluquerías primero | `PROPOSED` | Parte 16 | Orienta selección de los 3-5 piloto | Ninguno — ya aplicable a la Beta actual |
| PVB13 | Privacidad/GDPR de un asistente que capta datos de leads | `VALIDATION REQUIRED` | No diseñado | Bloqueante si se construye IA de atención | Requiere diseño legal antes de cualquier construcción |

---

## 27. VEREDICTO

1. **¿Propuesta B2B suficientemente fuerte?** Sí, en su núcleo (atribución + recurrencia); la IA la refuerza pero no es la base — coherente con el veredicto 🟡 del documento anterior, sin cambios.
2. **¿Podría pagar €50?** Sí — es la banda de entrada ya validada por el mercado (Sinch $49, Smile.io $49).
3. **¿Podría pagar €80?** Sí, si ve el "momento €80" (recurrencia real) — el mismo argumento del documento anterior, sin necesidad de IA para justificarlo.
4. **¿Podría pagar €90?** Sí, en el límite superior de la banda validada (Kangaroo Rewards Starter $79, Preferred Patron $79, Mindbody Starter $99) — con IA de texto incluida como diferenciador frente a esos competidores, que no la tienen.
5. **¿Qué tendría que recibir para pagar €129?** Algo que hoy VIAO no tiene: o bien recepción de voz real y fiable (categoría que hoy cuesta $195-487+/mes en Smith.ai), o bien campañas de recuperación automatizadas con resultado demostrado — ninguna de las dos existe ni está LOCKED.
6. **¿La IA aumenta realmente el valor?** Sí, la de texto — de forma barata y clara. La de voz, solo si se ejecuta bien, y con un coste real que hay que gestionar con cuidado.
7. **¿Qué IA tiene mejor ROI?** El asistente de texto (FAQ/WhatsApp) y la detección de caída de recurrencia — ambas de coste casi nulo sobre datos ya existentes.
8. **¿Qué IA NO debemos construir?** Voz ilimitada, generación de contenido ilimitada, cualquier IA que prometa un resultado que Beta no puede medir (Parte 19).
9. **¿Cuál es el producto B2B mínimo?** El mismo del documento anterior + un asistente de texto simple con límites — nada de voz.
10. **¿Cuál debería ser el Partner ideal?** Restaurantes y barberías/peluquerías (Parte 16).
11. **¿Principal riesgo?** Que la IA de texto no sea, en la práctica, lo que hace que el Partner pague — y que se construya antes de confirmarlo (Parte 25).
12. **¿Qué validar antes de construir?** La pregunta directa de la Parte 25, con los 3-5 Partners piloto, antes de escribir una sola línea de código de IA.
13. **¿Qué NO debemos tocar?** P1-P8, el schema de Partners ya LOCKED, ninguna decisión de Master V2 — nada de esta investigación las contradice.
14. **¿Siguiente experimento?** Preguntar directamente a los 3-5 Partners piloto si un asistente automático de WhatsApp les interesaría — antes de cualquier diseño técnico.

---

## Fuentes consultadas (nuevas en esta investigación)

- Precios oficiales de modelos Claude — vía skill `claude-api` (Anthropic, cacheado 2026-06-24).
- [GPT-4o-mini/GPT-4o Pricing — devtk.ai / pecollective](https://devtk.ai/en/models/gpt-4o-mini/)
- [Vapi vs Retell vs Bland — coste real por minuto — Medium](https://medium.com/@automation.labs/vapi-vs-retell-vs-bland-in-2026-the-true-cost-per-minute-578f38af3523)
- [AI Voice Agent Cost per Minute 2026 — Klariqo](https://klariqo.com/blog/voice-ai-cost-per-minute/)
- [Smith.ai pricing — ever-help.com](https://www.ever-help.com/blog/smith-ai-reviews-pros-cons)
- [AI Receptionist Pricing 2026 — AgentZap](https://agentzap.ai/blog/ai-receptionist-pricing-complete-cost-guide-2025)
- [WhatsApp Business API pricing España — Engrana](https://engrana.es/en/blog/whatsapp-business-api-pricing-spain)
- [Booksy España precios — Book360](https://book360.es/blog/cuanto-cuesta-software-de-reservas-espana-precios)
- [Fresha para peluquerías — Fresha](https://www.fresha.com/for-business/salon)
- [CoverManager precios 2026 — Mesabot](https://mesabot.es/covermanager-precios)
- [CoverManager vs TheFork — Bouzon Digital](https://www.bouzondigital.com/es/blog/covermanager-vs-thefork-restaurantes/)
- `docs/03_RESEARCH_VALIDATION/partners_commercial/VIAO_PARTNERS_B2B_VALUE_PROPOSITION.md`, `docs/01_CURRENT/partners/VIAO_PARTNERS_MASTER_V2.md`, `docs/01_CURRENT/partners/VIAO_PARTNERS_TECHNICAL_SPEC.md` — fuente interna.

---
