"use client";

import { useId, useState, type ChangeEvent } from "react";

import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";

// FPR-HOTELS-02 — Ya NO deriva las sugerencias de
// `MockHotelProvider.listKnownDestinations()` (bloque 16 "Destinos
// seleccionables", ahora obsoleto para el flujo real): el catálogo real
// de destinos (`destinations`, Supabase, sincronizado desde Hotelbeds
// Locations/Destinations) es la única fuente de verdad — se recibe como
// prop, cargado server-side en app/search/page.tsx. Evita tener dos
// catálogos de destinos distintos (Mock vs. Hotelbeds) desincronizados
// entre sí.
export interface DestinationCatalogEntry {
  code: string;
  name: string;
}

interface DestinationInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  /**
   * Se llama con el `code` real cuando el usuario SELECCIONA una
   * sugerencia del catálogo (nunca al escribir texto libre) — `undefined`
   * cuando el usuario vuelve a escribir, para no enviar un código que ya
   * no corresponde a lo escrito. FPR-HOTELS-02: es el dato canónico que
   * `HotelbedsProvider` usa directamente, sin volver a resolver por
   * nombre.
   */
  onDestinationCodeChange: (code: string | undefined) => void;
  /** Catálogo real de destinos (FPR-HOTELS-02) — cargado server-side, único origen de sugerencias. */
  destinations: DestinationCatalogEntry[];
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}

export function DestinationInput({
  id,
  name,
  value,
  onChange,
  onDestinationCodeChange,
  destinations,
  ariaInvalid,
  ariaDescribedBy,
}: DestinationInputProps) {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);

  const needle = value.trim().toLowerCase();
  const matches = needle
    ? destinations.filter((destination) => destination.name.toLowerCase().includes(needle))
    : destinations;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
    onDestinationCodeChange(undefined);
    setIsOpen(true);
  }

  function handleSelect(destination: DestinationCatalogEntry) {
    onChange(destination.name);
    onDestinationCodeChange(destination.code);
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        value={value}
        onChange={handleChange}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
      />
      {isOpen && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full left-0 z-10 mt-1 w-full rounded-lg border border-border bg-card p-1 shadow-md"
        >
          {matches.length > 0 ? (
            matches.map((destination) => (
              <li key={destination.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={destination.name === value}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(destination)}
                >
                  {destination.name}
                </button>
              </li>
            ))
          ) : (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">
              {t("search.destinationNoMatch")}
            </li>
          )}
          <li className="border-t border-border px-2 py-1.5 text-xs text-muted-foreground">
            {t("search.destinationSuggestionsNote")}
          </li>
        </ul>
      )}
    </div>
  );
}
