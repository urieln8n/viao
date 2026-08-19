"use client";

import { useId, useState, type ChangeEvent } from "react";

import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { listKnownDestinations } from "../../lib/travel-provider/mock-provider";

// Bloque 16 ("Destinos seleccionables") — deriva las sugerencias del MISMO
// catálogo que MockHotelProvider.search() ya usa (listKnownDestinations(),
// lib/travel-provider/mock-provider.ts), sin tocar esa función de
// matching. Con solo 4 destinos, un dropdown local hecho a mano cubre la
// necesidad real (filtrar 4 strings, elegir uno) sin la superficie de una
// primitiva headless completa (Autocomplete de @base-ui/react: Root +
// Input + Portal + Positioner + Popup + List + Item + navegación por
// teclado) que nunca se ha usado en este proyecto — menos riesgo de
// integración para el mismo resultado visible. Simplificación consciente:
// selección por click/tap, sin navegación con flechas del teclado.
const KNOWN_DESTINATIONS = listKnownDestinations();

interface DestinationInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}

export function DestinationInput({
  id,
  name,
  value,
  onChange,
  ariaInvalid,
  ariaDescribedBy,
}: DestinationInputProps) {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);

  const needle = value.trim().toLowerCase();
  const matches = needle
    ? KNOWN_DESTINATIONS.filter((destination) => destination.city.toLowerCase().includes(needle))
    : KNOWN_DESTINATIONS;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
    setIsOpen(true);
  }

  function handleSelect(city: string) {
    onChange(city);
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
              <li key={destination.city}>
                <button
                  type="button"
                  role="option"
                  aria-selected={destination.city === value}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(destination.city)}
                >
                  {destination.city}, {destination.country}
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
