---
STATUS: CURRENT
ERA: Esta sesión
DOMAIN: B2C/Producto
AUTHORITY: Fuente de verdad B2C — contiene 3 hallazgos CONTRADICTION FOUND frente al código real de Home, reportados y no resueltos
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-25
---

# VIAO — Definición Oficial del Producto B2C

### Estado: DOCUMENTO DE REFERENCIA — cierra el bloque B2C. No autoriza ninguna implementación por sí mismo.
### Fecha: 2026-08-25.
### Continúa de: `docs/01_CURRENT/product/VIAO_MASTER_PRODUCT_CONTEXT.md` (contexto global), la investigación comercial de Partners, y la auditoría B2C de esta sesión (3 contradicciones encontradas, referenciadas aquí, no repetidas íntegras).
### Taxonomía obligatoria: `FACT` (verificado en código/schema real) · `DECISION` (decidido explícitamente, con fuente) · `LOCKED` (no reabrir salvo contradicción real) · `PROPOSAL` (recomendado, no aprobado) · `VALIDATION` (necesita evidencia) · `FUTURE` (previsto, no actual) · `FROZEN` (existe, no se trabaja ahora) · `DEPRECATED` · `CONTRADICTION` (código/UX contradice la decisión documentada — reportada, no corregida aquí).

---

## 1. Definición B2C

> **VIAO ayuda a que la vida cotidiana del usuario genere progreso hacia objetivos que realmente le importan.**

```
Usuario → actividad cotidiana → Points → los acumula → avanza hacia un Goal → ve progreso → vuelve → repite
```

**El Goal es libre por diseño, no solo por intención** — `FACT`, verificado directamente:
- `supabase/migrations/20260823153000_create_goals.sql`: `title text NOT NULL`, `target_points integer`, `target_date date` (opcional). **Sin ninguna columna ni FK relacionada con viaje, hotel o `trips`.**
- `lib/goals/create-goal.ts`: el único campo de texto (`title`) se valida solo por no estar vacío (`input.title.trim()`) — sin ninguna validación temática.

Por tanto, un Goal puede representar viaje, compra, experiencia, curso, producto, ahorro puro o cualquier otro objetivo expresado por el usuario — `FACT`, no una aspiración.

**Matiz obligatorio** (`CONTRADICTION`, ver sección 7): aunque el **schema** ya es genérico, la **experiencia visible hoy** sigue anclando el ejemplo de Goal a "viaje" en varios puntos — esto no invalida el `FACT` anterior, pero significa que el desacoplamiento es real en el backend y todavía incompleto en superficie.

---

## 2. Papel de cada pieza

| Componente | Papel B2C | Estado | Dependencia |
|---|---|---|---|
| **Goal** | Destino del progreso — libre, elegido por el usuario | `LOCKED` (genérico, `GOAL_PROGRESS_MODEL=WALLET_BALANCE`) | Ninguna — no depende de Partners ni de Travel |
| **Points** | Unidad interna de progreso/recompensa, **nunca dinero** | `LOCKED` | Ledger `rewards_transactions` |
| **Rewards** | Mecanismo de canje — cambiar Points por algo tangible | `LOCKED` (canjear reduce visiblemente el progreso del Goal, tensión deliberada — `VIAO_GOALS_V1_DECISION_LOCK.md`) | Ninguna |
| **Missions** | Motor de hábito y engagement — generación de Points sin depender de gasto real | `LOCKED` la existencia; `VALIDATION`/`OPEN` el contenido exacto (sección 3) | Independiente de Partners |
| **Partners** | Fuente de actividad económica real que puede generar Points | `LOCKED` (Master V2, Technical Spec) | Depende de densidad de usuarios reales (`VALIDATION`) |
| **Partner Activities** | Puente entre actividad real, Points del usuario y valor para el Partner | `LOCKED` (schema, RPC diseñados; migración `PENDIENTE`) | Depende de `Partners` |
| **Attribution** | Cómo VIAO sabe que una actividad es real y de quién | `LOCKED` (QR/reserva, `complete_partner_activity()`) | `Partner Activities` |
| **Recurrence** | Métrica que demuestra que el modelo funciona, en ambos lados | `LOCKED` conceptualmente; `VALIDATION` si ocurre en la práctica | `Partner Activities` |
| **Trips** | Destino opcional del progreso, no núcleo | `FROZEN` — `FACT`: tabla independiente, sin FK a `goals` | Ninguna |
| **Vision** | Traductor de texto en contexto de viaje (no OCR de recibos) | `FROZEN` | Ninguna hoy con Partners |
| **Search** | Búsqueda de hoteles | `FROZEN` en backend; **activo en superficie** (ver sección 7) | `HotelProvider` |
| **Bookings** / **Booking Intents** | Arquitectura de reserva real | `FROZEN`, sin activar | `TravelProvider`/`HotelProvider` |

