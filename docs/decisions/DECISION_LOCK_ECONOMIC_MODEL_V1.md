---
STATUS: LOCKED
ERA: Fase G — Unit Economics + Modelo Económico V1
DOMAIN: Economía / Modelo de negocio
AUTHORITY: Decision Lock económico oficial de VIAO V1 — fuente de verdad para el modelo de negocio hasta que una nueva DECISION REVIEW explícita lo modifique. No es un Decision Lock de producto/schema — no sustituye ni modifica RW1-RW6, L12, ni ningún Decision Lock técnico existente.
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-27
---

# VIAO — DECISION LOCK: MODELO ECONÓMICO V1

> Cerrado después de FASE G — Unit Economics + Modelo Económico V1

**Fecha**: 27/08/2026
**Estado**: `LOCKED`

---

## 1. Propósito de este documento

Este documento convierte las decisiones ya alcanzadas en la FASE G (Unit Economics + Modelo Económico V1) en referencia permanente. No contiene investigación nueva, no introduce funcionalidades, no fija precios definitivos ni modifica ningún Decision Lock técnico existente (`RW1-RW6`, `L12`). Su función es evitar que bloques futuros reabran, sin evidencia nueva, decisiones ya cerradas.

---

## 2. Principio estratégico

> **"La riqueza viene de la estrategia, no del esfuerzo."**

Aplicado a VIAO: el negocio no debe crecer aumentando innecesariamente la complejidad operativa del fundador. La prioridad es construir una economía donde el modelo, los Partners y el sistema generen valor de forma sostenible **antes** de añadir trabajo, infraestructura o personal.

---

## 3. Decisión central — Modelo económico

**`LOCKED`**: VIAO V1 tendrá como modelo económico principal **PARTNER-FUNDED REWARDS**:

- El Partner financia el Reward asociado a su propia oferta.
- VIAO no asume, como modelo principal, el coste económico de los Rewards.
- El coste de Reward para VIAO bajo este modelo es €0.
- Premium puede existir como ingreso complementario (no núcleo).
- VIAO-funded queda limitado a un componente estrictamente acotado (sección 5).

**Motivo de la decisión**: es el modelo económicamente más robusto según la FASE G — genera contribución positiva desde una escala muy modesta (3-5 Partners) y no depende de variables no validadas (redención real, tamaño del pool VIAO-funded).

---

## 4. VIAO-funded — decisión

**`LOCKED`**: VIAO-funded **no será el núcleo económico de V1**. Queda como complemento estrictamente limitado por las reglas ya existentes:

- `RW5` permanece `LOCKED` (coste real del Reward VIAO-funded ≤ 30% del valor nominal).
- `RW6` permanece `LOCKED` (pool actual: €100/mes, compartido por todo el sistema).
- No se amplía el pool en este documento.
- No se modifica `RW5` ni `RW6`.

**Formulación exacta de la decisión**: *"VIAO-funded no es el modelo económico principal de V1 bajo las condiciones actuales."* No se afirma que sea imposible para siempre — cualquier ampliación futura requiere una nueva decisión explícita y una nueva validación económica.

---

## 5. Rewards — Decision Lock

**`LOCKED`**: `RW1-RW6` permanecen sin cambios. No se modifican reglas económicas existentes, `funding_type`, límites, pool, restricciones de coste ni lógica económica. Recordatorio explícito:

- `RW5`: coste real del Reward VIAO-funded ≤ 30% del valor nominal.
- `RW6`: pool VIAO-funded = €100/mes.

Ningún cambio se implementa en este bloque.

---

## 6. Partner Pricing

**`HIPÓTESIS`, no `LOCKED`**: Precio Partner = €50/mes. Hipótesis abiertas adicionales: €25 / €75 / €100. El precio definitivo deberá validarse comercialmente (protocolo comercial ya diseñado en bloques anteriores). No se modifica código ni se configura ningún precio definitivo.

---

## 7. Premium

**`HIPÓTESIS`**: Premium = €4,99/mes. Premium **no es el núcleo** del modelo económico — es ingreso complementario. La conversión Premium real permanece como `DATO A VALIDAR`. El 5% usado en simulaciones anteriores fue únicamente un escenario ilustrativo, nunca un dato real.

---

