// F6-02 (VIAO_ROADMAP.md) — Tests de la Server Action de reserva. Mismo
// motivo que el resto de Fase 5/6 para usar `node:test` y compilar a un
// directorio temporal antes de ejecutar (imports relativos, no el alias
// `@/` — ver el comando exacto en el reporte de la fase).
//
// `createBookingAction` solo toca `next/headers` (sesión) DESPUÉS de
// comprobar que el alojamiento existe — por eso los caminos de "input
// inválido", "propiedad inexistente" y "sin sesión real" son ejercitables
// aquí directamente, sin necesidad de una petición real de Next.js. El
// flujo completo con un usuario autenticado real (reserva válida, reserva
// rechazada por el provider, fila creada en `bookings`) se verifica en el
// reporte de la fase mediante navegador real — ver también
// lib/bookings/create-booking-record.test.ts y
// lib/properties/upsert-property-cache.test.ts para la capa de
// persistencia (usa `service_role`, sin depender de `next/headers`).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { createBookingAction } from "./actions";

const VALID_INPUT = {
  propertyId: "mock-001",
  checkIn: "2026-10-01",
  checkOut: "2026-10-04",
  guests: 2,
  rooms: 1,
};

// ── Input inválido: rechazado server-side, mismos principios que F5-02 ──
test("propertyId vacío: rechazado server-side", async () => {
  const result = await createBookingAction({ ...VALID_INPUT, propertyId: "" });

  assert.equal(result.status, "invalid_input");
  if (result.status !== "invalid_input") return;
  assert.ok(result.fieldErrors.propertyId);
});

test("checkOut anterior a checkIn: rechazado server-side", async () => {
  const result = await createBookingAction({
    ...VALID_INPUT,
    checkIn: "2026-10-04",
    checkOut: "2026-10-01",
  });

  assert.equal(result.status, "invalid_input");
  if (result.status !== "invalid_input") return;
  assert.ok(result.fieldErrors.checkOut);
});

test("guests = 0 y rooms = 0: rechazados server-side", async () => {
  const result = await createBookingAction({ ...VALID_INPUT, guests: 0, rooms: 0 });

  assert.equal(result.status, "invalid_input");
  if (result.status !== "invalid_input") return;
  assert.ok(result.fieldErrors.guests);
  assert.ok(result.fieldErrors.rooms);
});

test("tipos inesperados en runtime (no solo fuera de rango): rechazado, no crashea", async () => {
  const malformed = { ...VALID_INPUT, guests: "2" as unknown as number };
  const result = await createBookingAction(malformed);

  assert.equal(result.status, "invalid_input");
  if (result.status !== "invalid_input") return;
  assert.ok(result.fieldErrors.guests);
});

// ── propertyId inexistente: comprobación de solo lectura, antes de la sesión ──
test("propertyId inexistente: not_found, alcanzable sin sesión real (comprobación de existencia antes de resolver identidad)", async () => {
  const result = await createBookingAction({ ...VALID_INPUT, propertyId: "does-not-exist" });

  assert.equal(result.status, "not_found");
});

// ── 15. Usuario no autenticado: fail-closed, incluida la ausencia de un contexto de petición real ──
test("sin sesión real (fuera de una petición de Next.js): unauthenticated, no lanza", async () => {
  const result = await createBookingAction(VALID_INPUT);

  assert.equal(result.status, "unauthenticated");
});

// ── 16. No se puede enviar un user_id arbitrario: ni siquiera existe ese campo en el input ──
test("BookingActionInput no declara userId/user_id; actions.ts nunca lo lee del input del cliente", () => {
  const source = readFileSync(path.join(process.cwd(), "app/booking/actions.ts"), "utf-8");

  const inputInterfaceMatch = source.match(
    /export interface BookingActionInput \{([\s\S]*?)\}/,
  );
  assert.ok(inputInterfaceMatch, "no se encontró la interfaz BookingActionInput");
  assert.ok(
    !/userId|user_id/i.test(inputInterfaceMatch![1]),
    "BookingActionInput no debe declarar userId/user_id: la identidad solo viene de la sesión real",
  );
  assert.ok(
    !/input\.userId|input\.user_id|input\?\.userId|input\?\.user_id/.test(source),
    "actions.ts no debe leer userId/user_id del input del cliente en ningún punto",
  );
  assert.ok(
    /user\.id/.test(source),
    "actions.ts debe usar el id del usuario resuelto por sesión (user.id), no uno enviado por el cliente",
  );
});

