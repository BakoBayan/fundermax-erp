/**
 * Legacy Data Ingestion & Migration Engine (Eat & Absorb Legacy Data)
 * 
 * Capable of parsing legacy SQLite databases (.sqlite, .db), structured JSON,
 * and CSV spreadsheets into the v1.5 SQLite schema.
 * 
 * Guarantees:
 * 1. Atomic Transaction with 100% rollback on failure (via runInTransaction).
 * 2. Automated Pre-Import Safety Snapshot (pre-import-<timestamp>.sqlite.gz).
 * 3. Float-Safe currency sanitization (IQD strictly integer, USD/EUR 2 decimals).
 * 4. Conflict-safe key allocation avoiding collision with live records.
 * 5. Completely non-destructive to admin accounts and system settings.
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { runInTransaction, writeAuditLog } from './dbSafety';
import { createPreImportSafetySnapshot, SnapshotInfo } from './backup';
import { CurrencyCode, DropdownPresets } from '../types/inventory';
import { InboundShipment, InboundStatus } from '../types/warehouse';
import { getWarehouseOpsRawFromDB, saveWarehouseOpsRawToDB } from './db';

// ============================================================================
// Types & Data Structures
// ============================================================================

export interface LegacyMaterialRecord {
  id?: string;
  code?: string;
  name: string;
  type?: string;
  length?: number;
  width?: number;
  thickness?: number;
  unit?: string;
  finish?: string;
  unitPrice?: number;
  stockQuantity: number;
  notes?: string;
}

export interface LegacySupplierShipmentRecord {
  id?: string;
  batchCode: string;
  supplier: string;
  supplierContact?: string;
  originCountry?: string;
  arrivalDate?: string;
  currency: 'USD' | 'EUR' | 'IQD';
  invoicedTotal: number;
  amountPaid: number;
  remainingBalance: number;
  itemSummary?: string;
  notes?: string;
}

export interface LegacyInvoiceRecord {
  id?: string;
  code?: string;
  clientName: string;
  clientPhone?: string;
  invoiceDate: string;
  currency: 'USD' | 'EUR' | 'IQD';
  sellingAmount: number;
  amountPaidNow: number;
  amountOwed: number;
  lineItemsSummary?: string;
  lineItemsJson?: string;
  seller?: string;
  notes?: string;
}

export interface MigrationParsedData {
  format: 'sqlite' | 'json' | 'csv' | 'unknown';
  materials: LegacyMaterialRecord[];
  shipments: LegacySupplierShipmentRecord[];
  invoices: LegacyInvoiceRecord[];
  customers: Array<{ name: string; phone?: string }>;
}

export interface MigrationAuditSummary {
  fileName: string;
  fileSizeBytes: number;
  format: string;
  totalMaterials: number;
  totalShipments: number;
  totalInvoices: number;
  totalCustomers: number;
  totalFinancials: {
    totalInvoicedUSD: number;
    totalInvoicedIQD: number;
    totalPaidUSD: number;
    totalPaidIQD: number;
    totalDebtUSD: number;
    totalDebtIQD: number;
    supplierPayablesEUR: number;
    supplierPayablesUSD: number;
  };
  sampleItems: {
    materials: LegacyMaterialRecord[];
    shipments: LegacySupplierShipmentRecord[];
    invoices: LegacyInvoiceRecord[];
    customers: Array<{ name: string; phone?: string }>;
  };
}

export interface MigrationCommitResult {
  success: boolean;
  snapshotName: string;
  snapshotSizeBytes: number;
  importedCounts: {
    materialsInserted: number;
    materialsUpdated: number;
    shipmentsInserted: number;
    invoicesInserted: number;
    customersAdded: number;
  };
  durationMs: number;
  error?: string;
}

// ============================================================================
// Float-Safe Currency & Key Sanitization
// ============================================================================

export function sanitizeCurrency(val: unknown, currency: 'USD' | 'EUR' | 'IQD' = 'USD'): number {
  if (val === undefined || val === null || val === '') return 0;
  let num: number;
  if (typeof val === 'number') {
    num = val;
  } else {
    // strip out currency symbols, commas, and whitespace
    const cleanStr = String(val).replace(/[^0-9.-]/g, '');
    num = parseFloat(cleanStr);
  }
  if (isNaN(num)) return 0;

  if (currency === 'IQD') {
    return Math.round(num); // strictly integer
  }
  return Math.round((num + Number.EPSILON) * 100) / 100; // strictly 2 decimals
}

export function sanitizeDimension(val: unknown, fallback: number = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(num) || num < 0 ? fallback : Math.round(num * 10) / 10;
}

export function sanitizeInteger(val: unknown, fallback: number = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  const num = typeof val === 'number' ? val : parseInt(String(val).replace(/[^0-9-]/g, ''), 10);
  return isNaN(num) ? fallback : Math.max(0, num);
}

function generateDeterministicId(prefix: string, seed: string): string {
  const hash = crypto.createHash('sha256').update(seed.trim().toLowerCase()).digest('hex').slice(0, 10);
  return `mig-${prefix}-${hash}`;
}

// ============================================================================
// CSV Parsing Utility (RFC-4180 compliant)
// ============================================================================

export function parseCSVToRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  // Normalize newlines
  const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Detect delimiter: comma, semicolon, or tab from first line
  const firstLine = text.split('\n')[0] || '';
  let delimiter = ',';
  if (firstLine.includes(';') && (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0)) {
    delimiter = ';';
  } else if (firstLine.includes('\t') && (firstLine.match(/\t/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0)) {
    delimiter = '\t';
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !insideQuotes) {
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Normalize column headers to clean canonical lowercase keys
function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[\s_\-/#]+/g, '');
}

// ============================================================================
// Multi-Format Ingestion Parsers
// ============================================================================

/**
 * 1. Parse CSV Spreadsheet Records
 */
