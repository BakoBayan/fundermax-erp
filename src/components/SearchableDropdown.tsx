"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Plus, Trash2, Check, X } from "lucide-react";
import { useInventory } from "../context/InventoryContext";
import { autoCapitalizeFirstLetter } from "../utils/text";

interface SearchableDropdownProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  onAddNew?: (newVal: string) => void;
  onDeleteOption?: (valToDelete: string) => void;
  placeholder?: string;
  allowDelete?: boolean;
  compact?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  value,
  onChange,
  onAddNew,
  onDeleteOption,
  placeholder,
  allowDelete = true,
  compact = false,
  clearable = false,
  disabled = false,
  className = "",
}) => {
  const { t, requestConfirm } = useInventory();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click (mouse or touch)
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const canAddNew =
    Boolean(onAddNew) &&
    search.trim().length > 0 &&
    !options.some((o) => o.toLowerCase() === search.trim().toLowerCase());

  const handleSelect = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
    setSearch("");
  };

  const handleAddNew = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddNew && search.trim()) {
      const val = autoCapitalizeFirstLetter(search.trim());
      onAddNew(val);
      onChange(val);
      setSearch("");
      setIsOpen(false);
    }
  };

  const isProtectedOption = (opt: string) => {
    if (!opt) return true;
    const lower = opt.toLowerCase();
    return (
      lower === "all" ||
      lower.startsWith("all ") ||
      opt === t.allTypes ||
      opt === t.allStock
    );
  };

  const handleDelete = (e: React.MouseEvent, opt: string) => {
    e.stopPropagation();
    if (!onDeleteOption) return;

    if (requestConfirm) {
      requestConfirm({
        title: t.delete || "Delete Option",
        message: `${t.delete || "Delete"} "${opt}"?`,
        confirmLabel: t.delete || "Delete",
        type: "danger",
        onConfirm: () => {
          onDeleteOption(opt);
          if (value === opt) {
            onChange("");
          }
        },
      });
    } else {
      onDeleteOption(opt);
      if (value === opt) {
        onChange("");
      }
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Dropdown Button Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          compact
            ? "min-h-[34px] px-2.5 py-1 text-xs rounded-xl"
            : "min-h-[42px] px-3.5 py-2 text-sm rounded-xl"
        }`}
      >
        <span className={`truncate text-start ${value ? "font-semibold" : "text-slate-400 font-normal"}`}>
          {value || placeholder || t.type}
        </span>
        <div className="flex items-center gap-1 shrink-0 ms-1">
          {clearable && value && (
            <span
              onClick={handleClear}
              className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"} text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Popover List */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Filter Box */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 relative bg-slate-50 dark:bg-slate-850">
            <Search className="w-3.5 h-3.5 absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder ? `Filter ${placeholder}...` : t.searchType || "Filter options..."}
              className="w-full ps-8 pe-3 py-1.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            />
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filteredOptions.map((opt) => {
              const isSelected = value === opt;
              const canDeleteThis = allowDelete && Boolean(onDeleteOption) && !isProtectedOption(opt);

              return (
                <div
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs sm:text-sm ${
                    isSelected
                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold"
                      : "text-slate-800 dark:text-slate-200 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate me-2">
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    <span className="truncate">{opt}</span>
                  </div>

                  {canDeleteThis && (
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, opt)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors shrink-0"
                      title={t.deleteType || "Remove option"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            {filteredOptions.length === 0 && !canAddNew && (
              <div className="p-3 text-center text-slate-400 text-xs">
                {search ? "No matching options" : t.noTypesYet || "No options available"}
              </div>
            )}

            {/* Add New Option Button */}
            {canAddNew && (
              <button
                type="button"
                onClick={handleAddNew}
                className="w-full flex items-center gap-2 p-2.5 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-start transition-colors border-t border-dashed border-emerald-300 dark:border-emerald-800 text-xs sm:text-sm"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {t.addType || "Add"}: &quot;{search.trim()}&quot;
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
