---
STATUS: CURRENT
ERA: Fase H — Diseño de validación comercial (post Decision Lock económico)
DOMAIN: Validación comercial / Partners
AUTHORITY: Diseño de experimento comercial. NO es un Decision Lock — ninguna hipótesis de este documento se convierte en decisión hasta ejecutar el experimento y revisar la evidencia real. No modifica RW1-RW6, L12, ni DECISION_LOCK_ECONOMIC_MODEL_V1.md.
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-27
---

# VIAO — FASE H: DISEÑO DE VALIDACIÓN COMERCIAL PARTNER V1

*No existía ningún documento equivalente en `docs/validation/` — carpeta y archivo nuevos.*

---

## 1. Documento

Creado en `docs/validation/FASE_H_VALIDACION_COMERCIAL_PARTNER_V1.md`. Solo diseño — ningún contacto real, ninguna implementación, ningún cambio de precio en producto.

---

## 2. Pregunta central

> ¿Existe un tipo de Partner real dispuesto a pagar por VIAO y a financiar Rewards porque obtiene suficiente valor comercial a cambio?

No se busca gustar. Se busca comportamiento e intención comercial real.

---

## 3. Hipótesis principales (todas `HIPÓTESIS`, ninguna hecho)

**H1**: existe un segmento de pequeños/medianos negocios locales con valor suficiente para pagar una cuota mensual.
**H2**: el Partner está dispuesto a financiar Rewards para sus propios clientes.
**H3**: el Partner puede aportar una cantidad relevante de usuarios/clientes.
**H4**: el valor percibido se relaciona con captación, recurrencia, fidelización, engagement, tráfico, recompensas, relación con clientes.
**H5**: el Partner podría preferir financiar él mismo el Reward antes que depender de que VIAO lo financie.

---

## 4. ICP inicial — comparación de 5 categorías candidatas

*(No se asume ningún ganador de antemano — barbería no es automáticamente el ICP.)*

| Categoría | Frecuencia | Recurrencia | Margen p/Reward | Facilidad contacto | Cantidad clientes | Necesidad fidelización | Facilidad medir resultado | Capacidad decidir gasto | Compat. QR/Reward | Potencial Partner |
|---|---|---|---|---|---|---|---|---|---|---|
| Cafetería/panadería | Alta | Alta | Bajo-medio | Alta | Alta | Media | Alta | Alta | Alta | **Alto** |
| Peluquería/barbería | Media-baja | Muy alta | Medio-alto | Alta | Media | Alta | Media | Alta | Alta | **Alto** |
| Restaurante de barrio | Media | Media-alta | Medio | Media | Media | Media | Alta | Media | Alta | Alto |
| Estética/belleza | Media-baja | Media | Alto | Media | Media | Alta | Media | Alta | Alta | Medio-alto |
| Gimnasio/estudio pequeño | Alta uso, baja transacción | Alta | Medio | Media | Media | Alta si nuevo | **Baja** (modelo suscripción, no transacción) | Media | **Baja** | Bajo |

**Candidatos primarios para el experimento**: **cafetería/panadería** y **peluquería/barbería** — empatan como los mejores según los 10 criterios, cada uno por razones distintas (la primera por facilidad de medir y alta frecuencia; la segunda por recurrencia muy alta y capacidad de decisión del dueño). **Restaurante de barrio** queda como tercer candidato válido. **Gimnasio** queda deliberadamente deprioritizado — el propio criterio de compatibilidad QR/Reward y facilidad de medir resultado lo penaliza, coherente con hallazgos ya establecidos en bloques anteriores de esta sesión sobre el desajuste entre el mecanismo de actividad y un modelo de suscripción.

---

## 5. Perfil del Partner ideal

| Característica | Valor esperado | Estado |
|---|---|---|
| Tipo de negocio | Cafetería/panadería o peluquería/barbería, local independiente | `HIPÓTESIS` |
| Tamaño | 1-5 empleados | `DATO A VALIDAR` |
| Clientes activos | `DATO A VALIDAR` — este es exactamente lo que el experimento debe descubrir |
| Frecuencia de compra del cliente medio | Alta (café) o media-baja (peluquería) | `HIPÓTESIS`, por categoría |
| Ticket medio | `DATO A VALIDAR` |
| Empleados | Pocos, dueño presente en el local | `HIPÓTESIS` |
| Capacidad de decisión | El propio dueño decide, sin aprobación externa | `HIPÓTESIS` |
| Problema actual | No sabe con certeza quién repite y quién no | `HIPÓTESIS` |
| Fidelización actual | Ninguna, o informal (tarjeta de sellos, WhatsApp) | `HIPÓTESIS` |
| Disposición a probar algo nuevo | `DATO A VALIDAR` |