// ── 17. No importa MockHotelProvider directamente ──
test("actions.ts (booking) no importa MockHotelProvider directamente; usa getTravelProvider() del adapter", () => {
  const source = readFileSync(path.join(process.cwd(), "app/booking/actions.ts"), "utf-8");

  assert.ok(
    !/mock-provider/i.test(source),
    "actions.ts no debe referenciar mock-provider.ts directamente",
  );
  assert.ok(
    /getTravelProvider/.test(source),
    "actions.ts debe obtener el provider mediante getTravelProvider() (F4-05)",
  );
});

// ── 18. Un error inesperado (no del modelo de F4-03) nunca se oculta: ambos catch relanzan ──
test("los catch de getDetails() y book() relanzan cualquier error que no sea del modelo de F4-03 (no se oculta como resultado controlado)", () => {
  const source = readFileSync(path.join(process.cwd(), "app/booking/actions.ts"), "utf-8");

  const catchBlocks = source.match(/catch \(error\) \{[\s\S]*?\n  \}/g) ?? [];
  const relevantCatches = catchBlocks.filter((block) => block.includes("TravelProviderError"));

  assert.ok(
    relevantCatches.length >= 2,
    "se esperaban al menos 2 bloques catch (getDetails y book) que distingan TravelProviderError",
  );
  for (const block of relevantCatches) {
    assert.ok(
      /throw error;/.test(block),
      "cada catch debe relanzar (throw error) cuando el error no es TravelProviderError, nunca ocultarlo",
    );
  }
});

// ── F6-03: transición de estado tras crear la reserva ──
test("createBookingAction (F6-03) llama a updateBookingStatus tras createBookingRecord, con el status real del provider", () => {
  const source = readFileSync(path.join(process.cwd(), "app/booking/actions.ts"), "utf-8");

  assert.ok(
    /import \{ updateBookingStatus \} from "\.\.\/\.\.\/lib\/bookings\/update-booking-status"/.test(source),
    "actions.ts debe importar updateBookingStatus de lib/bookings/update-booking-status",
  );

  const createIndex = source.indexOf("await createBookingRecord(");
  const updateIndex = source.indexOf("await updateBookingStatus(");
  assert.ok(createIndex !== -1 && updateIndex !== -1, "no se encontraron ambas llamadas");
  assert.ok(createIndex < updateIndex, "updateBookingStatus debe llamarse DESPUÉS de createBookingRecord, nunca antes");

  const updateCallBlock = source.slice(updateIndex, updateIndex + 200);
  assert.ok(
    /status:\s*bookingResult\.status/.test(updateCallBlock),
    "el status pasado a updateBookingStatus debe venir de bookingResult.status (respuesta real del provider), no un valor fijo",
  );
  assert.ok(
    /userId:\s*user\.id/.test(updateCallBlock),
    "updateBookingStatus debe recibir el id del usuario resuelto por sesión, igual que createBookingRecord",
  );
});

test("createBookingAction (F6-03): un fallo al transicionar el estado no impide devolver success (no rompe una reserva ya válida)", () => {
  const source = readFileSync(path.join(process.cwd(), "app/booking/actions.ts"), "utf-8");

  const updateIndex = source.indexOf("await updateBookingStatus(");
  const successReturnIndex = source.indexOf('status: "success"', updateIndex);
  assert.ok(updateIndex !== -1 && successReturnIndex !== -1);
  assert.ok(
    updateIndex < successReturnIndex,
    "el return de éxito debe seguir ocurriendo después del intento de actualizar el estado",
  );

  // La llamada a updateBookingStatus debe estar en su propio try/catch que
  // NO relance ni haga return de error (a diferencia del catch exterior de
  // persistencia, que sí devuelve persistence_error). Se extrae únicamente
  // el CUERPO del catch (hasta su propia llave de cierre), no todo lo que
  // sigue en el archivo — de lo contrario el `return { status: "success"`
  // posterior (deseado) haría fallar una comprobación ingenua de "return".
  const catchBodyMatch = source.match(/catch \(statusError\) \{([\s\S]*?)\n {4}\}/);
  assert.ok(catchBodyMatch, "se esperaba un catch dedicado (statusError) que no interrumpa el flujo de éxito");
  assert.ok(
    !/return/.test(catchBodyMatch![1]),
    "el catch de statusError no debe hacer return: un fallo secundario de transición de estado no debe convertirse en un fallo de la Action",
  );
});

