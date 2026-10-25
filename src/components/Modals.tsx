"use client";

import React, { useState, useEffect } from "react";
import { useInventory } from "../context/InventoryContext";
import { PanelMaterial, OrderAllocation } from "../types/inventory";
import { SearchableDropdown } from "./SearchableDropdown";
import { X, Image as ImageIcon, Trash2, ZoomIn } from "lucide-react";
import { autoCapitalizeFirstLetter } from "../utils/text";

// ==========================================
// 1. MATERIAL / PANEL MODAL (ADD / EDIT)
// ==========================================
interface MaterialModalProps {
  isOpen: boolean;
  materialToEdit?: PanelMaterial | null;
  onClose: () => void;
}

export const MaterialModal: React.FC<MaterialModalProps> = ({
  isOpen,
  materialToEdit,
  onClose,
}) => {
  const {
    t,
    customTypes,
    addCustomType,
    deleteCustomType,
    addMaterial,
    editMaterial,
    setZoomedImage,
  } = useInventory();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("HPL");
  // All numbers blank by default
  const [length, setLength] = useState<string>("");
  const [width, setWidth] = useState<string>("");
  const [thickness, setThickness] = useState<string>("");
  const [totalStock, setTotalStock] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

  // Initialize form state when modal opens or target changes
  useEffect(() => {
    if (!isOpen) return;

    if (materialToEdit) {
      setCode(materialToEdit.code);
      setName(materialToEdit.name);
      setType(materialToEdit.type || "HPL");
      setLength(materialToEdit.dimensions.length > 0 ? String(materialToEdit.dimensions.length) : "");
      setWidth(materialToEdit.dimensions.width > 0 ? String(materialToEdit.dimensions.width) : "");
      setThickness(materialToEdit.dimensions.thickness > 0 ? String(materialToEdit.dimensions.thickness) : "");
      setTotalStock(materialToEdit.totalStock > 0 ? String(materialToEdit.totalStock) : "");
      setNotes(materialToEdit.notes || "");
      setImageUrl(materialToEdit.imageUrl);
    } else {
      setCode("");
      setName("");
      setType("HPL");
      setLength("");
      setWidth("");
      setThickness("");
      setTotalStock("");
      setNotes("");
      setImageUrl(undefined);
    }
  }, [isOpen, materialToEdit]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    const lenNum = parseInt(length) || 0;
    const widNum = parseInt(width) || 0;
    const thkNum = parseInt(thickness) || 0;
    const stockNum = parseInt(totalStock) || 0;

    const cleanCode = autoCapitalizeFirstLetter(code.trim());
    const cleanName = autoCapitalizeFirstLetter(name.trim());
    const cleanType = autoCapitalizeFirstLetter(type.trim() || "HPL");
    const cleanNotes = notes ? autoCapitalizeFirstLetter(notes) : "";

    if (materialToEdit) {
      editMaterial(materialToEdit.id, {
        code: cleanCode,
        name: cleanName,
        type: cleanType,
        length: lenNum,
        width: widNum,
        thickness: thkNum,
        totalStock: stockNum,
        notes: cleanNotes,
        imageUrl,
      });
    } else {
      addMaterial({
        code: cleanCode,
        name: cleanName,
        type: cleanType,
        length: lenNum,
        width: widNum,
        thickness: thkNum,
        totalStock: stockNum,
        notes: cleanNotes,
        imageUrl,
      });
    }

    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full border-t sm:border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden my-0 sm:my-6 max-h-[85dvh] sm:max-h-none flex flex-col pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150"
      >
        {/* Mobile Pull Pill Indicator */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between mt-1 sm:mt-0">
          <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
            {materialToEdit ? t.edit : t.addPanel}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-100 hover:text-white rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form: Stable typing, no auto-erasing */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3 text-xs sm:text-sm overflow-y-auto flex-1">
          {/* Code & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1">
                {t.code} *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t.codePlaceholder}
                className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-650 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1">
                {t.type} *
              </label>
              <SearchableDropdown
                options={customTypes.length > 0 ? customTypes : ["HPL"]}
                value={type || "HPL"}
                onChange={setType}
                onAddNew={addCustomType}
                onDeleteOption={deleteCustomType}
                placeholder={t.type}
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1">
              {t.name} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-650 rounded-xl text-slate-900 dark:text-white font-medium text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Panel Photo Attachment */}
          <div>
            <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1">
              {t.image} (Photo / Woodgrain)
            </label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-650 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.attachImage}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              {imageUrl && (
                <div className="flex items-center gap-1.5">
                  <div
                    onClick={() =>
                      setZoomedImage({
                        url: imageUrl,
                        title: `${name || code || "Panel"} Photo`,
                      })
                    }
                    className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 cursor-pointer group shadow-2xs"
                    title={t.zoom}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Thumbnail"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageUrl(undefined)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                    title={t.removeImage}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Dimensions */}
          <div>
            <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1">
              {t.dimensions}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <input
                  type="number"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  placeholder="2440"
                  className="w-full h-10 sm:h-9 px-2 text-center bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-650 rounded-xl text-slate-900 dark:text-white font-mono text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="block text-[10px] text-center text-slate-400 mt-0.5">L (mm)</span>
              </div>
              <div>
                <input
                  type="number"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="1220"
                  className="w-full h-10 sm:h-9 px-2 text-center bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-650 rounded-xl text-slate-900 dark:text-white font-mono text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="block text-[10px] text-center text-slate-400 mt-0.5">W (mm)</span>
              </div>
              <div>
                <input
                  type="number"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  value={thickness}
                  onChange={(e) => setThickness(e.target.value)}
                  placeholder="18"
                  className="w-full h-10 sm:h-9 px-2 text-center bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-650 rounded-xl text-slate-900 dark:text-white font-mono text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="block text-[10px] text-center text-slate-400 mt-0.5">T (mm)</span>
              </div>
            </div>
          </div>

          {/* Total Stock */}
          <div>
            <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1">
              {t.inStock} ({t.panelUnit})
            </label>
            <input
              type="number"
              inputMode="decimal"
              pattern="[0-9]*"
              value={totalStock}
              onChange={(e) => setTotalStock(e.target.value)}
              placeholder="0"
              className="w-full h-10 sm:h-9 px-3 bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-650 rounded-xl font-mono font-bold text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1">
              {t.notes}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="..."
              className="w-full h-10 sm:h-9 px-3 bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-650 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Action Buttons: Oversized tap targets for workshop ergonomic safety */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="min-h-[48px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-2.5 rounded-xl shadow-2xs active:scale-95 transition-all text-xs sm:text-sm cursor-pointer"
            >
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 2. ORDER MODAL (ADD / EDIT)
// ==========================================
interface OrderModalProps {
  isOpen: boolean;
  preselectedMaterialId?: string | null;
  orderToEdit?: { materialId: string; order: OrderAllocation } | null;
  onClose: () => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  preselectedMaterialId,
  orderToEdit,
  onClose,
}) => {
  const {
    t,
    materials,
    allocateOrder,
    editOrder,
    setZoomedImage,
    dropdownPresets,
    addToDropdownPresets,
    removeFromDropdownPresets,
    isViewer,
  } = useInventory();

  const [selectedMatId, setSelectedMatId] = useState("");
  const [client, setClient] = useState("");
  // Number blank by default
  const [quantity, setQuantity] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState("");

  const existingClients = Array.from(
    new Set(materials.flatMap((m) => (m.activeOrders || []).map((o) => o.client)).filter(Boolean))
  );
  const savedClientsList = Array.from(
    new Set([...(dropdownPresets?.savedClients || []), ...existingClients])
  );

  const currentMaterial = materials.find((m) => m.id === selectedMatId) || materials[0];

  const materialOptions = materials.map(
    (m) => `${m.code} — ${m.name} (${m.availableStock} ${t.available})`
  );
  const selectedMatOption = currentMaterial
    ? `${currentMaterial.code} — ${currentMaterial.name} (${currentMaterial.availableStock} ${t.available})`
    : "";

  const handleSelectMaterial = (optionStr: string) => {
    const codeMatch = optionStr.split(" — ")[0];
    const found = materials.find((m) => m.code === codeMatch);
    if (found) setSelectedMatId(found.id);
  };

  // Initialize form state when modal opens or target changes
  useEffect(() => {
    if (!isOpen) return;

    if (orderToEdit) {
      setSelectedMatId(orderToEdit.materialId);
      setClient(orderToEdit.order.client);
      setQuantity(String(orderToEdit.order.quantity));
      setNotes(orderToEdit.order.notes || "");
      setImageUrl(orderToEdit.order.imageUrl);
    } else {
      if (preselectedMaterialId) {
        setSelectedMatId(preselectedMaterialId);
      } else if (materials.length > 0) {
        setSelectedMatId(materials[0].id);
      }
      setClient("");
      setQuantity("");
      setNotes("");
      setImageUrl(undefined);
    }
    setErrorMsg("");
  }, [isOpen, orderToEdit, preselectedMaterialId, materials]);

  if (!isOpen) return null;

  const maxAvailable = currentMaterial
    ? orderToEdit
      ? currentMaterial.availableStock + orderToEdit.order.quantity
      : currentMaterial.availableStock
    : 0;

  const qtyNum = parseInt(quantity) || 0;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMaterial || !client.trim()) return;

    if (qtyNum <= 0) {
      setErrorMsg(t.quantity + " > 0");
      return;
    }

    if (qtyNum > maxAvailable) {
      setErrorMsg(`${t.insufficientStock} (${maxAvailable} ${t.available})`);
      return;
    }

    const cleanClient = autoCapitalizeFirstLetter(client.trim());
    const cleanNotes = notes ? autoCapitalizeFirstLetter(notes.trim()) : "";

    if (orderToEdit) {
      editOrder(orderToEdit.materialId, orderToEdit.order.id, {
        client: cleanClient,
        quantity: qtyNum,
        notes: cleanNotes,
        imageUrl,
      });
    } else {
      const result = allocateOrder(currentMaterial.id, {
        client: cleanClient,
        quantity: qtyNum,
        notes: cleanNotes,
        imageUrl,
      });

      if (!result.success) {
        setErrorMsg(result.message);
        return;
      }
    }

    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full border-t sm:border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden my-0 sm:my-6 max-h-[85dvh] sm:max-h-none flex flex-col pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150"
      >
        {/* Mobile Pull Pill Indicator */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between mt-1 sm:mt-0">
          <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
            {orderToEdit ? t.edit : t.addOrder}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-100 hover:text-white rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form: Stable typing */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3 text-xs sm:text-sm overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* Material Select */}
          <div>
            <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1">
              {t.materials} *
            </label>
            {orderToEdit ? (
              <div className="w-full h-9 px-3 flex items-center bg-slate-100 dark:bg-slate-750 border border-slate-300 dark:border-slate-650 rounded-xl text-slate-500 font-medium text-xs sm:text-sm">
                {currentMaterial ? `${currentMaterial.code} — ${currentMaterial.name}` : selectedMatId}
              </div>
            ) : (
              <SearchableDropdown
                options={materialOptions}
                value={selectedMatOption}
                onChange={handleSelectMaterial}
                placeholder="Search / select panel material..."
                compact={true}
                allowDelete={false}
              />
            )}
          </div>

          {/* Client Name */}
          <div>
            <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1">
              {t.client} *
            </label>
            <SearchableDropdown
              options={savedClientsList}
              value={client}
              onChange={setClient}
              onAddNew={(v) => addToDropdownPresets('savedClients', v)}
              onDeleteOption={(v) => removeFromDropdownPresets('savedClients', v)}
              placeholder="Search or enter client name..."
              compact={true}
              allowDelete={!isViewer}
            />
          </div>

          {/* Quantity */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 dark:text-slate-200 font-semibold">
                {t.quantity} ({t.panelUnit}) *
              </label>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {t.available}: {maxAvailable}
              </span>
            </div>
            <input
              type="number"
              inputMode="decimal"
              pattern="[0-9]*"
              required
              min="1"
              max={maxAvailable}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className="w-full h-10 sm:h-9 px-3 bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-650 rounded-xl font-mono font-bold text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Image Attachment (Photos/Blueprints) */}
          <div>
            <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1">
              {t.image}
            </label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-650 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.attachImage}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              {imageUrl && (
                <div className="flex items-center gap-1.5">
                  <div
                    onClick={() =>
                      setZoomedImage({
                        url: imageUrl,
                        title: `${client || "Order"} Attachment`,
                      })
                    }
                    className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 cursor-pointer group shadow-2xs"
                    title={t.zoom}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Thumbnail"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageUrl(undefined)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                    title={t.removeImage}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1">
              {t.notes}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="..."
              className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-650 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Action Buttons: Oversized tap targets */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="min-h-[48px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-2.5 rounded-xl shadow-2xs active:scale-95 transition-all text-xs sm:text-sm cursor-pointer"
            >
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
