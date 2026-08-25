# VIAO — Gobernanza documental

### Estado: CURRENT — regla operativa, no una decisión de producto.
### Fecha: 2026-08-25.
### Origen: extiende un precedente ya existente en el propio repositorio — `docs/99_ARCHIVE_V1/checkpoints/VIAO_V1_EXECUTION_LOCK.md` (24/08) ya definía una jerarquía de autoridad parcial que nadie volvió a aplicar formalmente después. Esta regla la retoma y la completa.

---

## Principios

1. **Código real + tests + migraciones = autoridad técnica final.** Ante cualquier discrepancia entre un documento y el código, el código gana.
2. **`LOCKED` = decisión de producto vigente.** No se reinterpreta, no se reabre salvo contradicción real evidenciada.
3. **`CURRENT`/V2 = documentación vigente, no necesariamente `LOCKED`.** Puede contener secciones `LOCKED`, `PROPOSAL`, `OPEN` o `BLOCKED` mezcladas — cada afirmación se etiqueta por separado, no el documento entero.
4. **`VALIDATION` = investigación, no decisión.** No se cita como si fuera un hecho decidido.
5. **`PROPOSAL` = propuesta, no decisión.** Cualquier implementación debe señalar qué documento `LOCKED` la autoriza, nunca una `PROPOSAL` directamente.
6. **`HISTORICAL`/V1 = contexto histórico.** Se conserva, se archiva, nunca se borra ni se reescribe.
7. **Toda decisión nueva debe indicar, en su propia cabecera o en su primera sección, qué documento sustituye** (aunque sea parcialmente) — el coste de no hacerlo es exactamente el que produjo el hallazgo `VIAO_PARTNERS_MASTER.md`/`VIAO_PARTNERS_MASTER_V2.md` de esta auditoría.
8. **No se elimina documentación histórica.** Se archiva en `99_ARCHIVE_V1/`.
9. **La supersesión parcial se marca solo en la sección afectada**, nunca invalidando un documento completo cuando solo una parte quedó obsoleta (caso `VIAO_V1_LOOP_DECISION.md`, ver más abajo).
10. **V1 y CURRENT no se mezclan en un mismo documento**, salvo referencias explícitas y trazables.
11. **Un checkpoint es un snapshot, no una fuente permanente de verdad.** Queda automáticamente superseded por el siguiente checkpoint; debe existir un único lugar conocido (el índice de `01_CURRENT/`) que diga cuál es el vigente ahora.
12. **Los nombres de archivo NO determinan autoridad por sí solos.** `VIAO_PREMIUM_DESIGN_UX_V1.md` contiene "V1" en el nombre y es `CURRENT`/`PROPOSAL`, no histórico — la clasificación se hace por contenido y evidencia, nunca por convención de nombre.
13. **Un documento en `STATUS: REVIEW REQUIRED` no se trata como fuente de verdad de nada**, ni siquiera del subconjunto de su contenido que parezca no conflictivo — se cita como lo que es (candidato sin resolver), nunca como base de una decisión de implementación, hasta que su estado cambie explícitamente.

## Jerarquía de conflicto

`LOCKED` > `CURRENT/V2` > `V1/HISTORICAL`, salvo que un Decision Lock posterior diga explícitamente lo contrario. El código real es la autoridad última en cualquier caso (principio 1).

## Cabecera de metadata estándar

Todo documento movido en esta reorganización lleva, justo debajo del título, un bloque:

```
---
STATUS:
ERA:
DOMAIN:
AUTHORITY:
SUPERSEDES:
SUPERSEDED BY:
LAST REVIEWED:
---
```

Campo no determinable → `UNKNOWN` / `REVIEW REQUIRED`. Nunca se rellena con una suposición.

## Documentos en `docs/` raíz — no movidos todavía

Estos 3 documentos permanecen en `docs/` (raíz), sin mover. Cada uno lleva ya su propia cabecera de metadata y nota explicativa in situ:

1. **`docs/VIAO_PARTNERS_MASTER.md`** — `STATUS: HISTORICAL / SUPERSEDED PARTIALLY`. Confirmado por evidencia textual directa (`VIAO_PARTNERS_MASTER_V2.md` lo llama "versión 1, hipótesis inicial, superada parcialmente donde entran en conflicto"). La cofinanciación 50/50 (§11) queda `DEPRECATED` vía `VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md`; atribución y arquitectura evolucionaron en `VIAO_PARTNERS_MASTER_V2.md`/`VIAO_PARTNERS_TECHNICAL_SPEC.md`; el resto (mini-web, análisis OCR, comparativa de modelos de ingresos, guiones comerciales) no está sustituido y se conserva como referencia histórica. Archivarlo formalmente a `99_ARCHIVE_V1/` sigue pendiente de tu confirmación explícita.
2. **`docs/VIAO_V1_LOOP_DECISION.md`** — `STATUS: SUPERSEDED PARTIALLY`. Solo 3 decisiones puntuales están sustituidas (cofinanciación 50/50, "sin dashboard", QR/token rotativo → todas por `VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md`) más `vision_used` como Mission (→ `VIAO_V1_EXECUTION_LOCK.md`). El resto del documento — el loop estratégico general — permanece vigente/referencial. No se archiva todavía.

## Documentos `REVIEW REQUIRED`

Solo queda uno — ver también la sección "Documentos pendientes de decisión" abajo:

1. **`docs/VIAO_MVP_MASTER.md`** — `STATUS: REVIEW REQUIRED`. Solapa en propósito con `docs/01_CURRENT/product/VIAO_MASTER_PRODUCT_CONTEXT.md`, pero ninguno de los dos documentos referencia al otro y no existe evidencia textual que determine cuál manda. No se trata como fuente de verdad mientras conserve este estado — ver principio de gobernanza correspondiente más abajo.

## Documentos pendientes de decisión

1. `VIAO_MVP_MASTER.md` — relación con `VIAO_MASTER_PRODUCT_CONTEXT.md` pendiente de decisión.

## Gap identificado — sin resolver en este bloque

**No existe un documento `CURRENT` dedicado para Rewards ni para Missions.** Ambos dominios solo tienen: código real (`lib/rewards/`, `lib/missions/rules.ts`) y menciones dispersas dentro de otros documentos (`docs/99_ARCHIVE_V1/checkpoints/` y `docs/01_CURRENT/product/VIAO_MASTER_PRODUCT_CONTEXT.md`). Las carpetas `docs/01_CURRENT/rewards/`, `docs/01_CURRENT/missions/`, `docs/02_DECISION_LOCKS/rewards/` y `docs/02_DECISION_LOCKS/missions/` existen vacías intencionalmente — son el marcador visible de este hueco, no un error de la estructura. Crear esos documentos es una tarea futura, no autorizada aquí.