---

## 3. Missions — estado real

`FACT`, verificado en `lib/missions/rules.ts` y `supabase/migrations/20260824101000_create_complete_mission_rpc.sql`:

| `mission_key` | Points | Periodicidad | Estado |
|---|---|---|---|
| `search_started` | 10 | Semanal | **Acoplada a Travel — identificada para sustitución/generalización** |
| `hotel_viewed` | 10 | Semanal | **Acoplada a Travel — identificada para sustitución/generalización** |
| `return_visit` | 10 | Semanal | Genérica, sin cambios |
| `goal_created` | 50 | `lifetime` | Genérica en backend; el copy mostrado dice "objetivo de **viaje**" (`CONTRADICTION`, sección 7) |

**`VALIDATION` / `OPEN DECISION`**: qué Missions concretas sustituyen a `search_started`/`hotel_viewed` — no decidido aquí, no se inventan en este documento.

**`LOCKED`, no reabrir**: **no existen ni se construirán Missions específicas de Partner** — decisión ya tomada en la investigación comercial (ninguna Partner Mission aporta valor incremental sobre lo que ya aportan Rewards+Goals+atribución directamente).

---

## 4. Conexión B2C + Partners — la pieza central

```
B2C:  Usuario → actividad → Partner Activity → Points → Goal → progreso → repetición
B2B:  Partner → actividad confirmada → atribución → cliente nuevo/recurrente → dashboard → valor económico
```

**`partner_activities` es el puente único** — `LOCKED`, `FACT` de diseño (Technical Spec): la misma fila real:
- genera Points para el usuario (vía `rewards_transactions`, `reason='partner_activity'`);
- puede contribuir al progreso de su Goal (`WALLET_BALANCE` lee el saldo total, sin distinguir origen);
- permite a VIAO atribuir la actividad (QR/reserva);
- permite al Partner saber que existe actividad real;
- permite medir recurrencia en ambos sentidos (el mismo dato).

**No son dos sistemas separados.** `LOCKED`, no reabrir: **Partners no controla Missions** — son motores independientes que confluyen en el mismo ledger de Points, nunca se cruzan a nivel de lógica.

---

## 5. Qué ofrecemos al usuario ahora

> *"Si VIAO ya no vende viajes/hoteles como razón principal, ¿qué recibe el usuario?"*

VIAO ofrece un sistema para convertir actividad cotidiana en progreso visible hacia objetivos personales. El usuario no entra únicamente para reservar un hotel — entra para: definir algo que quiere conseguir, acumular Points, avanzar hacia ese objetivo, mantener el hábito, descubrir actividades/Partners que contribuyen, y volver a seguir progresando.

**Travel queda como uno de los posibles destinos del progreso, no como la razón de entrada.** `DECISION`, turno "Nueva dirección de producto" de esta sesión.

**Explícitamente, esto NO es**: una app de ahorro financiero, ni promete dinero real por los Points (`LOCKED`, Points≠dinero, sin excepciones).

---

## 6. Qué pasa con Travel

**Travel NO se elimina. Travel queda `FROZEN`.**

Arquitectura intacta, sin tocar en ningún turno de esta sesión: `Trips`, `TravelProvider`, `HotelProvider`, `MockHotelProvider`, `HotelbedsProvider`, `Search`, `Bookings`, `Booking Intents`, `Vision`.

**Travel = capacidad futura / vertical futura, no razón central del producto actual.** `DECISION`, sin ambigüedad.

---

## 7. Contradicciones actuales — reportadas, no corregidas

Verificadas directamente contra el código en la auditoría B2C de esta sesión:

1. **`CONTRADICTION FOUND` / `UX-COPY GAP`**: la Mission `goal_created` (backend genérico) muestra al usuario el texto **"Definir tu objetivo de viaje"** (`lib/missions/rules.ts:39`) — no "objetivo" genérico.
2. **`CONTRADICTION FOUND` / `UX-COPY GAP`**: la sección "Cuando estés listo para viajar" sigue visible y funcional en toda carga de Home (`app/page.tsx:277-300`), no oculta ni condicionada.
3. **`CONTRADICTION FOUND` / `UX-COPY GAP`**: `TripHero` sigue siendo el elemento más grande y protagonista de Home cuando el usuario tiene un Trip activo (`app/page.tsx:91-127, 185-186`).

**Lectura correcta, explícita**: la arquitectura ya es genérica (`FACT`, verificado en schema/RPC). La experiencia visible todavía conserva restos reales del posicionamiento Travel. No son errores de código — son superficie pendiente de actualizar, en el momento que se decida (sección 9).

---

## 8. Qué está LOCKED (referenciado, no copiado)