// ── F6-04: booking_completed solo tras una transición a "confirmed" real ──
test("createBookingAction (F6-04): registra booking_completed, y solo dentro de la condición statusUpdateSucceeded && status === \"confirmed\"", () => {
  const source = readFileSync(path.join(process.cwd(), "app/booking/actions.ts"), "utf-8");

  assert.ok(
    /import \{ logAnalyticsEvent \} from "\.\.\/\.\.\/lib\/analytics\/log-event"/.test(source),
    "actions.ts debe importar logAnalyticsEvent de lib/analytics/log-event (reutilizando F5-05, sin sistema paralelo)",
  );

  const occurrences = source.match(/logAnalyticsEvent\(\s*"booking_completed"/g) ?? [];
  assert.equal(occurrences.length, 1, "booking_completed debe registrarse en exactamente un punto del archivo");

  const updateIndex = source.indexOf("await updateBookingStatus(");
  const succeededAssignIndex = source.indexOf("statusUpdateSucceeded = true;");

  assert.ok(updateIndex !== -1 && succeededAssignIndex !== -1, "no se encontró la transición de estado de F6-03");
  assert.ok(updateIndex < succeededAssignIndex, "statusUpdateSucceeded = true debe fijarse DESPUÉS de que updateBookingStatus resuelva con éxito");

  const ifGuardMatch = source.match(
    /if \(statusUpdateSucceeded && bookingResult\.status === "confirmed"\) \{([\s\S]*?)\n {4}\}/,
  );
  assert.ok(ifGuardMatch, 'se esperaba un guard explícito "if (statusUpdateSucceeded && bookingResult.status === \\"confirmed\\")" antes de registrar booking_completed');
  assert.ok(
    /logAnalyticsEvent\(\s*"booking_completed"/.test(ifGuardMatch![1]),
    "la llamada a logAnalyticsEvent(\"booking_completed\") debe estar DENTRO del guard, no fuera de él",
  );

  const guardIndex = source.indexOf(ifGuardMatch![0]);
  const successReturnIndex = source.indexOf('status: "success"', guardIndex);
  assert.ok(guardIndex > succeededAssignIndex, "el guard de booking_completed debe evaluarse después de que se conozca si la transición tuvo éxito");
  assert.ok(successReturnIndex > guardIndex, "el return de éxito debe seguir ocurriendo después del intento de registrar booking_completed");
});

test("createBookingAction (F6-04): ninguna rama de error (invalid_input/unauthenticated/not_found/unavailable/provider_error/persistence_error) puede alcanzar booking_completed", () => {
  const source = readFileSync(path.join(process.cwd(), "app/booking/actions.ts"), "utf-8");

  // Todos los `return` de error ocurren antes del bloque try que contiene
  // createBookingRecord/updateBookingStatus/booking_completed, o dentro
  // del catch exterior de persistencia (que retorna sin pasar por el
  // guard). Se comprueba estructuralmente que el ÚNICO guard de
  // booking_completed está anidado dentro del try de persistencia, después
  // de una creación ya exitosa — nunca alcanzable desde un `return`
  // temprano de error.
  const outerTryIndex = source.indexOf("try {\n    const propertyRowId = await upsertPropertyCache(property);");
  const eventGuardIndex = source.indexOf('if (statusUpdateSucceeded && bookingResult.status === "confirmed")');
  const outerCatchIndex = source.indexOf("} catch (error) {\n    // El provider YA aceptó la reserva");

  assert.ok(outerTryIndex !== -1 && eventGuardIndex !== -1 && outerCatchIndex !== -1);
  assert.ok(
    outerTryIndex < eventGuardIndex && eventGuardIndex < outerCatchIndex,
    "el guard de booking_completed debe vivir dentro del try de persistencia, antes de su catch — nunca en una rama de error temprana",
  );
});

// ── F7-04: recompensa de Points solo tras una confirmación real, dentro del mismo guard que booking_completed ──
test("createBookingAction (F7-04): otorga la recompensa de Points DENTRO del mismo guard que booking_completed, DESPUÉS de registrarlo", () => {
  const source = readFileSync(path.join(process.cwd(), "app/booking/actions.ts"), "utf-8");

  assert.ok(
    /import \{ createRewardTransaction \} from "\.\.\/\.\.\/lib\/rewards\/create-reward-transaction"/.test(source),
    "actions.ts debe importar createRewardTransaction de lib/rewards/create-reward-transaction (F7-01), sin reimplementar la escritura",
  );
  assert.ok(
    /import \{ BOOKING_REWARD_POINTS_PROVISIONAL \} from "\.\.\/\.\.\/lib\/rewards\/rules"/.test(source),
    "el monto debe venir de lib/rewards/rules.ts (config centralizada), no de un número mágico",
  );

  const occurrences = source.match(/await createRewardTransaction\(/g) ?? [];
  assert.equal(occurrences.length, 1, "createRewardTransaction debe llamarse en exactamente un punto del archivo");

  const ifGuardMatch = source.match(
    /if \(statusUpdateSucceeded && bookingResult\.status === "confirmed"\) \{([\s\S]*?)\n {4}\}/,
  );
  assert.ok(ifGuardMatch, "no se encontró el guard compartido con booking_completed (F6-04)");
  const guardBody = ifGuardMatch![1];

  assert.ok(
    /await createRewardTransaction\(/.test(guardBody),
    "createRewardTransaction debe llamarse DENTRO del mismo guard que booking_completed, nunca fuera de él",
  );

  const completedMatch = guardBody.match(/logAnalyticsEvent\(\s*"booking_completed"/);
  const rewardIdx = guardBody.indexOf("await createRewardTransaction(");
  assert.ok(completedMatch, "no se encontró la llamada a booking_completed dentro del guard");
  const completedIdx = guardBody.indexOf(completedMatch![0]);
  assert.ok(rewardIdx > completedIdx, "la recompensa debe otorgarse después de registrar booking_completed, no antes");

  // Datos correctos: reason/referenceType='booking', referenceId=bookingId (la reserva real), userId=user.id (nunca del cliente), amount=la constante provisional.
  const rewardCallBlock = guardBody.slice(rewardIdx, rewardIdx + 260);
  assert.ok(/userId:\s*user\.id/.test(rewardCallBlock), "debe usar el id del usuario resuelto por sesión, igual que createBookingRecord/updateBookingStatus");
  assert.ok(/amount:\s*BOOKING_REWARD_POINTS_PROVISIONAL/.test(rewardCallBlock), "debe usar el monto provisional centralizado");
  assert.ok(/reason:\s*"booking"/.test(rewardCallBlock));
  assert.ok(/referenceType:\s*"booking"/.test(rewardCallBlock));
  assert.ok(/referenceId:\s*bookingId/.test(rewardCallBlock), "referenceId debe ser el bookingId real de ESTA reserva, para la idempotencia por referencia");
});

test("createBookingAction (F7-04): un fallo al crear la recompensa no impide devolver success (no rompe una reserva ya válida)", () => {
  const source = readFileSync(path.join(process.cwd(), "app/booking/actions.ts"), "utf-8");

  const rewardCallIndex = source.indexOf("await createRewardTransaction(");
  const successReturnIndex = source.indexOf('status: "success"', rewardCallIndex);
  assert.ok(rewardCallIndex !== -1 && successReturnIndex !== -1);
  assert.ok(successReturnIndex > rewardCallIndex, "el return de éxito debe seguir ocurriendo después del intento de otorgar la recompensa");

  const catchBodyMatch = source.match(/catch \(rewardError\) \{([\s\S]*?)\n {6}\}/);
  assert.ok(catchBodyMatch, "se esperaba un catch dedicado (rewardError) que no interrumpa el flujo de éxito");
  assert.ok(
    !/return/.test(catchBodyMatch![1]),
    "el catch de rewardError no debe hacer return: un fallo al otorgar Points no debe convertirse en un fallo de la Action",
  );
});

test("createBookingAction (F7-04): ninguna rama de error puede alcanzar createRewardTransaction (mismo guard ya protegido que booking_completed)", () => {
  const source = readFileSync(path.join(process.cwd(), "app/booking/actions.ts"), "utf-8");

  const outerTryIndex = source.indexOf("try {\n    const propertyRowId = await upsertPropertyCache(property);");
  const rewardCallIndex = source.indexOf("await createRewardTransaction(");
  const outerCatchIndex = source.indexOf("} catch (error) {\n    // El provider YA aceptó la reserva");

  assert.ok(outerTryIndex !== -1 && rewardCallIndex !== -1 && outerCatchIndex !== -1);
  assert.ok(
    outerTryIndex < rewardCallIndex && rewardCallIndex < outerCatchIndex,
    "la llamada a createRewardTransaction debe vivir dentro del try de persistencia, antes de su catch — nunca alcanzable desde una rama de error temprana",
  );
});

// ── F6-06: search_id solo se persiste si pertenece al usuario que reserva ──
test("createBookingAction (F6-06) resuelve search_id vía getSearchById, DESPUÉS de conocer al usuario, nunca antes", () => {
  const source = readFileSync(path.join(process.cwd(), "app/booking/actions.ts"), "utf-8");

  assert.ok(
    /import \{ getSearchById \} from "\.\.\/\.\.\/lib\/searches\/get-search-by-id"/.test(source),
    "actions.ts debe importar getSearchById de lib/searches/get-search-by-id (F6-01), sin reimplementar la lectura",
  );

  const userCheckIndex = source.indexOf('if (!user) {\n    return { status: "unauthenticated" };\n  }');
  const getSearchIndex = source.indexOf("await getSearchById(rawSearchId)");
  const bookCallIndex = source.indexOf("bookingResult = await provider.book(");

  assert.ok(userCheckIndex !== -1 && getSearchIndex !== -1 && bookCallIndex !== -1);
  assert.ok(
    userCheckIndex < getSearchIndex,
    "getSearchById debe llamarse DESPUÉS de resolver `user` — antes de eso no hay auth.uid() real con el que comparar ownership",
  );
  assert.ok(
    getSearchIndex < bookCallIndex,
    "el search_id debe quedar resuelto antes de llamar a provider.book(), para poder persistirlo en el mismo flujo",
  );
});

test("createBookingAction (F6-06): search_id solo se conserva si getSearchById devuelve una búsqueda real (ownership vía RLS, no una comprobación manual)", () => {
  const source = readFileSync(path.join(process.cwd(), "app/booking/actions.ts"), "utf-8");

  const block = source.slice(
    source.indexOf("let searchId: string | undefined;"),
    source.indexOf("let bookingResult: BookingResult;"),
  );
  assert.ok(block.length > 0, "no se encontró el bloque de resolución de search_id");
  assert.ok(
    /const ownSearch = await getSearchById\(rawSearchId\);/.test(block),
    "debe llamar a getSearchById(rawSearchId), no a una variante distinta",
  );
  assert.ok(
    /searchId = ownSearch \? rawSearchId : undefined;/.test(block),
    "search_id solo debe conservarse cuando getSearchById encontró una fila real (propia, por RLS); si no, debe quedar undefined -> NULL",
  );

  // No debe existir ninguna comprobación manual de ownership (consulta
  // directa a `searches` o comparación de `user_id` a mano): la garantía
  // viene entera de RLS a través de getSearchById, no de lógica duplicada
  // aquí.
  assert.ok(
    !/\.from\(\s*"searches"\s*\)/.test(source),
    "actions.ts no debe consultar la tabla searches directamente: debe reutilizar getSearchById",
  );
});

test("createBookingAction (F6-06): un searchId con formato inválido nunca llega a getSearchById (se descarta como rawSearchId=undefined antes)", () => {
  const source = readFileSync(path.join(process.cwd(), "app/booking/actions.ts"), "utf-8");

  assert.ok(
    /const rawSearchId =\s*\n\s*input\.searchId && isValidUuid\(input\.searchId\) \? input\.searchId : undefined;/.test(
      source,
    ),
    "el formato UUID debe filtrarse antes, sobre input.searchId, reutilizando isValidUuid",
  );
  assert.ok(
    /if \(rawSearchId\) \{\s*\n\s*const ownSearch = await getSearchById\(rawSearchId\);/.test(source),
    "getSearchById solo debe llamarse cuando rawSearchId ya tiene formato válido (rawSearchId truthy)",
  );
});

test("sin sesión real, con un searchId con formato válido: sigue devolviendo unauthenticated sin lanzar (no llega a resolver ownership sin sesión)", async () => {
  const result = await createBookingAction({
    ...VALID_INPUT,
    searchId: "11111111-1111-1111-1111-111111111111",
  });

  assert.equal(result.status, "unauthenticated");
});

// ── No duplica el modelo de precisión de F6-01: reutiliza isValidUuid de F5-07 ──
test("actions.ts (booking) reutiliza isValidUuid de app/properties/[id]/resolve.ts, no duplica el regex", () => {
  const source = readFileSync(path.join(process.cwd(), "app/booking/actions.ts"), "utf-8");

  assert.ok(
    /import \{ isValidUuid \} from "\.\.\/properties\/\[id\]\/resolve"/.test(source),
    "actions.ts debe importar isValidUuid en vez de redefinir la validación de formato UUID",
  );
});