---

## 6. Qué debemos descubrir

**A. Problema**: ¿Cómo consigues que un cliente vuelva? ¿Cómo sabes quién vuelve? ¿Qué haces hoy para fidelizar? ¿Qué problema tienes con clientes que no regresan? ¿Cuánto vale para ti una visita adicional?

**B. Economía**: ¿Pagas hoy por captar clientes? ¿Pagas hoy por fidelización? ¿Cuánto, aproximadamente? ¿Qué tendría que producir una herramienta para que pagaras mensualmente por ella?

**C. Usuarios** (nunca sugerir una cifra): ¿Cuántos clientes tienes? ¿Cuántos activos? ¿Cuántos nuevos entran al mes? ¿Cuántos repiten? ¿Qué % aproximado repite?

**D. Rewards**: ¿Qué recompensa tendría sentido para tus clientes? ¿Descuento, servicio, producto, experiencia, otra cosa? ¿Estarías dispuesto a financiarla tú? ¿Cuánto te parecería razonable destinar?

**E. Precio**: nunca preguntar solo "¿pagarías €50?" — descubrir primero el valor (A-D), y solo entonces probar €25/€50/€75/€100 como hipótesis, nunca como precio anunciado.

---

## 7. Evitar sesgo

**No usar** como evidencia principal: "¿Te parece buena idea?", "¿Te gustaría tener esto?", "¿Usarías VIAO?". **Priorizar**: "¿Cómo lo haces hoy?", "¿Cuánto te cuesta?", "¿Qué has probado?", "¿Qué ocurrió?", "¿Qué pagarías hoy por resolverlo?", "¿Qué tendría que pasar para que cambiaras?". Comportamiento pasado siempre por delante de intención futura.

---

## 8. Señales de validación

🔴 **NO VALIDADO**: interés verbal sin continuidad; no acepta prueba; no comparte datos; no considera pagar.
🟡 **SEÑAL POSITIVA**: identifica un problema real; reconoce valor; acepta estudiar la propuesta o una prueba; acepta discutir precio; interés concreto.
🟢 **VALIDACIÓN FUERTE**: acepta un piloto con condiciones concretas; acepta financiar el Reward; acepta un precio o rango; aporta usuarios/clientes reales; o se compromete a pagar/firmar cuando el producto esté listo.

**"Me gusta" nunca es validación fuerte.**

---

## 9. Criterio de éxito

Medir: negocios contactados → responden → tienen problema real → aceptan conocer la solución → aceptan piloto → aceptan financiar Reward → dispuestos a pagar → precio/rango aceptado → usuarios/clientes potenciales por Partner.

**Tamaño de muestra recomendado para un fundador único, validación manual**: 20 negocios contactados, apuntando a 8-10 conversaciones reales y 4-5 con evidencia completa (ficha llena) — coherente con el plan de captación ya diseñado en bloques anteriores de esta sesión, reutilizado aquí sin rediseñarlo.

---

## 10. Ficha de registro

```
ID:
FECHA:
SECTOR:
TIPO DE NEGOCIO:
TAMAÑO (empleados):
CLIENTES ACTIVOS:
CLIENTES NUEVOS/MES:
FRECUENCIA DE COMPRA:
SISTEMA DE FIDELIZACIÓN ACTUAL:
PROBLEMA PRINCIPAL (HECHO DICHO POR EL PARTNER):
COSTE ACTUAL DE RESOLVERLO (HECHO DICHO POR EL PARTNER):
REWARD QUE CONSIDERA ATRACTIVO (HECHO DICHO POR EL PARTNER):
DISPOSICIÓN A FINANCIAR REWARD (HECHO DICHO POR EL PARTNER):
PRECIO CONSIDERADO RAZONABLE (HECHO DICHO POR EL PARTNER):
USUARIOS POTENCIALES (HECHO DICHO POR EL PARTNER):
INTERÉS (NUESTRA INTERPRETACIÓN):
OBJECIONES:
PRÓXIMO PASO:
NIVEL DE VALIDACIÓN (🔴/🟡/🟢):
NOTAS:
```

La ficha separa explícitamente **lo que el Partner dijo** de **nuestra interpretación** — nunca se mezclan en el mismo campo.

---

## 11. Score de Partner (0-5, herramienta de priorización, no evidencia)

