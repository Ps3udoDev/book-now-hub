"use client";

import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ProductApiItem } from "@/hooks/supabase/use-products";
import { cn } from "@/lib/utils";

interface ProductComboboxProps {
  products: ProductApiItem[];
  value: string;
  onChange: (productId: string) => void;
  /** Opción sintética al inicio de la lista (ej. "Todos" en filtros). */
  allOption?: { value: string; label: string };
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

function stockOf(product: ProductApiItem): number {
  return product.stock_summary?.calculated_stock ?? product.stock_quantity;
}

/** Normaliza para buscar sin tildes ni mayúsculas. */
const DIACRITICS = /[̀-ͯ]/g;

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(DIACRITICS, "");
}

/**
 * Selector de producto con buscador incorporado. Reemplaza al <Select> plano
 * cuando el catálogo es grande: el Select de Radix sólo permite typeahead de
 * un carácter y obliga a desplazar toda la lista a mano.
 */
export function ProductCombobox({
  products,
  value,
  onChange,
  allOption,
  placeholder = "Selecciona un producto",
  isLoading = false,
  disabled = false,
  className,
}: ProductComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const options = useMemo(() => {
    const term = normalize(query.trim());
    const matches = products.filter((product) => {
      if (!term) return true;
      return (
        normalize(product.name).includes(term) ||
        normalize(product.sku ?? "").includes(term) ||
        normalize(product.category ?? "").includes(term)
      );
    });

    const mapped = matches.map((product) => ({
      value: product.id,
      label: product.name,
      hint: [product.sku, product.category].filter(Boolean).join(" · "),
      stock: stockOf(product),
    }));

    // La opción sintética sólo aparece cuando no se está filtrando.
    if (allOption && !term) {
      return [
        {
          value: allOption.value,
          label: allOption.label,
          hint: "",
          stock: null,
        },
        ...mapped,
      ];
    }
    return mapped;
  }, [products, query, allOption]);

  const selectedLabel = useMemo(() => {
    if (allOption && value === allOption.value) return allOption.label;
    return products.find((product) => product.id === value)?.name ?? "";
  }, [products, value, allOption]);

  // Cierra al hacer click fuera del combobox.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  // Al abrir: limpia el filtro previo y enfoca el buscador.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlight(0);
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const commit = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((current) => Math.min(current + 1, options.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const option = options[highlight];
      if (option) commit(option.value);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((current) => !current)}
        className="border-input dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          className={cn(
            "line-clamp-1 text-left",
            !selectedLabel && "text-muted-foreground",
          )}
        >
          {selectedLabel || placeholder}
        </span>
        {isLoading ? (
          <Loader2 className="size-4 shrink-0 animate-spin opacity-50" />
        ) : (
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        )}
      </button>

      {open && (
        <div className="bg-popover text-popover-foreground absolute z-50 mt-1 w-full overflow-hidden rounded-md border shadow-md">
          <div className="relative border-b">
            <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlight(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Buscar por nombre, SKU o categoría"
              className="placeholder:text-muted-foreground h-9 w-full bg-transparent pl-9 pr-3 text-sm outline-none"
            />
          </div>

          <ul
            id={listboxId}
            aria-label="Productos"
            className="max-h-60 overflow-y-auto p-1"
          >
            {options.length === 0 ? (
              <li className="text-muted-foreground px-3 py-6 text-center text-sm">
                {isLoading ? "Cargando productos..." : "Sin resultados"}
              </li>
            ) : (
              options.map((option, index) => (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => commit(option.value)}
                    onMouseEnter={() => setHighlight(index)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none",
                      index === highlight && "bg-accent text-accent-foreground",
                    )}
                  >
                    <Check
                      className={cn(
                        "size-4 shrink-0",
                        option.value === value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{option.label}</span>
                      {option.hint && (
                        <span className="text-muted-foreground block truncate text-xs">
                          {option.hint}
                        </span>
                      )}
                    </span>
                    {option.stock !== null && (
                      <span className="text-muted-foreground shrink-0 text-xs">
                        Stock {option.stock}
                      </span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
