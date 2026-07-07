"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { GradebookBadge } from "@/components/grades/gradebook-design";

type MultiCheckboxOption = {
  value: string;
  label: string;
};

type MultiCheckboxSelectProps = {
  name: string;
  label: string;
  helpText: string;
  options: MultiCheckboxOption[];
  emptyText?: string;
};

export function MultiCheckboxSelect({
  name,
  label,
  helpText,
  options,
  emptyText = "No hay opciones disponibles."
}: MultiCheckboxSelectProps) {
  const [query, setQuery] = useState("");
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const selectedOptions = options.filter((option) => selectedValues.includes(option.value));
  const filteredOptions = useMemo(() => {
    const normalized = normalizeText(query);
    if (!normalized) return options;
    return options.filter((option) => normalizeText(option.label).includes(normalized));
  }, [options, query]);

  function toggleValue(value: string) {
    setSelectedValues((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  function clearSelection() {
    setSelectedValues([]);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-950">{label}</h3>
            <GradebookBadge tone={selectedValues.length > 0 ? "blue" : "gray"}>{selectedValues.length} seleccionados</GradebookBadge>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{helpText}</p>
        </div>
        <button
          type="button"
          onClick={clearSelection}
          disabled={selectedValues.length === 0}
          className="inline-flex h-8 w-fit items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Limpiar
        </button>
      </div>

      {selectedOptions.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <span key={option.value} className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
              {option.label}
              <button type="button" onClick={() => toggleValue(option.value)} aria-label={`Quitar ${option.label}`} className="rounded-full p-0.5 hover:bg-sky-100">
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <label className="mt-3 flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 focus-within:border-sky-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100">
        <Search className="h-4 w-4" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Buscar ${label.toLowerCase()}`}
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </label>

      <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-slate-200">
        {filteredOptions.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-slate-500">{emptyText}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredOptions.map((option) => {
              const checked = selectedValues.includes(option.value);
              return (
                <label key={option.value} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-slate-50">
                  <input
                    type="checkbox"
                    name={name}
                    value={option.value}
                    checked={checked}
                    onChange={() => toggleValue(option.value)}
                    className="h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-500"
                  />
                  <span className="text-sm font-medium text-slate-700">{option.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
