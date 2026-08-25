---
STATUS: HISTORICAL
ERA: V1 / FOUNDATIONAL
DOMAIN: Arquitectura técnica
AUTHORITY: Ninguna — el código real es la fuente técnica actual
SUPERSEDES: —
SUPERSEDED BY: codebase (lib/, supabase/)
LAST REVIEWED: UNKNOWN (documento sin fecha propia)
---

# VIAO — Arquitectura técnica del MVP

**Estado:** Borrador para aprobación — no programar hasta confirmación.
**Fuente:** este documento deriva directamente de [`VIAO_MVP_v0.1.md`](VIAO_MVP_v0.1.md). No añade funcionalidades ni decisiones de negocio no definidas allí.
**Principio:** sencilla, barata, segura, mantenible, mobile-first, preparada para crecer, sin sobreingeniería.

---

## Índice

1. [Principios arquitectónicos](#1-principios-arquitectónicos)
2. [Diagrama general del sistema](#2-diagrama-general-del-sistema)
3. [Estructura de carpetas propuesta](#3-estructura-de-carpetas-propuesta)
4. [Frontend](#4-frontend)
5. [Backend](#5-backend)
6. [Supabase](#6-supabase)
7. [Autenticación](#7-autenticación)
8. [Base de datos](#8-base-de-datos)
9. [TravelProvider / HotelProvider](#9-travelprovider--hotelprovider)
10. [Flujo de búsqueda de alojamientos](#10-flujo-de-búsqueda-de-alojamientos)
11. [Flujo de reserva](#11-flujo-de-reserva)
12. [VIAO AI](#12-viao-ai)
13. [VIAO Vision](#13-viao-vision)
14. [Rewards](#14-rewards)
15. [Wallet](#15-wallet)
16. [Referidos](#16-referidos)
17. [Mi viaje](#17-mi-viaje)
18. [Analytics](#18-analytics)
19. [Storage y fotografías](#19-storage-y-fotografías)
20. [Seguridad](#20-seguridad)
21. [Privacidad](#21-privacidad)
22. [Gestión de secretos y variables de entorno](#22-gestión-de-secretos-y-variables-de-entorno)
23. [Control de costes de OpenAI](#23-control-de-costes-de-openai)
24. [Rate limiting y protección contra abuso](#24-rate-limiting-y-protección-contra-abuso)
25. [Manejo de errores](#25-manejo-de-errores)
26. [Logging](#26-logging)
27. [Testing](#27-testing)
28. [Deployment](#28-deployment)
29. [Desarrollo local](#29-desarrollo-local)
30. [Observabilidad](#30-observabilidad)
31. [Escalabilidad futura](#31-escalabilidad-futura)
32. [Dependencias externas](#32-dependencias-externas)
33. [Riesgos técnicos](#33-riesgos-técnicos)
34. [Decisiones pendientes](#34-decisiones-pendientes)

---

## 1. Principios arquitectónicos

- **Un único proyecto Next.js**, sin microservicios ni infraestructura propia. Supabase y Vercel absorben la mayor parte de la complejidad operativa.
- **El backend es el único que conoce secretos.** El cliente nunca llama directamente a OpenAI ni al proveedor de alojamiento.
- **Abstracción donde hay incertidumbre real** (proveedor de alojamiento — sección 9), no abstracción especulativa en todo lo demás.
- **Todo movimiento económico o de puntos es un registro, nunca un valor editable** (reservas, VIAO Points — secciones 11 y 14).
- **Mobile-first** en todo el frontend, porque el usuario objetivo organiza el viaje desde el móvil (MVP, sección 3).
- **Coste bajo por diseño**: servicios gestionados, sin servidores propios, límites de uso de IA desde el primer commit, no desde una fase posterior.
- **No se construye nada que no esté en `VIAO_MVP_v0.1.md`.** Si una necesidad técnica implica una funcionalidad no definida allí, se para y se pregunta.

---

## 2. Diagrama general del sistema

```
                        ┌─────────────────────────┐
                        │   Cliente (navegador)    │
                        │  Next.js App Router UI   │
                        │  Mobile-first, ES/EN     │
                        └────────────┬─────────────┘
                                     │  (solo llama a VIAO, nunca a terceros)
                                     ▼
                    ┌───────────────────────────────────┐
                    │   Backend VIAO (Next.js)           │
                    │   Server Actions / Route Handlers  │
                    │   - valida sesión y permisos       │
                    │   - rate limiting                  │
                    │   - orquesta todas las llamadas     │
                    │     externas                        │
                    └───┬───────┬───────────┬────────────┘
                        │       │           │
            ┌───────────┘       │           └───────────────┐
            ▼                   ▼                            ▼
   ┌─────────────────┐  ┌───────────────┐          ┌──────────────────────┐
   │    Supabase      │  │  OpenAI API   │          │   TravelProvider      │
   │ Postgres + Auth  │  │ (recomendación │          │        ↓              │
   │   + Storage      │  │  IA + Vision) │          │   HotelProvider       │
   └─────────────────┘  └───────────────┘          │ (proveedor externo,   │
                                                     │  aún sin seleccionar) │
                                                     └──────────────────────┘

   Hosting: Vercel        Analytics: PostHog (cliente + eventos críticos server-side)
```

El cliente nunca es el que decide qué proveedor de IA o de alojamiento se usa: siempre pasa por el backend de VIAO, que centraliza validación, límites y secretos.

---

## 3. Estructura de carpetas propuesta

Estructura orientativa sobre Next.js App Router. No es un esquema cerrado línea por línea — solo la organización mínima necesaria para separar responsabilidades sin sobreingeniería:

```
viao/
├── app/
│   ├── (auth)/                 # login, registro, recuperación
│   ├── search/                 # búsqueda y resultados de alojamientos
│   ├── properties/[id]/        # detalle de alojamiento
│   ├── booking/                # flujo de reserva
│   ├── trips/                  # "Mi viaje"
│   ├── vision/                 # VIAO Vision
│   ├── rewards/                # Wallet + historial
│   ├── profile/                # "Mi VIAO", referidos
│   └── api/                    # Route Handlers (solo donde no basta un Server Action)
│
├── lib/
│   ├── supabase/                # clientes Supabase (server/client), helpers de sesión
│   ├── travel-provider/         # interfaz TravelProvider + HotelProvider (sección 9)
│   ├── openai/                  # wrapper único de llamadas a OpenAI (sección 23)
│   ├── rewards/                 # lógica de ledger de puntos (sección 14)
│   ├── rate-limit/               # utilidades de rate limiting (sección 24)
│   └── analytics/                # helpers de tracking de eventos (sección 18)
│
├── components/                  # componentes UI (shadcn/ui + propios)
├── types/                       # tipos compartidos (TravelProvider, dominio VIAO)
├── supabase/                    # migraciones y configuración de Supabase
└── docs/                        # este documento y el resto de la documentación
```

Ningún módulo de `app/` llama directamente a Supabase/OpenAI/HotelProvider sin pasar por `lib/`.

---

## 4. Frontend

- **Next.js (App Router) + TypeScript**, con Server Components por defecto y Client Components solo donde se necesita interactividad (formularios de búsqueda, captura de imagen en Vision, formularios de reserva).
- **Tailwind CSS + shadcn/ui** para UI consistente sin construir un sistema de diseño propio desde cero.
- **Mobile-first**: layout y componentes diseñados primero para pantalla pequeña (MVP, sección 3).
- **Idiomas (ES/EN)**: la estructura de textos de UI debe estar centralizada (diccionarios/mensajes), no hardcodeada en cada componente, para poder añadir idiomas sin rediseño (MVP, sección 14). No se fija todavía la librería concreta de i18n (sección 34).
- El frontend **nunca** contiene API keys ni llama directamente a OpenAI o al proveedor de alojamiento.

---

## 5. Backend

- **Server Actions** como mecanismo principal para mutaciones iniciadas desde la propia UI de VIAO (búsqueda, reserva, escaneo de Vision, canje de puntos, generación de código de referido).
- **Route Handlers** (`app/api/*`) solo donde se necesite un endpoint HTTP explícito (por ejemplo, si en el futuro el proveedor de alojamiento requiere un webhook, o si algún cliente externo necesita llamar a VIAO).
- Toda Server Action/Route Handler que toque datos sensibles (reservas, wallet, transacciones, referidos) **valida sesión y permisos antes de ejecutar nada**.
- El backend es la única capa que conoce las claves de Supabase (rol de servicio), OpenAI y, en su momento, del proveedor de alojamiento.

---

## 6. Supabase

- Supabase actúa como backend unificado de **base de datos (Postgres), autenticación y almacenamiento**, evitando montar servicios separados.
- Un único proyecto Supabase para el MVP (sin separación multi-tenant ni multi-proyecto).
- Row Level Security (RLS) activo desde el primer día en toda tabla con datos de usuario (sección 20).
- La clave de servicio (`service_role`) de Supabase se usa **solo en el backend**, nunca se expone al cliente.

---

## 7. Autenticación

- **Supabase Auth** gestiona registro, login, logout y recuperación de acceso (MVP, sección 6.1) — VIAO no implementa su propio sistema de credenciales.
- El backend valida la sesión de Supabase en cada Server Action/Route Handler sensible antes de continuar.
- El método concreto de login (email+contraseña, magic link, o ambos) no está fijado — es una decisión de producto/UX pendiente (sección 34), no bloquea el resto de la arquitectura porque Supabase Auth soporta ambos sin cambios estructurales.

---

## 8. Base de datos

Tablas conceptuales previstas (heredadas de `VIAO_MVP_v0.1.md`, sección 17). El esquema detallado (columnas, tipos, relaciones, políticas RLS) se define en un documento aparte (`VIAO_DATABASE.md`, no creado todavía):

| Tabla | Propósito |
|---|---|
| `profiles` | Datos de perfil del usuario, vinculados a Supabase Auth |
| `trips` | Agrupación de un viaje ("Mi viaje": reserva, fotos, Vision, Rewards) |
| `properties` | Alojamientos normalizados devueltos por `HotelProvider` |
| `searches` | Búsquedas realizadas (para analytics y contexto de recomendación IA) |
| `bookings` | Reservas, incluyendo `booking_value`, `provider_commission`, `viao_revenue`, `reward_cost` (MVP, sección 17) |
| `rewards_wallets` | Vista/estado agregado del saldo de VIAO Points por usuario |
| `rewards_transactions` | Historial de movimientos de puntos (origen, acción, importe) — nunca solo un saldo |
| `referrals` | Relación entre usuario referidor y referido, y estado de la recompensa |
| `vision_scans` | Registro de escaneos de VIAO Vision (resultado, no necesariamente la imagen — sección 19) |
| `photos` | Fotos que el usuario decide conservar explícitamente en un viaje |
| `analytics_events` | Eventos de negocio críticos que también se envían a PostHog (sección 18) |

Todas estas tablas ya estaban previstas en el MVP; este documento no añade tablas nuevas.

---

## 9. TravelProvider / HotelProvider

**El resto de VIAO no depende directamente de un proveedor concreto.** Todavía no se ha elegido proveedor (MVP, sección 18), así que esta sección define únicamente la abstracción conceptual, no una implementación:

```
TravelProvider
  └── HotelProvider   (único proveedor activo en el MVP)
```

`HotelProvider` es la interfaz que cualquier proveedor concreto deberá implementar. Debe exponer, conceptualmente, las siguientes capacidades:

- **Búsqueda** — recibir destino, fechas, huéspedes y habitaciones; devolver una lista de alojamientos candidatos.
- **Disponibilidad** — confirmar si un alojamiento concreto está disponible para esas fechas.
- **Detalles** — obtener la información completa de un alojamiento (fotos, ubicación, características).
- **Precio** — obtener el precio aplicable a la búsqueda concreta.
- **Condiciones** — políticas relevantes (cancelación, requisitos) tal como las exponga el proveedor.
- **Reserva** *(si el proveedor lo permite)* — iniciar/confirmar una reserva.
- **Cancelación** *(si el proveedor lo permite)* — cancelar una reserva existente.
- **Comisión** *(si el proveedor lo expone)* — información necesaria para calcular `provider_commission`/`viao_revenue` (sección 8).

Todo el resto del sistema (búsqueda, resultados, reserva, "Mi viaje", analytics) programa contra esta interfaz, nunca contra un proveedor específico. Cuando se seleccione el proveedor (MVP, sección 18), se implementa un `HotelProvider` concreto sin tocar el resto del código. Si el proveedor elegido no soporta alguna capacidad (p. ej. cancelación programática), esa limitación se refleja en la implementación concreta, no en la interfaz general.

---

## 10. Flujo de búsqueda de alojamientos

1. El usuario introduce destino, fechas, huéspedes y habitaciones en el frontend.
2. Una Server Action envía la búsqueda al backend.
3. El backend valida el input y llama a `TravelProvider.search(...)`.
4. `HotelProvider` devuelve resultados; el backend los normaliza a un formato interno estable (independiente del proveedor).
5. El backend registra el evento `search_started`/`search_completed` (analytics, sección 18) y devuelve los resultados al frontend.
6. Al ver un alojamiento se registra `hotel_viewed`.

---

## 11. Flujo de reserva

1. El usuario decide reservar un alojamiento (con o sin haber pedido recomendación de IA).
2. Se registra `booking_clicked`.
3. El backend llama a `TravelProvider.book(...)` si el proveedor soporta reserva programática (sección 9); si no, el flujo puede reducirse a redirigir al usuario al proveedor, según lo que ese proveedor permita — el detalle exacto depende del proveedor elegido (sección 34).
4. Si la reserva se completa, el backend registra en `bookings`: `booking_value`, `provider_commission` (si el proveedor la expone), `viao_revenue` derivado, y crea la transacción de Rewards correspondiente (`reward_cost`, sección 14).
5. Se registra `booking_completed` y se dispara la recompensa (`reward_earned`).
6. La reserva queda visible en "Mi viaje" (sección 17).

Ninguno de estos pasos fija todavía un porcentaje de comisión ni un proveedor concreto (MVP, sección 18).

---

## 12. VIAO AI

1. El usuario aporta contexto en lenguaje natural sobre una búsqueda ya realizada.
2. Una Server Action envía ese contexto **más los resultados reales de la búsqueda** al backend.
3. El backend construye el prompt usando únicamente esos datos (sin inventar información — MVP, sección 6.4) y llama a OpenAI API de forma server-side, a través del wrapper único descrito en la sección 23.
4. La llamada pasa por rate limiting por usuario (sección 24) antes de ejecutarse.
5. Se devuelve la recomendación explicada al frontend y se registra `recommendation_requested`.

---

## 13. VIAO Vision

1. El usuario captura o sube una imagen.
2. El frontend valida tamaño/formato básico antes de enviarla (primera barrera de coste, sección 23).
3. La imagen se envía al backend, nunca directamente a OpenAI desde el cliente.
4. El backend aplica rate limiting y límites de tamaño/cantidad (sección 24), y llama a OpenAI de forma server-side para traducir/explicar el contenido.
5. El resultado (traducción + explicación) se devuelve al usuario y se registra `vision_used`.
6. **Gestión de la imagen**: no se asume almacenamiento permanente. Por defecto, la imagen se procesa y no se conserva; solo si el usuario decide explícitamente guardarla en "Mi viaje" se persiste en Supabase Storage (sección 19). El usuario puede eliminarla en cualquier momento.

---

## 14. Rewards

- **Modelo de ledger, no de saldo editable.** Cada Point ganado o gastado es una fila en `rewards_transactions`, con:
  - origen de la recompensa (registro, reserva, referido, etc.);
  - referencia a la acción/entidad que la generó (p. ej. `booking_id`, `referral_id`);
  - importe (positivo al ganar, negativo al gastar);
  - marca de tiempo, para auditoría.
- `rewards_wallets` refleja el saldo agregado, pero siempre **derivado** del histórico de transacciones — nunca la única fuente de verdad.
- El campo `reward_cost` de `bookings` (y de otras acciones que otorguen puntos) permite calcular el coste del programa de Rewards frente al ingreso, aunque **no se fija todavía la conversión Points → euros** (MVP, sección 9 y 18).
- Toda escritura en `rewards_transactions` ocurre en el backend; el cliente nunca puede crear o modificar una transacción directamente (solo leerlas).

---

## 15. Wallet

- Vista de solo lectura para el usuario: saldo actual (agregado de `rewards_transactions`) y el historial completo de movimientos.
- El backend calcula/expone el saldo; no existe un endpoint que permita al cliente escribir el saldo directamente.
- Sin funcionalidad de canje a dinero real en el MVP (MVP, sección 15 — excluido explícitamente).

---

## 16. Referidos

1. Al registrarse, cada usuario recibe un `referral_code` único (generado por el backend).
2. Un nuevo usuario puede registrarse indicando el código de otro; el backend crea la relación en `referrals`.
3. La recompensa **no se otorga solo por el registro**: se otorga cuando el referido completa una "acción válida" (su definición exacta es una decisión pendiente, MVP sección 18).
4. Validación mínima en el MVP: no auto-referirse, un registro por cuenta. No se construye un sistema antifraude avanzado (MVP, sección 12).
5. Al cumplirse la condición, el backend crea las transacciones de Rewards correspondientes para ambas partes (sección 14) y registra `referral_created`.

---

## 17. Mi viaje

- Cada fila de `trips` agrega, para un usuario y una reserva: destino, fechas, la reserva asociada, las fotos que el usuario decidió conservar, los `vision_scans` realizados durante ese viaje y las transacciones de Rewards vinculadas a él.
- Es una vista de agregación sobre datos que ya existen en otras tablas (`bookings`, `photos`, `vision_scans`, `rewards_transactions`) — no un módulo de gestión de viajes avanzado (MVP, sección 11).

---

## 18. Analytics

- **PostHog** en cliente para comportamiento general de UI, complementado con **captura server-side** para los eventos de negocio críticos (`booking_completed`, `reward_earned`, `referral_created`) — así no dependen de que el navegador del usuario ejecute JavaScript de terceros sin bloqueos.
- Taxonomía de eventos: la definida en `VIAO_MVP_v0.1.md`, sección 13 (`registered`, `search_started`, `search_completed`, `hotel_viewed`, `recommendation_requested`, `booking_clicked`, `booking_completed`, `vision_used`, `reward_earned`, `reward_redeemed`, `referral_created`, `return_visit`).
- Los eventos server-side se registran también en `analytics_events` (Supabase) como copia auditable, independiente de PostHog.

---

## 19. Storage y fotografías

- **Supabase Storage** con, conceptualmente, dos usos distintos:
  - imágenes de VIAO Vision en tránsito (procesamiento puntual, sin retención por defecto — sección 13);
  - fotos que el usuario decide guardar explícitamente en un viaje (`photos`, asociadas a `trips`).
- Acceso a los archivos protegido (URLs firmadas / RLS), nunca buckets públicos por defecto para contenido de usuario.
- Flujo de eliminación disponible para el usuario sobre cualquier imagen que haya guardado (sección 21).
- No se asume almacenamiento permanente de nada salvo que el usuario lo pida explícitamente.

---

## 20. Seguridad

- RLS activo en toda tabla con datos de usuario (perfiles, reservas, wallet, transacciones, referidos, fotos, escaneos).
- Validación de inputs tanto en cliente (UX) como en servidor (fuente de verdad).
- Ninguna ruta que toque `bookings`, `rewards_transactions` o `referrals` es accesible sin sesión válida.
- Ninguna API key (Supabase `service_role`, OpenAI, futura del proveedor de alojamiento) se expone al frontend.
- Todas las llamadas a servicios externos pasan por el backend (secciones 9, 12, 13).

---

## 21. Privacidad

- Las imágenes de VIAO Vision se tratan como **dato potencialmente sensible** (MVP, sección 10):
  - se solicita consentimiento cuando corresponda antes de procesar una imagen;
  - se explica de forma clara qué se hace con ella;
  - el usuario puede eliminarla;
  - no se conserva de forma permanente salvo decisión explícita del usuario (sección 19).
- No se construye infraestructura legal compleja (gestión formal de consentimiento tipo CMP) en el MVP — solución simple y honesta, acorde a lo ya aprobado.
- El mecanismo exacto de consentimiento y el plazo de conservación por defecto son detalles de implementación pendientes de definir (sección 34; ya señalado como pendiente en el MVP, sección 18).

---

## 22. Gestión de secretos y variables de entorno

- Todas las claves (Supabase `service_role`, OpenAI, y en su momento la del proveedor de alojamiento) viven en variables de entorno, **fuera del repositorio** (`.env.local` en desarrollo, variables de entorno de Vercel en producción/preview).
- Distinción clara entre variables públicas (`NEXT_PUBLIC_*`, seguras de exponer al cliente, p. ej. la URL/clave anónima de Supabase) y variables privadas (accesibles solo en el backend).
- La clave `service_role` de Supabase y la API key de OpenAI **nunca** llevan el prefijo `NEXT_PUBLIC_` ni se referencian desde código de cliente.
- Sin gestor de secretos dedicado en el MVP (no se justifica el coste/complejidad todavía) — las variables de entorno de Vercel y Supabase son suficientes a esta escala.

---

## 23. Control de costes de OpenAI

Todas las llamadas a OpenAI (recomendación IA y VIAO Vision) pasan por un **wrapper único en el backend** (`lib/openai/`), que centraliza:

- **Rate limiting** por usuario y global (sección 24).
- **Límites de tamaño** de entrada (longitud del contexto en recomendaciones, tamaño/cantidad de imágenes en Vision).
- **Logging de consumo** por llamada (usuario, endpoint, coste estimado), para poder auditar el gasto frente al presupuesto de pruebas de 20-50 € (MVP, sección 14).
- **Interruptor de emergencia**: posibilidad de desactivar temporalmente una función costosa (p. ej. Vision) sin desplegar código nuevo, si el consumo se acerca al presupuesto.

**No se fijan todavía** los valores numéricos exactos (llamadas por usuario/día, tamaño máximo de imagen en KB/MB) — son una decisión pendiente (sección 34; ya señalada en el MVP, sección 18). El mecanismo debe existir desde el primer commit; los números se ajustan después.

---

## 24. Rate limiting y protección contra abuso

- Rate limiting aplicado principalmente donde hay coste variable real: recomendación IA y VIAO Vision.
- Mecanismo simple (p. ej. contador por usuario con ventana de tiempo), sin introducir infraestructura dedicada nueva solo para esto — se apoya en lo que ya existe en el stack (Supabase o el propio runtime de Vercel), no en un servicio adicional.
- Protección básica adicional en autenticación (delegada en gran parte a las protecciones nativas de Supabase Auth).
- Si el volumen de abuso lo justificara más adelante, se evalúa una solución más robusta — no se construye por adelantado (sección 31).
- El mecanismo concreto de almacenamiento del contador (en Supabase, en memoria del runtime, u otro) no está fijado (sección 34).

---

## 25. Manejo de errores

- Los Server Actions/Route Handlers distinguen entre errores esperables (validación de input, proveedor externo no disponible, límite de uso alcanzado) y errores inesperados.
- Mensajes de error orientados al usuario, sin exponer detalles internos (trazas, nombres de tablas, claves).
- Degradación controlada: por ejemplo, si la recomendación de IA falla, el usuario sigue viendo los resultados de búsqueda con normalidad; si `HotelProvider` falla, se informa claramente en vez de mostrar un resultado inconsistente.
- Los errores relevantes se registran (sección 26) para poder diagnosticarlos sin depender del reporte del usuario.

---

## 26. Logging

- Logging server-side de las operaciones relevantes: búsquedas, reservas, llamadas a OpenAI (con su coste, sección 23), escaneos de Vision, transacciones de Rewards.
- Uso del logging nativo de la plataforma (Vercel) en el MVP — no se monta un stack de logging dedicado todavía (sección 30).
- No se registran imágenes completas ni contenido sensible en los logs a largo plazo; solo metadatos necesarios (tamaño, resultado, coste, usuario, timestamp).

---

## 27. Testing

Enfoque proporcional al riesgo, no cobertura exhaustiva:

- **Tests unitarios** para la lógica con mayor riesgo de error silencioso: el contrato de `TravelProvider`/`HotelProvider` (sección 9) y la lógica del ledger de Rewards (sección 14) — porque un fallo ahí es difícil de detectar a simple vista y afecta a dinero/puntos.
- **Tests de integración ligeros** sobre los flujos críticos de extremo a extremo: búsqueda → reserva, y ganar → consultar Wallet.
- Sin suite de e2e exhaustiva en el MVP — se prioriza validar que el producto tiene tracción sobre blindar cada esquina del código (principio de la sección 1).
- El framework concreto de testing no está fijado todavía (sección 34).

---

## 28. Deployment

- Despliegue en **Vercel**, conectado directamente al repositorio de **GitHub**.
- Preview deployments automáticos por pull request; producción desde la rama principal.
- Variables de entorno configuradas por entorno (producción/preview) en Vercel (sección 22).
- Migraciones de Supabase aplicadas como parte del flujo de despliegue (de forma simple; sin pipeline de CI/CD elaborado más allá de lo que ya ofrece Vercel + GitHub).

---

## 29. Desarrollo local

- Servidor de desarrollo de Next.js en local.
- Conexión a un proyecto Supabase de desarrollo (separado del de producción) mediante `.env.local`.
- VS Code + Claude Code como entorno de desarrollo principal (MVP, sección 16).
- Datos de prueba mínimos (seed) opcionales para no depender de datos reales del `HotelProvider` durante el desarrollo, especialmente mientras el proveedor no esté decidido.

---

## 30. Observabilidad

- A esta escala, la observabilidad se resuelve con lo que ya aporta el stack: logs y métricas nativas de Vercel, más PostHog para comportamiento de producto.
- El logging de consumo de OpenAI (sección 23) actúa también como observabilidad de coste.
- No se introduce una solución de APM/tracing dedicada en el MVP — se reevalúa si el producto avanza a V1 y el volumen lo justifica (sección 31).

---

## 31. Escalabilidad futura

- La abstracción `TravelProvider` permite añadir proveedores adicionales sin rehacer el núcleo (sección 9).
- Vercel y Supabase escalan de forma gestionada para el rango de tráfico esperable en el MVP y en una V1 razonable.
- Si el volumen de uso de OpenAI crece de forma significativa, se puede reevaluar mover llamadas costosas a un modelo de cola/async — no se construye ahora porque no hay necesidad demostrada (principio de la sección 1).
- Si el rate limiting simple (sección 24) resulta insuficiente, se puede migrar a una solución dedicada más adelante, sin que eso obligue a rediseñar el resto del sistema.

---

## 32. Dependencias externas

- **Supabase** — base de datos, autenticación y storage. Dependencia crítica única.
- **OpenAI API** — recomendación IA y VIAO Vision. Dependencia crítica con impacto directo en coste.
- **Vercel** — hosting y despliegue.
- **PostHog** — analytics de producto.
- **GitHub** — control de versiones y disparador de despliegues.
- **HotelProvider** (proveedor de alojamiento) — aún sin seleccionar; dependencia crítica para el flujo de reserva (sección 9), pero aislada detrás de `TravelProvider`.

Cada una de estas dependencias es un punto único de fallo para su función correspondiente; no hay redundancia planeada en el MVP (proporcional al principio de simplicidad, sección 1).

---

## 33. Riesgos técnicos

- **Proveedor de alojamiento aún no definido**: hasta que se seleccione, no se puede validar si la interfaz `HotelProvider` (sección 9) cubre realmente sus capacidades (p. ej. si no soporta cancelación programática, o si su modelo de comisión no encaja con `provider_commission`/`viao_revenue`).
- **Coste de OpenAI sin límites numéricos fijados todavía**: el mecanismo existe (sección 23), pero hasta fijar los números concretos hay riesgo de over/under-provisioning del límite.
- **Mala configuración de RLS en Supabase**: es el riesgo de seguridad más probable en un MVP construido rápido; requiere pruebas explícitas antes de manejar datos reales.
- **Gestión de imágenes de Vision**: el compromiso de "no almacenamiento permanente salvo decisión del usuario" (sección 21) añade complejidad de implementación (borrado, expiración) que debe diseñarse con cuidado para no dejar copias residuales.
- **Rate limiting simple bajo carga real desconocida**: al no haber datos de uso real todavía, el mecanismo elegido (sección 24) podría resultar insuficiente o excesivo — se ajusta con datos del piloto.
- **Dependencia total de servicios de terceros** (sección 32): una caída de Supabase, Vercel u OpenAI afecta directamente a VIAO sin capa de resiliencia adicional — aceptable para un MVP, a revisar en V1.

---

## 34. Decisiones pendientes

Estas decisiones son de **implementación técnica**, no de negocio, y no bloquean el resto de esta arquitectura porque están aisladas en puntos concretos:

1. **Método(s) de autenticación** habilitados en Supabase Auth (contraseña, magic link, o ambos) — sección 7.
2. **Valores numéricos exactos de rate limiting y límites de OpenAI** (llamadas/usuario/día, tamaño máximo de imagen) — sección 23; ya pendiente en el MVP, sección 18.
3. **Mecanismo de almacenamiento del contador de rate limiting** (Supabase, memoria del runtime, u otro) — sección 24.
4. **Detalle operativo del consentimiento y plazo de conservación por defecto de imágenes** — sección 21; ya pendiente en el MVP, sección 18.
5. **Esquema detallado de base de datos** (columnas, tipos, políticas RLS exactas) — se define en `VIAO_DATABASE.md`, no creado todavía.
6. **Librería/estrategia de internacionalización** (ES/EN) — sección 4.
7. **Framework de testing concreto** — sección 27.
8. **Implementación concreta de `HotelProvider`** — depende de la selección de proveedor (MVP, sección 18), fuera del alcance de este documento.

---

## Revisión de coherencia con `VIAO_MVP_v0.1.md`

- **Sin contradicciones detectadas**: el stack, las funcionalidades cubiertas (secciones 10-17) y los límites (Rewards no son dinero, Vision sin almacenamiento permanente por defecto, sin microservicios) coinciden con el MVP.
- **Sin decisiones de negocio inventadas**: no se fija comisión, no se fija conversión Points→euros, no se elige proveedor de alojamiento, no se fijan límites numéricos de OpenAI.
- **Sin funcionalidades añadidas** que no estén ya en `VIAO_MVP_v0.1.md` (secciones 6-17 del MVP mapean 1:1 con las secciones 9-19 de este documento).
- **Sin sobreingeniería**: no hay microservicios, no hay colas/mensajería, no hay gestor de secretos dedicado, no hay stack de observabilidad separado — todo se apoya en Supabase + Vercel + PostHog.