- Nuevo propósito general — `DECISION`, esta sesión.
- Goals genéricos, sin acoplamiento a Travel — `FACT` + `LOCKED`.
- `GOAL_PROGRESS_MODEL = WALLET_BALANCE` — `docs/02_DECISION_LOCKS/goals/VIAO_GOALS_V1_DECISION_LOCK.md`, **APPROVED/IMPLEMENTED**.
- Rewards ledger (`rewards_transactions`), Points ≠ dinero — decisión histórica del proyecto.
- Partners como motor B2B, Partner Activities, Attribution — `docs/01_CURRENT/partners/VIAO_PARTNERS_MASTER_V2.md` (L1-L19), `docs/01_CURRENT/partners/VIAO_PARTNERS_TECHNICAL_SPEC.md`.
- P1-P8 (Decision Lock Económico) — Technical Spec sección 25.
- No Partner Missions — investigación comercial de Partners, esta sesión.
- Beta Partners 3-5, onboarding manual/curado, Beta gratis, categorías Restaurantes+Experiencias, atribución QR+Reserva — Master V2 L1-L6.

---

## 9. Qué está abierto

**`VALIDATION`** (necesita evidencia, no decisión):
- Densidad real de usuarios VIAO por zona — el riesgo más importante identificado en toda la investigación de Partners.
- Recurrencia real (Value Event) con Partners piloto.
- Disposición real a pagar (€49/€79, `PROPOSAL` no `LOCKED`).
- Comportamiento real de usuarios ante Goals no-Travel.

**`OPEN DECISION`** (pendiente de decidir, no de evidenciar):
- Nuevas Missions que sustituyan a `search_started`/`hotel_viewed`.
- Definición formal del Value Event como métrica propia.
- Cuándo corregir el copy/UX de Home (sección 7) — antes o después de Beta de Partners.
- Precio final post-Beta.
- Arquitectura de acceso Partner V1+ (Technical Spec 11.4).

---

## 10. Do Not Build

Partner Missions, CRM completo, POS, reservas reales, integraciones Booksy/Fresha, IA (texto/voz), WhatsApp automatizado, multi-location, OCR (antes de V1.1), múltiples planes de precio, nueva arquitectura B2C.

**Regla adicional**: no volver a construir funcionalidades de Travel simplemente porque el código ya existe — su existencia no es una justificación de prioridad.

---

## 11. Mapa final del producto

```
                              VIAO

              ┌──────────────── B2C ────────────────┐
              │                                       │
           Usuario                                  Goal
              │                                       ↑
              ↓                                       │
         Actividad ──→ Points ────────────────────────┘
              │
              ↓
       Partner Activity
              │
              ├────────→ Rewards (canjear resta progreso)
              │
              └────────→ Partner
                            │
                            ↓
                      Attribution
                            ↓
                   Nuevo / Recurrente
                            ↓
                       Dashboard

           Missions (independiente de Partners)
                │
                ↓
          Hábito / retorno
                │
                ↓
              Points

    Travel = vertical FROZEN al lado — no núcleo del loop.
```

---

## 12. Veredicto final

**El modelo B2C actual de VIAO no necesita reconstruirse.** El núcleo ya existe: Goals + Points + Rewards + Missions. Partners añade la dimensión de actividad económica real. `partner_activities` es el puente único entre ambos — no dos sistemas paralelos.

**B2C = motor de usuario. Partners = motor de actividad económica + monetización B2B. `partner_activities` = el puente.** Travel = vertical futura, congelada, no eliminada.

La prioridad no es diseñar otro producto. La prioridad es: (1) conservar esta definición como fuente de verdad; (2) resolver las 3 contradicciones de UX/copy en el momento que se decida, no antes de decidirlo; (3) definir las nuevas Missions cuando corresponda; (4) conectar la implementación real de Partners (migración pendiente) con este modelo ya definido; (5) validar usuarios → actividad → recurrencia → valor → disposición a pagar, con datos reales, no con más documentos.

---

## Fuentes

`docs/01_CURRENT/product/VIAO_MASTER_PRODUCT_CONTEXT.md`, `docs/02_DECISION_LOCKS/goals/VIAO_GOALS_V1_DECISION_LOCK.md`, `docs/01_CURRENT/partners/VIAO_PARTNERS_MASTER_V2.md`, `docs/01_CURRENT/partners/VIAO_PARTNERS_TECHNICAL_SPEC.md`, `docs/03_RESEARCH_VALIDATION/partners_commercial/VIAO_PARTNERS_B2B_VALUE_PROPOSITION.md`, `docs/03_RESEARCH_VALIDATION/partners_commercial/VIAO_PARTNERS_B2B_AI_STRATEGY.md` — más código real verificado directamente: `supabase/migrations/20260823153000_create_goals.sql`, `lib/goals/create-goal.ts`, `lib/goals/get-goal.ts`, `lib/missions/rules.ts`, `supabase/migrations/20260824101000_create_complete_mission_rpc.sql`, `app/page.tsx`.

---
