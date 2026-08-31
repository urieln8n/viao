---
STATUS: CURRENT
ERA: Fase I — Ejecución de validación comercial
DOMAIN: Validación comercial / Partners
AUTHORITY: Protocolo operativo de experimento. NO es Decision Lock. Ningún resultado se convierte automáticamente en decisión de producto.
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-27
---

# VIAO — FASE I: EJECUCIÓN DE LA VALIDACIÓN COMERCIAL PARTNER V1

*Bootstrap completado: releídos `docs/validation/FASE_H_VALIDACION_COMERCIAL_PARTNER_V1.md`, `docs/decisions/DECISION_LOCK_ECONOMIC_MODEL_V1.md`, y reutilizado el conocimiento ya verificado en esta misma sesión de los Decision Locks de Rewards (`VIAO_REWARDS_V1_DECISION_LOCK.md`), Goals (`VIAO_GOALS_V1_DECISION_LOCK.md`) y Partners (`VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md`). **Ninguna contradicción encontrada** con ninguna decisión `LOCKED` — este documento es una capa operativa sobre FASE H, no introduce ningún elemento nuevo que las contradiga.*

---

## 1. Objetivo

Descubrir, mediante conversaciones reales, si existe un tipo de Partner con un problema suficientemente importante como para pagar por VIAO y financiar Rewards para sus propios clientes.

**Pregunta central**: *"¿Existe un tipo de Partner real que tenga un problema suficientemente importante como para pagar por VIAO y financiar Rewards para sus propios clientes?"*

Se separan explícitamente: problema, valor, usuarios aportables, Reward, financiación, disposición a pagar, precio, e **intención vs. comportamiento** — nunca se tratan como lo mismo.

---

## 2. Regla fundamental

**La evidencia de comportamiento vale más que la opinión.**

**No es validación**: "me gusta", "es interesante", "lo usaría", "suena bien", "quizá", "más adelante".

**Es evidencia fuerte**: acepta un piloto concreto; proporciona datos reales; identifica el problema con claridad; explica qué hace hoy; revela cuánto gasta hoy; acepta financiar el Reward; acepta discutir precio; acepta pagar; se compromete a una siguiente acción concreta.

---

## 3. ICP a testear

**A. Cafeterías/panaderías, B. Peluquerías/barberías, C. Restaurantes de barrio** — los tres candidatos de `FASE_H` §4, sin ganador declarado de antemano. **Gimnasios/estudios pequeños permanecen deprioritizados**, coherente con `FASE_H`. El propio experimento debe descubrir qué segmento responde mejor — no se asume aquí.

---

## 4. Muestra

Objetivo: **20 negocios contactados** → **8-10 conversaciones reales** → **4-5 fichas completas** para comparar. No es una muestra estadísticamente representativa — es un experimento manual inicial para un fundador único.

---

## 5. Criterios de selección de candidatos

Priorizar: negocio independiente; dueño o decisor accesible directamente; recurrencia visible de clientes; posibilidad de que el propio negocio identifique quién repite; capacidad de ofrecer un Reward; capacidad potencial de financiarlo; interés genuino en fidelización.

**No asumir**: número de clientes, facturación, margen, ticket medio, capacidad de pago — todo se descubre en la conversación, nada se presupone al seleccionar el candidato.

---

## 6. Protocolo de contacto (12 pasos)

1. Seleccionar candidato → 2. Registrar candidato (ficha, §15) → 3. Contactar → 4. Conseguir conversación → 5. Realizar entrevista → 6. Registrar respuestas → 7. Presentar VIAO brevemente (§8) → 8. Explorar Reward (§11) → 9. Explorar financiación → 10. Explorar precio (§12) → 11. Proponer siguiente paso concreto → 12. Clasificar evidencia (§14). **No se intenta cerrar una venta artificialmente en ningún paso.**

---

## 7. Guion definitivo

**Apertura**: *"Hola, soy Andrés, estoy trabajando en un proyecto para negocios como el tuyo y antes de construir nada más estoy hablando con dueños para entender cómo gestionan a sus clientes habituales."*

Después, en este orden: **A. Clientes** (§13) → **B. Recurrencia** → **C. Fidelización actual** (§9) → **D. Problemas** (§9) → **E. Coste actual** (§10) → **F. Valor de una visita adicional** (§10) → **G. Rewards** (§11) → **H. Financiación del Reward** (§11) → **I. Presentar VIAO** (§8) → **J. Precio** (§12) → **K. Próximo paso** (§6, paso 11).