export function parseCSVData(content: string): MigrationParsedData {
  const rows = parseCSVToRows(content);
  if (rows.length < 2) {
    return { format: 'csv', materials: [], shipments: [], invoices: [], customers: [] };
  }

  const rawHeaders = rows[0];
  const headers = rawHeaders.map(normalizeHeader);
  const dataRows = rows.slice(1);

  // Determine what kind of data table this CSV represents based on header keywords
  const isMaterialTable = headers.some((h) =>
    ['panel', 'material', 'thickness', 'wood', 'mdf', 'plywood', 'length', 'width', 'تەختە', 'درێژی', 'پانی', 'ئەستووری'].some((k) => h.includes(k))
  );

  const isShipmentTable = headers.some((h) =>
    ['container', 'fundermax', 'batch', 'supplier', 'payable', 'کۆنتێنەر', 'دابینکەر'].some((k) => h.includes(k))
  );

  const isInvoiceTable = headers.some((h) =>
    ['invoice', 'client', 'customer', 'amountpaid', 'amountowed', 'sellingamount', 'کڕیار', 'پسوولە', 'قەرز'].some((k) => h.includes(k))
  );

  const result: MigrationParsedData = {
    format: 'csv',
    materials: [],
    shipments: [],
    invoices: [],
    customers: [],
  };

  const getCol = (row: string[], ...aliases: string[]): string => {
    for (const alias of aliases) {
      const idx = headers.findIndex((h) => h === alias || h.includes(alias));
      if (idx !== -1 && row[idx] !== undefined) return row[idx].trim();
    }
    return '';
  };

  if (isMaterialTable || (!isShipmentTable && !isInvoiceTable)) {
    for (const row of dataRows) {
      const name = getCol(row, 'name', 'panelname', 'material', 'item', 'ناوی', 'تەختە');
      if (!name) continue;

      const length = sanitizeDimension(getCol(row, 'length', 'l', 'len', 'درێژی'), 2440);
      const width = sanitizeDimension(getCol(row, 'width', 'w', 'wid', 'پانی'), 1220);
      const thickness = sanitizeDimension(getCol(row, 'thickness', 't', 'thick', 'ئەستووری'), 18);
      const stock = sanitizeInteger(getCol(row, 'stock', 'quantity', 'qty', 'totalstock', 'عەدەد', 'ژمارە'), 1);
      const price = sanitizeCurrency(getCol(row, 'price', 'unitprice', 'cost', 'نرخ'), 'USD');
      const type = getCol(row, 'type', 'materialtype', 'finish', 'grain', 'جۆر') || 'MDF';
      const code = getCol(row, 'code', 'sku', 'id', 'کۆد') || '';

      result.materials.push({
        code: code || `PL-${name.slice(0, 3).toUpperCase()}-${Math.floor(length)}`,
        name,
        type,
        length,
        width,
        thickness,
        unit: 'mm',
        unitPrice: price,
        stockQuantity: stock,
        finish: getCol(row, 'finish', 'grain', 'surface'),
        notes: getCol(row, 'notes', 'تێبینی'),
      });
    }
  }

  if (isShipmentTable) {
    for (const row of dataRows) {
      const batchCode = getCol(row, 'batchcode', 'batch', 'container', 'tracking', 'ref', 'کۆنتێنەر') || `BATCH-${Date.now().toString(36)}`;
      const supplier = getCol(row, 'supplier', 'fundermax', 'vendor', 'company', 'دابینکەر') || 'FunderMax';
      const currStr = getCol(row, 'currency', 'basecurrency', 'دراو').toUpperCase();
      const currency: 'USD' | 'EUR' | 'IQD' = currStr.includes('EUR') ? 'EUR' : currStr.includes('IQD') ? 'IQD' : 'USD';

      const invoiced = sanitizeCurrency(getCol(row, 'invoicedtotal', 'invoiced', 'total', 'کۆیگشتی'), currency);
      const paid = sanitizeCurrency(getCol(row, 'amountpaid', 'paid', 'بڕیدراو'), currency);
      const balance = sanitizeCurrency(getCol(row, 'remainingbalance', 'balance', 'payable', 'قەرز', 'ماوە'), currency) || Math.max(0, invoiced - paid);

      result.shipments.push({
        batchCode,
        supplier,
        supplierContact: getCol(row, 'contact', 'phone', 'تەلەفۆن'),
        originCountry: getCol(row, 'origin', 'country', 'ئۆستڕیا') || 'Austria (FunderMax)',
        arrivalDate: getCol(row, 'date', 'arrivaldate', 'بەروار') || new Date().toISOString().slice(0, 10),
        currency,
        invoicedTotal: invoiced,
        amountPaid: paid,
        remainingBalance: balance,
        itemSummary: getCol(row, 'items', 'summary', 'description', 'کاڵا') || 'Imported Wood Panels / Hardware',
        notes: getCol(row, 'notes', 'تێبینی'),
      });
    }
  }

  if (isInvoiceTable) {
    for (const row of dataRows) {
      const client = getCol(row, 'clientname', 'client', 'customer', 'buyer', 'کڕیار');
      if (!client) continue;

      const phone = getCol(row, 'phone', 'mobile', 'contact', 'تەلەفۆن');
      const currStr = getCol(row, 'currency', 'دراو').toUpperCase();
      const currency: 'USD' | 'EUR' | 'IQD' = currStr.includes('IQD') ? 'IQD' : currStr.includes('EUR') ? 'EUR' : 'USD';

      const total = sanitizeCurrency(getCol(row, 'sellingamount', 'total', 'amount', 'کۆیگشتی'), currency);
      const paid = sanitizeCurrency(getCol(row, 'amountpaidnow', 'paid', 'دراو'), currency);
      const owed = sanitizeCurrency(getCol(row, 'amountowed', 'owed', 'debt', 'قەرز'), currency) || Math.max(0, total - paid);

      result.invoices.push({
        code: getCol(row, 'code', 'invoicecode', 'invoicenumber', 'ژمارە') || `INV-${Date.now().toString(36)}`,
        clientName: client,
        clientPhone: phone,
        invoiceDate: getCol(row, 'date', 'invoicedate', 'timestamp', 'بەروار') || new Date().toISOString(),
        currency,
        sellingAmount: total,
        amountPaidNow: paid,
        amountOwed: owed,
        lineItemsSummary: getCol(row, 'items', 'itemsummary', 'مەواد'),
        seller: getCol(row, 'seller', 'فرۆشیار') || 'Bako',
        notes: getCol(row, 'notes', 'تێبینی'),
      });

      if (!result.customers.some((c) => c.name.toLowerCase() === client.toLowerCase())) {
        result.customers.push({ name: client, phone });
      }
    }
  }

  return result;
}