## 8. Variable económica más importante — conclusión LOCKED de la FASE G

**`LOCKED`**: la variable crítica para el modelo Partner-funded **no es el número total de usuarios**. Es, en orden:

1. Número de Partners.
2. Usuarios reales que aporta cada Partner.
3. Disposición real del Partner a pagar.
4. Retención/actividad de esos usuarios.

La relación **Partners ↔ usuarios/Partner debe tratarse como variable independiente** — no se asume 500 usuarios/Partner. Esa cifra, usada en simulaciones anteriores, fue únicamente un escenario ilustrativo (la FASE G demostró hasta 21x de diferencia en revenue con el mismo total de usuarios, según cómo se repartan entre Partners).

---

## 9. Break-even

Coste fijo aproximado V1: **€150-160/mes** con gestoría, durante el escenario de tarifa plana y con las suposiciones actuales. Break-even aproximado: **3-4 Partners**, si el ingreso neto por Partner ronda €48,84.

**Esto es una simulación, no una garantía comercial.** El break-even real depende de precio final, IVA, Stripe, número real de Partners, costes administrativos reales y otros costes futuros no contemplados. "3-4 Partners" no debe usarse como promesa comercial.

---

## 10. Costes fijos (referencia económica, no contrato)

**Durante tarifa plana**:

| Concepto | Referencia |
|---|---|
| Autónomo | ~€80/mes |
| Gestoría | ~€50/mes |
| Vercel Pro | ~€19/mes |
| Supabase | €0 mientras el uso permanezca dentro del plan adecuado |
| Facturación VeriFactu | €0-10/mes según solución |
| Dominio | ~€1/mes |
| Teléfono incremental | €0 |
| Salario del fundador | €0 en esta fase |
| Marketing orgánico | €0 en esta fase |
| **Total de referencia** | **~€150-160/mes** |

**Tras tarifa plana**: ~€270-330/mes como escenario de referencia.

Estos números son referencias económicas y deben verificarse cuando llegue el momento de operar realmente — no son valores eternos.

---

## 11. IVA — decisión metodológica

**`LOCKED` (metodología, no cifra)**: toda futura simulación económica debe separar precio cobrado, IVA, base imponible, comisión Stripe y revenue neto de VIAO. No se vuelve a mezclar IVA con revenue.

Escenario de referencia usado en la FASE G: **IVA aparte**.
- Partner €50 → revenue neto aproximado después de Stripe = **€48,84**.
- Premium €4,99 → revenue neto aproximado después de Stripe = **€4,65**.

Estos valores son referencias de simulación, no precios `LOCKED`.

---

## 12. Stripe

**`LOCKED` (metodología)**: toda futura simulación debe usar explícitamente `1,5% × importe cobrado + €0,25 por transacción`. No se usa `Revenue × 1,5%` como simplificación cuando existe comisión fija por transacción.

---

## 13. Impuestos

Se separan siempre: (A) cuota de autónomo, (B) IVA, (C) IRPF, (D) beneficio antes de impuestos. **El IRPF personal de Andrés no se calcula en el modelo económico V1** — depende de su situación fiscal personal completa. Se marca `DATO A VERIFICAR`. **Este documento no constituye asesoramiento fiscal.**

---

## 14. VeriFactu

Existe una alternativa gratuita de la Agencia Tributaria para necesidades muy básicas de facturación, y soluciones de pago económicas (desde ~€10/mes). Estado: `DATO A VALIDAR OPERATIVAMENTE`. No se compra ni se integra ningún software en este bloque.

---

## 15. LTV

**`LOCKED`**: LTV = **NO VALIDADO**. No se usan proyecciones de LTV basadas simplemente en margen × número arbitrario de meses. Validar LTV requiere retención real, churn real, comportamiento real, ingresos y costes variables reales — ninguno existe todavía.

---

## 16. HIPÓTESIS ABIERTAS

Ninguna de las siguientes se trata como hecho:

- Precio Partner final.
- Precio Premium final.
- Conversión Premium.
- Usuarios reales por Partner.
- Número de Partners alcanzable.
- Retención.
- Churn.
- Actividad de usuarios.
- % que alcanza Goals.
- % que redime Rewards.
- Coste real de cada Reward.
- CAC.
- Valor que el Partner obtiene realmente.
- Disposición real del Partner a pagar.