**No convertir esto en un pitch largo** — el guion completo dura minutos, no una presentación.

---

## 8. Presentación de VIAO (máx. 30 segundos, formulación fija)

> "VIAO es una herramienta para que tus clientes habituales ganen puntos con lo que ya consumen normalmente — café, un corte, lo de siempre — y tú defines qué les das a cambio cuando vuelven varias veces. Tú decides el beneficio y lo financias tú; VIAO te da la herramienta para gestionarlo y ver quién repite."

**Nunca mencionar**: viajes, hoteles, marketplace de viajes, Travel, APIs de travel.

---

## 9. Test de problema (comportamiento pasado, nunca sugerido)

*"¿Cómo consigues que vuelva un cliente?" · "¿Cómo sabes quién vuelve?" · "¿Qué haces actualmente para fidelizar?" · "¿Has probado alguna herramienta?" · "¿Cuánto te cuesta?" · "¿Qué resultado te dio?" · "¿Qué haces cuando un cliente deja de venir?"*

No se sugiere ninguna respuesta en ningún caso.

---

## 10. Test de valor económico

Descubrir: cuánto vale para el Partner una visita adicional; cuánto gasta hoy en captar/fidelizar; qué resultado consideraría suficientemente valioso; qué tendría que producir VIAO para justificar un pago mensual. **No se asume ROI, no se inventa CAC, no se inventa margen** — todo sale de la conversación o queda `DATO A VALIDAR`.

---

## 11. Test de Reward

No se impone descuento, producto, servicio ni cantidad — se pregunta primero. Después se descubre: qué Reward ofrecería, por qué, cuánto le costaría aproximadamente, si estaría dispuesto a financiarlo, qué límites pondría. **Se registran las respuestas literalmente**, sin parafrasear.

---

## 12. Test de precio

**€50 nunca se presenta como precio oficial** — €25/€50/€75/€100 siguen siendo `HIPÓTESIS` experimentales (`DECISION_LOCK_ECONOMIC_MODEL_V1.md` §6, `LOCKED` como metodología, no como cifra).

Primero se descubre el valor (§9-11). Solo después: *"Si una herramienta así te ayudara realmente a conseguir más recurrencia y gestionar esos clientes, ¿qué pagarías aproximadamente al mes?"* — y solo si hace falta, se usan los rangos como anclaje experimental.

Se registra: precio espontáneo, reacción a €25, a €50, a €75, a €100, objeción, condición necesaria para pagar. **Ninguna reacción positiva se interpreta como compra.**

---

## 13. Test de usuarios

**No se pregunta** "¿cuántos usuarios podrías conseguir para VIAO?" directamente. Primero se descubre: clientes totales, clientes activos, nuevos clientes/mes, clientes recurrentes, frecuencia, tamaño de la base actual. Solo después se pregunta si estaría dispuesto a incorporar clientes reales a un piloto. **La cifra sale del Partner — no se asumen 500 usuarios/Partner**, coherente con `FASE_H` §5 y `DECISION_LOCK_ECONOMIC_MODEL_V1.md` §8.

---

## 14. Evidencia — clasificación

🔴 **NO VALIDADO**: sin problema real reconocido, sin datos compartidos, sin aceptar ningún paso siguiente.
🟡 **SEÑAL POSITIVA**: problema real identificado, valor reconocido, acepta estudiar la propuesta o discutir precio, sin compromiso todavía.
🟢 **VALIDACIÓN FUERTE**: acepta piloto concreto, financia el Reward, acepta precio/rango, aporta usuarios reales, o se compromete a una acción con fecha.

**Un "sí, me interesa" sin siguiente acción concreta nunca es validación fuerte.**

---

## 15. Ficha operativa (lista para copiar/usar)

```
ID:
FECHA:
SECTOR:
NEGOCIO:
DECISOR:
EMPLEADOS:
CLIENTES TOTALES:
CLIENTES ACTIVOS:
CLIENTES NUEVOS/MES:
FRECUENCIA:
TICKET MEDIO:
FIDELIZACIÓN ACTUAL:
PROBLEMA LITERAL (cita textual):
COSTE ACTUAL (cita textual):
VALOR DE VISITA ADICIONAL (cita textual):
REWARD PROPUESTO (cita textual):
COSTE APROXIMADO DEL REWARD:
FINANCIA REWARD (sí/no/condicionado):
PRECIO ESPONTÁNEO:
REACCIÓN A €25 / €50 / €75 / €100:
USUARIOS POTENCIALES (cifra dada por el Partner):
ACEPTA PILOTO (sí/no/condicionado):
PRÓXIMO PASO:
OBJECIONES:
CITAS TEXTUALES RELEVANTES:
INTERPRETACIÓN (nuestra, separada de lo anterior):
SCORE:
NIVEL: 🔴 / 🟡 / 🟢
```