| Dimensión | 0-5 |
|---|---|
| Problema real identificado | |
| Capacidad económica | |
| Frecuencia de compra de sus clientes | |
| Potencial de usuarios aportados | |
| Interés mostrado | |
| Disposición a financiar Reward | |
| Disposición a pagar | |

El score ordena a quién seguir primero — **nunca sustituye la evidencia cualitativa de la ficha** (sección 10) ni el nivel 🔴/🟡/🟢 (sección 8).

---

## 12. Guion comercial (natural, no corporativo)

1. **Apertura**: "Hola, soy Andrés, tengo un proyecto para negocios como el tuyo, ¿tienes un minuto?"
2. **Contexto**: "Estoy hablando con dueños de negocios de la zona antes de construir nada más — quiero entender cómo funciona tu día a día."
3. **Problema**: "¿Cómo consigues que un cliente vuelva? ¿Sabes cuántos repiten?"
4. **Comportamiento actual**: "¿Haces algo hoy para eso — tarjeta, WhatsApp, nada?"
5. **Economía**: "¿Gastas algo en eso hoy? ¿Cuánto, más o menos?"
6. **Clientes**: "¿Cuántos clientes tienes, más o menos? ¿Cuántos dirías que repiten?"
7. **Rewards**: "Si pudieras dar algo a un cliente que vuelve varias veces, ¿qué le darías? ¿Lo pagarías tú?"
8. **Presentar VIAO** (máx. 30 segundos, sección 13).
9. **Precio**: "Si esto tuviera un coste aproximado de €50/mes, ¿te parece razonable, alto, bajo?"
10. **Objeciones**: escuchar sin defender, anotar literal.
11. **Siguiente paso**: proponer una fecha o acción concreta, nunca cerrar a la fuerza.

---

## 13. Presentación de VIAO (máx. 30 segundos)

> "VIAO es una herramienta para que tus clientes habituales ganen puntos con lo que ya consumen normalmente — café, un corte, lo de siempre — y tú defines qué les das a cambio cuando vuelven varias veces. Tú decides el beneficio y lo financias tú; VIAO te da la herramienta para gestionarlo y ver quién repite."

**Nunca** mencionar viajes, hoteles, marketplace de viajes — quedan fuera por completo.

---

## 14. Experimento manual (fases, sin ejecutar todavía)

H1 Selección de ICP (sección 4, ya hecha) → H2 Lista de candidatos reales → H3 Contacto manual → H4 Conversaciones → H5 Registro de evidencia (ficha, sección 10) → H6 Comparación de resultados (matriz, sección 15) → H7 Decisión (Decision Gate, sección 16). **Ninguna fase se ejecuta en este bloque.**

---

## 15. Matriz de resultados (plantilla)

| Partner | Sector | Clientes | Problema | Valor percibido | Reward | Financia Reward | Precio aceptado | Usuarios potenciales | Interés | Prueba | Objeciones | Score | Resultado |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | | |

---

## 16. Decision Gate

**GATE A — VALIDADO**: evidencia suficiente (varios 🟢) → definir modelo comercial V1 → abrir nueva decisión formal → adaptar producto después, no antes.
**GATE B — SEÑAL MIXTA**: interés real pero precio/ICP/Reward equivocado → iterar la propuesta, no programar todavía.
**GATE C — NO VALIDADO**: sin problema real, sin pago, sin financiación de Reward, sin usuarios aportados → reconsiderar ICP/modelo antes de programar nada.

---

## 17. Reglas económicas que no cambian durante FASE H

Partner-funded = modelo principal V1. VIAO-funded = complemento limitado. `RW1-RW6` sin cambios (`RW5` sin cambios, `RW6`=€100/mes). Premium = complementario. €25/€50/€75/€100 = hipótesis. 500 usuarios/Partner = no se asume.

---

## 18. Regla de oro

> "No queremos que el Partner nos diga que le gusta VIAO. Queremos descubrir si tiene un problema por el que está dispuesto a pagar."

> "La evidencia de comportamiento vale más que la opinión."

---

## 19. Siguiente bloque

Tras aprobar este diseño (FASE H), el siguiente bloque será la **EJECUCIÓN del experimento comercial** — no se ejecuta todavía, requiere su propia autorización explícita.

---

## 20. Regla de no implementación

Solo diseño. Ningún código, migración, cambio de Supabase/Vercel, cambio de Rewards/Goals/Missions/Partners, cambio de precio en producto, landing, integración, contacto real con Partners, ni campaña de marketing fue creado o ejecutado para producir este documento. Discovery, Travel y Hotels permanecen fuera de esta propuesta.
