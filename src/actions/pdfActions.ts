"use server";

import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { COMPANY_BRAND } from '@/config/brand';
import { SHASWAR_LOGO_BASE64 } from '@/config/logoBase64';

function sanitizeText(input: any, fallback = ""): string {
  if (input === null || input === undefined) return fallback;
  const raw = String(input)
    .replace(/€/g, "EUR ")
    .replace(/[•·]/g, "-")
    .replace(/[—–]/g, "-")
    .replace(/[\r\n\t]+/g, " ")
    // Strip Arabic, Kurdish, and any non-ASCII characters outside printable Latin range
    .replace(/[^\x20-\x7E]/g, "")
    // Clean up empty parentheses left behind by bilingual labels like "Cash (نەقد)"
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return raw || fallback;
}

function formatReadableDate(rawDate?: string | number): string {
  if (!rawDate) {
    return new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return String(rawDate);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(rawDate);
  }
}

export async function generateMasterPDF(
  invoiceData: any,
  base64Files: { name: string; data: string; type: string }[],
  brandLogoBase64?: string
): Promise<{ success: boolean; base64: string; fileName: string; url?: string }> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // 1. Initial Invoice Page (A4 standard)
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const margin = 40;
  const contentWidth = width - margin * 2;

  // Currency & formatting helpers
  const cur = sanitizeText(
    invoiceData?.currency || invoiceData?.invoiceCurrency || "USD",
    "USD"
  );
  const sym = cur === "EUR" ? "EUR " : cur === "IQD" ? "IQD " : "$";
  const fmt = (num: number) =>
    sanitizeText(
      `${sym}${Number(num || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      "$0.00"
    );

  // Header Identification
  const rawId =
    invoiceData?.code ||
    invoiceData?.id ||
    invoiceData?.invoiceId ||
    "INV-2026-11-001";
  const invoiceId = sanitizeText(String(rawId).replace(/^tx-/, ""), "INV-2026-11-001");
  const formattedDate = sanitizeText(
    formatReadableDate(
      invoiceData?.date || invoiceData?.timestamp || invoiceData?.createdAt
    ),
    "Nov 2, 2026"
  );

  // =========================================================================
  // TOP BRANDING & HEADER BAR
  // =========================================================================
  // Embed the Logo in the Top Right
  let logoWidth = 0;
  let logoBytes: Uint8Array | null = null;

  const rawBase64 = brandLogoBase64 || SHASWAR_LOGO_BASE64;
  if (rawBase64) {
    try {
      const cleanBase64 = rawBase64.includes(",") ? rawBase64.split(",")[1] : rawBase64;
      logoBytes = Buffer.from(cleanBase64, "base64");
    } catch (e) {
      console.warn("Base64 Logo parse failed", e);
    }
  }

  if (!logoBytes || logoBytes.length === 0) {
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'shaswar-ahmad-logo.png'),
      path.join(process.cwd(), 'public', 'shaswar-ahmad-logo - Copy.png'),
      path.join(process.cwd(), 'public', COMPANY_BRAND.logoPath.replace(/^\//, '')),
    ];
    for (const p of possiblePaths) {
      try {
        if (fs.existsSync(p)) {
          logoBytes = fs.readFileSync(p);
          break;
        }
      } catch {}
    }
  }

  if (logoBytes && logoBytes.length > 0) {
    try {
      const embeddedLogo = await pdfDoc.embedPng(logoBytes).catch(() => pdfDoc.embedJpg(logoBytes!));
      const logoDims = embeddedLogo.scale(0.33);
      page.drawImage(embeddedLogo, {
        x: width - margin - logoDims.width,
        y: height - 20 - logoDims.height,
        width: logoDims.width,
        height: logoDims.height,
      });
      logoWidth = logoDims.width;
    } catch (e) {
      console.warn("Logo embed failed", e);
    }
  }

  // Red Executive Accent Bar
  page.drawRectangle({
    x: margin - 12,
    y: height - 70,
    width: 4,
    height: 25,
    color: rgb(0.85, 0.15, 0.15), // Shaswar corporate red
  });

  // Clean Typography (Left Aligned)
  page.drawText("COMMERCIAL INVOICE", {
    x: margin,
    y: height - 45,
    size: 16,
    font: fontBold,
    color: rgb(0.09, 0.12, 0.18),
  });
  page.drawText(sanitizeText(`Invoice Ref: #${invoiceId}`), {
    x: margin,
    y: height - 62,
    size: 9,
    font: fontBold,
    color: rgb(0.25, 0.32, 0.42),
  });
  page.drawText(sanitizeText(`Date: ${formattedDate}`), {
    x: margin,
    y: height - 74,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.52),
  });

  // Divider Line
  page.drawLine({
    start: { x: margin, y: height - 100 },
    end: { x: width - margin, y: height - 100 },
    thickness: 1,
    color: rgb(0.88, 0.91, 0.94),
  });

  // =========================================================================
  // CLIENT & COMPANY INFORMATION BOX
  // =========================================================================
  const entityBoxHeight = 60;
  const entityBoxY = height - 175;

  page.drawRectangle({
    x: margin,
    y: entityBoxY,
    width: contentWidth,
    height: entityBoxHeight,
    color: rgb(0.98, 0.99, 1.0),
    borderColor: rgb(0.88, 0.91, 0.95),
    borderWidth: 0.5,
  });

  // Entity Details
  const entityName = sanitizeText(
    invoiceData?.client ||
      invoiceData?.supplier ||
      invoiceData?.supplierName,
    "General Trade Client"
  );
  const entityPhone = sanitizeText(
    invoiceData?.clientPhone ||
      invoiceData?.customerPhone ||
      invoiceData?.supplierContact ||
      invoiceData?.phone,
    "No phone specified"
  );
  const entityRef = sanitizeText(
    invoiceData?.fundermaxBatchRef ||
      invoiceData?.legacyInvoiceRef ||
      invoiceData?.notes,
    "Standard Trade Fulfillment"
  );

  // Left Section: Entity Profile
  page.drawText("BILLED TO / TRADING ENTITY", {
    x: margin + 14,
    y: entityBoxY + entityBoxHeight - 13,
    size: 7.5,
    font: fontBold,
    color: rgb(0.45, 0.5, 0.58),
  });
  page.drawText(sanitizeText(entityName.slice(0, 40), "General Trade Client"), {
    x: margin + 14,
    y: entityBoxY + entityBoxHeight - 27,
    size: 10.5,
    font: fontBold,
    color: rgb(0.09, 0.12, 0.18),
  });
  page.drawText(sanitizeText(`Contact: ${entityPhone.slice(0, 30)}`), {
    x: margin + 14,
    y: entityBoxY + entityBoxHeight - 40,
    size: 8,
    font: fontRegular,
    color: rgb(0.35, 0.4, 0.48),
  });
  page.drawText(sanitizeText(`Reference: ${entityRef.slice(0, 45)}`), {
    x: margin + 14,
    y: entityBoxY + entityBoxHeight - 51,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.45, 0.5, 0.58),
  });

  // Right Section: Payment & Settlement Terms
  const settlementStatus =
    (invoiceData?.combinedTotalDebt || invoiceData?.amountOwed || invoiceData?.supplierDebtRemaining || 0) > 0
      ? "PARTIAL / DEBT BALANCE"
      : "SETTLED / PAID IN FULL";

  page.drawText("SETTLEMENT TERMS & STATUS", {
    x: margin + 280,
    y: entityBoxY + entityBoxHeight - 13,
    size: 7.5,
    font: fontBold,
    color: rgb(0.45, 0.5, 0.58),
  });
  page.drawText(sanitizeText(`Status: ${settlementStatus}`), {
    x: margin + 280,
    y: entityBoxY + entityBoxHeight - 27,
    size: 9,
    font: fontBold,
    color: settlementStatus.includes("DEBT") ? rgb(0.75, 0.15, 0.2) : rgb(0.1, 0.55, 0.3),
  });
  page.drawText(sanitizeText(`Currency: ${cur} (Official Ledger Base)`), {
    x: margin + 280,
    y: entityBoxY + entityBoxHeight - 40,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.45, 0.5, 0.58),
  });

  // =========================================================================
  // LINE ITEMS TABLE
  // =========================================================================
  let currentY = entityBoxY - 18;

  // Table Column Positions
  const colItemX = margin + 10;
  const colBatchX = margin + 210;
  const colQtyX = margin + 315;
  const colPriceX = margin + 380;
  const colTotalX = margin + 450;

  // Header Bar
  page.drawRectangle({
    x: margin,
    y: currentY - 2,
    width: contentWidth,
    height: 20,
    color: rgb(0.95, 0.97, 0.99),
  });

  page.drawText("ITEM / DESCRIPTION", {
    x: colItemX,
    y: currentY,
    size: 8,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.35),
  });
  page.drawText("BATCH / CODE", {
    x: colBatchX,
    y: currentY,
    size: 8,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.35),
  });
  page.drawText("QTY", {
    x: colQtyX,
    y: currentY,
    size: 8,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.35),
  });
  page.drawText("UNIT PRICE", {
    x: colPriceX,
    y: currentY,
    size: 8,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.35),
  });
  page.drawText("TOTAL", {
    x: colTotalX,
    y: currentY,
    size: 8,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.35),
  });

  currentY -= 20;

  // Populate Actual Line Items (fallback to item breakdowns if present)
  const items: any[] =
    Array.isArray(invoiceData?.items) && invoiceData.items.length > 0
      ? invoiceData.items
      : [
          {
            product:
              invoiceData?.material ||
              invoiceData?.product ||
              invoiceData?.description ||
              "Wood Panel / Standard Material",
            code:
              invoiceData?.fundermaxBatchRef ||
              invoiceData?.batchCode ||
              invoiceData?.code ||
              "FMAX-STD",
            quantity: invoiceData?.quantity ?? 1,
            price:
              invoiceData?.price ??
              invoiceData?.costPrice ??
              (invoiceData?.totalAfterDiscount || invoiceData?.total || 0),
            total:
              invoiceData?.totalAfterDiscount ??
              invoiceData?.sellingAmount ??
              invoiceData?.total ??
              invoiceData?.totalInvoiceAmount ??
              0,
          },
        ];

  items.forEach((item, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      page.drawRectangle({
        x: margin,
        y: currentY - 4,
        width: contentWidth,
        height: 18,
        color: rgb(0.97, 0.98, 0.99),
      });
    }

    const desc = sanitizeText(
      item.product || item.description || item.name,
      `Line Item ${index + 1}`
    ).slice(0, 36);
    const batchCode = sanitizeText(
      item.code ||
        item.batchCode ||
        item.fundermaxBatchRef ||
        invoiceData?.fundermaxBatchRef,
      "-"
    ).slice(0, 18);
    const qty = sanitizeText(item.quantity ?? 1, "1");
    const price = fmt(Number(item.price ?? 0));
    const total = fmt(Number(item.total ?? (Number(item.quantity ?? 1) * Number(item.price ?? 0))));

    page.drawText(sanitizeText(desc, `Line Item ${index + 1}`), {
      x: colItemX,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.12, 0.15, 0.2),
    });
    page.drawText(sanitizeText(batchCode, "-"), {
      x: colBatchX,
      y: currentY,
      size: 8,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.52),
    });
    page.drawText(sanitizeText(qty, "1"), {
      x: colQtyX,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.12, 0.15, 0.2),
    });
    page.drawText(sanitizeText(price, "$0.00"), {
      x: colPriceX,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.12, 0.15, 0.2),
    });
    page.drawText(sanitizeText(total, "$0.00"), {
      x: colTotalX,
      y: currentY,
      size: 8.5,
      font: fontBold,
      color: rgb(0.09, 0.12, 0.18),
    });

    page.drawLine({
      start: { x: margin, y: currentY - 5 },
      end: { x: width - margin, y: currentY - 5 },
      thickness: 0.5,
      color: rgb(0.92, 0.94, 0.96),
    });

    currentY -= 18;
  });

  // Bottom table line
  page.drawLine({
    start: { x: margin, y: currentY },
    end: { x: width - margin, y: currentY },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  });

  // =========================================================================
  // FINANCIAL SUMMARY BREAKDOWN & CRISP GRAND TOTAL
  // =========================================================================
  currentY -= 14;

  const netTotalNum = Number(
    invoiceData?.totalAfterDiscount ??
    invoiceData?.total ??
    invoiceData?.totalInvoiceAmount ??
    0
  );
  const paidNum = Number(
    invoiceData?.amountPaidNow ??
    invoiceData?.amountPaidToSupplier ??
    0
  );
  const remainingDebtNum = Number(
    invoiceData?.combinedTotalDebt ??
    invoiceData?.amountOwed ??
    invoiceData?.supplierDebtRemaining ??
    Math.max(0, netTotalNum - paidNum)
  );

  // Financial Breakdown Card (Right Aligned)
  const summaryBoxWidth = 240;
  const summaryBoxX = width - margin - summaryBoxWidth;
  const summaryBoxHeight = 85;
  const summaryBoxY = Math.max(80, currentY - summaryBoxHeight - 25);

  // Elegant Signature Anchor (Fills the left void beautifully)
  page.drawLine({
    start: { x: margin, y: summaryBoxY + 30 },
    end: { x: margin + 180, y: summaryBoxY + 30 },
    thickness: 0.5,
    color: rgb(0.7, 0.75, 0.8),
  });
  page.drawText("Authorized Ledger Signature & Stamp", {
    x: margin,
    y: summaryBoxY + 16,
    size: 8.5,
    font: fontBold,
    color: rgb(0.25, 0.32, 0.42),
  });
  page.drawText("Electronically verified & securely issued.", {
    x: margin,
    y: summaryBoxY + 4,
    size: 7,
    font: fontRegular,
    color: rgb(0.45, 0.5, 0.58),
  });

  // Net Total Row
  const totalsValueX = summaryBoxX + summaryBoxWidth - 14;

  page.drawText("Net Invoiced Total:", {
    x: summaryBoxX + 14,
    y: summaryBoxY + 74,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.35, 0.4, 0.48),
  });
  const netText = fmt(netTotalNum);
  page.drawText(netText, {
    x: totalsValueX - fontBold.widthOfTextAtSize(netText, 9),
    y: summaryBoxY + 74,
    size: 9,
    font: fontBold,
    color: rgb(0.09, 0.12, 0.18),
  });

  // Amount Paid Row
  page.drawText("Amount Paid to Date:", {
    x: summaryBoxX + 14,
    y: summaryBoxY + 54,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.35, 0.4, 0.48),
  });
  const paidText = fmt(paidNum);
  page.drawText(paidText, {
    x: totalsValueX - fontBold.widthOfTextAtSize(paidText, 9),
    y: summaryBoxY + 54,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.55, 0.3),
  });

  // Remaining Debt Row
  page.drawText("Remaining Unpaid Debt:", {
    x: summaryBoxX + 14,
    y: summaryBoxY + 34,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.35, 0.4, 0.48),
  });
  const debtText = fmt(remainingDebtNum);
  page.drawText(debtText, {
    x: totalsValueX - fontBold.widthOfTextAtSize(debtText, 9),
    y: summaryBoxY + 34,
    size: 9,
    font: fontBold,
    color: remainingDebtNum > 0 ? rgb(0.75, 0.15, 0.2) : rgb(0.1, 0.55, 0.3),
  });

  // Subtle separator line above the balance due
  page.drawLine({
    start: { x: summaryBoxX, y: summaryBoxY + 22 },
    end: { x: summaryBoxX + summaryBoxWidth, y: summaryBoxY + 22 },
    thickness: 0.5,
    color: rgb(0.8, 0.85, 0.9),
  });

  // Balance Due row background
  page.drawRectangle({
    x: summaryBoxX,
    y: summaryBoxY,
    width: summaryBoxWidth,
    height: 22,
    color: rgb(0.96, 0.97, 0.98),
  });

  page.drawText("BALANCE DUE:", {
    x: summaryBoxX + 14,
    y: summaryBoxY + 9,
    size: 8.5,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  const balanceText = fmt(remainingDebtNum > 0 ? remainingDebtNum : netTotalNum);
  page.drawText(balanceText, {
    x: totalsValueX - fontBold.widthOfTextAtSize(balanceText, 10.5),
    y: summaryBoxY + 8,
    size: 10.5,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // =========================================================================
  // ENTERPRISE FOOTER SIGN-OFF & CERTIFICATION
  // =========================================================================
  const footerLineY = Math.max(66, summaryBoxY - 30);

  page.drawLine({
    start: { x: margin, y: footerLineY },
    end: { x: width - margin, y: footerLineY },
    thickness: 0.75,
    color: rgb(0.88, 0.91, 0.94),
  });

  page.drawText(sanitizeText(COMPANY_BRAND.copyright, "Electronically generated by Bako's Master System ERP."), {
    x: margin,
    y: footerLineY - 14,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.55, 0.6, 0.68),
  });

  page.drawText(sanitizeText("Need a custom ERP or application? Contact: bakobayan.official@gmail.com | 07705488654"), {
    x: margin,
    y: footerLineY - 26,
    size: 7,
    font: fontBold,
    color: rgb(0.45, 0.5, 0.6),
  });

  page.drawText(sanitizeText("Valid Document - Page 1 of 1"), {
    x: width - margin - 110,
    y: footerLineY - 14,
    size: 8,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.52),
  });
  const formattedTimestamp = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  page.drawText(sanitizeText(`Record Timestamp: ${formattedTimestamp}`), {
    x: width - margin - 165,
    y: footerLineY - 26,
    size: 7,
    font: fontRegular,
    color: rgb(0.6, 0.65, 0.72),
  });

  // =========================================================================
  // ATTACHMENTS MERGER
  // =========================================================================
  for (const file of base64Files || []) {
    try {
      if (!file || !file.data) continue;
      const cleanBase64 = file.data.includes(",")
        ? file.data.split(",")[1]
        : file.data;
      const fileBytes = Buffer.from(cleanBase64, "base64");
      if (!fileBytes || fileBytes.length === 0) continue;

      const fileType = (file.type || "").toLowerCase();

      if (fileType.includes("pdf")) {
        const externalDoc = await PDFDocument.load(fileBytes);
        const copiedPages = await pdfDoc.copyPages(
          externalDoc,
          externalDoc.getPageIndices()
        );
        for (const p of copiedPages) {
          pdfDoc.addPage(p);
        }
      } else if (
        fileType.includes("jpeg") ||
        fileType.includes("jpg") ||
        fileType.includes("png") ||
        fileType.includes("image")
      ) {
        let embeddedImage;
        const isPngHeader =
          fileBytes.length >= 4 &&
          fileBytes[0] === 0x89 &&
          fileBytes[1] === 0x50 &&
          fileBytes[2] === 0x4e &&
          fileBytes[3] === 0x47;

        if (isPngHeader || fileType.includes("png")) {
          try {
            embeddedImage = await pdfDoc.embedPng(fileBytes);
          } catch {
            embeddedImage = await pdfDoc.embedJpg(fileBytes);
          }
        } else {
          try {
            embeddedImage = await pdfDoc.embedJpg(fileBytes);
          } catch {
            embeddedImage = await pdfDoc.embedPng(fileBytes);
          }
        }

        const imgPage = pdfDoc.addPage([595.28, 841.89]);
        const imgPageSize = imgPage.getSize();
        const scale = Math.min(
          (imgPageSize.width - 80) / embeddedImage.width,
          (imgPageSize.height - 80) / embeddedImage.height,
          1
        );
        const drawWidth = embeddedImage.width * scale;
        const drawHeight = embeddedImage.height * scale;
        imgPage.drawImage(embeddedImage, {
          x: (imgPageSize.width - drawWidth) / 2,
          y: (imgPageSize.height - drawHeight) / 2,
          width: drawWidth,
          height: drawHeight,
        });
      }
    } catch (attachmentErr) {
      console.warn(
        `[generateMasterPDF] Skipping invalid or unsupported attachment (${file?.name || "unnamed"}):`,
        attachmentErr
      );
    }
  }

  // 3. Serialize to base64
  const pdfBytes: Uint8Array = await pdfDoc.save();
  const base64 = Buffer.from(pdfBytes).toString("base64");
  const fileName = `${invoiceId}-${Date.now()}.pdf`;

  return {
    success: true,
    base64,
    fileName,
  };
}