/**
 * 2. Parse Structured JSON Records
 */
export function parseJSONData(content: string): MigrationParsedData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new Error(`Invalid JSON file format: ${err instanceof Error ? err.message : String(err)}`);
  }

  const result: MigrationParsedData = {
    format: 'json',
    materials: [],
    shipments: [],
    invoices: [],
    customers: [],
  };

  // Helper to extract an array from root or key
  const asArray = (val: unknown): unknown[] => (Array.isArray(val) ? val : []);

  if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>;

    // Case A: Standard legacy JSON export or warehouse store
    const rawMaterials = asArray(obj.materials || obj.panels || obj.inventory || obj.items);
    const rawShipments = asArray(obj.shipments || obj.inbound || obj.supplierShipments || obj.fundermax);
    const rawInvoices = asArray(obj.transactions || obj.invoices || obj.sales || obj.orders);
    const rawCustomers = asArray(obj.customers || obj.clients);

    // If root itself is an array of items, inspect first element
    if (Array.isArray(parsed) && parsed.length > 0) {
      for (const item of parsed) {
        if (!item || typeof item !== 'object') continue;
        const it = item as Record<string, unknown>;
        if (it.dimensions || it.totalStock !== undefined || it.thickness !== undefined) {
          rawMaterials.push(it);
        } else if (it.batchCode || it.supplier || it.invoicedTotal !== undefined) {
          rawShipments.push(it);
        } else if (it.client || it.clientName || it.sellingAmount !== undefined || it.amountPaidNow !== undefined) {
          rawInvoices.push(it);
        }
      }
    }

    // Process Materials
    for (const raw of rawMaterials) {
      if (!raw || typeof raw !== 'object') continue;
      const m = raw as Record<string, unknown>;
      const name = String(m.name || m.panelName || m.material || '').trim();
      if (!name) continue;

      let length = 2440;
      let width = 1220;
      let thickness = 18;

      if (typeof m.dimensions === 'object' && m.dimensions !== null) {
        const d = m.dimensions as Record<string, unknown>;
        length = sanitizeDimension(d.length, 2440);
        width = sanitizeDimension(d.width, 1220);
        thickness = sanitizeDimension(d.thickness, 18);
      } else {
        length = sanitizeDimension(m.length, 2440);
        width = sanitizeDimension(m.width, 1220);
        thickness = sanitizeDimension(m.thickness, 18);
      }

      const stock = sanitizeInteger(m.totalStock ?? m.stock ?? m.quantity ?? m.availableStock, 1);
      const price = sanitizeCurrency(m.price ?? m.unitPrice ?? m.costPrice, 'USD');

      result.materials.push({
        id: m.id ? String(m.id) : undefined,
        code: String(m.code || `PL-${name.slice(0, 3).toUpperCase()}-${Math.floor(length)}`),
        name,
        type: String(m.type || 'MDF'),
        length,
        width,
        thickness,
        unit: 'mm',
        unitPrice: price,
        stockQuantity: stock,
        finish: m.finish ? String(m.finish) : undefined,
        notes: m.notes ? String(m.notes) : undefined,
      });
    }

    // Process Shipments / FunderMax
    for (const raw of rawShipments) {
      if (!raw || typeof raw !== 'object') continue;
      const s = raw as Record<string, unknown>;
      const batchCode = String(s.batchCode || s.container || s.batch || s.trackingCode || `FMAX-${Date.now().toString(36)}`);
      const supplier = String(s.supplier || 'FunderMax');
      const currStr = String(s.currency || 'EUR').toUpperCase();
      const currency: 'USD' | 'EUR' | 'IQD' = currStr.includes('EUR') ? 'EUR' : currStr.includes('IQD') ? 'IQD' : 'USD';

      const invoiced = sanitizeCurrency(s.invoicedTotal ?? s.total ?? s.quantity, currency);
      const paid = sanitizeCurrency(s.amountPaid ?? s.paid, currency);
      const balance = sanitizeCurrency(s.remainingBalance ?? s.balance ?? s.payable, currency) || Math.max(0, invoiced - paid);

      result.shipments.push({
        id: s.id ? String(s.id) : undefined,
        batchCode,
        supplier,
        supplierContact: s.supplierContact ? String(s.supplierContact) : undefined,
        originCountry: String(s.originCountry || 'Austria (FunderMax)'),
        arrivalDate: String(s.arrivalDate || new Date().toISOString().slice(0, 10)),
        currency,
        invoicedTotal: invoiced,
        amountPaid: paid,
        remainingBalance: balance,
        itemSummary: String(s.itemSummary || s.destination || 'Imported Panel Consignment'),
        notes: s.notes ? String(s.notes) : undefined,
      });
    }

    // Process Invoices & Customer Transactions
    for (const raw of rawInvoices) {
      if (!raw || typeof raw !== 'object') continue;
      const tx = raw as Record<string, unknown>;
      const client = String(tx.client || tx.clientName || tx.customer || tx.seller || '').trim();
      if (!client) continue;

      const currStr = String(tx.currency || tx.chargedCurrency || 'USD').toUpperCase();
      const currency: 'USD' | 'EUR' | 'IQD' = currStr.includes('IQD') ? 'IQD' : currStr.includes('EUR') ? 'EUR' : 'USD';

      const total = sanitizeCurrency(tx.sellingAmount ?? tx.totalAfterDiscount ?? tx.total ?? tx.amount, currency);
      const paid = sanitizeCurrency(tx.amountPaidNow ?? tx.paidNow ?? tx.amountPaid, currency);
      const owed = sanitizeCurrency(tx.amountOwed ?? tx.owed ?? tx.combinedTotalDebt, currency) || Math.max(0, total - paid);

      result.invoices.push({
        id: tx.id ? String(tx.id) : undefined,
        code: String(tx.code || `INV-${Date.now().toString(36)}`),
        clientName: client,
        clientPhone: tx.phone ? String(tx.phone) : undefined,
        invoiceDate: String(tx.timestamp || tx.invoiceDate || tx.date || new Date().toISOString()),
        currency,
        sellingAmount: total,
        amountPaidNow: paid,
        amountOwed: owed,
        lineItemsSummary: tx.material ? String(tx.material) : undefined,
        lineItemsJson: Array.isArray(tx.items) ? JSON.stringify(tx.items) : undefined,
        seller: String(tx.seller || 'Bako'),
        notes: tx.notes ? String(tx.notes) : undefined,
      });

      if (!result.customers.some((c) => c.name.toLowerCase() === client.toLowerCase())) {
        result.customers.push({ name: client, phone: tx.phone ? String(tx.phone) : undefined });
      }
    }

    // Process explicit customer directory if provided
    for (const raw of rawCustomers) {
      if (!raw) continue;
      const name = typeof raw === 'string' ? raw.trim() : String((raw as Record<string, unknown>).name || '').trim();
      if (!name) continue;
      const phone = typeof raw === 'object' && raw !== null ? String((raw as Record<string, unknown>).phone || '') : undefined;
      if (!result.customers.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        result.customers.push({ name, phone });
      }
    }
  }

  return result;
}

