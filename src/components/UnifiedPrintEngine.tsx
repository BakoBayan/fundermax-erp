'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { APP_CONFIG, APP_VERSION_NUMBER } from '@/config/appConfig';
import { PrintJob, OrderAllocation, PanelMaterial, PanelTransaction, InboundShipment } from '@/types/inventory';
import { useInventory } from '@/context/InventoryContext';

// ============================================================================
// TEMPLATE 1: WOOD PANELS CUTTING SLIP (A4 PORTRAIT)
// ============================================================================
export const WoodPanelsCuttingSlip: React.FC<{
  order: OrderAllocation;
  material: PanelMaterial;
  language: 'en' | 'ku';
}> = ({ order, material, language }) => {
  const isKu = language === 'ku';
  const orderDate = order.date
    ? new Date(order.date).toLocaleDateString(isKu ? 'ku' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString();

  return (
    <div className="w-full max-w-[210mm] mx-auto p-8 sm:p-10 bg-white text-black font-sans text-xs select-text print:p-6 print:m-0 print:max-w-none">
      {/* Formal Header */}
      <div className="border-b-2 border-black pb-4 mb-5 flex items-start justify-between">
        <div>
          <div className="inline-block px-2.5 py-0.5 border border-black text-[10px] font-mono font-black uppercase tracking-widest mb-1.5">
            {isKu ? 'پسوڵەی فەرمی بڕینی تەختە لە کارگە' : 'OFFICIAL FACTORY CUTTING SLIP'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black">
            Bako&apos;s Master System
          </h1>
          <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wide mt-0.5">
            {isKu ? 'بەشی تەختەکان و هێڵی بڕینی دارتاشی' : 'Wood Panels & Automated Workshop Cutting Division'}
          </div>
        </div>

        <div className="text-right font-mono">
          <div className="text-sm font-black px-3 py-1 border border-black inline-block bg-gray-100">
            REF #{order.orderNumber}
          </div>
          <div className="text-[11px] text-gray-600 mt-1">{orderDate}</div>
          <div className="text-[10px] font-bold uppercase text-gray-800 mt-0.5">
            {isKu ? 'مۆڵەتی کارگەی شاسوار ئەحمەد شاسوار' : 'Shaswar Ahmad Shaswar Co.'}
          </div>
        </div>
      </div>

      {/* Customer & Order Summary Details */}
      <div className="grid grid-cols-2 gap-4 mb-5 p-4 border border-black bg-gray-50/60">
        <div>
          <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
            {isKu ? 'زانیاری کڕیار / پڕۆژە' : 'Client / Project Entity'}
          </span>
          <div className="text-base font-black text-black mt-0.5">{order.client}</div>
          <div className="text-xs text-gray-600 mt-1">
            {isKu ? 'تەختەی دیاریکراو:' : 'Assigned Material:'}{' '}
            <strong className="text-black">{material.name}</strong> (#{material.code})
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
            {isKu ? 'بڕی تەختەی داواکراو' : 'Total Panels To Cut'}
          </span>
          <div className="text-2xl font-black font-mono text-black mt-0.5">
            {order.quantity} <span className="text-xs font-normal">pcs</span>
          </div>
          <div className="text-[11px] font-bold uppercase text-gray-700 mt-1">
            Status: {order.status === 'finalized' ? (isKu ? 'تەواوکراوە' : 'FINALIZED') : (isKu ? 'گیراوە بۆ بڕین' : 'RESERVED')}
          </div>
        </div>
      </div>

      {/* Cutting Specification Table (Zero clipped rows, break-inside: avoid) */}
      <div className="mb-6">
        <div className="text-[11px] font-black uppercase tracking-wider mb-1.5 flex justify-between items-center">
          <span>{isKu ? 'خشتەی ئەندازە و تایبەتمەندییەکانی بڕین' : 'SPECIFICATIONS & CUTTING DIMENSION TABLE'}</span>
          <span className="text-[10px] font-mono text-gray-500">TOLERANCE: +/- 0.5MM</span>
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-100 border-b border-black text-black font-black uppercase text-[11px]">
              <th className="p-2 border-r border-black text-center w-10">#</th>
              <th className="p-2 border-r border-black text-left">{isKu ? 'جۆری دار / پەنەل' : 'Material / Finish'}</th>
              <th className="p-2 border-r border-black text-center">{isKu ? 'درێژی (Length)' : 'Length (mm)'}</th>
              <th className="p-2 border-r border-black text-center">{isKu ? 'پانی (Width)' : 'Width (mm)'}</th>
              <th className="p-2 border-r border-black text-center">{isKu ? 'ئەستووری (Thick)' : 'Thick (mm)'}</th>
              <th className="p-2 border-r border-black text-center">{isKu ? 'دانە' : 'Quantity'}</th>
              <th className="p-2 border-r border-black text-left">{isKu ? 'ئاڕاستەی نەخش / تێبینی' : 'Grain / Edge Notes'}</th>
              <th className="p-2 text-center">{isKu ? 'دۆخ' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }} className="border-b border-black">
              <td className="p-2.5 border-r border-black text-center font-mono font-bold">1</td>
              <td className="p-2.5 border-r border-black font-bold">
                {material.name}
                <div className="text-[10px] text-gray-600 font-mono">TYPE: {material.type}</div>
              </td>
              <td className="p-2.5 border-r border-black text-center font-mono font-black">{material.dimensions.length} mm</td>
              <td className="p-2.5 border-r border-black text-center font-mono font-black">{material.dimensions.width} mm</td>
              <td className="p-2.5 border-r border-black text-center font-mono font-black">{material.dimensions.thickness} mm</td>
              <td className="p-2.5 border-r border-black text-center font-mono font-black text-sm">{order.quantity} pcs</td>
              <td className="p-2.5 border-r border-black text-xs">{order.notes || (isKu ? 'بەپێی پێوانەی ستاندارد' : 'Standard Factory Grain')}</td>
              <td className="p-2.5 text-center font-bold uppercase text-[10px]">
                {order.status === 'finalized' ? (isKu ? 'تەواوکراو' : 'Cut Done') : (isKu ? 'ئامادە بۆ بڕین' : 'In Queue')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Workshop Notes / Instructions */}
      {order.notes && (
        <div className="mb-5 p-3.5 border border-black bg-gray-50/40" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <div className="text-[10px] font-black uppercase tracking-wider text-gray-700 mb-1">
            {isKu ? 'ڕێنمایی و تێبینییەکانی وەستا:' : 'OPERATOR WORKSHOP INSTRUCTIONS:'}
          </div>
          <p className="text-xs text-gray-900 font-mono leading-relaxed whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}

      {/* Optional Attached Blueprint / Sketch Photo */}
      {order.imageUrl && (
        <div className="mb-6 p-3 border border-black text-center" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <div className="text-[10px] font-black uppercase tracking-wider text-gray-600 mb-2">
            {isKu ? 'نەخشە و دیزاینی هاوپێچکراوی داواکاری' : 'ATTACHED ORDER BLUEPRINT / SKETCH'}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={order.imageUrl}
            alt="Order Blueprint"
            className="max-h-64 max-w-full mx-auto object-contain filter grayscale contrast-125 border border-gray-300"
          />
        </div>
      )}

      {/* Operator & Workshop Sign-Off Box (Always clean, no page break clipping) */}
      <div className="mt-8 pt-4 border-t-2 border-black" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 text-center">
          {isKu ? 'مۆر و واژۆی دەستەی جێبەجێکار و چاودێری' : 'OFFICIAL WORKSHOP DISPATCH & QUALITY VERIFICATION'}
        </div>

        <div className="grid grid-cols-3 gap-6 text-center text-xs">
          <div className="border border-black p-3 rounded-none min-h-[90px] flex flex-col justify-between">
            <span className="font-bold text-[10px] uppercase text-gray-700">
              {isKu ? 'وەستای بڕین (Machine Operator)' : 'Saw Machine Operator'}
            </span>
            <div className="border-b border-dotted border-black my-4" />
            <span className="text-[9px] text-gray-500 font-mono">Sign &amp; Date</span>
          </div>

          <div className="border border-black p-3 rounded-none min-h-[90px] flex flex-col justify-between">
            <span className="font-bold text-[10px] uppercase text-gray-700">
              {isKu ? 'پشکنەری کوالێتی (Quality Inspector)' : 'Quality Inspector'}
            </span>
            <div className="border-b border-dotted border-black my-4" />
            <span className="text-[9px] text-gray-500 font-mono">Sign &amp; Date</span>
          </div>

          <div className="border border-black p-3 rounded-none min-h-[90px] flex flex-col justify-between">
            <span className="font-bold text-[10px] uppercase text-gray-700">
              {isKu ? 'وەرگری کاڵا (Client Receiver)' : 'Client Dispatch Receiver'}
            </span>
            <div className="border-b border-dotted border-black my-4" />
            <span className="text-[9px] text-gray-500 font-mono">Sign &amp; Date</span>
          </div>
        </div>

        <div className="mt-5 text-center text-[10px] font-mono text-gray-500 flex justify-between items-center">
          <span>Engineered by Bako Bayan Madhhar • 07705488654</span>
          <span>Shaswar Ahmad Shaswar Co. Licensure • v{APP_VERSION_NUMBER}</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TEMPLATE 2: WAREHOUSE RECEIVING MANIFEST (A4 PORTRAIT)
// ============================================================================
export const WarehouseManifestSlip: React.FC<{
  shipment: InboundShipment;
  language: 'en' | 'ku';
}> = ({ shipment, language }) => {
  const isKu = language === 'ku';
  const arrivalDateStr = shipment.arrivalDate || new Date().toLocaleDateString();

  return (
    <div className="w-full max-w-[210mm] mx-auto p-8 sm:p-10 bg-white text-black font-sans text-xs select-text print:p-6 print:m-0 print:max-w-none">
      {/* Formal Header */}
      <div className="border-b-2 border-black pb-4 mb-5 flex items-start justify-between">
        <div>
          <div className="inline-block px-2.5 py-0.5 border border-black text-[10px] font-mono font-black uppercase tracking-widest mb-1.5">
            {isKu ? 'مانیفێستی فەرمی وەرگرتنی بار لە کۆگا' : 'INBOUND SHIPMENT RECEIVING MANIFEST'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black">
            Bako&apos;s Master System
          </h1>
          <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wide mt-0.5">
            {isKu ? 'بەشی کۆگا، کەلوپەل و لۆجستی نێودەوڵەتی' : 'Warehouse Goods, Hardware & Logistics Fleet'}
          </div>
        </div>

        <div className="text-right font-mono">
          <div className="text-sm font-black px-3 py-1 border border-black inline-block bg-gray-100">
            BATCH: {shipment.batchCode}
          </div>
          <div className="text-[11px] text-gray-600 mt-1">{arrivalDateStr}</div>
          <div className="text-[10px] font-bold uppercase text-gray-800 mt-0.5">
            STATUS: {shipment.status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Supplier & Logistics Metadata */}
      <div className="grid grid-cols-2 gap-4 mb-5 p-4 border border-black bg-gray-50/60">
        <div>
          <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
            {isKu ? 'دابینکەر / کۆمپانیا نێرەر' : 'Supplier / Logistics Consignor'}
          </span>
          <div className="text-base font-black text-black mt-0.5">{shipment.supplier}</div>
          <div className="text-xs text-gray-600 mt-1">
            {isKu ? 'وڵاتی سەرچاوە:' : 'Origin Country:'}{' '}
            <strong className="text-black">{shipment.originCountry || 'Standard International'}</strong>
          </div>
          {shipment.supplierContact && (
            <div className="text-xs text-gray-600">Contact: {shipment.supplierContact}</div>
          )}
        </div>

        <div className="text-right font-mono">
          <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
            {isKu ? 'کۆی بڕگەکانی ناو بار' : 'Manifest Line Count'}
          </span>
          <div className="text-2xl font-black text-black mt-0.5">
            {shipment.items.length} <span className="text-xs font-normal">lines</span>
          </div>
          <div className="text-[11px] font-bold text-gray-700 mt-1">
            {isKu ? 'دۆخی گومرگ:' : 'Port Clearance:'} {shipment.status}
          </div>
        </div>
      </div>

      {/* Shipment Items Table */}
      <div className="mb-6">
        <div className="text-[11px] font-black uppercase tracking-wider mb-1.5 flex justify-between items-center">
          <span>{isKu ? 'خشتەی کاڵا گەیشتووەکان و پشکنینی فیزیکی' : 'RECEIVED ITEMS, BATCH VERIFICATION & RACK ASSIGNMENT'}</span>
          <span className="text-[10px] font-mono text-gray-500">AUDIT VERIFIED</span>
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-100 border-b border-black text-black font-black uppercase text-[11px]">
              <th className="p-2 border-r border-black text-center w-10">#</th>
              <th className="p-2 border-r border-black text-left">{isKu ? 'ناوى کاڵا / کەرەستە' : 'Item Description'}</th>
              <th className="p-2 border-r border-black text-center">{isKu ? 'یەکە' : 'Unit'}</th>
              <th className="p-2 border-r border-black text-right">{isKu ? 'چاوەڕوانکراو' : 'Expected Qty'}</th>
              <th className="p-2 border-r border-black text-right">{isKu ? 'گەیشتوو' : 'Received Qty'}</th>
              <th className="p-2 border-r border-black text-right">{isKu ? 'جیاوازی' : 'Variance'}</th>
              <th className="p-2 border-r border-black text-center">{isKu ? 'شوێن لە ڕەفە' : 'Rack / Bay'}</th>
              <th className="p-2 text-left">{isKu ? 'تێبینی تەندروستی کاڵا' : 'Condition Notes'}</th>
            </tr>
          </thead>
          <tbody>
            {shipment.items.map((it, idx) => {
              const diff = it.receivedQty - it.expectedQty;
              return (
                <tr key={it.id || idx} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }} className="border-b border-black">
                  <td className="p-2 border-r border-black text-center font-mono font-bold">{idx + 1}</td>
                  <td className="p-2 border-r border-black font-bold">{it.description}</td>
                  <td className="p-2 border-r border-black text-center font-mono">{it.unit}</td>
                  <td className="p-2 border-r border-black text-right font-mono font-bold">{it.expectedQty.toLocaleString()}</td>
                  <td className="p-2 border-r border-black text-right font-mono font-black">{it.receivedQty.toLocaleString()}</td>
                  <td className={`p-2 border-r border-black text-right font-mono font-bold ${diff < 0 ? 'text-red-700' : 'text-black'}`}>
                    {diff === 0 ? '0' : diff > 0 ? `+${diff}` : `${diff}`}
                  </td>
                  <td className="p-2 border-r border-black text-center font-mono font-bold">RACK-AUTO</td>
                  <td className="p-2 text-xs">{it.expectedQty === it.receivedQty ? (isKu ? 'تەواوە و کێشەی نییە' : 'Inspected & Passed') : (isKu ? 'جیاوازی تۆمارکراوە' : 'Discrepancy noted')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Shipment Notes */}
      {shipment.notes && (
        <div className="mb-5 p-3.5 border border-black bg-gray-50/40" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <div className="text-[10px] font-black uppercase tracking-wider text-gray-700 mb-1">
            {isKu ? 'تێبینییەکانی گەیشتنی بار:' : 'SHIPMENT LOGISTICS NOTES:'}
          </div>
          <p className="text-xs text-gray-900 font-mono leading-relaxed whitespace-pre-wrap">{shipment.notes}</p>
        </div>
      )}

      {/* Receiving Officer & Auditor Sign-Off Box */}
      <div className="mt-8 pt-4 border-t-2 border-black" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 text-center">
          {isKu ? 'مۆر و واژۆی کارمەندی وەرگرتن و وردبینی کۆگا' : 'OFFICIAL WAREHOUSE RECEIPT & AUDIT INSPECTION SIGN-OFF'}
        </div>

        <div className="grid grid-cols-2 gap-8 text-center text-xs">
          <div className="border border-black p-4 rounded-none min-h-[90px] flex flex-col justify-between">
            <span className="font-bold text-[10px] uppercase text-gray-700">
              {isKu ? 'کارمەندی وەرگرتنی کۆگا (Warehouse Receiving Clerk)' : 'Warehouse Receiving Clerk'}
            </span>
            <div className="border-b border-dotted border-black my-4" />
            <span className="text-[9px] text-gray-500 font-mono">Sign &amp; Date</span>
          </div>

          <div className="border border-black p-4 rounded-none min-h-[90px] flex flex-col justify-between">
            <span className="font-bold text-[10px] uppercase text-gray-700">
              {isKu ? 'وردبین و بەڕێوەبەری کۆگا (Warehouse Manager / Auditor)' : 'Warehouse Manager / Auditor'}
            </span>
            <div className="border-b border-dotted border-black my-4" />
            <span className="text-[9px] text-gray-500 font-mono">Sign &amp; Date</span>
          </div>
        </div>

        <div className="mt-5 text-center text-[10px] font-mono text-gray-500 flex justify-between items-center">
          <span>Engineered by Bako Bayan Madhhar • 07705488654</span>
          <span>Shaswar Ahmad Shaswar Co. Licensure • v{APP_VERSION_NUMBER}</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TEMPLATE 3: POS INVOICE (DUAL MODE: 80MM THERMAL & A4 VOUCHER)
// ============================================================================
export const PosInvoiceSlip: React.FC<{
  tx: PanelTransaction;
  format?: 'a4' | 'thermal80';
  formatMoney: (val: number, cur?: any) => string;
  language: 'en' | 'ku';
}> = ({ tx, format = 'a4', formatMoney, language }) => {
  const isKu = language === 'ku';
  const invoiceDateStr = tx.timestamp
    ? new Date(tx.timestamp).toLocaleDateString(isKu ? 'ku' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString();

  if (format === 'thermal80') {
    return (
      <div className="w-[80mm] max-w-[80mm] mx-auto p-4 text-black bg-white font-mono text-[11px] leading-snug select-text print:p-0 print:m-0 print:w-[72mm] print:max-w-[72mm]">
        {/* Thermal Header */}
        <div className="text-center pb-2.5 mb-2.5 border-b-2 border-dashed border-black">
          <h2 className="text-base font-black uppercase tracking-wider text-black">
            BAKO&apos;S MASTER SYSTEM
          </h2>
          <p className="text-[11px] font-bold text-black mt-0.5">
            Shaswar Ahmad Shaswar Co.
          </p>
          <p className="text-[10px] font-semibold text-black mt-0.5">
            Official Contact: 07705488654
          </p>
          <div className="text-[10px] font-black uppercase tracking-widest mt-1.5 border-t border-black pt-1">
            SALES RECEIPT / پسوولەی فرۆشتن
          </div>
        </div>

        {/* Thermal Meta */}
        <div className="text-[10px] space-y-0.5 pb-2 mb-2 border-b border-dashed border-black font-mono">
          <div className="flex justify-between">
            <span>INV: #{tx.code || tx.id.slice(-6)}</span>
            <span>{invoiceDateStr}</span>
          </div>
          <div className="flex justify-between">
            <span>SELLER: {tx.seller || 'Bako Bayan'}</span>
            <span>PAY: {tx.paymentType || 'Cash'}</span>
          </div>
          <div className="flex justify-between">
            <span>CURRENCY: {tx.currency || 'USD'}</span>
            {tx.bank && <span>BANK: {tx.bank}</span>}
          </div>
        </div>

        {/* Thermal Items Table */}
        <div className="pb-2 mb-2 border-b-2 border-dashed border-black">
          <div className="flex justify-between text-[10px] font-black border-b border-black pb-1 mb-1">
            <span className="w-1/2">ITEM</span>
            <span className="w-10 text-center">QTY</span>
            <span className="w-16 text-right">PRICE</span>
            <span className="w-16 text-right">TOTAL</span>
          </div>
          {tx.items && tx.items.length > 0 ? (
            tx.items.map((it, idx) => (
              <div key={idx} className="flex justify-between items-start text-[10px] py-0.5">
                <div className="w-1/2 font-bold truncate">{it.product || it.type}</div>
                <div className="w-10 text-center font-bold">{it.quantity}</div>
                <div className="w-16 text-right">{formatMoney(it.price, tx.currency)}</div>
                <div className="w-16 text-right font-black">{formatMoney(it.total, tx.currency)}</div>
              </div>
            ))
          ) : (
            <div className="flex justify-between items-start text-[10px] py-0.5">
              <div className="w-1/2 font-bold truncate">{tx.material || tx.panelType}</div>
              <div className="w-10 text-center font-bold">{tx.quantity}</div>
              <div className="w-16 text-right">{formatMoney(tx.sellingAmount / (tx.quantity || 1), tx.currency)}</div>
              <div className="w-16 text-right font-black">{formatMoney(tx.sellingAmount, tx.currency)}</div>
            </div>
          )}
        </div>

        {/* Thermal Financial Breakdown */}
        <div className="text-[10.5px] space-y-1 pb-2 mb-2 border-b-2 border-dashed border-black font-mono">
          <div className="flex justify-between">
            <span>SUBTOTAL:</span>
            <span>{formatMoney(tx.sellingAmount, tx.currency)}</span>
          </div>
          {tx.discountDollars !== undefined && tx.discountDollars > 0 && (
            <div className="flex justify-between font-bold">
              <span>DISCOUNT:</span>
              <span>-{formatMoney(tx.discountDollars, tx.currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs font-black border-t border-black pt-1">
            <span>TOTAL NET:</span>
            <span>{formatMoney(tx.totalAfterDiscount, tx.currency)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>PAID NOW:</span>
            <span>{formatMoney(tx.amountPaidNow || 0, tx.currency)}</span>
          </div>
          <div className="flex justify-between font-black">
            <span>REMAINING DEBT:</span>
            <span>{formatMoney(tx.combinedTotalDebt || 0, tx.currency)}</span>
          </div>
        </div>

        {/* Thermal Notes */}
        {tx.notes && (
          <div className="text-[10px] pb-2 mb-2 border-b border-dashed border-black break-words font-mono">
            <span className="font-bold">NOTES: </span>
            <span>{tx.notes}</span>
          </div>
        )}

        {/* Thermal Cut Line & Footer */}
        <div className="text-center text-[9.5px] pt-1.5 space-y-1 font-mono">
          <p className="font-black uppercase tracking-wider">THANK YOU FOR YOUR BUSINESS</p>
          <p>Bako&apos;s Master System • v{APP_CONFIG.version}</p>
          <div className="pt-2 text-center text-[9px] text-gray-700 font-mono">
            - - - - - - - - - - - - - - - - - - - - - - - -
            <span className="block mt-0.5 font-bold">[ CUT HERE / لێرە بیبڕە ]</span>
          </div>
        </div>
      </div>
    );
  }

  // Standard A4 Wholesale Voucher
  return (
    <div className="w-full max-w-[210mm] mx-auto p-8 sm:p-10 bg-white text-black font-sans text-xs select-text print:p-6 print:m-0 print:max-w-none">
      {/* Formal Header */}
      <div className="border-b-2 border-black pb-4 mb-5 flex items-start justify-between">
        <div>
          <div className="inline-block px-2.5 py-0.5 border border-black text-[10px] font-mono font-black uppercase tracking-widest mb-1.5">
            {isKu ? 'پسوولەی فەرمی فرۆشتن و دارایی' : 'OFFICIAL SALES & WHOLESALE INVOICE VOUCHER'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black">
            Bako&apos;s Master System
          </h1>
          <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wide mt-0.5">
            {isKu ? 'کۆمپانیای شاسوار ئەحمەد شاسوار • بازرگانی گشتی تەختە و مەواد' : 'Shaswar Ahmad Shaswar Co. • General Trading & Wood Panel Supply'}
          </div>
        </div>

        <div className="text-right font-mono">
          <div className="text-sm font-black px-3 py-1 border border-black inline-block bg-gray-100">
            INV #{tx.code || tx.id.slice(-6)}
          </div>
          <div className="text-[11px] text-gray-600 mt-1">{invoiceDateStr}</div>
          <div className="text-[10px] font-bold uppercase text-gray-800 mt-0.5">
            SELLER: {tx.seller || 'Bako Bayan'}
          </div>
        </div>
      </div>

      {/* Invoice Meta Grid */}
      <div className="grid grid-cols-2 gap-4 mb-5 p-4 border border-black bg-gray-50/60">
        <div>
          <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
            {isKu ? 'شێوازی پارەدان و هەژمار' : 'Payment & Settlement Terms'}
          </span>
          <div className="text-sm font-black text-black mt-0.5">
            {tx.paymentType || 'Cash'} {tx.bank ? `• ${tx.bank}` : ''}
          </div>
          <div className="text-xs text-gray-600 mt-1 font-mono">
            {isKu ? 'دراوی مامەڵە:' : 'Transaction Currency:'}{' '}
            <strong className="text-black">{tx.currency || 'USD'}</strong>
          </div>
        </div>

        <div className="text-right font-mono">
          <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
            {isKu ? 'دۆخی پسوولە' : 'Invoice Payment Status'}
          </span>
          <div className="text-base font-black text-black mt-0.5 uppercase">
            {tx.status}
          </div>
          <div className="text-[11px] font-bold text-gray-700 mt-1">
            {isKu ? 'قەرزی پێشوو:' : 'Prior Ledger Debt:'} {formatMoney(tx.oldUnpaidDebt || 0, tx.currency)}
          </div>
        </div>
      </div>

      {/* Itemized Table */}
      <div className="mb-6">
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-100 border-b border-black text-black font-black uppercase text-[11px]">
              <th className="p-2 border-r border-black text-center w-10">#</th>
              <th className="p-2 border-r border-black text-left">{isKu ? 'کاڵا / کەرەستە' : 'Item Description'}</th>
              <th className="p-2 border-r border-black text-center">{isKu ? 'جۆری فرۆشتن' : 'Sale Type'}</th>
              <th className="p-2 border-r border-black text-center">{isKu ? 'بڕ' : 'Quantity'}</th>
              <th className="p-2 border-r border-black text-right">{isKu ? 'نرخی یەکە' : 'Unit Price'}</th>
              <th className="p-2 text-right">{isKu ? 'کۆی گشتی' : 'Line Total'}</th>
            </tr>
          </thead>
          <tbody>
            {tx.items && tx.items.length > 0 ? (
              tx.items.map((it, idx) => (
                <tr key={idx} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }} className="border-b border-black">
                  <td className="p-2 border-r border-black text-center font-mono font-bold">{idx + 1}</td>
                  <td className="p-2 border-r border-black font-bold">{it.product || it.type}</td>
                  <td className="p-2 border-r border-black text-center text-xs">{it.sellingType || 'Wholesale'}</td>
                  <td className="p-2 border-r border-black text-center font-mono font-bold">{it.quantity}</td>
                  <td className="p-2 border-r border-black text-right font-mono">{formatMoney(it.price, tx.currency)}</td>
                  <td className="p-2 text-right font-mono font-black">{formatMoney(it.total, tx.currency)}</td>
                </tr>
              ))
            ) : (
              <tr style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }} className="border-b border-black">
                <td className="p-2 border-r border-black text-center font-mono font-bold">1</td>
                <td className="p-2 border-r border-black font-bold">{tx.material || tx.panelType}</td>
                <td className="p-2 border-r border-black text-center text-xs">{tx.sellingType}</td>
                <td className="p-2 border-r border-black text-center font-mono font-bold">{tx.quantity} {tx.unit}</td>
                <td className="p-2 border-r border-black text-right font-mono">{formatMoney(tx.sellingAmount / (tx.quantity || 1), tx.currency)}</td>
                <td className="p-2 text-right font-mono font-black">{formatMoney(tx.sellingAmount, tx.currency)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Financial Breakdown Summary Table */}
      <div className="flex justify-end mb-6" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <div className="w-72 border border-black p-3.5 space-y-1.5 font-mono text-xs bg-gray-50/60">
          <div className="flex justify-between">
            <span className="font-bold text-gray-700">{isKu ? 'کۆی پێش داشکاندن:' : 'Gross Subtotal:'}</span>
            <span className="font-bold">{formatMoney(tx.sellingAmount, tx.currency)}</span>
          </div>
          {tx.discountDollars !== undefined && tx.discountDollars > 0 && (
            <div className="flex justify-between text-red-700 font-bold">
              <span>{isKu ? 'داشکاندن:' : 'Discount Applied:'}</span>
              <span>-{formatMoney(tx.discountDollars, tx.currency)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-black pt-1 font-black text-sm text-black">
            <span>{isKu ? 'کۆی گشتی پاش داشکاندن:' : 'Net Invoice Total:'}</span>
            <span>{formatMoney(tx.totalAfterDiscount, tx.currency)}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-gray-300">
            <span className="text-gray-700">{isKu ? 'پارەی دراو:' : 'Amount Paid Now:'}</span>
            <span className="font-black text-black">{formatMoney(tx.amountPaidNow || 0, tx.currency)}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-black text-black font-black">
            <span>{isKu ? 'قەرزی ماوەی ئەم پسوولەیە:' : 'Remaining Balance:'}</span>
            <span>{formatMoney(tx.combinedTotalDebt || tx.amountOwed || 0, tx.currency)}</span>
          </div>
        </div>
      </div>

      {/* Invoice Notes */}
      {tx.notes && (
        <div className="mb-5 p-3.5 border border-black bg-gray-50/40" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <div className="text-[10px] font-black uppercase tracking-wider text-gray-700 mb-1">
            {isKu ? 'تێبینییەکانی پسوولە:' : 'INVOICE REMARKS:'}
          </div>
          <p className="text-xs text-gray-900 font-mono leading-relaxed whitespace-pre-wrap">{tx.notes}</p>
        </div>
      )}

      {/* Optional Attached Order Photos */}
      {tx.images && tx.images.length > 0 && (
        <div className="mb-6 p-3.5 border border-black" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <div className="text-[10px] font-black uppercase tracking-wider text-gray-700 mb-2">
            {isKu ? 'وێنەکانی هاوپێچکراو:' : 'ATTACHED ORDER PHOTOS:'}
          </div>
          <div className="flex flex-wrap gap-3 items-center justify-center">
            {tx.images.map((imgUrl, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={imgUrl}
                alt={`Invoice Attachment ${i + 1}`}
                className="max-h-48 max-w-xs object-contain border border-gray-300 filter grayscale contrast-125"
              />
            ))}
          </div>
        </div>
      )}

      {/* Signatures Box */}
      <div className="mt-8 pt-4 border-t-2 border-black" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <div className="grid grid-cols-2 gap-8 text-center text-xs">
          <div className="border border-black p-4 rounded-none min-h-[90px] flex flex-col justify-between">
            <span className="font-bold text-[10px] uppercase text-gray-700">
              {isKu ? 'واژۆی ژمێریار / فرۆشیار' : 'Authorized Cashier / Accountant'}
            </span>
            <div className="border-b border-dotted border-black my-4" />
            <span className="text-[9px] text-gray-500 font-mono">Sign &amp; Date</span>
          </div>

          <div className="border border-black p-4 rounded-none min-h-[90px] flex flex-col justify-between">
            <span className="font-bold text-[10px] uppercase text-gray-700">
              {isKu ? 'واژۆی کڕیار بۆ وەرگرتنی کاڵا' : 'Customer Acceptance / Receiver'}
            </span>
            <div className="border-b border-dotted border-black my-4" />
            <span className="text-[9px] text-gray-500 font-mono">Sign &amp; Date</span>
          </div>
        </div>

        <div className="mt-5 text-center text-[10px] font-mono text-gray-500 flex justify-between items-center">
          <span>Engineered by Bako Bayan Madhhar • 07705488654</span>
          <span>Shaswar Ahmad Shaswar Co. Licensure • v{APP_VERSION_NUMBER}</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN UNIFIED PRINT MOUNT COMPONENT
// Mounts directly into #print-mount-root in layout.tsx via React Portal
// ============================================================================
export const UnifiedPrintMount: React.FC = () => {
  const { activePrintJob, clearPrintJob, language, formatMoney } = useInventory();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for afterprint event to clear active print job
  useEffect(() => {
    const handleAfterPrint = () => {
      clearPrintJob();
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, [clearPrintJob]);

  // When activePrintJob changes, trigger print after DOM portal has fully painted
  useEffect(() => {
    if (activePrintJob && mounted) {
      let animId1: number;
      let animId2: number;
      const timer = setTimeout(() => {
        animId1 = requestAnimationFrame(() => {
          animId2 = requestAnimationFrame(() => {
            if (typeof window !== 'undefined') {
              window.print();
            }
          });
        });
      }, 150);

      return () => {
        clearTimeout(timer);
        if (animId1) cancelAnimationFrame(animId1);
        if (animId2) cancelAnimationFrame(animId2);
      };
    }
  }, [activePrintJob, mounted]);

  if (!mounted || !activePrintJob) return null;

  const mountRoot = typeof document !== 'undefined' ? document.getElementById('print-mount-root') : null;
  if (!mountRoot) return null;

  let content: React.ReactNode = null;
  if (activePrintJob.type === 'cutting-slip') {
    content = (
      <WoodPanelsCuttingSlip
        order={activePrintJob.data.order}
        material={activePrintJob.data.material}
        language={language}
      />
    );
  } else if (activePrintJob.type === 'warehouse-manifest') {
    content = (
      <WarehouseManifestSlip
        shipment={activePrintJob.data as unknown as InboundShipment}
        language={language}
      />
    );
  } else if (activePrintJob.type === 'pos-invoice') {
    content = (
      <PosInvoiceSlip
        tx={activePrintJob.data.tx}
        format={activePrintJob.data.format || 'a4'}
        formatMoney={formatMoney}
        language={language}
      />
    );
  }

  return createPortal(content, mountRoot);
};

export default UnifiedPrintMount;
