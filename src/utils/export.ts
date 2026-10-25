import { PanelMaterial, OrderAllocation, Language, PanelTransaction, Product, Shipment, ActivityLogEntry } from "../types/inventory";

function escapeCSV(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCSVBlob(filename: string, csvContent: string) {
  if (typeof window === "undefined") return;
  // \uFEFF is the UTF-8 Byte Order Mark (BOM) ensuring Excel natively recognizes UTF-8 (Kurdish/Arabic/symbols)
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportPanelsToCSV(materials: PanelMaterial[], language: Language = "en") {
  const isKu = language === "ku";
  const headers = isKu
    ? [
        "کۆد",
        "ناوی پانێڵ",
        "جۆر",
        "درێژی (ملم)",
        "پانی (ملم)",
        "ئەستووری (ملم)",
        "قەبارە",
        "کۆی کۆگا",
        "تەرخانکراو",
        "بەردەست",
        "ژمارەی داواکارییەکان",
        "تێبینی",
      ]
    : [
        "Code",
        "Panel Name",
        "Type",
        "Length (mm)",
        "Width (mm)",
        "Thickness (mm)",
        "Dimensions",
        "Total Stock",
        "Reserved",
        "Available",
        "Active Orders Count",
        "Notes",
      ];

  const rows = materials.map((m) => [
    escapeCSV(m.code),
    escapeCSV(m.name),
    escapeCSV(m.type),
    escapeCSV(m.dimensions.length),
    escapeCSV(m.dimensions.width),
    escapeCSV(m.dimensions.thickness),
    escapeCSV(m.dimensions.formatted),
    escapeCSV(m.totalStock),
    escapeCSV(m.allocatedStock),
    escapeCSV(m.availableStock),
    escapeCSV(m.activeOrders.length),
    escapeCSV(m.notes || ""),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const dateStr = new Date().toISOString().split("T")[0];
  downloadCSVBlob(`Bako_Panels_Inventory_${dateStr}.csv`, csvContent);
}

export function exportOrdersToCSV(
  orders: { order: OrderAllocation; material: PanelMaterial }[],
  language: Language = "en"
) {
  const isKu = language === "ku";
  const headers = isKu
    ? [
        "ژمارەی داواکاری",
        "کڕیار",
        "کۆدی پانێڵ",
        "ناوی پانێڵ",
        "جۆری پانێڵ",
        "بڕی تەرخانکراو",
        "دۆخ",
        "بەروار",
        "تێبینی",
      ]
    : [
        "Order #",
        "Client",
        "Panel Code",
        "Panel Name",
        "Panel Type",
        "Reserved Quantity",
        "Status",
        "Date",
        "Notes",
      ];

  const rows = orders.map(({ order, material }) => [
    escapeCSV(order.orderNumber),
    escapeCSV(order.client),
    escapeCSV(material.code),
    escapeCSV(material.name),
    escapeCSV(material.type),
    escapeCSV(order.quantity),
    escapeCSV(order.status === "finalized" ? (isKu ? "تەواوکراو" : "Finalized") : (isKu ? "تەرخانکراو" : "Reserved")),
    escapeCSV(order.date || ""),
    escapeCSV(order.notes || ""),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const dateStr = new Date().toISOString().split("T")[0];
  downloadCSVBlob(`Bako_Orders_Export_${dateStr}.csv`, csvContent);
}

export function exportTransactionsToCSV(
  transactions: PanelTransaction[],
  language: Language = "en"
) {
  const isKu = language === "ku";
  const headers = isKu
    ? [
        "کۆد",
        "بەروار",
        "جۆری پانێڵ / بابەت",
        "بڕ",
        "جۆری فرۆشتن",
        "فرۆشیار",
        "بانک / پارەدان",
        "دراو",
        "کۆی فرۆش",
        "داشکاندن ($)",
        "کۆی کۆتایی",
        "پارەی دراو",
        "قەرزی ماوە",
        "قازانجی گشتی",
        "ڕێژەی قازانج (%)",
        "دۆخ",
        "تێبینی",
      ]
    : [
        "Invoice Code",
        "Date",
        "Item / Panel",
        "Qty",
        "Selling Type",
        "Seller",
        "Bank / Payment Method",
        "Currency",
        "Gross Total",
        "Discount ($)",
        "Net Total",
        "Paid Now",
        "Debt Remaining",
        "Gross Profit",
        "Margin (%)",
        "Status",
        "Notes",
      ];

  const rows = transactions.map((t) => [
    escapeCSV(t.code || t.id.slice(-6)),
    escapeCSV(new Date(t.timestamp).toLocaleDateString()),
    escapeCSV(t.panelType || (t.items?.[0]?.product) || ""),
    escapeCSV(t.quantity || 1),
    escapeCSV(t.sellingType || ""),
    escapeCSV(t.seller || ""),
    escapeCSV(`${t.bank || ""} - ${t.paymentType || ""}`),
    escapeCSV(t.currency || "USD"),
    escapeCSV(t.sellingAmount || 0),
    escapeCSV(t.discountDollars || 0),
    escapeCSV(t.totalAfterDiscount || 0),
    escapeCSV(t.amountPaidNow || 0),
    escapeCSV(t.combinedTotalDebt || t.amountOwed || 0),
    escapeCSV(t.grossProfit || 0),
    escapeCSV(t.profitMargin ? `${t.profitMargin}%` : "0%"),
    escapeCSV(t.status || "completed"),
    escapeCSV(t.notes || ""),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const dateStr = new Date().toISOString().split("T")[0];
  downloadCSVBlob(`Bako_Sales_Invoices_${dateStr}.csv`, csvContent);
}

export function exportProductsToCSV(products: Product[], language: Language = "en") {
  const isKu = language === "ku";
  const headers = isKu
    ? ["کۆد / SKU", "ناوی کاڵا", "پۆلێن", "کۆی کۆگا", "کەمترین بڕ", "شوێن / بەش", "نرخ ($)", "دۆخ"]
    : ["SKU / Code", "Product Name", "Category", "Current Stock", "Min Stock Alert", "Location / Bay", "Price ($)", "Stock Lane"];

  const rows = products.map((p) => [
    escapeCSV(p.sku),
    escapeCSV(p.name),
    escapeCSV(p.category),
    escapeCSV(p.currentStock),
    escapeCSV(p.minStock),
    escapeCSV(p.location),
    escapeCSV(p.price),
    escapeCSV(p.lane || "inStock"),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const dateStr = new Date().toISOString().split("T")[0];
  downloadCSVBlob(`Bako_Warehouse_Goods_${dateStr}.csv`, csvContent);
}

export function exportShipmentsToCSV(shipments: Shipment[], language: Language = "en") {
  const isKu = language === "ku";
  const headers = isKu
    ? ["کۆدی بەدواداچوون", "شوێنی گەیشتن", "پوختەی بار", "بڕ", "دۆخ", "بەرواری دروستکردن"]
    : ["Tracking Code", "Destination", "Cargo Summary", "Quantity", "Pipeline Status", "Created Date"];

  const rows = shipments.map((s) => [
    escapeCSV(s.trackingCode),
    escapeCSV(s.destination),
    escapeCSV(s.itemSummary),
    escapeCSV(s.quantity),
    escapeCSV(s.status),
    escapeCSV(new Date(s.createdAt).toLocaleDateString()),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const dateStr = new Date().toISOString().split("T")[0];
  downloadCSVBlob(`Bako_Shipments_Pipeline_${dateStr}.csv`, csvContent);
}

export function exportAuditLogsToCSV(logs: ActivityLogEntry[], language: Language = "en") {
  const isKu = language === "ku";
  const headers = isKu
    ? ["کات و بەروار", "بەکارهێنەر", "کردار", "پوختەی ڕووداو", "وردەکاری"]
    : ["Timestamp", "User", "Action", "Description", "Details"];

  const rows = logs.map((l) => [
    escapeCSV(l.formattedTime || new Date(l.timestamp).toLocaleString()),
    escapeCSV(l.username),
    escapeCSV(l.action),
    escapeCSV(l.description),
    escapeCSV(l.details || ""),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const dateStr = new Date().toISOString().split("T")[0];
  downloadCSVBlob(`Bako_System_AuditLogs_${dateStr}.csv`, csvContent);
}

// Convenient export aliases
export const exportPanelsCSV = exportPanelsToCSV;
export const exportOrdersCSV = exportOrdersToCSV;
export const exportTransactionsCSV = exportTransactionsToCSV;
export const exportProductsCSV = exportProductsToCSV;
export const exportShipmentsCSV = exportShipmentsToCSV;
export const exportAuditLogsCSV = exportAuditLogsToCSV;