/**
 * 3. Parse Legacy SQLite Database File
 */
export function parseSQLiteData(buffer: Buffer): MigrationParsedData {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const tempFile = path.join(dataDir, `temp-migrate-${crypto.randomBytes(8).toString('hex')}.sqlite`);
  fs.writeFileSync(tempFile, buffer);

  let tempDB: DatabaseSync | null = null;
  const result: MigrationParsedData = {
    format: 'sqlite',
    materials: [],
    shipments: [],
    invoices: [],
    customers: [],
  };

  try {
    tempDB = new DatabaseSync(tempFile);

    // Enumerate tables
    const tables = tempDB
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`)
      .all() as Array<{ name: string }>;

    const tableNames = tables.map((t) => t.name.toLowerCase());

    // 1. Inspect Materials / Panels
    const materialTable = tables.find((t) =>
      ['materials', 'panels', 'inventory', 'wood', 'products'].some((k) => t.name.toLowerCase() === k)
    );

    if (materialTable) {
      try {
        const rows = tempDB.prepare(`SELECT * FROM ${materialTable.name};`).all() as Record<string, unknown>[];
        for (const row of rows) {
          const name = String(row.name || row.panel_name || row.material || row.title || '').trim();
          if (!name) continue;

          const length = sanitizeDimension(row.length ?? row.sheet_length, 2440);
          const width = sanitizeDimension(row.width ?? row.sheet_width, 1220);
          const thickness = sanitizeDimension(row.thickness, 18);
          const stock = sanitizeInteger(row.total_stock ?? row.stock ?? row.quantity ?? row.available_stock, 1);
          const price = sanitizeCurrency(row.unit_price ?? row.price ?? row.cost_price, 'USD');

          result.materials.push({
            id: row.id ? String(row.id) : undefined,
            code: String(row.code || `PL-${name.slice(0, 3).toUpperCase()}-${Math.floor(length)}`),
            name,
            type: String(row.type || 'MDF'),
            length,
            width,
            thickness,
            unit: String(row.unit || 'mm'),
            unitPrice: price,
            stockQuantity: stock,
            finish: row.finish ? String(row.finish) : undefined,
            notes: row.notes ? String(row.notes) : undefined,
          });
        }
      } catch (err) {
        console.warn(`[Migration SQLite] Could not query table ${materialTable.name}:`, err);
      }
    }

    // 2. Inspect Shipments / FunderMax Payables
    const shipmentTable = tables.find((t) =>
      ['shipments', 'inbound_shipments', 'inbound', 'fundermax', 'suppliers'].some((k) => t.name.toLowerCase() === k)
    );

    if (shipmentTable) {
      try {
        const rows = tempDB.prepare(`SELECT * FROM ${shipmentTable.name};`).all() as Record<string, unknown>[];
        for (const row of rows) {
          const batchCode = String(
            row.batch_code || row.batchCode || row.tracking_code || row.container || row.ref || `BATCH-${Date.now().toString(36)}`
          );
          const supplier = String(row.supplier || 'FunderMax');
          const currStr = String(row.currency || row.base_currency || 'EUR').toUpperCase();
          const currency: 'USD' | 'EUR' | 'IQD' = currStr.includes('EUR') ? 'EUR' : currStr.includes('IQD') ? 'IQD' : 'USD';

          const invoiced = sanitizeCurrency(row.invoiced_total ?? row.total ?? row.quantity, currency);
          const paid = sanitizeCurrency(row.amount_paid ?? row.paid, currency);
          const balance = sanitizeCurrency(row.remaining_balance ?? row.balance ?? row.payable, currency) || Math.max(0, invoiced - paid);

          result.shipments.push({
            id: row.id ? String(row.id) : undefined,
            batchCode,
            supplier,
            supplierContact: row.supplier_contact ? String(row.supplier_contact) : undefined,
            originCountry: String(row.origin_country || 'Austria (FunderMax)'),
            arrivalDate: String(row.arrival_date || new Date().toISOString().slice(0, 10)),
            currency,
            invoicedTotal: invoiced,
            amountPaid: paid,
            remainingBalance: balance,
            itemSummary: String(row.item_summary || row.destination || 'Imported Consignment'),
            notes: row.notes ? String(row.notes) : undefined,
          });
        }
      } catch (err) {
        console.warn(`[Migration SQLite] Could not query table ${shipmentTable.name}:`, err);
      }
    }

    // 3. Inspect Transactions & Invoices
    const txTable = tables.find((t) =>
      ['transactions', 'invoices', 'sales'].some((k) => t.name.toLowerCase() === k)
    );

    if (txTable) {
      try {
        const rows = tempDB.prepare(`SELECT * FROM ${txTable.name};`).all() as Record<string, unknown>[];
        for (const row of rows) {
          const client = String(row.client || row.seller || row.customer || '').trim();
          if (!client) continue;

          const currStr = String(row.currency || row.charged_currency || 'USD').toUpperCase();
          const currency: 'USD' | 'EUR' | 'IQD' = currStr.includes('IQD') ? 'IQD' : currStr.includes('EUR') ? 'EUR' : 'USD';

          const total = sanitizeCurrency(row.selling_amount ?? row.total_after_discount ?? row.total, currency);
          const paid = sanitizeCurrency(row.amount_paid_now ?? row.paid, currency);
          const owed = sanitizeCurrency(row.amount_owed ?? row.owed ?? row.combined_total_debt, currency) || Math.max(0, total - paid);

          result.invoices.push({
            id: row.id ? String(row.id) : undefined,
            code: String(row.code || `INV-${Date.now().toString(36)}`),
            clientName: client,
            clientPhone: row.phone ? String(row.phone) : undefined,
            invoiceDate: String(row.timestamp || row.created_at || new Date().toISOString()),
            currency,
            sellingAmount: total,
            amountPaidNow: paid,
            amountOwed: owed,
            lineItemsSummary: row.material ? String(row.material) : undefined,
            lineItemsJson: row.items_json ? String(row.items_json) : undefined,
            seller: String(row.seller || 'Bako'),
            notes: row.notes ? String(row.notes) : undefined,
          });

          if (!result.customers.some((c) => c.name.toLowerCase() === client.toLowerCase())) {
            result.customers.push({ name: client, phone: row.phone ? String(row.phone) : undefined });
          }
        }
      } catch (err) {
        console.warn(`[Migration SQLite] Could not query table ${txTable.name}:`, err);
      }
    }

    // 4. Inspect Dedicated Customers Table if present
    const customerTable = tables.find((t) =>
      ['customers', 'clients', 'contacts'].some((k) => t.name.toLowerCase() === k)
    );

    if (customerTable) {
      try {
        const rows = tempDB.prepare(`SELECT * FROM ${customerTable.name};`).all() as Record<string, unknown>[];
        for (const row of rows) {
          const name = String(row.name || row.client_name || row.customer_name || '').trim();
          if (!name) continue;
          const phone = row.phone ? String(row.phone) : undefined;
          if (!result.customers.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
            result.customers.push({ name, phone });
          }
        }
      } catch (err) {
        console.warn(`[Migration SQLite] Could not query table ${customerTable.name}:`, err);
      }
    }
  } finally {
    if (tempDB) {
      try {
        tempDB.close();
      } catch {}
    }
    try {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    } catch {}
  }

  return result;
}

/**
 * Universal Ingestion Entry Point
 */
export function parseLegacyData(buffer: Buffer, fileName: string): MigrationParsedData {
  const ext = path.extname(fileName).toLowerCase();

  // SQLite files check magic header: SQLite format 3\000
  const isSqliteMagic =
    buffer.length >= 16 && buffer.toString('utf8', 0, 15) === 'SQLite format 3';

  if (isSqliteMagic || ext === '.sqlite' || ext === '.db') {
    return parseSQLiteData(buffer);
  }

  const textContent = buffer.toString('utf8');

  if (ext === '.json' || textContent.trim().startsWith('{') || textContent.trim().startsWith('[')) {
    return parseJSONData(textContent);
  }

  return parseCSVData(textContent);
}

// ============================================================================
// Inspection & Audit Summarizer
// ============================================================================

export function generateAuditSummary(
  data: MigrationParsedData,
  fileName: string,
  fileSizeBytes: number
): MigrationAuditSummary {
  let totalInvoicedUSD = 0;
  let totalInvoicedIQD = 0;
  let totalPaidUSD = 0;
  let totalPaidIQD = 0;
  let totalDebtUSD = 0;
  let totalDebtIQD = 0;

  for (const inv of data.invoices) {
    if (inv.currency === 'IQD') {
      totalInvoicedIQD += inv.sellingAmount;
      totalPaidIQD += inv.amountPaidNow;
      totalDebtIQD += inv.amountOwed;
    } else {
      totalInvoicedUSD += inv.sellingAmount;
      totalPaidUSD += inv.amountPaidNow;
      totalDebtUSD += inv.amountOwed;
    }
  }

  let supplierPayablesEUR = 0;
  let supplierPayablesUSD = 0;
  for (const ship of data.shipments) {
    if (ship.currency === 'EUR') {
      supplierPayablesEUR += ship.remainingBalance;
    } else {
      supplierPayablesUSD += ship.remainingBalance;
    }
  }

  return {
    fileName,
    fileSizeBytes,
    format: data.format.toUpperCase(),
    totalMaterials: data.materials.length,
    totalShipments: data.shipments.length,
    totalInvoices: data.invoices.length,
    totalCustomers: data.customers.length,
    totalFinancials: {
      totalInvoicedUSD: sanitizeCurrency(totalInvoicedUSD, 'USD'),
      totalInvoicedIQD: sanitizeCurrency(totalInvoicedIQD, 'IQD'),
      totalPaidUSD: sanitizeCurrency(totalPaidUSD, 'USD'),
      totalPaidIQD: sanitizeCurrency(totalPaidIQD, 'IQD'),
      totalDebtUSD: sanitizeCurrency(totalDebtUSD, 'USD'),
      totalDebtIQD: sanitizeCurrency(totalDebtIQD, 'IQD'),
      supplierPayablesEUR: sanitizeCurrency(supplierPayablesEUR, 'EUR'),
      supplierPayablesUSD: sanitizeCurrency(supplierPayablesUSD, 'USD'),
    },
    sampleItems: {
      materials: data.materials.slice(0, 5),
      shipments: data.shipments.slice(0, 5),
      invoices: data.invoices.slice(0, 5),
      customers: data.customers.slice(0, 5),
    },
  };
}

// ============================================================================
// Atomic Migration Execution (Inside Savepoint / Transaction)
// ============================================================================

export async function commitMigration(
  db: DatabaseSync,
  data: MigrationParsedData,
  actor: string = 'Super Admin'
): Promise<MigrationCommitResult> {
  const startTime = Date.now();

  // 1. Mandatory Pre-Import Safety Snapshot (Crash-safe atomic backup)
  const safetySnapshot = await createPreImportSafetySnapshot(db);

  let materialsInserted = 0;
  let materialsUpdated = 0;
  let shipmentsInserted = 0;
  let invoicesInserted = 0;
  let customersAdded = 0;

  // 2. Execute Entire Migration Inside an Atomic SQLite Transaction
  try {
    runInTransaction(db, () => {
      const nowIso = new Date().toISOString();

      // Prepared Statements for Materials
      const checkMaterialStmt = db.prepare(`SELECT id, total_stock, available_stock FROM materials WHERE id = ? OR name = ? LIMIT 1;`);
      const insertMaterialStmt = db.prepare(`
        INSERT INTO materials (
          id, code, name, type, length, width, thickness, unit,
          formatted_dimensions, total_stock, allocated_stock, available_stock,
          notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?);
      `);
      const updateMaterialStockStmt = db.prepare(`
        UPDATE materials
        SET total_stock = total_stock + ?,
            available_stock = available_stock + ?,
            updated_at = ?
        WHERE id = ?;
      `);

      for (const mat of data.materials) {
        const matId = mat.id || generateDeterministicId('mat', `${mat.name}-${mat.length}-${mat.width}-${mat.thickness}`);
        const existing = checkMaterialStmt.get(matId, mat.name) as { id: string; total_stock: number; available_stock: number } | undefined;

        if (existing) {
          updateMaterialStockStmt.run(mat.stockQuantity, mat.stockQuantity, nowIso, existing.id);
          materialsUpdated++;
        } else {
          const formattedDim = `${mat.length} × ${mat.width} × ${mat.thickness} ${mat.unit || 'mm'}`;
          insertMaterialStmt.run(
            matId,
            mat.code || `PL-${mat.name.slice(0, 3).toUpperCase()}`,
            mat.name,
            mat.type || 'MDF',
            mat.length || 2440,
            mat.width || 1220,
            mat.thickness || 18,
            mat.unit || 'mm',
            formattedDim,
            mat.stockQuantity,
            mat.stockQuantity,
            mat.notes ? `${mat.notes} | Legacy Ingested` : 'Legacy Ingested',
            nowIso,
            nowIso
          );
          materialsInserted++;
        }
      }

      // Prepared Statements for Transactions / Sales Invoices
      const checkTxStmt = db.prepare(`SELECT id FROM transactions WHERE id = ? LIMIT 1;`);
      const insertTxStmt = db.prepare(`
        INSERT INTO transactions (
          id, code, timestamp, panel_type, material, quantity, unit, selling_type,
          seller, bank, payment_type, currency, currency_rate, selling_amount,
          cost_price, discount_dollars, discount_percentage, total_after_discount,
          amount_paid_now, amount_owed, old_unpaid_debt, combined_total_debt,
          gross_profit, profit_margin, notes, images_json, items_json,
          status, last_updated, charged_amount, charged_currency
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, 1, ?,
          0, 0, 0, ?,
          ?, ?, 0, ?,
          0, 0, ?, '[]', ?,
          ?, ?, ?, ?
        );
      `);

      for (const inv of data.invoices) {
        const txId = inv.id || generateDeterministicId('tx', `${inv.clientName}-${inv.invoiceDate}-${inv.sellingAmount}`);
        const exists = checkTxStmt.get(txId);
        if (!exists) {
          const status = inv.amountOwed <= 0 ? 'completed' : inv.amountPaidNow > 0 ? 'partial' : 'debt';
          insertTxStmt.run(
            txId,
            inv.code || `INV-${txId.slice(-6)}`,
            inv.invoiceDate || nowIso,
            'Imported Goods',
            inv.lineItemsSummary || 'Historical Legacy Invoice Item',
            1,
            'units',
            'Wholesale',
            inv.seller || 'Bako',
            'Main Ledger',
            'Cash',
            inv.currency,
            inv.sellingAmount,
            inv.sellingAmount,
            inv.amountPaidNow,
            inv.amountOwed,
            inv.amountOwed,
            inv.notes ? `${inv.notes} | Phone: ${inv.clientPhone || 'N/A'}` : `Migrated legacy invoice. Phone: ${inv.clientPhone || 'N/A'}`,
            inv.lineItemsJson || '[]',
            status,
            nowIso,
            inv.sellingAmount,
            inv.currency
          );
          invoicesInserted++;
        }
      }

      // Prepared Statements for Shipments
      const checkShipmentStmt = db.prepare(`SELECT id FROM shipments WHERE id = ? OR tracking_code = ? LIMIT 1;`);
      const insertShipmentStmt = db.prepare(`
        INSERT INTO shipments (
          id, tracking_code, destination, item_summary, quantity, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?);
      `);

      for (const ship of data.shipments) {
        const shipId = ship.id || generateDeterministicId('shp', `${ship.batchCode}-${ship.supplier}`);
        const exists = checkShipmentStmt.get(shipId, ship.batchCode);
        if (!exists) {
          const itemSummary = `${ship.supplier} (${ship.batchCode}) - Balance: ${ship.currency} ${ship.remainingBalance}`;
          insertShipmentStmt.run(
            shipId,
            ship.batchCode,
            `Erbil Central Vault (${ship.originCountry})`,
            itemSummary,
            1,
            'delivered',
            ship.arrivalDate || nowIso
          );
          shipmentsInserted++;
        }
      }

      // Ingest Shipments into Warehouse Operations Meta State
      const rawWarehouseOps = getWarehouseOpsRawFromDB();
      let warehouseOpsState: { shipments: InboundShipment[]; locations: unknown[]; allocations: unknown[]; transfers: unknown[]; updatedAt: number } = {
        shipments: [],
        locations: [],
        allocations: [],
        transfers: [],
        updatedAt: Date.now(),
      };
      if (rawWarehouseOps) {
        try {
          warehouseOpsState = JSON.parse(rawWarehouseOps);
          if (!Array.isArray(warehouseOpsState.shipments)) warehouseOpsState.shipments = [];
        } catch {}
      }

      for (const ship of data.shipments) {
        const inboundId = generateDeterministicId('inbound', `${ship.batchCode}-${ship.supplier}`);
        if (!warehouseOpsState.shipments.some((s) => s.batchCode === ship.batchCode || s.id === inboundId)) {
          warehouseOpsState.shipments.unshift({
            id: inboundId,
            batchCode: ship.batchCode,
            supplier: ship.supplier,
            supplierContact: ship.supplierContact || 'Direct Consignment',
            originCountry: ship.originCountry || 'Austria (FunderMax)',
            arrivalDate: ship.arrivalDate || nowIso.slice(0, 10),
            status: 'received' as InboundStatus,
            items: [
              {
                id: `item-${Date.now().toString(36)}`,
                description: ship.itemSummary || 'Consignment batch',
                unit: 'pallets',
                expectedQty: 1,
                receivedQty: 1,
              },
            ],
            notes: `Invoiced: ${ship.currency} ${ship.invoicedTotal} | Paid: ${ship.currency} ${ship.amountPaid} | Balance: ${ship.currency} ${ship.remainingBalance} ${ship.notes ? `| ${ship.notes}` : ''}`,
            createdAt: ship.arrivalDate || nowIso,
            updatedAt: nowIso,
            isDeleted: 0,
            deletedAt: null,
          });
        }
      }
      warehouseOpsState.updatedAt = Date.now();
      saveWarehouseOpsRawToDB(JSON.stringify(warehouseOpsState));

      // Ingest Customers into Dropdown Presets (Non-destructive to existing settings)
      const presetsRow = db.prepare(`SELECT value FROM meta WHERE key = 'dropdown_presets'`).get() as { value: string } | undefined;
      let presets: DropdownPresets = {
        savedTypes: [],
        savedProducts: [],
        savedSellingTypes: [],
        savedSellers: [],
        savedBanks: [],
        savedPaymentTypes: [],
      };

      if (presetsRow?.value) {
        try {
          presets = JSON.parse(presetsRow.value);
        } catch {}
      }

      if (!Array.isArray(presets.savedClients)) {
        presets.savedClients = [];
      }
      if (!Array.isArray(presets.savedSellers)) {
        presets.savedSellers = [];
      }

      const clientSet = new Set(presets.savedClients);
      for (const cust of data.customers) {
        if (cust.name && !clientSet.has(cust.name)) {
          clientSet.add(cust.name);
          presets.savedClients.push(cust.name);
          customersAdded++;
        }
      }

      db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('dropdown_presets', ?)`).run(JSON.stringify(presets));

      // Record Tamper-Evident Audit Log
      writeAuditLog(
        db,
        'LEGACY_DATA_MIGRATED',
        {
          materialsInserted,
          materialsUpdated,
          shipmentsInserted,
          invoicesInserted,
          customersAdded,
          safetySnapshot: safetySnapshot.name,
        },
        actor
      );
    });

    return {
      success: true,
      snapshotName: safetySnapshot.name,
      snapshotSizeBytes: safetySnapshot.sizeBytes,
      importedCounts: {
        materialsInserted,
        materialsUpdated,
        shipmentsInserted,
        invoicesInserted,
        customersAdded,
      },
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[Migration Ingestion Error]', error);
    return {
      success: false,
      snapshotName: safetySnapshot.name,
      snapshotSizeBytes: safetySnapshot.sizeBytes,
      importedCounts: {
        materialsInserted: 0,
        materialsUpdated: 0,
        shipmentsInserted: 0,
        invoicesInserted: 0,
        customersAdded: 0,
      },
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
