"use client";

import React, { useState, useEffect } from "react";
import { useInventory } from "../context/InventoryContext";
import { PanelMaterial, OrderAllocation } from "../types/inventory";
import { DoorOrderSpec, DoorOpeningDirection, DoorTypeCategory } from "../types/doors";
import { SearchableDropdown } from "./SearchableDropdown";
import { X, Image as ImageIcon, Trash2, ZoomIn, DoorClosed, Compass, Camera, Check } from "lucide-react";
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
    language,
  } = useInventory();

  const isKu = language === 'ku';

  const [selectedMatId, setSelectedMatId] = useState("");
  const [client, setClient] = useState("");
  // Number blank by default
  const [quantity, setQuantity] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState("");

  const [jobType, setJobType] = useState<"generic" | "door">("generic");
  // Custom Door Order Specs
  const [doorHeight, setDoorHeight] = useState<string>("2100");
  const [doorWidth, setDoorWidth] = useState<string>("900");
  const [frameDepth, setFrameDepth] = useState<string>("150");
  const [openingDirection, setOpeningDirection] = useState<DoorOpeningDirection>("right");
  const [doorModel, setDoorModel] = useState<string>("");
  const [doorType, setDoorType] = useState<DoorTypeCategory>("interior");
  const [casingIncluded, setCasingIncluded] = useState<boolean>(true);
  const [hardwareIncluded, setHardwareIncluded] = useState<boolean>(false);

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
      const isDoor = orderToEdit.order.jobType === "door" || !!orderToEdit.order.doorSpec;
      setJobType(isDoor ? "door" : "generic");
      if (orderToEdit.order.doorSpec) {
        const spec = orderToEdit.order.doorSpec;
        setDoorHeight(String(spec.doorHeight || 2100));
        setDoorWidth(String(spec.doorWidth || 900));
        setFrameDepth(String(spec.frameDepth || 150));
        setOpeningDirection(spec.openingDirection || "right");
        setDoorModel(spec.doorModel || "");
        setDoorType(spec.doorType || "interior");
        setCasingIncluded(spec.casingIncluded !== false);
        setHardwareIncluded(!!spec.hardwareIncluded);
      } else {
        setDoorHeight("2100");
        setDoorWidth("900");
        setFrameDepth("150");
        setOpeningDirection("right");
        setDoorModel("");
        setDoorType("interior");
        setCasingIncluded(true);
        setHardwareIncluded(false);
      }
    } else {
      if (preselectedMaterialId) {
        setSelectedMatId(preselectedMaterialId);
      } else if (materials.length > 0) {
        setSelectedMatId(materials[0].id);
      }
      setClient("");
      setQuantity("1");
      setNotes("");
      setImageUrl(undefined);
      setJobType("generic");
      setDoorHeight("2100");
      setDoorWidth("900");
      setFrameDepth("150");
      setOpeningDirection("right");
      setDoorModel("");
      setDoorType("interior");
      setCasingIncluded(true);
      setHardwareIncluded(false);
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

    let doorSpec: DoorOrderSpec | undefined = undefined;
    if (jobType === "door") {
      doorSpec = {
        doorHeight: parseFloat(doorHeight) || 2100,
        doorWidth: parseFloat(doorWidth) || 900,
        frameDepth: parseFloat(frameDepth) || 150,
        openingDirection,
        doorModel: doorModel.trim() || currentMaterial.name,
        doorType,
        casingIncluded,
        hardwareIncluded,
        unit: "mm",
        notes: cleanNotes,
      };
    }

    if (orderToEdit) {
      editOrder(orderToEdit.materialId, orderToEdit.order.id, {
        client: cleanClient,
        quantity: qtyNum,
        notes: cleanNotes,
        imageUrl,
        jobType,
        doorSpec,
      });
    } else {
      const result = allocateOrder(currentMaterial.id, {
        client: cleanClient,
        quantity: qtyNum,
        notes: cleanNotes,
        imageUrl,
        jobType,
        doorSpec,
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
        className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl max-w-xl w-full border-t sm:border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden my-0 sm:my-6 max-h-[92dvh] sm:max-h-[90vh] flex flex-col pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150"
      >
        {/* Mobile Pull Pill Indicator */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between mt-1 sm:mt-0 shrink-0">
          <div className="flex items-center gap-2">
            {jobType === "door" ? <DoorClosed className="w-5 h-5 text-emerald-200" /> : null}
            <h3 className="font-bold text-base sm:text-lg">
              {orderToEdit
                ? (jobType === "door" ? (isKu ? "دەستکاری داواکاری دەرگا" : "Edit Door Order") : t.edit)
                : (jobType === "door" ? (isKu ? "داواکاری نوێی دروستکردنی دەرگا" : "New Custom Door Order") : t.addOrder)}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-100 hover:text-white rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Toggle: Generic Sheet Cutting vs Custom Door Production */}
        <div className="p-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-750 rounded-xl border border-slate-300 dark:border-slate-650">
            <button
              type="button"
              onClick={() => setJobType("generic")}
              className={`py-2 px-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                jobType === "generic"
                  ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-300/60 dark:border-slate-650"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>{isKu ? "بڕینی تەختەی ئاسایی (Generic Cuts)" : "Generic Sheet Cutting"}</span>
            </button>
            <button
              type="button"
              onClick={() => setJobType("door")}
              className={`py-2 px-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                jobType === "door"
                  ? "bg-emerald-700 text-white shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <DoorClosed className="w-4 h-4 shrink-0" />
              <span>{isKu ? "دروستکردنی دەرگا (Custom Door)" : "Custom Door Fabrication"}</span>
            </button>
          </div>
        </div>

        {/* Form: Stable typing */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* Material Select & Client Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1">
                {jobType === "door" ? (isKu ? "تەختە و ڕووکەشی دەرگا (Material)" : "Door Skin & Material") : t.materials} *
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
                  placeholder="Select panel / skin..."
                  compact={true}
                  allowDelete={false}
                />
              )}
            </div>

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
                placeholder="Client / Project name..."
                compact={true}
                allowDelete={!isViewer}
              />
            </div>
          </div>

          {/* Quantity */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 dark:text-slate-200 font-semibold">
                {jobType === "door" ? (isKu ? "ژمارەی دەرگا (Door Quantity)" : "Door Quantity") : `${t.quantity} (${t.panelUnit})`} *
              </label>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {t.available}: {maxAvailable}
              </span>
            </div>
            <input
              type="number"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              required
              min="1"
              max={maxAvailable}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
              className="w-full h-10 sm:h-9 px-3 bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-650 rounded-xl font-mono font-bold text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* ============================================================== */}
          {/* SPECIALIZED SULAYMANIYAH CUSTOM DOOR WORKFLOW SECTION          */}
          {/* ============================================================== */}
          {jobType === "door" && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-3.5">
              <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800/50 pb-2">
                <span className="font-bold text-xs sm:text-sm text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <DoorClosed className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <span>{isKu ? "تایبەتمەندی و ئەندازەی دروستکردنی دەرگا" : "Custom Door Specifications"}</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md">
                  {isKu ? "سلێمانی" : "Sulaymaniyah"}
                </span>
              </div>

              {/* Door Dimensions & Frame Depth */}
              <div>
                <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1 text-xs">
                  {isKu ? "ئەندازەی دەرگا و قووڵی چوارچێوە (Door & Frame Dimensions) *" : "Door & Frame Dimensions *"}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1">
                      {isKu ? "بەرزی (Height mm)" : "Height (mm)"}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      required
                      value={doorHeight}
                      onChange={(e) => setDoorHeight(e.target.value)}
                      placeholder="2100"
                      className="w-full h-9 px-2.5 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-650 rounded-xl font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="block text-[10px] text-center text-slate-400 mt-0.5 font-mono">
                      {(parseFloat(doorHeight) || 0) > 0 ? `${(parseFloat(doorHeight) / 10).toFixed(0)} cm` : "210 cm"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1">
                      {isKu ? "پانی (Width mm)" : "Width (mm)"}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      required
                      value={doorWidth}
                      onChange={(e) => setDoorWidth(e.target.value)}
                      placeholder="900"
                      className="w-full h-9 px-2.5 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-650 rounded-xl font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="block text-[10px] text-center text-slate-400 mt-0.5 font-mono">
                      {(parseFloat(doorWidth) || 0) > 0 ? `${(parseFloat(doorWidth) / 10).toFixed(0)} cm` : "90 cm"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1">
                      {isKu ? "قووڵی دیوار/چوارچێوە" : "Wall / Frame Depth"}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      required
                      value={frameDepth}
                      onChange={(e) => setFrameDepth(e.target.value)}
                      placeholder="150"
                      className="w-full h-9 px-2.5 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-650 rounded-xl font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="block text-[10px] text-center text-slate-400 mt-0.5 font-mono">
                      {(parseFloat(frameDepth) || 0) > 0 ? `${(parseFloat(frameDepth) / 10).toFixed(0)} cm` : "15 cm"}
                    </span>
                  </div>
                </div>

                {/* Quick Frame Depth Preset Pills */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-bold text-slate-500">{isKu ? "پێوانەی خێرا:" : "Presets:"}</span>
                  {[
                    { label: isKu ? "10 سم (100mm)" : "10 cm (100mm)", val: "100" },
                    { label: isKu ? "15 سم (150mm)" : "15 cm (150mm)", val: "150" },
                    { label: isKu ? "20 سم (200mm)" : "20 cm (200mm)", val: "200" },
                    { label: isKu ? "25 سم (250mm)" : "25 cm (250mm)", val: "250" },
                  ].map((chip) => (
                    <button
                      key={chip.val}
                      type="button"
                      onClick={() => setFrameDepth(chip.val)}
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                        frameDepth === chip.val
                          ? "bg-emerald-700 text-white border-emerald-700 font-bold"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-650 hover:bg-slate-100"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opening Direction (Right / Left Handing) */}
              <div>
                <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1 text-xs">
                  {isKu ? "لای کردنەوە (دەستە) *" : "Hinge & Opening Direction *"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOpeningDirection("right")}
                    className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      openingDirection === "right"
                        ? "bg-emerald-700 text-white border-emerald-700 shadow-xs font-black ring-2 ring-emerald-500/30"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-650 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>{isKu ? "لای ڕاست" : "Right-Hand Opening"}</span>
                    {openingDirection === "right" && <Check className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setOpeningDirection("left")}
                    className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      openingDirection === "left"
                        ? "bg-emerald-700 text-white border-emerald-700 shadow-xs font-black ring-2 ring-emerald-500/30"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-650 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>{isKu ? "لای چەپ" : "Left-Hand Opening"}</span>
                    {openingDirection === "left" && <Check className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Door Type Category */}
              <div>
                <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1 text-xs">
                  {isKu ? "جۆری دەرگا (Door Type Category) *" : "Door Type Category *"}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "interior" as DoorTypeCategory, label: isKu ? "ژوور (Interior)" : "Interior Room" },
                    { id: "waterproof_wc" as DoorTypeCategory, label: isKu ? "پێکهاتەی دژە ئاو (Waterproof)" : "Waterproof / WC" },
                    { id: "entrance" as DoorTypeCategory, label: isKu ? "سەرەکی (Entrance)" : "Main Entrance" },
                  ].map((dt) => (
                    <button
                      key={dt.id}
                      type="button"
                      onClick={() => setDoorType(dt.id)}
                      className={`py-1.5 px-2 rounded-xl border text-[11px] sm:text-xs font-bold text-center transition-all cursor-pointer ${
                        doorType === dt.id
                          ? "bg-emerald-700 text-white border-emerald-700 shadow-xs font-black"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-650 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      {dt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Door Model & CNC Pattern */}
              <div>
                <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1 text-xs">
                  {isKu ? "ناوی مۆدێل / نەخشی CNC (Model & Pattern Design)" : "Model & CNC Pattern Design"}
                </label>
                <input
                  type="text"
                  value={doorModel}
                  onChange={(e) => setDoorModel(e.target.value)}
                  placeholder="e.g. FunderMax Oak Modern, CNC Pattern A-12..."
                  className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-650 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Hardware & Casing Toggles */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-650 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={casingIncluded}
                    onChange={(e) => setCasingIncluded(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-700"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {isKu ? "تاج و کەتیبە (Casing)" : "Casing Included"}
                  </span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-650 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hardwareIncluded}
                    onChange={(e) => setHardwareIncluded(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-700"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {isKu ? "بەستنی قوفڵ و ئێکسسوارات لە کارگە" : "Hardware Included"}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Design Sketch / Photo Attachment */}
          <div>
            <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1">
              {jobType === "door" ? (isKu ? "کامێرا / وێنەی دیزاین و نەخشی دەرگا (Sketch / CNC Photo)" : "Design Photo / Sketch") : t.image}
            </label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-650 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors">
                <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{jobType === "door" ? (isKu ? "وێنە بگرە یان دیزاین هەڵبژێرە" : "Upload Photo / Design") : t.attachImage}</span>
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
                        title: `${client || (jobType === "door" ? "Door Design" : "Order")} Attachment`,
                      })
                    }
                    className="relative w-9 h-9 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 cursor-pointer group shadow-2xs"
                    title={t.zoom}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Thumbnail"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageUrl(undefined)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                    title={t.removeImage}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1">
              {jobType === "door" ? (isKu ? "تێبینی و ڕێنمایی بۆ دارتاش / وەستاکار" : "Carpenter / Workshop Notes") : t.notes}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={jobType === "door" ? (isKu ? "تێبینی لەسەر قوفڵ، گێڕ، ڕەنگی کەتیبە..." : "Notes on lock, frame, architrave...") : "..."}
              className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-650 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[46px] px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="min-h-[46px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-2.5 rounded-xl shadow-2xs active:scale-95 transition-all text-xs sm:text-sm cursor-pointer flex items-center gap-1.5"
            >
              {jobType === "door" && <DoorClosed className="w-4 h-4" />}
              <span>{orderToEdit ? t.save : (jobType === "door" ? (isKu ? "تۆمارکردنی داواکاری دەرگا" : "Save Door Order") : t.save)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
