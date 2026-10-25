"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useInventory } from "../context/InventoryContext";
import {
  X,
  Trash2,
  Plus,
  Search,
  SlidersHorizontal,
  Layers,
  UserCheck,
  Building2,
  CreditCard,
  Package,
  MapPin,
  Tag,
  Users
} from "lucide-react";
import { DropdownPresets } from "../types/inventory";
import { autoCapitalizeFirstLetter } from "../utils/text";

interface DropdownManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

type PresetCategoryKey =
  | "customTypes"
  | "savedPaymentTypes"
  | "savedSellingTypes"
  | "savedSellers"
  | "savedBanks"
  | "savedClients"
  | "savedCategories"
  | "savedLocations"
  | "savedTypes"
  | "savedProducts";

interface CategoryMeta {
  key: PresetCategoryKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const CATEGORIES: CategoryMeta[] = [
  {
    key: "customTypes",
    label: "Wood Panel Types",
    icon: Layers,
    description: "Panel material types (MDF, HPL, Plywood, etc.)",
  },
  {
    key: "savedPaymentTypes",
    label: "Payment Methods",
    icon: CreditCard,
    description: "Payment options (Cash, Debt, Card, Installments)",
  },
  {
    key: "savedSellingTypes",
    label: "Selling Types",
    icon: Tag,
    description: "Wholesale, Retail, Cut-to-size, Project, etc.",
  },
  {
    key: "savedSellers",
    label: "Sellers & Cashiers",
    icon: UserCheck,
    description: "Staff and sellers appearing in invoice headers",
  },
  {
    key: "savedBanks",
    label: "Banks & Drawers",
    icon: Building2,
    description: "Financial accounts, banks, and physical cash drawers",
  },
  {
    key: "savedClients",
    label: "Clients & Customers",
    icon: Users,
    description: "Saved customers and clients across orders and sales",
  },
  {
    key: "savedCategories",
    label: "Warehouse Categories",
    icon: Package,
    description: "Goods and hardware categories in the warehouse",
  },
  {
    key: "savedLocations",
    label: "Warehouse Locations",
    icon: MapPin,
    description: "Bays, racks, and aisles in the warehouse floor",
  },
  {
    key: "savedTypes",
    label: "Invoice Line Item Types",
    icon: Layers,
    description: "Preset types for fast POS active line items",
  },
  {
    key: "savedProducts",
    label: "Invoice Preset Products",
    icon: Package,
    description: "Frequent wood panel finishes and finishes presets",
  },
];

export const DropdownManagerModal: React.FC<DropdownManagerModalProps> = ({
  isOpen,
  onClose,
  initialTab,
}) => {
  const {
    t,
    customTypes,
    addCustomType,
    deleteCustomType,
    dropdownPresets,
    addToDropdownPresets,
    removeFromDropdownPresets,
    requestConfirm,
    isViewer,
  } = useInventory();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [activeKey, setActiveKey] = useState<PresetCategoryKey>(
    (initialTab as PresetCategoryKey) || "customTypes"
  );
  const [search, setSearch] = useState("");
  const [newValue, setNewValue] = useState("");

  useEffect(() => {
    if (initialTab) {
      setActiveKey(initialTab as PresetCategoryKey);
    }
  }, [initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  // Resolve current list based on category
  const getCurrentList = (): string[] => {
    if (activeKey === "customTypes") {
      return customTypes;
    }
    const presetsKey = activeKey as keyof DropdownPresets;
    return dropdownPresets[presetsKey] || [];
  };

  const currentList = getCurrentList();

  const filteredList = currentList.filter((item) =>
    item.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = autoCapitalizeFirstLetter(newValue.trim());
    if (!trimmed) return;

    if (activeKey === "customTypes") {
      addCustomType(trimmed);
    } else {
      addToDropdownPresets(activeKey as keyof DropdownPresets, trimmed);
    }
    setNewValue("");
  };

  const handleDeleteItem = (val: string) => {
    if (isViewer) return;

    requestConfirm({
      title: "Remove Saved Option",
      message: `Are you sure you want to remove "${val}" from saved dropdown options?`,
      confirmLabel: "Remove",
      type: "danger",
      onConfirm: () => {
        if (activeKey === "customTypes") {
          deleteCustomType(val);
        } else {
          removeFromDropdownPresets(activeKey as keyof DropdownPresets, val);
        }
      },
    });
  };

  const activeCategoryMeta =
    CATEGORIES.find((c) => c.key === activeKey) || CATEGORIES[0];
  const IconComponent = activeCategoryMeta.icon;

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Dropdown Options & Presets Manager
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage, filter, add, or remove saved options across all system dropboxes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Sidebar + Main Area */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          {/* Categories Sidebar */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-e border-slate-100 dark:border-slate-800 p-2 sm:p-3 overflow-y-auto space-y-1 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Dropbox Categories
            </div>
            {CATEGORIES.map((cat) => {
              const CatIcon = cat.icon;
              const isActive = cat.key === activeKey;
              const count =
                cat.key === "customTypes"
                  ? customTypes.length
                  : (dropdownPresets[cat.key as keyof DropdownPresets] || []).length;

              return (
                <button
                  key={cat.key}
                  onClick={() => {
                    setActiveKey(cat.key);
                    setSearch("");
                    setNewValue("");
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <CatIcon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                    <span className="truncate">{cat.label}</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] rounded-md font-mono ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Main List & Management Panel */}
          <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden min-h-0">
            {/* Category Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <IconComponent className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {activeCategoryMeta.label}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeCategoryMeta.description}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {currentList.length} total saved
              </span>
            </div>

            {/* Controls: Search Filter & Add Input */}
            <div className="py-3.5 space-y-2.5">
              {/* Search Filter Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Filter saved ${activeCategoryMeta.label.toLowerCase()}...`}
                  className="w-full ps-10 pe-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Add New Option Form */}
              {!isViewer && (
                <form onSubmit={handleAdd} className="flex gap-2">
                  <input
                    type="text"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder={`Add new option to ${activeCategoryMeta.label}...`}
                    className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={!newValue.trim()}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </form>
              )}
            </div>

            {/* List of Saved Options */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-850 p-1">
              {filteredList.map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors group"
                >
                  <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 truncate me-2">
                    {item}
                  </span>
                  {!isViewer && (
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                      title={`Remove "${item}"`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {filteredList.length === 0 && (
                <div className="p-8 text-center text-xs sm:text-sm text-slate-400">
                  {search
                    ? `No options match "${search}"`
                    : "No saved options in this category yet. Use the input above to add your first option."}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <span className="text-[11px] text-slate-400">
            Changes sync automatically to database and will apply both now and from now on.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default DropdownManagerModal;
