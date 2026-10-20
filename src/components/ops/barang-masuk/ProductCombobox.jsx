"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Package, Search, X } from "lucide-react";

const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

function productStock(product) {
  const value = product?.stock_efektif ?? product?.stock;
  const total = Number(value);
  return Number.isFinite(total) ? total : null;
}

export default function ProductCombobox({ products = [], variants = [], value = "", onSelect, autoFocus = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listId = useId();
  const selected = useMemo(() => products.find((p) => p.id === value) || null, [products, value]);

  const options = useMemo(() => {
    const variantsByProduct = new Map();
    for (const variant of variants || []) {
      if (!variantsByProduct.has(variant.product_id)) variantsByProduct.set(variant.product_id, []);
      variantsByProduct.get(variant.product_id).push(variant);
    }
    return products.map((product) => {
      const ownVariants = variantsByProduct.get(product.id) || [];
      const colors = [
        ...(Array.isArray(product.colors) ? product.colors : []),
        ...ownVariants.map((variant) => variant.color),
      ].filter((color) => color && String(color).toLowerCase() !== "default");
      return {
        product,
        series: String(product.series || "").trim(),
        category: String(product.category || product.jenis_kain?.name || "Lainnya").trim(),
        stock: productStock(product),
        search: normalize([
          product.name,
          product.sku,
          product.series,
          product.category,
          product.jenis_kain?.name,
          ...colors,
          ...ownVariants.flatMap((variant) => Object.values(variant.skus || {})),
        ].join(" ")),
      };
    });
  }, [products, variants]);

  const groups = useMemo(() => {
    const needle = normalize(query);
    const visible = options.filter((option) => !needle || option.search.includes(needle));
    const grouped = new Map();
    for (const option of visible) {
      if (!grouped.has(option.category)) grouped.set(option.category, []);
      grouped.get(option.category).push(option);
    }
    return [...grouped.entries()].map(([category, items]) => ({
      category,
      items: items.sort(
        (a, b) =>
          a.product.name.localeCompare(b.product.name, "id") ||
          a.series.localeCompare(b.series, "id"),
      ),
    }));
  }, [options, query]);

  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const indexOf = useMemo(() => new Map(flat.map((item, index) => [item, index])), [flat]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const active = document.getElementById(`${listId}-opt-${activeIndex}`);
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, listId]);

  const selectedLabel = selected ? [selected.name, selected.series].filter(Boolean).join(" · ") : "";
  const inputValue = open ? query : selectedLabel;

  function openPanel() {
    if (open) return;
    setOpen(true);
    setQuery("");
  }

  function closePanel() {
    setOpen(false);
    setQuery("");
  }

  function choose(option) {
    onSelect?.(option.product.id);
    closePanel();
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        openPanel();
        return;
      }
      setActiveIndex((index) => Math.min(Math.max(flat.length - 1, 0), index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openPanel();
        return;
      }
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter") {
      if (open && flat[activeIndex]) {
        event.preventDefault();
        choose(flat[activeIndex]);
      } else if (!open) {
        event.preventDefault();
        openPanel();
      }
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        closePanel();
        inputRef.current?.blur();
      }
    } else if (event.key === "Tab") {
      if (open) closePanel();
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-400" size={18} />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-activedescendant={open && flat[activeIndex] ? `${listId}-opt-${activeIndex}` : undefined}
          value={inputValue}
          autoFocus={autoFocus}
          onClick={openPanel}
          onChange={(event) => {
            setOpen(true);
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Cari produk, SKU, series, warna, atau kain…"
          className="w-full rounded-xl border-2 border-gray-200 bg-white py-3.5 pl-11 pr-20 font-inter transition-all focus:border-green-500 focus:ring-2 focus:ring-green-100"
          style={{ fontSize: "14.5px", fontWeight: 600 }}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {value ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSelect?.("");
                closePanel();
                inputRef.current?.focus();
              }}
              className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Hapus produk"
            >
              <X size={15} />
            </button>
          ) : null}
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (open) {
                closePanel();
              } else {
                openPanel();
                inputRef.current?.focus();
              }
            }}
            className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label={open ? "Tutup daftar produk" : "Buka daftar produk"}
          >
            <ChevronDown size={17} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[min(340px,60vh)] overflow-y-auto overscroll-contain rounded-2xl border border-gray-200 bg-white shadow-xl scroll-smooth"
        >
          {flat.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-gray-100 text-gray-400">
                <Search size={20} />
              </div>
              <p className="font-inter text-[13.5px] font-bold text-slate-700">Produk tidak ditemukan</p>
              <p className="font-inter mt-1 text-[11.5px] text-slate-400">
                Coba nama, SKU, series, warna, atau kain lain.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.category}>
                <div className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50/95 px-4 py-2 backdrop-blur-sm">
                  <p className="font-inter text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
                    {group.category}
                  </p>
                </div>
                {group.items.map((option) => {
                  const index = indexOf.get(option) ?? 0;
                  const active = index === activeIndex;
                  const isSelected = option.product.id === value;
                  return (
                    <button
                      key={option.product.id}
                      id={`${listId}-opt-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => choose(option)}
                      className={`flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left transition-colors last:border-b-0 ${
                        active ? "bg-green-50" : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                          isSelected ? "bg-green-600 text-white" : "bg-gray-100 text-slate-400"
                        }`}
                      >
                        <Package size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-inter text-[13px] font-bold text-slate-900">
                            {option.product.name}
                          </span>
                          {isSelected ? <Check size={13} className="shrink-0 text-green-600" /> : null}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-inter text-[10.5px] text-slate-500">
                          {option.series ? (
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-bold text-slate-600">
                              {option.series}
                            </span>
                          ) : null}
                          {option.product.jenis_kain?.name ? <span>{option.product.jenis_kain.name}</span> : null}
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-[10.5px] text-slate-400">
                          {option.product.sku}
                        </span>
                      </span>
                      {option.stock !== null ? (
                        <span className="shrink-0 text-right">
                          <span className="block font-outfit text-[14px] font-extrabold text-slate-800">
                            {option.stock}
                          </span>
                          <span className="block font-inter text-[9px] font-bold uppercase tracking-wide text-slate-400">
                            pcs
                          </span>
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
