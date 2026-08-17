# VIAO — MVP v0.1
### Documento maestro de producto — Definición de MVP

**Rol:** Product Manager + Software Architect
**Estado:** Borrador para aprobación — no programar hasta confirmación.
**Principio:** Máximo aprendizaje con mínimo coste. No sobrearquitecturar.

---

## Índice

1. [Visión](#1-visión)
2. [Problema](#2-problema)
3. [Usuario objetivo](#3-usuario-objetivo)
4. [Propuesta de valor](#4-propuesta-de-valor)
5. [Objetivos del MVP](#5-objetivos-del-mvp)
6. [Funcionalidades incluidas](#6-funcionalidades-incluidas)
7. [Funcionalidades excluidas](#7-funcionalidades-excluidas)
8. [Flujo principal del usuario](#8-flujo-principal-del-usuario)
9. [Rewards](#9-rewards)
10. [VIAO Vision](#10-viao-vision)
11. [Mi viaje](#11-mi-viaje)
12. [Referidos](#12-referidos)
13. [Analytics](#13-analytics)
14. [Requisitos no funcionales](#14-requisitos-no-funcionales)
15. [Seguridad](#15-seguridad)
16. [Stack](#16-stack)
17. [Arquitectura inicial](#17-arquitectura-inicial)
18. [Decisiones pendientes](#18-decisiones-pendientes)
19. [Métricas de éxito](#19-métricas-de-éxito)
20. [Criterios para pasar a V1](#20-criterios-para-pasar-a-v1)

---

## 1. Visión

VIAO es un compañero de viaje inteligente. La visión a largo plazo es ayudar al usuario a:

- descubrir viajes;
- comparar y reservar;
- utilizar IA durante el viaje;
- traducir y entender imágenes mediante VIAO Vision;
- guardar recuerdos;
- acumular Rewards;
- utilizar esas recompensas para futuros viajes.

El MVP no intenta construir esta visión completa. Construye la porción mínima necesaria para comprobar si la idea tiene tracción real con usuarios.

---

## 2. Problema

El viajero actual reparte su experiencia entre herramientas distintas: una app para reservar alojamiento, otra para traducir carteles, otra para guardar fotos, y programas de puntos independientes que no se conectan entre sí. Esa fragmentación es la oportunidad que VIAO explora: unir búsqueda, IA, comprensión del entorno (Vision) y recompensas en una sola experiencia.

El MVP no resuelve toda la fragmentación. Solo valida si unir *búsqueda + recomendación IA + Vision + Rewards* aporta valor suficiente como para que el usuario vuelva.

---

## 3. Usuario objetivo

**Perfil inicial propuesto** (a validar, ver sección 18):

- viaja de forma ocasional (no viajero frecuente/profesional);
- organiza y reserva viajes desde el móvil;
- ya reserva alojamiento online (usuario de Booking/Airbnb u similares);
- usa apps de traducción cuando viaja;
- está dispuesto a probar herramientas nuevas si le ahorran fricción o le dan algo a cambio (Rewards).

**Mercado inicial:** España. **Idiomas iniciales:** español e inglés (la arquitectura debe permitir añadir idiomas posteriormente sin rediseño, ver sección 14).

**Primer grupo de validación:** 50-100 testers directos. Existe la posibilidad de usar una comunidad de más de 8.000 personas como canal de difusión/validación, pero **no se asume que esas 8.000 personas sean usuarios de VIAO** — es solo un canal potencial, no una base de usuarios confirmada.

---

## 4. Propuesta de valor

Las herramientas existentes resuelven una sola parte del viaje (reservar, traducir, o acumular puntos, cada una por separado). VIAO propone una experiencia integrada: buscar y reservar con ayuda de una recomendación de IA, entender el entorno durante el viaje con Vision, y que cada acción alimente un sistema de Rewards pensado para el próximo viaje.

El diferencial del MVP no es tener más inventario de alojamientos. Es la combinación *búsqueda + IA + Vision + Rewards* en un único flujo.

**Modelo de negocio (provisional):** el MVP se sostiene sobre comisiones de afiliación/reserva con el proveedor de alojamiento, y potencialmente acuerdos comerciales adicionales con proveedores. **No se fijan todavía porcentajes concretos de comisión** — se definirán al seleccionar el proveedor (sección 18). Este es un modelo provisional sujeto a validación, no una fuente de ingresos garantizada en esta fase.

---

## 5. Objetivos del MVP

1. Validar que las personas buscan alojamiento a través de VIAO.
2. Comprobar si la recomendación de IA aporta valor percibido real.
3. Validar el flujo de reserva de extremo a extremo con el proveedor disponible.
4. Comprobar si VIAO Vision resulta útil durante el viaje.
5. Validar si los usuarios quieren acumular y usar VIAO Rewards.
6. Obtener una primera señal de retención: ¿vuelve el usuario después de su primer viaje?

---

## 6. Funcionalidades incluidas

1. **Registro/login** — alta, inicio de sesión, cierre de sesión, recuperación de acceso (vía Supabase Auth).
2. **Búsqueda de alojamientos** — destino, fechas, huéspedes, habitaciones.
3. **Resultados de alojamientos** — listado con foto, nombre, precio, valoración, ubicación y acción de reserva.
4. **Recomendación mediante IA** — el usuario aporta contexto en lenguaje natural y recibe una recomendación explicada, basada únicamente en los resultados reales de la búsqueda (sin inventar datos).
5. **Flujo de reserva mediante el proveedor disponible** — un único proveedor de alojamiento integrado en el MVP (cuál, ver sección 18).
6. **VIAO Rewards** — puntos por acciones clave (registro, reserva, etc.), con historial de movimientos, no solo un saldo.
7. **VIAO Wallet** — vista del saldo actual de VIAO Points del usuario.
8. **VIAO Vision** — captura o carga de imagen, traducción y explicación de contenido (carteles, menús, señales).
9. **Mi viaje** — ficha por viaje con destino, fechas, reserva, fotos, escaneos de Vision y Rewards asociados.
10. **Analytics básico** — registro de eventos clave del producto (sección 13).
11. **Sistema sencillo de referidos** — código de referido por usuario; ambas partes reciben Points al completarse el registro del referido.

---

## 7. Funcionalidades excluidas

Explícitamente fuera de alcance del MVP:

- vuelos;
- alquiler de coches;
- eSIM;
- tarjeta VIAO;
- cashback financiero;
- blockchain / criptomonedas;
- app nativa;
- red social;
- marketplace completo;
- múltiples proveedores innecesarios (el MVP usa uno solo);
- arquitectura de microservicios;
- cualquier funcionalidad no necesaria para validar los objetivos de la sección 5.

---

## 8. Flujo principal del usuario

```
Registro/Login → Búsqueda → Resultados → Recomendación IA (opcional) → Reserva
                                                                          │
                                                                          ▼
                                                          VIAO Points otorgados
                                                                          │
                                                                          ▼
                                              Durante el viaje: VIAO Vision (traducir/explicar)
                                                                          │
                                                                          ▼
                                              Todo queda archivado en "Mi viaje"
                                                                          │
                                                                          ▼
                                        Usuario comparte código de referido (opcional)
                                                                          │
                                                                          ▼
                                              Retorno: ¿vuelve a buscar/reservar?
```

1. El usuario se registra o inicia sesión.
2. Busca alojamiento (destino, fechas, huéspedes, habitaciones).
3. Ve resultados; opcionalmente pide una recomendación a la IA.
4. Reserva a través del proveedor integrado.
5. Recibe VIAO Points por la acción.
6. Durante el viaje, usa VIAO Vision para traducir/entender su entorno.
7. Todo el viaje (reserva, fotos, escaneos, Rewards) queda visible en "Mi viaje".
8. Puede compartir su código de referido.
9. Se mide si vuelve a usar VIAO tras el viaje (métrica norte, sección 19).

---

## 9. Rewards

- **VIAO Points se definen como puntos internos de fidelización.** No son dinero, no son saldo bancario y no representan un cashback garantizado.
- Cada usuario tiene un **VIAO Wallet** con un saldo de VIAO Points.
- El saldo **nunca se almacena como un único número editable**: cada ganancia o gasto de puntos debe quedar registrado como una transacción individual (histórico auditable).
- Acciones que otorgan puntos en el MVP: registro y reserva, como mínimo. En esta fase se usan como **recompensa promocional**, para probar acumulación y comportamiento de los usuarios (¿acumulan?, ¿vuelven por ellos?, ¿los reclaman?).
- **No se fija todavía**: conversión definitiva a euros, caducidad, porcentaje de recompensa por acción, ni límites finales de canje (decisión pendiente, sección 18).
- Cada transacción de puntos debe permitir registrar su **coste asociado para VIAO** (`reward_cost`, ver sección 17) aunque el valor de conversión final no esté fijado, para poder analizar el coste del programa desde el primer día.

---

## 10. VIAO Vision

- Acción principal: escanear (foto o imagen subida).
- El sistema traduce el texto detectado y ofrece una breve explicación de contexto.
- El usuario puede hacer una pregunta de seguimiento sobre lo escaneado (ej. "¿qué significa esto?").
- Implementación prevista: llamada server-side a OpenAI API (la imagen nunca se envía a un proveedor externo directamente desde el cliente).
- No se define en este documento cuántos escaneos gratuitos por usuario/mes son sostenibles en coste — pendiente (sección 18), pero deben implementarse límites técnicos desde el MVP (sección 15).

**Privacidad de las imágenes** (imágenes = dato potencialmente sensible):

- Solicitar consentimiento del usuario cuando corresponda antes de procesar una imagen.
- Explicar de forma clara qué se hace con la imagen (traducción/explicación vía OpenAI).
- Permitir al usuario eliminar sus imágenes/escaneos.
- Evitar almacenamiento permanente innecesario — conservar solo lo necesario para "Mi viaje" (sección 11), no una copia indefinida por defecto.
- No se construye todavía una infraestructura legal compleja (p. ej. gestión formal de consentimiento tipo CMP) — solución simple y honesta para el MVP.

---

## 11. Mi viaje

Cada viaje del usuario agrupa:

```
Destino
Fechas
Reserva
Fotos
Escaneos de Vision
Rewards obtenidos en ese viaje
```

No se construye en el MVP un gestor de viajes avanzado (itinerarios, colaboración multiusuario, etc.).

---

## 12. Referidos

El sistema inicial contempla:

- `referral_code`: código de referido único por usuario.
- Relación entre usuarios (quién refirió a quién), persistida para poder auditar el crecimiento orgánico.
- Recompensa promocional en VIAO Points para ambas partes.
- La recompensa está **condicionada a una acción válida** del referido (no basta con registrarse; por ejemplo, completar registro + una acción mínima adicional a definir).
- **No se implementa todavía** un sistema antifraude complejo. Solo la validación mínima razonable (p. ej. no auto-referirse, un registro por cuenta).
- El monto exacto de puntos por referido y el detalle de qué cuenta como "acción válida" no están definidos — pendiente (sección 18).

---

## 13. Analytics

Eventos mínimos a registrar desde el primer día:

```
registered
search_started
search_completed
hotel_viewed
recommendation_requested
booking_clicked
booking_completed
vision_used
reward_earned
reward_redeemed
referral_created
return_visit
```

La métrica más importante del MVP es la **retención**: si el usuario vuelve a VIAO después de su primer viaje (ver sección 19).

---

## 14. Requisitos no funcionales

- **Bajo coste operativo**: priorizar servicios gestionados/serverless (Supabase, Vercel) frente a infraestructura propia.
- **Rendimiento razonable**: búsquedas y recomendaciones con tiempos de respuesta aceptables para uso móvil.
- **Mobile-first**: el usuario objetivo organiza el viaje desde el móvil (sección 3).
- **Mantenibilidad**: código simple, sin abstracciones que no se usen todavía.
- **Escalabilidad razonable, no prematura**: la arquitectura debe permitir crecer (más proveedores, más volumen) sin reescritura completa, pero no se optimiza para una escala que el MVP no tiene.
- **Disponibilidad**: sin objetivo formal de SLA en el MVP (a definir si el producto avanza a V1).
- **Internacionalización**: mercado inicial España, idiomas español e inglés; la arquitectura de contenidos/UI debe permitir añadir idiomas sin rediseño (sección 3).
- **Control de coste de IA**: presupuesto interno de pruebas de 20-50 € de consumo de OpenAI API. El diseño debe permitir monitorizar y limitar ese gasto desde el primer día (ver sección 15).

---

## 15. Seguridad

- Variables de entorno y secretos fuera del repositorio.
- Row Level Security (RLS) activo en todas las tablas de Supabase con datos de usuario.
- Validación de inputs en cliente y servidor.
- Autenticación vía Supabase Auth; ninguna ruta sensible (reservas, wallet, transacciones) accesible sin sesión válida.
- Ninguna API key (OpenAI, proveedor de alojamiento) expuesta en el frontend — todas las llamadas externas pasan por el backend.
- Rate limiting en endpoints con coste variable (recomendaciones IA, escaneos de Vision) para controlar gasto y abuso.
- Logs de eventos relevantes para auditoría y debugging.

**Control de coste y abuso de OpenAI (recomendaciones IA + Vision):**

- Rate limiting por usuario en ambos endpoints (recomendación IA y escaneo de Vision).
- Límites de uso (p. ej. número máximo de llamadas por usuario/día) — el número exacto queda pendiente (sección 18), pero el mecanismo debe existir desde el MVP.
- Control de tamaño y cantidad de imágenes aceptadas por VIAO Vision, para acotar el coste por llamada.
- Logs de consumo por usuario/endpoint, para poder auditar el gasto frente al presupuesto de pruebas (20-50 €, sección 14).
- Protección frente a llamadas abusivas o automatizadas (más allá del rate limiting básico: p. ej. detección de patrones anómalos si el volumen lo justifica).

---

## 16. Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Backend | Next.js Server Actions / API Routes |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |
| Almacenamiento | Supabase Storage |
| IA | OpenAI API |
| Hosting | Vercel |
| Analytics | PostHog |
| Código | GitHub |
| Desarrollo | VS Code + Claude Code |

---

## 17. Arquitectura inicial

- El frontend nunca llama directamente a servicios externos (proveedor de alojamiento, OpenAI). Todo pasa por el backend de VIAO.
- Capa de abstracción `TravelProvider` desde el inicio, aunque el MVP solo implemente un `HotelProvider` concreto. Esto evita acoplar el resto del sistema a un proveedor específico y permite añadir otros más adelante sin rehacer el núcleo.
- **El proveedor de alojamiento aún no está seleccionado.** La selección se hará comparando, para cada candidato: acceso, requisitos técnicos/comerciales, inventario, comisión, capacidad de reserva, condiciones comerciales y cobertura geográfica. Hasta entonces, `HotelProvider` se implementa contra una interfaz estable, sin acoplar el resto del sistema a un proveedor concreto.

```
VIAO
  ↓
TravelProvider
  ↓
HotelProvider (único proveedor en el MVP, aún por seleccionar)
```

- Tablas iniciales previstas (mínimas, se amplían solo si es necesario): `profiles`, `trips`, `properties`, `searches`, `bookings`, `rewards_wallets`, `rewards_transactions`, `referrals`, `vision_scans`, `photos`, `analytics_events`.
- **Trazabilidad económica**: `bookings` (y/o una tabla de detalle asociada) debe registrar, por reserva, como mínimo:
  - `booking_value` — valor de la reserva.
  - `provider_commission` — comisión pagada por/recibida del proveedor.
  - `viao_revenue` — ingreso resultante para VIAO en esa reserva.
  - `reward_cost` — coste en VIAO Points otorgados asociado a esa reserva (u otras acciones), para poder calcular el coste real del programa de Rewards frente al ingreso.
  - Ninguno de estos campos implica fijar todavía porcentajes o fórmulas — solo que el esquema los pueda registrar desde el primer día.
- Sin microservicios: un único proyecto Next.js desplegado en Vercel, con Supabase como backend de datos/auth/storage.

---

## 18. Decisiones pendientes

Las decisiones marco ya están aprobadas (ver secciones correspondientes). Lo que sigue abierto son los **parámetros concretos** dentro de cada marco, y algunos temas que aún no se han tratado. No se asumen valores por defecto para ninguno de estos puntos:

1. **Porcentaje de comisión de afiliación** y condiciones comerciales exactas — dependen del proveedor seleccionado (punto 2).
2. **Selección final del proveedor de alojamiento** (`HotelProvider`), tras comparar acceso, requisitos, inventario, comisión, capacidad de reserva, condiciones comerciales y cobertura geográfica (sección 17).
3. **Economía exacta de VIAO Points**: puntos otorgados por acción (registro, reserva, referido), conversión a euros (si la hubiera), caducidad, porcentaje de recompensa y límites finales de canje.
4. **Definición de "acción válida"** que activa la recompensa de referido, y monto exacto de puntos por referido.
5. **Reglas antifraude de referidos** más allá de la validación mínima (límites por usuario, detección de duplicados) — solo se implementa lo básico en el MVP.
6. **Límites técnicos exactos de uso de OpenAI** (nº de llamadas/usuario/día para recomendaciones y Vision, tamaño/cantidad máxima de imágenes) que mantengan el consumo dentro del presupuesto de pruebas de 20-50 €.
7. **Detalle operativo de privacidad de imágenes**: mecanismo concreto de consentimiento, plazo de conservación por defecto, y flujo de eliminación a petición del usuario.
8. **Umbrales numéricos finales de éxito para pasar a V1** más allá de los objetivos del piloto de 100 testers (sección 19) — se fijarán con datos del primer cohorte real (sección 20).
9. **Canal de adquisición confirmado**: si la comunidad de 8.000 personas se activará como canal, y en qué condiciones/autorización.

Mientras estas decisiones no se tomen, no se debe asumir una respuesta por defecto en el desarrollo — si una implementación las requiere, se debe parar y preguntar (según tu instrucción).

---

## 19. Métricas de éxito

Se definen tres métricas principales. Los objetivos numéricos del piloto (más abajo) son una **vara de medida inicial**, no criterios definitivos de paso a V1 — el criterio definitivo se establecerá después de analizar los resultados del primer cohorte real (ver sección 20).

### 1. Activación
- usuarios registrados;
- usuarios que completan una acción útil;
- porcentaje de usuarios activados.

### 2. Conversión
- búsquedas realizadas;
- hoteles consultados;
- recomendaciones de IA solicitadas;
- clics hacia reserva;
- reservas iniciadas;
- reservas completadas.

### 3. Retención
- usuarios que regresan;
- frecuencia de uso;
- usuarios que vuelven después del viaje;
- usuarios que vuelven para preparar otro viaje.

### Señales complementarias

- uso de VIAO Vision;
- número de Vision scans;
- Rewards obtenidos;
- Rewards utilizados;
- referidos generados;
- feedback cualitativo;
- funcionalidades más utilizadas;
- funcionalidades que los usuarios dicen echar de menos.

**Objetivo interno de validación del piloto** (100 testers; cifras internas de validación, **no garantías de negocio ni criterios definitivos de paso a V1**):

| Hito | Objetivo |
|---|---|
| Testers en el piloto | 100 |
| Activados (≥1 acción útil) | 60+ |
| Realizan al menos una búsqueda | 40+ |
| Utilizan la recomendación de IA | 25+ |
| Utilizan VIAO Vision | 20+ |
| Llegan al flujo de reserva | 10+ |
| Reservas reales completadas | primeras reservas reales (sin cifra mínima fijada) |
| Retorno durante el periodo de prueba | 20%+ |

### Preguntas de validación

1. ¿Los usuarios entienden qué es VIAO en menos de 10 segundos?
2. ¿VIAO aporta algo que no obtienen simplemente usando Booking + Google Maps + Google Translate?
3. ¿Los usuarios consideran Rewards suficientemente atractivos?
4. ¿VIAO Vision se utiliza realmente durante los viajes?
5. ¿Los usuarios llegan al flujo de reserva?
6. ¿Los usuarios volverían a utilizar VIAO para su siguiente viaje?
7. ¿Los usuarios recomendarían VIAO a otra persona?
8. ¿Qué funcionalidad genera mayor interés?
9. ¿Qué funcionalidad sobra?
10. ¿Qué funcionalidad falta?

---

## 20. Criterios para pasar a V1

El MVP se considera "validado" para avanzar a V1 cuando, con usuarios reales (no solo internos), hay evidencia razonable en cada uno de los objetivos de la sección 5:

1. Una parte significativa de los registrados completa al menos una búsqueda.
2. Los usuarios que usan la recomendación de IA reservan igual o mejor que quienes no la usan, o dan feedback cualitativo claramente positivo.
3. Se completan reservas reales de extremo a extremo sin fricción técnica relevante.
4. Una parte relevante de los viajes activos usa VIAO Vision, con feedback positivo sobre su utilidad.
5. Hay evidencia de que los usuarios valoran y vuelven a usar sus Rewards.
6. La señal de retención (sección 19) es lo bastante fuerte como para justificar seguir invirtiendo.

Los objetivos numéricos del piloto de 100 testers (sección 19) sirven como primera vara de medir, pero **no son automáticamente el umbral definitivo de paso a V1** — ese umbral final es una decisión pendiente (sección 18) y debería confirmarse (o ajustarse) con el primer cohorte de datos reales, no darse por cerrado de antemano. Mientras no se cumplan estos criterios, no se amplía el alcance del producto más allá de la sección 6.