**Separación obligatoria, siempre**: hecho dicho por el Partner ≠ nuestra interpretación — nunca en el mismo campo.

---

## 16. Score (herramienta de priorización, no ciencia)

0-5 en: problema real, capacidad económica, frecuencia, potencial de usuarios, interés, financiación del Reward, disposición a pagar. **El score no sustituye la evidencia de la ficha (§15) ni el nivel 🔴🟡🟢 (§14)** — solo ordena a quién seguir primero.

---

## 17. Matriz de resultados

| Partner | Sector | Clientes | Problema | Valor | Reward | Financia Reward | Precio | Usuarios | Piloto | Objeciones | Score | Nivel |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | |

---

## 18. Decision Gate

**GATE A — VALIDADO**: evidencia repetida y concreta en varios Partners (varios 🟢).
**GATE B — SEÑAL MIXTA**: problema real presente, pero falla precio, Reward, ICP, valor o usuarios.
**GATE C — NO VALIDADO**: no aparece suficiente problema, valor, financiación ni disposición a pagar.

**Ningún Gate modifica el producto automáticamente** — tras el Gate se abre una decisión separada, en su propio turno.

---

## 19. Qué no debemos hacer durante el experimento

No cambiar precios del producto; no programar funcionalidades; no crear Rewards nuevos; no modificar `RW1-RW6`; no modificar `L12`; no cambiar el modelo económico `LOCKED`; no crear marketplace; no crear Discovery; no volver a Travel/Hotels; no adaptar producto tras una sola conversación; no seleccionar solo respuestas positivas.

---

## 20. Control contra sesgo

Registrar también las respuestas negativas; no eliminar Partners que rechacen; no reinterpretar objeciones a favor; conservar citas textuales; no convertir opinión en evidencia; no cambiar las preguntas para conseguir un "sí"; comparar sectores entre sí; registrar el número total de contactos, no solo las conversaciones exitosas.

---

## 21. Métricas del experimento

Contactados · Respondieron · Conversaciones · Problema real identificado · Aceptan conocer VIAO · Aceptan piloto · Financian Reward · Dispuestos a pagar · Precio indicado · Usuarios aportables · Siguiente acción concreta. **Los ratios se calculan solo cuando existan datos reales — ningún número se inventa aquí.**

---

## 22. Criterio de parada

Se detiene temporalmente la ronda de entrevistas para analizar evidencia cuando ya hay suficientes fichas completas para aplicar el Decision Gate (§18) con confianza razonable — orientativamente, tras las 4-5 fichas completas del objetivo de muestra (§4). **No se declara validación a partir de una muestra anecdótica** (1-2 conversaciones), ni se sigue entrevistando indefinidamente una vez la evidencia ya es suficiente para decidir.

---

## 23. Resultado esperado

El resultado de FASE I **no debe ser** "VIAO es una buena idea". Debe tener la forma de: *"El segmento X muestra evidencia Y bajo las condiciones Z"*, o *"No existe evidencia suficiente para justificar continuar con este modelo tal como está planteado"*. La conclusión se basa únicamente en los datos recogidos en las fichas (§15) y la matriz (§17).

---

## 24. Siguiente paso

Tras completar las conversaciones, **no se programa de inmediato**. Primero: (1) consolidar evidencia, (2) comparar sectores, (3) analizar precio, (4) analizar Reward, (5) analizar usuarios/Partner, (6) analizar objeciones, (7) ejecutar el Decision Gate (§18), (8) crear posteriormente un Decision Lock si corresponde — en su propio turno, con autorización explícita.

---

## 25. HARD STOP

HARD STOP.

FASE I queda preparada para ejecución manual.
No se ha contactado ningún Partner.
No se ha modificado código.
No se ha modificado Supabase.
No se ha modificado Vercel.
No se han modificado RW1-RW6.
No se ha modificado L12.
No se ha modificado el modelo económico LOCKED.
No se ha modificado producto.
No se ha creado ninguna nueva decisión.

La siguiente acción autorizable será ejecutar el experimento y registrar evidencia real.
