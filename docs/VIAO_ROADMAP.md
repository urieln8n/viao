# VIAO — Roadmap técnico del MVP

**Estado:** Borrador para aprobación — no ejecutar ninguna fase hasta confirmación.
**Fuentes:** [`VIAO_MVP_v0.1.md`](VIAO_MVP_v0.1.md), [`VIAO_ARCHITECTURE.md`](VIAO_ARCHITECTURE.md), [`VIAO_DATABASE.md`](VIAO_DATABASE.md). Este roadmap no añade funcionalidades nuevas — solo secuencia lo ya aprobado en fases pequeñas y verificables.
**Regla de ejecución:** cada fase se implementa y se verifica antes de empezar la siguiente. Ninguna fase asume un proveedor hotelero concreto ni una economía de Points definitiva.

---

## Índice

- [Fase 0 — Preparación](#fase-0--preparación)
- [Fase 1 — Supabase](#fase-1--supabase)
- [Fase 2 — Design System / UI](#fase-2--design-system--ui)
- [Fase 3 — Usuarios](#fase-3--usuarios)
- [Fase 4 — TravelProvider](#fase-4--travelprovider)
- [Fase 5 — Búsqueda de alojamientos](#fase-5--búsqueda-de-alojamientos)
- [Fase 6 — Flujo de reserva](#fase-6--flujo-de-reserva)
- [Fase 7 — Rewards](#fase-7--rewards)
- [Fase 8 — Referidos](#fase-8--referidos)
- [Fase 9 — VIAO AI](#fase-9--viao-ai)
- [Fase 10 — VIAO Vision](#fase-10--viao-vision)
- [Fase 11 — Mi viaje](#fase-11--mi-viaje)
- [Fase 12 — Analytics](#fase-12--analytics)
- [Fase 13 — Seguridad](#fase-13--seguridad)
- [Fase 14 — Testing](#fase-14--testing)
- [Antes de Fase 15 — Bloques de validación previos](#antes-de-fase-15--bloques-de-validación-previos)
- [Fase 15 — Beta](#fase-15--beta)
- [Fase 16 — Evaluación MVP](#fase-16--evaluación-mvp)
- [Gates de aprobación (resumen)](#gates-de-aprobación-resumen)
- [Decisiones que bloquean](#decisiones-que-bloquean)

---

## Fase 0 — Preparación

**Objetivo de la fase:** tener un proyecto Next.js ejecutable, tipado, con estilos y estructura, sin ninguna funcionalidad de producto todavía.

| ID | Objetivo | Dependencia | Archivos/componentes | Criterio de aceptación | Prueba necesaria | Resultado esperado |
|---|---|---|---|---|---|---|
| F0-01 | Inicializar repositorio Git | — | `.git/`, `.gitignore` | Repo creado, primer commit | `git status` limpio | Historial de versiones disponible |
| F0-02 | Inicializar Next.js + TypeScript | F0-01 | `package.json`, `next.config.*`, `tsconfig.json` | `next dev` arranca sin errores | Build local (`next build`) | App base accesible en local |
| F0-03 | Configurar Tailwind CSS + shadcn/ui | F0-02 | `tailwind.config.*`, `components/ui/` | Un componente shadcn renderiza con estilos | Render visual de un componente de prueba | Base de UI lista para Fase 2 |
| F0-04 | Configurar ESLint | F0-02 | `.eslintrc.*` | `lint` corre sin errores en el proyecto vacío | `next lint` | Calidad de código verificable desde el inicio |
| F0-05 | Estructura de carpetas y variables de entorno | F0-02 | `lib/`, `components/`, `types/`, `.env.example` (arquitectura, sección 3) | Carpetas existen; `.env.example` documenta variables sin valores reales | Revisión manual de estructura | Proyecto listo para recibir Supabase (Fase 1) |

> 🚦 **Gate Fase 0 → Fase 1:** NO avanzar hasta que el proyecto compile, `lint` pase, y la estructura de carpetas de `lib/` esté creada (aunque vacía).

---

## Fase 1 — Supabase

**Objetivo de la fase:** tener el esquema de `VIAO_DATABASE.md` desplegado con RLS verificado, antes de construir ninguna pantalla.

| ID | Objetivo | Dependencia | Archivos/componentes | Criterio de aceptación | Prueba necesaria | Resultado esperado |
|---|---|---|---|---|---|---|
| F1-01 | Crear proyecto Supabase de desarrollo | F0-05 | — (panel Supabase) | Proyecto creado, credenciales en `.env.local` | Conexión de prueba desde Next.js | Backend de datos disponible |
| F1-02 | Clientes Supabase (server/client) | F1-01 | `lib/supabase/` | Cliente server y cliente browser funcionando por separado | Llamada de prueba desde un Server Component | Acceso a Supabase encapsulado, no disperso por la app |
| F1-03 | Configurar Supabase Auth (mecanismo básico) | F1-01 | Config. de Auth en Supabase | Se puede crear un usuario de prueba | Registro/login manual de prueba | Base de autenticación lista para Fase 3 |
| F1-04 | Migraciones de las 11 tablas | F1-02 | `supabase/migrations/*` | Las 11 tablas de `VIAO_DATABASE.md` existen con los tipos/constraints definidos | Inspección del esquema en Supabase | Esquema completo desplegado |
| F1-05 | Vista `rewards_wallets` | F1-04 | `supabase/migrations/*` | La vista devuelve el saldo agregado correcto para datos de prueba | Consulta manual comparando suma vs vista | Saldo derivado, sin columna editable (aprobado) |
| F1-06 | Políticas RLS (Patrón A/B por tabla) | F1-04 | `supabase/migrations/*` | Cada tabla tiene exactamente las políticas descritas en `VIAO_DATABASE.md` sección 14 | Checklist tabla por tabla contra el documento | RLS activo y correcto en las 11 tablas |
| F1-07 | Seed mínimo de datos de prueba | F1-06 | `supabase/seed.sql` (o script) | Datos ficticios de perfiles/propiedades de ejemplo, sin depender de un proveedor real | Carga del seed sin errores | Entorno de desarrollo usable sin esperar al proveedor |
| F1-08 | Pruebas de seguridad RLS | F1-06, F1-07 | — (pruebas manuales o script) | Usuario A no puede leer/escribir datos de usuario B; ninguna tabla Patrón B acepta escritura del cliente | Casos de prueba explícitos por tabla (ver Fase 13 para la suite formal) | Confirmación temprana de que el modelo de seguridad funciona como se diseñó |
| F1-09 | Crear buckets de Supabase Storage | F1-01 | Config. de Storage en Supabase | Buckets necesarios creados (imágenes de Vision en tránsito, fotos guardadas) — ninguno público por defecto | Verificación en el panel de Supabase | Storage disponible para Fase 10/11 |
| F1-10 | Políticas de acceso (RLS) de Storage | F1-09 | Config. de Storage en Supabase (políticas por bucket) | Cada bucket tiene políticas alineadas con `VIAO_DATABASE.md` (`photos`, `vision_scans`): solo el propietario accede a sus archivos, sin acceso público no autorizado, eliminación posible por el propietario | Pruebas de acceso cruzado (usuario A no accede a archivo de usuario B; acceso anónimo/no autenticado denegado; borrado funciona) | Storage tan protegido como las tablas de Postgres — auditoría formal en F13-07 |

> 🚦 **Gate Fase 1 → Fase 2:** NO avanzar hasta que F1-08 confirme, para cada tabla, que el aislamiento entre usuarios y el patrón de escritura (A/B) funcionan como en `VIAO_DATABASE.md`, **y** que F1-10 confirme que los buckets de Storage tienen el mismo nivel de aislamiento.

---

## Fase 2 — Design System / UI

**Objetivo de la fase:** tener la base visual y de navegación mobile-first sobre la que construir cada funcionalidad, sin lógica de negocio todavía.

| ID | Objetivo | Dependencia | Archivos/componentes | Criterio de aceptación | Prueba necesaria | Resultado esperado |
|---|---|---|---|---|---|---|
| F2-01 | Layout base mobile-first | F0-03 | `app/layout.tsx` | Layout usable en viewport móvil sin scroll horizontal | Revisión visual en viewport móvil real/emulado | Base consistente para todas las pantallas |
| F2-02 | Navegación principal | F2-01 | `components/nav/` | Navegación accesible entre las secciones previstas del MVP (búsqueda, mi viaje, wallet, perfil) | Navegación manual entre rutas placeholder | Estructura de navegación estable |
| F2-03 | Componentes principales (shadcn/ui) | F0-03 | `components/ui/` | Botones, inputs, cards y modales disponibles y reutilizados | Storybook o página de prueba visual | Consistencia visual en el resto de fases |
| F2-04 | Estados loading/error/empty reutilizables | F2-03 | `components/state/` | Cada estado se puede invocar de forma genérica en cualquier pantalla | Render de los 3 estados en una pantalla de prueba | Menos código repetido en fases posteriores |
| F2-05 | Base de textos ES/EN | F2-01 | `lib/i18n/` (o equivalente) | Los textos de UI no están hardcodeados por componente; el idioma se puede resolver por `profiles.locale` | Cambio manual de idioma en una pantalla de prueba | Preparado para ES/EN sin rediseño (arquitectura sección 4) |

> 🚦 **Gate Fase 2 → Fase 3:** NO avanzar hasta tener layout, navegación y componentes base funcionando en mobile, con los 3 estados (loading/error/empty) disponibles como piezas reutilizables.

---

## Fase 3 — Usuarios

**Objetivo de la fase:** ciclo completo de cuenta de usuario sobre Supabase Auth.

| ID | Objetivo | Dependencia | Archivos/componentes | Criterio de aceptación | Prueba necesaria | Resultado esperado |
|---|---|---|---|---|---|---|
| F3-01 | Registro de usuario | F1-03, F2-03 | `app/(auth)/register/` | Un usuario nuevo puede registrarse | Registro de prueba end-to-end | Alta funcional |
| F3-02 | Trigger de creación de `profiles` | F3-01 | `supabase/migrations/*` (trigger server-side) | Al registrarse, se crea automáticamente la fila en `profiles` con `referral_code` único | Registro de prueba + verificación en `profiles` | Perfil disponible sin insert manual desde el cliente (Patrón B, `VIAO_DATABASE.md` sección 2) |
| F3-03 | Login/logout | F3-01 | `app/(auth)/login/` | Sesión se inicia/cierra correctamente | Login/logout de prueba | Acceso autenticado funcional |
| F3-04 | Recuperación de acceso | F3-01 | `app/(auth)/recover/` | El usuario puede solicitar recuperación de acceso | Flujo de recuperación de prueba | Reduce fricción de soporte desde el piloto |
| F3-05 | Pantalla de perfil | F3-02, F2-04 | `app/profile/` | El usuario edita `name`, `avatar_url`, `locale`; no puede editar `referral_code` | Edición de prueba + verificación en BD | Perfil editable dentro de los límites de RLS |
| F3-06 | Protección de rutas/Server Actions | F3-03 | Middleware/helpers de sesión en `lib/supabase/` | Ninguna ruta/Server Action sensible responde sin sesión válida | Intento de acceso sin sesión (debe fallar) | Base de seguridad para el resto de fases |
| F3-07 | Registrar evento `registered` | F3-02 | `lib/analytics/` | El evento `registered` se registra inmediatamente tras la creación exitosa del perfil (justo después del trigger de F3-02), no en una fase posterior | Verificación en `analytics_events` tras un registro de prueba | Evento fundacional de la taxonomía (MVP sección 13) disponible desde el momento real en que ocurre, no simulado más tarde en Fase 12 |

> 🚦 **Gate Fase 3 → Fase 4:** NO avanzar hasta que registro, login, creación automática de perfil y protección de rutas estén verificados con pruebas reales, no solo revisadas visualmente.

---

## Fase 4 — TravelProvider

**Objetivo de la fase:** poder desarrollar y probar todo el producto **sin haber elegido proveedor real**, mediante un mock que cumple la interfaz definida en `VIAO_ARCHITECTURE.md` (sección 9).

> **Restricción explícita sobre `properties`:** VIAO **no** construirá un inventario hotelero mundial propio. `properties` es únicamente una caché mínima ligada a las búsquedas activas del MVP — no un catálogo autónomo. Cuando exista un proveedor real, `properties` seguirá dependiendo de él (búsqueda bajo demanda), no de una sincronización masiva de su inventario completo.

| ID | Objetivo | Dependencia | Archivos/componentes | Criterio de aceptación | Prueba necesaria | Resultado esperado |
|---|---|---|---|---|---|---|
| F4-01 | Interfaz `TravelProvider`/`HotelProvider` | F0-05 | `lib/travel-provider/types.ts` | Interfaz define búsqueda, disponibilidad, detalles, precio, condiciones, reserva, cancelación, comisión (todas marcadas como capacidades, algunas opcionales) | Revisión de tipos contra arquitectura sección 9 | Contrato estable, independiente del proveedor |
| F4-02 | Tipos de dominio | F4-01 | `types/travel.ts` | `Property`, `SearchParams`, `BookingRequest`, etc. tipados y usados en el resto del código | Compilación sin `any` innecesarios | Consistencia de datos en todo el flujo |
| F4-03 | Modelo de errores del provider | F4-01 | `lib/travel-provider/errors.ts` | Errores distinguibles (no disponible, error del proveedor, no soportado) | Casos de prueba de cada tipo de error | Manejo de errores predecible (Fase 25/13) |
| F4-04 | **`MockHotelProvider`** | F4-01, F4-02, F4-03 | `lib/travel-provider/mock-provider.ts` | Implementa todas las capacidades de la interfaz con datos ficticios estables | Tests unitarios del contrato completo | Producto desarrollable y demostrable sin proveedor real |
| F4-05 | Adapter/selector de provider activo | F4-04 | `lib/travel-provider/index.ts` | El resto de la app consume `TravelProvider` sin saber si es mock o real | Cambiar de mock a otra implementación de prueba sin tocar el resto del código | Verifica que la abstracción realmente aísla al proveedor |
| F4-06 | Escenarios de prueba de `MockHotelProvider` | F4-04 | `lib/travel-provider/mock-provider.ts`, tests | El mock puede simular explícitamente: alojamiento disponible, alojamiento no disponible, cambio de precio entre búsqueda y reserva, error del proveedor, reserva exitosa, reserva fallida, y cancelación (si el contrato la contempla) | Un test por escenario, incluidos los casos negativos | Fase 5/6 pueden probar tanto el camino feliz como los casos límite antes de tener un proveedor real |

> 🚦 **Gate Fase 4 → Fase 5:** NO avanzar hasta que `MockHotelProvider` implemente el contrato completo (F4-04) **y** sus escenarios de prueba (F4-06), incluidos los casos negativos. La ausencia de proveedor real **no** bloquea este gate (ver "Decisiones que bloquean").

---

## Fase 5 — Búsqueda de alojamientos

**Objetivo de la fase:** flujo de búsqueda completo contra `TravelProvider` (mock).

| ID | Objetivo | Dependencia | Archivos/componentes | Criterio de aceptación | Prueba necesaria | Resultado esperado |
|---|---|---|---|---|---|---|
| F5-01 | Formulario de búsqueda | F2-03, F4-05 | `app/search/` | Captura destino, fechas, huéspedes, habitaciones (MVP sección 6.2) | Envío de formulario de prueba | Input de búsqueda validado |
| F5-02 | Server Action de búsqueda | F5-01, F4-05 | `app/search/actions.ts` | Llama a `TravelProvider.search()`, valida input server-side | Búsqueda de prueba contra el mock | Resultados normalizados devueltos |
| F5-03 | Listado de resultados | F5-02, F2-04 | `app/search/results/` | Muestra foto, nombre, precio, valoración, ubicación (MVP sección 6.3) | Búsqueda con y sin resultados (estado empty) | Resultados usables en mobile |
| F5-04 | Página de detalle | F5-03 | `app/properties/[id]/` | Muestra detalle completo de un alojamiento del mock | Navegación resultado → detalle | Base para iniciar reserva (Fase 6) |
| F5-05 | Registro de eventos de búsqueda | F5-02, F5-03 | `lib/analytics/` | `search_started`, `search_completed`, `hotel_viewed` se registran (MVP sección 13) | Verificación en `analytics_events` tras una búsqueda de prueba | Datos disponibles para Fase 12/16 |
| F5-06 | Crear registro de búsqueda en `searches` | F5-02 | `app/search/actions.ts` | Cada búsqueda válida crea una fila en `searches` (tabla, no solo evento de analytics) con destino/fechas/huéspedes/habitaciones y `results_count` | Verificación en la tabla `searches` tras una búsqueda de prueba | Historial de búsquedas persistido, distinto de `analytics_events` (`VIAO_DATABASE.md` sección 5) |
| F5-07 | Relacionar resultados y clics con la búsqueda de origen | F5-06, F5-03, F5-04 | `app/search/results/`, `app/properties/[id]/` | El `search_id` de origen viaja junto a los resultados mostrados y al detalle abierto, de forma que un clic hacia una propiedad es trazable a la búsqueda que lo generó | Prueba de navegación búsqueda → resultado → detalle conservando el `search_id` | Base necesaria para medir búsqueda → clic → reserva (usado en F6-06 y Fase 16) |

> 🚦 **Gate Fase 5 → Fase 6:** NO avanzar hasta que una búsqueda de extremo a extremo (formulario → resultados → detalle) funcione contra el mock, registre sus eventos correctamente **y** persista su fila en `searches` con el `search_id` trazable hasta el detalle.

---

## Fase 6 — Flujo de reserva

**Objetivo de la fase:** poder completar una reserva de extremo a extremo contra el mock, con el modelo económico de `bookings` ya operativo (aunque con campos nullable).

| ID | Objetivo | Dependencia | Archivos/componentes | Criterio de aceptación | Prueba necesaria | Resultado esperado |
|---|---|---|---|---|---|---|
| F6-01 | Pantalla de confirmación de reserva | F5-04 | `app/booking/[propertyId]/` | Resume el alojamiento y pide los datos necesarios | Revisión visual + navegación | UI de reserva lista |
| F6-02 | Server Action de reserva | F6-01, F4-05 | `app/booking/actions.ts` | Llama a `TravelProvider.book()` (mock); crea fila en `bookings` con `status='pending'` y campos económicos en `NULL` si no se conocen | Reserva de prueba end-to-end | Registro de reserva coherente con `VIAO_DATABASE.md` sección 6 |
| F6-03 | Confirmación/actualización de estado | F6-02 | `app/booking/actions.ts` | Transición `pending` → `confirmed` (o `cancelled`) según respuesta del provider | Prueba de reserva exitosa y de reserva fallida | Estados de reserva reflejan la realidad del provider |
| F6-04 | Registro de eventos de reserva | F6-02, F6-03 | `lib/analytics/` | `booking_clicked`, `booking_completed` se registran | Verificación en `analytics_events` | Datos disponibles para métricas de conversión (Fase 12/16) |
| F6-05 | UI de estado de reserva para el usuario | F6-03, F2-04 | `app/booking/[id]/status/` | El usuario ve el estado real de su reserva | Prueba visual de los 3 estados | Transparencia para el usuario |
| F6-06 | Guardar `search_id` en la reserva cuando corresponda | F6-02, F5-07 | `app/booking/actions.ts` | Si la reserva procede de una búsqueda conocida (F5-07), `bookings.search_id` se rellena; si el usuario llega por otra vía, queda `NULL` (permitido por `VIAO_DATABASE.md`) | Prueba de reserva iniciada desde resultados de búsqueda vs. reserva iniciada sin búsqueda previa | Permite medir en Fase 16 si la recomendación de IA mejora la conversión (MVP sección 20, criterio 2) |

> 🚦 **Gate Fase 6 → Fase 7:** NO avanzar hasta completar al menos una reserva de extremo a extremo contra el mock (incluyendo un caso de reserva fallida, F4-06), con el registro correcto en `bookings` (incluido `search_id` cuando aplica) y los eventos de analytics asociados.

---

## Fase 7 — Rewards

**Objetivo de la fase:** ledger de Points operativo y auditable, con montos **provisionales**, no definitivos.

| ID | Objetivo | Dependencia | Archivos/componentes | Criterio de aceptación | Prueba necesaria | Resultado esperado |
|---|---|---|---|---|---|---|
| F7-01 | Función backend de creación de transacciones | F1-06, F3-02 | `lib/rewards/` | Crea filas en `rewards_transactions` con `reason`/`reference_type`/`reference_id` correctos | Transacción de prueba por registro y por reserva | Ledger alimentado desde eventos reales |
| F7-02 | Lectura de saldo vía `rewards_wallets` | F1-05, F7-01 | `lib/rewards/` | El saldo mostrado coincide siempre con la suma de transacciones | Comparación automática saldo vs suma | Ninguna divergencia entre vista y ledger |
| F7-03 | UI de Wallet | F7-02, F2-03 | `app/rewards/` | Muestra saldo actual e historial (MVP sección 8) | Revisión visual con datos de prueba | Wallet funcional para el piloto |
| F7-04 | Recompensas promocionales iniciales (registro/reserva) | F7-01 | `lib/rewards/rules.ts` | Se otorgan puntos por registro y por reserva, con montos marcados explícitamente como provisionales en el código/config | Verificación de que se otorgan tras F3-01/F6-03 | Comportamiento de acumulación observable en el piloto, sin comprometer una economía definitiva |
| F7-05 | Tests del ledger | F7-01, F7-02 | Tests en `lib/rewards/` | Suma correcta, inmutabilidad (no `UPDATE`/`DELETE` posibles desde el cliente) | Suite de tests (ver Fase 14) | Confianza en la integridad del sistema de puntos |

> 🚦 **Gate Fase 7 → Fase 8:** NO avanzar hasta que el ledger sea consistente (saldo = suma de transacciones) y ninguna vía de escritura directa del cliente exista sobre `rewards_transactions`. **No fijar todavía conversión definitiva a euros** (decisión pendiente).

---

## Fase 8 — Referidos

**Objetivo de la fase:** sistema de referidos funcional con la validación mínima ya aprobada (sin antifraude avanzado).

| ID | Objetivo | Dependencia | Archivos/componentes | Criterio de aceptación | Prueba necesaria | Resultado esperado |
|---|---|---|---|---|---|---|
| F8-01 | Generación de `referral_code` | F3-02 | (ya cubierto por el trigger de F3-02) | Cada usuario tiene un código único desde su registro | Verificación en `profiles` | Código disponible para compartir |
| F8-02 | Registro con código de referido | F3-01, F8-01 | `app/(auth)/register/` | Un registro con código válido crea una fila en `referrals` con `status='pending'` | Registro de prueba con código válido/ inválido | Atribución correcta o rechazo claro |
| F8-03 | Definición técnica configurable de "acción válida" | F8-02 | `lib/referrals/rules.ts` | La condición que dispara la recompensa es un punto de configuración único, no lógica dispersa | Cambiar la condición en un solo lugar y verificar el efecto | Permite ajustar la definición de negocio (aún pendiente) sin tocar el resto del sistema |
| F8-04 | Recompensa a ambas partes | F8-03, F7-01 | `lib/referrals/` | Al cumplirse la acción válida, se crean transacciones para referidor y referido, y `referrals.status` pasa a `rewarded` | Prueba de flujo completo referido → acción válida → recompensa | Ciclo de referidos verificable |
| F8-05 | Validación antifraude mínima | F8-02 | Constraints ya definidos en `VIAO_DATABASE.md` (`UNIQUE(referred_id)`, `referrer_id <> referred_id`) | Un usuario no puede autorreferirse ni ser referido dos veces | Intentos de prueba de ambos casos (deben fallar) | Protección básica sin sobreingeniería |

> 🚦 **Gate Fase 8 → Fase 9:** NO avanzar hasta que el ciclo completo (código → registro con código → acción válida → recompensa para ambas partes) funcione de extremo a extremo con la validación mínima activa.

---

## Fase 9 — VIAO AI

**Objetivo de la fase:** recomendación de IA funcional con control de coste desde el primer commit.

| ID | Objetivo | Dependencia | Archivos/componentes | Criterio de aceptación | Prueba necesaria | Resultado esperado |
|---|---|---|---|---|---|---|
| F9-01 | Wrapper server-side de OpenAI | F0-05 | `lib/openai/` | Única puerta de entrada a la API de OpenAI en todo el proyecto | Revisión de que ningún otro módulo llama a OpenAI directamente | Punto único de control de coste (arquitectura sección 23) |
| F9-02 | Server Action de recomendación | F9-01, F5-03 | `app/search/ai-recommendation/` | Usa únicamente los resultados reales de la búsqueda como contexto, sin inventar datos (MVP sección 6.4) | Prueba con búsqueda real del mock | Recomendación explicada y trazable a datos reales |
| F9-03 | Rate limiting por usuario | F9-01 | `lib/rate-limit/` | Un usuario no puede superar el límite configurado de llamadas | Prueba de exceder el límite (debe bloquear) | Protección de coste activa desde el desarrollo |
| F9-04 | Logging de consumo | F9-01 | `lib/openai/` | Cada llamada registra usuario, endpoint y coste estimado | Verificación de logs tras varias llamadas de prueba | Auditoría de gasto disponible (arquitectura sección 23) |
| F9-05 | Interruptor de emergencia | F9-01 | Config. en `lib/openai/` | Se puede desactivar la función sin desplegar código nuevo | Prueba de activar/desactivar el flag | Control operativo del gasto en producción |

> 🚦 **Gate Fase 9 → Fase 10:** NO avanzar hasta que el wrapper, el rate limiting y el logging de consumo estén activos y probados — no solo la funcionalidad de recomendación en sí.

---

## Fase 10 — VIAO Vision

**Objetivo de la fase:** escaneo funcional respetando el principio de no-almacenamiento-permanente por defecto.

| ID | Objetivo | Dependencia | Archivos/componentes | Criterio de aceptación | Prueba necesaria | Resultado esperado |
|---|---|---|---|---|---|---|
| F10-00 | **Consentimiento previo al procesamiento** | F3-06 | `app/vision/`, tabla a definir para registrar el consentimiento (dentro del alcance de `VIAO_DATABASE.md`) | Antes de cualquier procesamiento se solicita y registra el consentimiento del usuario cuando corresponda; si el consentimiento requerido no está disponible, el procesamiento **no se ejecuta** | Prueba de intento de escaneo sin consentimiento (debe bloquear) y con consentimiento otorgado (debe permitir) | Ningún escaneo ocurre sin consentimiento registrado cuando es exigible (MVP sección 10, arquitectura sección 21) |
| F10-01 | Subida/captura de imagen con validación | F2-03, F10-00 | `app/vision/` | Rechaza imágenes fuera de los límites de tamaño/formato antes de enviarlas al backend | Prueba con imagen válida e inválida | Primera barrera de coste activa (arquitectura sección 23) |
| F10-02 | Procesamiento server-side | F9-01, F10-00, F10-01 | `app/vision/actions.ts` | Traducción + explicación devueltas correctamente vía el wrapper de OpenAI; **verifica el consentimiento registrado (F10-00) antes de llamar a OpenAI** | Escaneo de prueba con imagen de ejemplo, y prueba de bloqueo si falta consentimiento | Resultado útil sin exponer la imagen al cliente-terceros directamente, y sin procesar sin consentimiento |
| F10-03 | Registro en `vision_scans` | F10-02 | `lib/vision/` | Se crea la fila con el resultado, sin guardar la imagen por defecto (`image_retained=false`) | Verificación en BD tras un escaneo | Separación registro/imagen respetada (`VIAO_DATABASE.md` sección 10) |
| F10-04 | Conservar imagen, eliminación y retirada de consentimiento | F10-03, F1-06, F1-10 | `app/vision/actions.ts` | El usuario puede decidir guardar (crea fila en `photos`), eliminar un escaneo ya realizado, o **retirar su consentimiento** — lo que dispara la eliminación asociada según la política definida (decisión pendiente, ver "Decisiones pendientes") | Prueba de guardar, de eliminar, y de retirar consentimiento | Cumple el requisito de privacidad (arquitectura sección 21) de forma completa, no solo la eliminación manual |
| F10-05 | Rate limiting y límites específicos de Vision | F9-03 | `lib/rate-limit/` | Límite de escaneos por usuario aplicado igual que en F9-03 | Prueba de exceder el límite | Coste de Vision controlado de forma independiente de la recomendación IA |

> 🚦 **Gate Fase 10 → Fase 11:** NO avanzar hasta verificar que (a) ningún procesamiento ocurre sin consentimiento registrado cuando es exigible (F10-00), (b) ninguna imagen se conserva salvo decisión explícita del usuario, y (c) el flujo de eliminación y de retirada de consentimiento funciona.

---

## Fase 11 — Mi viaje

**Objetivo de la fase:** vista de agregación funcional sobre datos ya existentes de fases anteriores.

| ID | Objetivo | Dependencia | Archivos/componentes | Criterio de aceptación | Prueba necesaria | Resultado esperado |
|---|---|---|---|---|---|---|
| F11-01 | Crear viaje | F3-06 | `app/trips/` | El usuario puede crear un viaje (`trips`) | Creación de prueba | Base para agrupar reservas |
| F11-02 | Asociar reserva(s) a un viaje | F6-02, F11-01 | `app/trips/[id]/` | Una o varias `bookings` quedan vinculadas a `trip_id` | Prueba con una y con varias reservas | Relación usuario→viaje→reserva(s) verificada (MVP, requisito explícito) |
| F11-03 | Añadir fotos guardadas voluntariamente | F10-04, F11-01 | `app/trips/[id]/` | Fotos guardadas por el usuario aparecen en el viaje correspondiente | Prueba de guardar foto y verla en el viaje | Consistente con `photos.trip_id` |
| F11-04 | Resumen del viaje | F11-02, F11-03 | `app/trips/[id]/` | Muestra destino, fechas, reserva(s), fotos, escaneos, Rewards asociados (MVP sección 11) | Revisión visual con datos de prueba completos | "Mi viaje" funcional para el piloto |

> 🚦 **Gate Fase 11 → Fase 12:** NO avanzar hasta que un viaje de prueba agregue correctamente reserva, fotos y escaneos reales generados en fases anteriores.

---

## Fase 12 — Analytics

**Objetivo de la fase:** medición confiable de Activación/Conversión/Retención antes del piloto.

| ID | Objetivo | Dependencia | Archivos/componentes | Criterio de aceptación | Prueba necesaria | Resultado esperado |
|---|---|---|---|---|---|---|
| F12-01 | Integración PostHog (cliente) | F0-05 | `lib/analytics/posthog.ts` | Eventos de comportamiento general llegan a PostHog | Verificación en el panel de PostHog | Analítica de producto disponible |
| F12-02 | Captura server-side de eventos críticos | F3-07, F5-05, F6-04, F10-03, F8-04, F12-05 | `lib/analytics/` | Todos los eventos de la taxonomía del MVP (sección 13) se registran también en `analytics_events` | Verificación cruzada PostHog vs `analytics_events` | Eventos críticos no dependen solo del cliente |
| F12-03 | Cálculo de Activación/Conversión/Retención | F12-02 | `lib/analytics/metrics.ts` (o consultas directas) | Se pueden calcular las tres métricas principales (MVP sección 19) a partir de los datos registrados | Cálculo de prueba con datos ficticios | Preparado para medir el piloto real (Fase 15-16) |
| F12-04 | Verificación de taxonomía completa | F12-02 | — | Los 12 eventos del MVP están cubiertos, ninguno huérfano ni faltante (incluye explícitamente `registered` desde F3-07 y `return_visit` desde F12-05) | Checklist evento por evento | Sin brechas de medición antes del piloto |
| F12-05 | Registrar evento `return_visit` | F12-01, F3-03 | `lib/analytics/` | Se registra `return_visit` cuando un usuario autenticado inicia una nueva sesión (p. ej. login) posterior a su primer uso registrado, distinguible de la primera visita | Prueba de login simulando un "segundo día" tras el registro inicial | Señal de retención (MVP sección 19, métrica norte) medible desde el primer despliegue, no solo declarada |

> 🚦 **Gate Fase 12 → Fase 13:** NO avanzar hasta confirmar que los 12 eventos de la taxonomía del MVP se registran correctamente y que las tres métricas principales son calculables con datos reales de prueba.

---

## Fase 13 — Seguridad

**Objetivo de la fase:** verificación formal de todo lo diseñado en `VIAO_DATABASE.md` y `VIAO_ARCHITECTURE.md`, antes de exponer el producto a testers reales.

| ID | Objetivo | Dependencia | Archivos/componentes | Criterio de aceptación | Prueba necesaria | Resultado esperado |
|---|---|---|---|---|---|---|
| F13-01 | Suite de tests de RLS | F1-06 | Tests de integración contra Supabase | Cada tabla se comporta exactamente según el Patrón A/B documentado | Ejecución automatizada de la suite | Confianza formal, no solo manual (reemplaza/formaliza F1-08) |
| F13-02 | Tests de autenticación | F3-06 | Tests de integración | Ninguna ruta/Server Action sensible responde sin sesión válida | Ejecución automatizada | Seguridad de acceso verificada |
| F13-03 | Validación server-side de inputs sensibles | F5-02, F6-02, F9-02, F10-02 | Revisión de cada Server Action | Ningún input llega sin validar a Supabase/OpenAI/TravelProvider | Revisión de código + tests de input malicioso/mal formado | Reduce superficie de error/abuso |
| F13-04 | Verificación de rate limiting | F9-03, F10-05 | Tests de integración | Los límites configurados se aplican de verdad bajo prueba de carga simple | Prueba de exceder el límite en ambos endpoints | Confirma que el control de coste funciona, no solo que existe el código |
| F13-05 | Auditoría de gestión de secretos | Todo lo anterior | Revisión de `.env*`, bundle del cliente | Ninguna clave privada aparece en el bundle del cliente ni en el repositorio | Búsqueda de secretos en el build de producción | Cumple arquitectura sección 22 |
| F13-06 | Pruebas de abuso de IA | F9-05 | Tests manuales/automatizados | El interruptor de emergencia corta el gasto cuando se activa | Prueba de activar el kill-switch bajo uso simulado | Control operativo verificado antes del piloto |
| F13-07 | Tests de políticas de Supabase Storage | F1-10 | Tests de integración contra Storage | Ningún archivo de `photos` o de Vision en tránsito es accesible sin autorización; el borrado funciona; no hay acceso público no autorizado | Ejecución automatizada + intento de acceso directo por URL no firmada/no autorizada (debe fallar) | Confirma, antes de Fase 15, que las imágenes de los usuarios están tan protegidas como las tablas de Postgres |

> 🚦 **Gate Fase 13 → Fase 14:** NO avanzar hasta que la suite de seguridad (RLS, auth, rate limiting, secretos) pase completa. Esta fase es un requisito explícito antes de acercarse a producción real (ver "Decisiones que bloquean").

---

## Fase 14 — Testing

**Objetivo de la fase:** consolidar en una suite formal lo que ya se ha ido probando fase a fase, con foco en los puntos de mayor riesgo.

| ID | Objetivo | Dependencia | Archivos/componentes | Criterio de aceptación | Prueba necesaria | Resultado esperado |
|---|---|---|---|---|---|---|
| F14-01 | Unit tests de `TravelProvider`/`MockHotelProvider` | F4-04 | Tests en `lib/travel-provider/` | Cobertura del contrato completo (búsqueda, disponibilidad, reserva, cancelación, errores) | Ejecución de la suite | Garantiza que un futuro `HotelProvider` real se pueda validar contra el mismo contrato |
| F14-02 | Unit tests del ledger de Rewards | F7-05 | Tests en `lib/rewards/` | Casos de ganar, gastar, e intento de escritura no autorizada | Ejecución de la suite | Confianza en la integridad económica del sistema |
| F14-03 | Tests de integración: búsqueda → reserva | F6-03 | Tests end-to-end mínimos | Flujo completo pasa sin intervención manual | Ejecución automatizada | Flujo crítico protegido frente a regresiones |
| F14-04 | Tests de integración: ganar → consultar Wallet | F7-03 | Tests end-to-end mínimos | El saldo mostrado refleja la transacción recién creada | Ejecución automatizada | Flujo crítico de Rewards protegido |
| F14-05 | Inclusión de tests de RLS en la suite general | F13-01 | CI/scripts de test | La suite de seguridad corre junto al resto de tests | Ejecución conjunta | Seguridad verificada en cada cambio, no solo una vez |

> 🚦 **Gate Fase 14 → Fase 15:** NO avanzar hasta que la suite de testing (provider mock, ledger, RLS, flujos críticos) pase de forma reproducible, no solo en una ejecución manual puntual.

---

## Antes de Fase 15 — Bloques de validación previos

Dos bloques no técnicos que deben resolverse antes de que Fase 15 tenga sentido, detectados en la auditoría cruzada. Ninguno de los dos es una fase numerada (no requiere renumerar el resto del roadmap) pero ambos son gates reales.

### A. Selección e integración del `HotelProvider` real

**Objetivo:** habilitar reservas reales sin perder la capacidad de seguir desarrollando y probando con `MockHotelProvider` — el adapter de F4-05 permite alternar entre ambos sin tocar el resto del código, y `MockHotelProvider` **sigue existiendo y disponible** para desarrollo/testing después de esta integración.

| ID | Objetivo | Dependencia | Archivos/componentes | Criterio de aceptación | Prueba necesaria | Resultado esperado |
|---|---|---|---|---|---|---|
| FPR-01 | Evaluación de proveedores candidatos | F4-01 | — (documento de evaluación, no código) | Comparativa explícita de acceso, requisitos comerciales, inventario, disponibilidad, precios, capacidad de reserva, cancelaciones (si existen), tracking de comisión y cobertura geográfica (MVP sección 18, arquitectura sección 9) | Revisión de la comparativa | Base objetiva para decidir el proveedor |
| FPR-02 | Selección del proveedor y condiciones comerciales | FPR-01 | — | Proveedor elegido; condiciones/comisión conocidas (aunque el % final sea una decisión de negocio aparte) | Confirmación explícita de la decisión | Decisión pendiente del MVP (sección 18) resuelta |
| FPR-03 | Alta de credenciales y entorno sandbox | FPR-02 | Variables de entorno (sección 22 de arquitectura) | Credenciales del proveedor disponibles solo en el backend, en un entorno de pruebas (sandbox) separado de producción | Llamada de prueba al sandbox del proveedor | Integración probable sin arriesgar datos/reservas reales |
| FPR-04 | Implementación de `HotelProvider` real | FPR-03, F4-01, F4-02, F4-03 | `lib/travel-provider/<proveedor>-provider.ts` | Implementa el mismo contrato que `MockHotelProvider` (búsqueda, disponibilidad, detalles, precio, condiciones, reserva, cancelación si aplica, comisión si el proveedor la expone) | Se ejecutan contra esta implementación los mismos tests de contrato de F14-01 | Confirma que la abstracción de Fase 4 era correcta |
| FPR-05 | Tracking de comisión real | FPR-04 | `app/booking/actions.ts`, `bookings` | `provider_commission`/`viao_revenue` se rellenan con datos reales cuando el proveedor los expone (siguen siendo `NULL` si no los expone, según `VIAO_DATABASE.md`) | Reserva de prueba en sandbox | Trazabilidad económica real, no solo el esquema preparado |
| FPR-06 | Pruebas en sandbox antes de producción | FPR-04, FPR-05, F4-06 | Tests de integración | Los mismos escenarios de F4-06 (disponible/no disponible/cambio de precio/error/reserva ok/reserva fallida/cancelación) se verifican contra el sandbox real, no solo contra el mock | Ejecución de la suite contra sandbox | Confianza equivalente a la que ya se tenía con el mock, ahora con el proveedor real |
| FPR-07 | Activar el proveedor real vía el adapter (F4-05) | FPR-06 | `lib/travel-provider/index.ts` | El adapter selecciona el proveedor real en el entorno correspondiente; `MockHotelProvider` sigue disponible para desarrollo/testing | Cambio de configuración de entorno, sin tocar el resto del código | Reservas reales posibles sin perder el entorno de desarrollo basado en mock |

> 🚦 **Gate → Fase 15 (reservas reales):** NO habilitar reservas con dinero real a testers hasta que FPR-06 confirme el sandbox. Fase 15 puede arrancar en modo `MockHotelProvider` si este bloque no está listo a tiempo, pero en ese caso F16-02 ("reservas reales completadas") no podrá evaluarse con datos reales — debe quedar explícito en el reporte de Fase 16 si ocurre así.

### B. Adquisición del piloto

**Objetivo:** confirmar cómo se va a llegar a los 50-100 testers del piloto (MVP sección 3) antes de construir el proceso de onboarding real.

| ID | Objetivo | Dependencia | Archivos/componentes | Criterio de aceptación | Prueba necesaria | Resultado esperado |
|---|---|---|---|---|---|---|
| FAB-01 | Confirmar canal de adquisición del primer cohorte | — | — (decisión de negocio, no código) | Existe una decisión explícita sobre qué canal(es) se usarán para llegar a 50-100 testers; si se usa la comunidad de más de 8.000 personas, queda confirmada únicamente como **canal de difusión/validación**, nunca asumida como usuarios ya adquiridos (MVP sección 18, punto 9) | Confirmación explícita de la decisión | Decisión pendiente del MVP resuelta antes de reclutar |
| FAB-02 | Plan de invitación | FAB-01 | Proceso externo (no código) | Mecanismo definido para invitar a los testers seleccionados a través del canal confirmado | Revisión del plan | Reclutamiento ejecutable |
| FAB-03 | Identificación de testers del piloto | FAB-01 | `profiles` (marca/flag mínima) | Un tester del piloto es distinguible de un usuario cualquiera que llegue por otra vía | Alta de prueba de un tester de ejemplo | Permite filtrar métricas del piloto específicamente en Fase 16 |
| FAB-04 | Plan de recogida de feedback | FAB-01 | Reutiliza el canal de F15-04 | Canal definido y accesible antes de empezar el onboarding real | Prueba de envío | Insumo listo para Fase 16 desde el primer día del piloto |
| FAB-05 | Plan de seguimiento de métricas del piloto | FAB-01, F12-03 | Reporte | Se sabe qué métricas se van a mirar y con qué frecuencia durante el piloto | Revisión del plan | Fase 16 no empieza a improvisar cómo leer los datos |

> 🚦 **Gate → Fase 15 (onboarding):** NO iniciar el onboarding real de testers (F15-03) hasta que FAB-01 a FAB-05 estén resueltos.

---

## Fase 15 — Beta

**Objetivo de la fase:** exponer el producto al piloto real de 50-100 testers (MVP sección 3) con observabilidad activa.

| ID | Objetivo | Dependencia | Archivos/componentes | Criterio de aceptación | Prueba necesaria | Resultado esperado |
|---|---|---|---|---|---|---|
| F15-01 | Deployment a producción/preview | F0-05, F14-05 | Configuración de Vercel | App accesible en una URL estable | Smoke test post-deploy | Entorno real disponible para testers |
| F15-02 | Observabilidad mínima activa | F9-04, F12-02 | Logs de Vercel, PostHog, logging de OpenAI | Se puede diagnosticar un fallo real sin acceso directo al testers | Simulación de un error controlado | Capacidad de respuesta durante el piloto |
| F15-03 | Onboarding de 50-100 testers | F15-01, FAB-01 a FAB-05 | Proceso externo (no código) | Testers dados de alta y con acceso funcional, a través del canal confirmado en FAB-01 | Verificación de altas reales | Piloto en marcha (MVP sección 3) |
| F15-04 | Canal de recogida de feedback cualitativo | F15-03 | Formulario/canal externo | Las 10 preguntas de validación (MVP sección 19) tienen un canal de respuesta | Prueba de envío de feedback | Insumo para la Fase 16 |
| F15-05 | Monitorización de errores durante el piloto | F15-02 | — | Errores reales se detectan sin depender solo del reporte del usuario | Revisión periódica de logs durante el piloto | Calidad del piloto protegida |

> 🚦 **Gate Fase 15 → Fase 16:** NO avanzar hasta acumular un periodo de uso real suficiente del piloto (según se defina con el primer grupo activo) con datos de analítica y feedback recogidos, no solo el despliegue técnico completado.

---

## Fase 16 — Evaluación MVP

**Objetivo de la fase:** analizar los resultados del piloto frente a los objetivos definidos en `VIAO_MVP_v0.1.md` (secciones 19-20), sin decidir automáticamente el paso a V1.

| ID | Objetivo | Dependencia | Archivos/componentes | Criterio de aceptación | Prueba necesaria | Resultado esperado |
|---|---|---|---|---|---|---|
| F16-01 | Medición de Activación/Conversión/Retención | F12-03, F15-05 | Reporte (no código de producto) | Cifras reales calculadas frente a los objetivos del piloto (MVP sección 19) | Revisión de los datos frente a la tabla de objetivos | Base cuantitativa para la decisión |
| F16-02 | Análisis de reservas reales completadas | F16-01 | Reporte | Nº de reservas reales documentado; si el bloque FPR (proveedor real) no se completó antes del piloto, el reporte debe declararlo explícitamente en vez de presentar reservas del mock como reales | Revisión de `bookings.status='confirmed'` | Evidencia del objetivo 3 del MVP (sección 5) |
| F16-03 | Análisis de uso de Vision | F16-01 | Reporte | % de viajes con `vision_used` documentado | Revisión de `vision_scans` vs `trips` | Evidencia del objetivo 4 del MVP |
| F16-04 | Análisis de Rewards obtenidos/utilizados | F16-01 | Reporte | Datos de `rewards_transactions` (earned vs spent) documentados | Consulta agregada sobre el ledger | Evidencia del objetivo 5 del MVP |
| F16-05 | Síntesis de feedback cualitativo | F15-04 | Reporte | Respuestas a las 10 preguntas de validación (MVP sección 19) sintetizadas | Revisión del canal de feedback | Contexto cualitativo junto a los números |
| F16-06 | Recomendación de paso a V1 | F16-01 a F16-05 | Reporte | Recomendación explícita, contrastando resultados con los criterios de la sección 20 del MVP — **sin fijar el umbral definitivo automáticamente** | Revisión conjunta con el equipo/decisor de negocio | Decisión informada de continuar, ajustar o parar |

> 🚦 **Gate Fase 16 → V1:** NO avanzar a construir V1 hasta que exista una decisión explícita de negocio basada en F16-06 — los objetivos del piloto (MVP sección 19) son una vara de medida inicial, **no** un umbral que se cruza automáticamente (MVP sección 20, ya aprobado).

---

## Gates de aprobación (resumen)

| De → A | Condición ("NO avanzar hasta que...") |
|---|---|
| Fase 0 → 1 | El proyecto compile, `lint` pase y la estructura de carpetas exista |
| Fase 1 → 2 | RLS verificado tabla por tabla (aislamiento + patrón A/B), **y** políticas de Storage (F1-10) con el mismo nivel de aislamiento |
| Fase 2 → 3 | Layout, navegación y estados loading/error/empty funcionen en mobile |
| Fase 3 → 4 | Registro, login, creación automática de perfil, protección de rutas **y** el evento `registered` (F3-07) verificados con pruebas reales |
| Fase 4 → 5 | `MockHotelProvider` implemente el contrato completo (F4-04) **y** sus escenarios de prueba (F4-06), incluidos los negativos (no bloqueado por falta de proveedor real) |
| Fase 5 → 6 | Búsqueda completa (formulario → resultados → detalle) funcione contra el mock, registre eventos **y** persista su fila en `searches` con `search_id` trazable |
| Fase 6 → 7 | Al menos una reserva completa de extremo a extremo contra el mock (incluyendo un caso fallido), con `bookings` (incluido `search_id`) y eventos correctos |
| Fase 7 → 8 | Ledger consistente (saldo = suma de transacciones), sin escritura directa del cliente, sin fijar conversión a euros |
| Fase 8 → 9 | Ciclo completo de referidos (código → registro → acción válida → recompensa) funcione con la validación mínima |
| Fase 9 → 10 | Wrapper, rate limiting y logging de consumo de IA activos y probados |
| Fase 10 → 11 | Ningún procesamiento ocurra sin consentimiento registrado cuando es exigible (F10-00); ninguna imagen se conserva salvo decisión explícita del usuario; eliminación y retirada de consentimiento funcionan |
| Fase 11 → 12 | Un viaje de prueba agregue correctamente reserva, fotos y escaneos reales |
| Fase 12 → 13 | Los 12 eventos de la taxonomía del MVP se registran (incluidos `registered` y `return_visit`); las 3 métricas principales son calculables |
| Fase 13 → 14 | Suite de seguridad (RLS de tablas, RLS de Storage F13-07, auth, rate limiting, secretos) pase completa |
| Fase 14 → 15 | Suite de testing (mock, ledger, RLS, flujos críticos) pase de forma reproducible |
| Bloque FPR → Fase 15 (reservas reales) | El sandbox del proveedor real (FPR-06) esté validado — si no, Fase 15 puede arrancar en modo mock, pero debe declararlo |
| Bloque FAB → Fase 15 (onboarding) | El canal de adquisición y el plan de piloto (FAB-01 a FAB-05) estén confirmados |
| Fase 15 → 16 | Periodo de uso real del piloto acumulado, con datos de analítica y feedback recogidos |
| Fase 16 → V1 | Exista una decisión explícita de negocio basada en el análisis de F16-06 — no automática |

---

## Decisiones que bloquean

Estas son decisiones de negocio/producto **no técnicas**, ya identificadas como pendientes en `VIAO_MVP_v0.1.md`, `VIAO_ARCHITECTURE.md` y `VIAO_DATABASE.md`. Se listan aquí junto a **qué fase bloquean realmente** y qué **no** bloquean:

1. **Proveedor hotelero** — bloquea: el bloque FPR ("Selección e integración del `HotelProvider` real", antes de Fase 15) y cualquier reserva con dinero real. **No bloquea**: Fases 4, 5 y 6 en modo `MockHotelProvider`, que pueden desarrollarse y probarse por completo sin proveedor elegido; `MockHotelProvider` sigue disponible para desarrollo/testing incluso después de integrar el proveedor real.
2. **Economía definitiva de VIAO Points** (conversión a euros, `reason`/`reference_type` cerrados, caducidad, límites de canje) — bloquea: fijar los montos **definitivos** de recompensa y cualquier canje con valor económico real. **No bloquea**: F7-01 a F7-05 (el mecanismo de ledger, la vista de saldo y las recompensas promocionales provisionales sí se pueden construir y probar). **Esta actualización del roadmap no ha tocado ni definido esta economía** — sigue siendo una decisión pendiente sin conversión fijada.
3. **Política de privacidad de imágenes** (detalle de consentimiento, plazo de conservación por defecto) — bloquea: exponer VIAO Vision a producción/al piloto real (Fase 15) sin ese detalle resuelto; ahora tiene tareas propias asignadas (F10-00 consentimiento, F1-09/F1-10/F13-07 Storage). **No bloquea**: F10-01 a F10-05 en desarrollo/pruebas internas con una política provisional conservadora.
4. **Límites numéricos definitivos de OpenAI** (llamadas/usuario/día, tamaño máximo de imagen) — bloquea: abrir VIAO AI/Vision a los 50-100 testers reales (Fase 15) sin límites concretos configurados (aunque sea con valores conservadores de partida). **No bloquea**: F9-01 a F9-05 y F10-01 a F10-05 en desarrollo, donde se pueden usar límites provisionales bajos.
5. **Definición exacta de "acción válida"** en referidos — bloquea: activar recompensas reales de referidos en el piloto. **No bloquea**: F8-01 a F8-05, ya que F8-03 construye el punto de configuración precisamente para no bloquear el desarrollo mientras se decide.
6. **Retención de `searches` y política de eliminación de cuentas** — no bloquean ninguna fase de este roadmap; son decisiones operativas a resolver antes de una fase de "gestión de cuenta avanzada" que no está en el alcance del MVP.
7. **Canal de adquisición del piloto** (MVP sección 18, punto 9) — bloquea: el bloque FAB ("Adquisición del piloto", antes de Fase 15) y, por tanto, F15-03 (onboarding real). **No bloquea**: nada anterior a Fase 15. Si se usa la comunidad de más de 8.000 personas, debe quedar confirmada solo como canal de difusión, nunca asumida como usuarios ya adquiridos.
8. **Políticas de Supabase Storage** (detalle de configuración de buckets/RLS) — bloquea: F13-07 y, por tanto, el gate de Fase 13 → 14, y en última instancia abrir Vision a testers reales en Fase 15. **No bloquea**: Fases 0-9; solo se vuelve relevante a partir de Fase 1 (creación de buckets) y Fase 10 (uso real).

**Ninguna de estas decisiones bloquea el desarrollo del `MockHotelProvider` ni el resto de la construcción del producto en modo desarrollo/pruebas** — solo bloquean, de forma explícita, el paso a datos/dinero reales o a testers reales en las fases correspondientes (principalmente el bloque FPR, el bloque FAB, y Fase 15, Beta).