---

## 17. DATOS A VALIDAR

**P0 (prioridad máxima)**:
1. ¿Un Partner está dispuesto a pagar?
2. ¿Cuánto está dispuesto a pagar?
3. ¿Cuántos usuarios/clientes reales puede aportar?
4. ¿Qué valor percibe del sistema?
5. ¿Qué Reward está dispuesto a financiar?

**P1**:
6. Conversión Premium.
7. Retención.
8. Actividad.
9. Coste real de operación.
10. Consumo real de infraestructura.

---

## 18. Siguiente experimento

**`LOCKED`**: el siguiente paso **no es programar más economía**. El siguiente experimento es **comercial**, con el objetivo de validar el modelo Partner-funded con Partners reales.

Preguntas principales:
1. ¿Pagarías por este sistema?
2. ¿Cuánto pagarías al mes?
3. ¿Cuántos clientes/usuarios activos tienes?
4. ¿Cuántos clientes podrías introducir en VIAO?
5. ¿Qué tipo de Reward estarías dispuesto a financiar?
6. ¿Qué resultado tendría que producir VIAO para justificar el precio?
7. ¿Preferirías €25, €50, €75 o €100?
8. ¿Qué te impediría contratarlo?

No se implementa nada todavía — el protocolo comercial completo (perfiles, guiones, ficha de registro, sistema de puntuación, kit de captación) ya está diseñado en bloques anteriores de esta sesión.

---

## 19. Lo que no se necesita ahora

VIAO **no necesita ahora**: cross-Partner settlement, Discovery, personal contratado, infraestructura cara, marketing pagado, escalar Rewards VIAO-funded, aumentar `RW6`, modificar `RW5`, integrar un proveedor de viajes, Travel, Hotels.

VIAO continúa centrado en: **Goals + Points + Rewards + Missions + Partners**.

---

## 20. LOCKED — NO REABRIR SIN NUEVA EVIDENCIA

1. Partner-funded como modelo económico principal V1.
2. VIAO-funded como complemento limitado.
3. `RW1-RW6` permanecen sin cambios.
4. `RW6` = €100/mes.
5. `RW5` ≤30% del nominal.
6. Premium es complementario.
7. No asumir 500 usuarios/Partner.
8. IVA separado de revenue.
9. Stripe calculado con comisión fija + porcentaje.
10. LTV permanece `NO VALIDADO`.
11. No Travel/Hotels.
12. No Discovery.
13. No Cross-Partner settlement.

Si alguna de estas decisiones se quisiera cambiar en el futuro, debe abrirse explícitamente una **nueva DECISION REVIEW** con: motivo, evidencia nueva, impacto, alternativa, decisión, fecha.

---

## 21. Regla para futuros bloques

> Ningún futuro bloque debe volver a analizar una decisión `LOCKED` salvo que exista nueva evidencia que pueda cambiar materialmente la decisión.

> Una hipótesis no puede convertirse en "hecho" simplemente porque haya sido utilizada repetidamente en simulaciones.

> Los escenarios económicos son herramientas de decisión, no predicciones.

---

## 22. Conclusión

VIAO V1 no necesita ganar dinero por cobrar al usuario para demostrar que tiene valor. El modelo económico principal consiste en:

```
USUARIO   → obtiene valor
PARTNER   → obtiene clientes/retención/valor comercial
PARTNER   → financia el Reward
VIAO      → proporciona la infraestructura, sistema de Goals, Points,
            Rewards, Missions y relación de valor
```

La prioridad no es maximizar usuarios artificialmente. La prioridad es demostrar que un Partner real: (1) paga, (2) obtiene valor, (3) aporta usuarios, (4) financia Rewards, (5) permanece. Si esto funciona, la economía puede escalar.

---

## 23. Regla de no implementación

Este documento es exclusivamente de decisión y memoria estratégica. Ningún código, migración, componente, tabla, RPC, configuración de Supabase/Vercel ni cambio de producto fue creado o modificado para producir este documento.

---

## 24. Fuente

Consolidación directa de la FASE G — Unit Economics + Modelo Económico V1 (esta misma sesión). No se realizó investigación nueva para este documento.
