import { jsPDF } from 'jspdf';
import { Invoice, StoreSettings } from '../types/app';
import {
  formatFcfa,
  getDeliveryLabel,
  getInvoiceStatusLabel,
  getPaymentLabel,
  getPoleLabel,
} from './formatters';

function sanitizePdfText(value: string): string {
  return String(value ?? '')
    .replace(/[\u202F\u00A0]/g, ' ')
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '-');
}

function formatPdfFcfa(amount: number, currency: string): string {
  return sanitizePdfText(formatFcfa(amount, currency));
}

export function downloadInvoiceAsPdf(
  invoice: Invoice,
  settings: StoreSettings
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const rightEdge = pageWidth - margin;

  const docTitle =
    invoice.docType === 'facture' ? 'FACTURE' : 'DEVIS ESTIMATIF';
  const companyHeader = sanitizePdfText(
    `${settings.poster.brandAcronym} - ${settings.poster.companyName}`
  );
  const phonesText = sanitizePdfText(
    `Tel : ${settings.poster.phones.filter(Boolean).join(' / ') || settings.whatsappPhone}`
  );

  const drawTopBanner = (isContinuation = false) => {
    const bannerH = isContinuation ? 18 : 35;
    doc.setFillColor(15, 35, 66);
    doc.rect(0, 0, pageWidth, bannerH, 'F');

    doc.setFillColor(217, 83, 30);
    doc.rect(0, bannerH, pageWidth, 1.4, 'F');

    if (isContinuation) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(companyHeader, margin, 11.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(245, 158, 11);
      doc.text(
        sanitizePdfText(`${docTitle} ${invoice.code} (suite)`),
        rightEdge,
        11.5,
        { align: 'right' }
      );
      return;
    }

    // Main page 1 header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text(companyHeader, margin, 12.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(253, 224, 71);
    doc.text(sanitizePdfText(settings.poster.tagline), margin, 18.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(203, 213, 225);
    doc.text(phonesText, margin, 24.5);

    if (settings.poster.location) {
      const locLines = doc.splitTextToSize(
        sanitizePdfText(settings.poster.location),
        106
      ) as string[];
      doc.text(locLines[0] ?? '', margin, 29.5);
    }

    // Right side document type & code
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(245, 158, 11);
    doc.text(docTitle, rightEdge, 12.5, { align: 'right' });

    doc.setFont('courier', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(255, 255, 255);
    doc.text(sanitizePdfText(invoice.code), rightEdge, 19.5, {
      align: 'right',
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    doc.text(
      sanitizePdfText(`Statut : ${getInvoiceStatusLabel(invoice.status)}`),
      rightEdge,
      25.5,
      { align: 'right' }
    );
  };

  const drawTableHeader = (startY: number): number => {
    const h = 8.5;
    doc.setFillColor(15, 35, 66);
    doc.rect(margin, startY, contentWidth, h, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(255, 255, 255);
    doc.text('DESIGNATION', margin + 3, startY + 5.7);
    doc.text('POLE', margin + 84, startY + 5.7);
    doc.text('QTE', margin + 123, startY + 5.7, { align: 'right' });
    doc.text('P.U.', margin + 151, startY + 5.7, { align: 'right' });
    doc.text('TOTAL', rightEdge - 3, startY + 5.7, { align: 'right' });

    return startY + h;
  };

  drawTopBanner(false);

  // Client & Logistics metadata cards
  let y = 42;
  const colGap = 6;
  const colW = (contentWidth - colGap) / 2;

  const clientAddressLines = invoice.customerAddress
    ? (doc.splitTextToSize(
        sanitizePdfText(`Adresse : ${invoice.customerAddress}`),
        colW - 8
      ) as string[])
    : [];

  const staffParts: string[] = [];
  if (invoice.assignedLoaderName) {
    staffParts.push(`Chargeur : ${invoice.assignedLoaderName}`);
  }
  if (invoice.assignedDriverName) {
    staffParts.push(`Chauffeur : ${invoice.assignedDriverName}`);
  }
  const staffLine = staffParts.join(' | ');

  const emissionDate = sanitizePdfText(
    new Date(invoice.createdAt).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  );

  const clientCardH = Math.max(
    30,
    22 + clientAddressLines.slice(0, 3).length * 4.2
  );
  const metaCardH = Math.max(30, staffLine ? 31 : 27);
  const cardsH = Math.max(clientCardH, metaCardH);

  // Left card: Client
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, y, colW, cardsH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CLIENT & RECEPTION', margin + 4, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    sanitizePdfText(invoice.customerName || 'Client comptoir').slice(0, 40),
    margin + 4,
    y + 12.2
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    sanitizePdfText(`Tel : ${invoice.customerPhone || 'Non precise'}`),
    margin + 4,
    y + 17.5
  );

  clientAddressLines.slice(0, 3).forEach((line, idx) => {
    doc.text(line, margin + 4, y + 22.3 + idx * 4.2);
  });

  // Right card: Emission & Logistics
  const rightCardX = margin + colW + colGap;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightCardX, y, colW, cardsH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('EMISSION & LOGISTIQUE', rightCardX + 4, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.2);
  doc.setTextColor(15, 23, 42);
  doc.text(`Le ${emissionDate}`, rightCardX + 4, y + 12.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    sanitizePdfText(`Emis par : ${invoice.createdByName}`).slice(0, 44),
    rightCardX + 4,
    y + 17.3
  );
  doc.text(
    sanitizePdfText(`Mode : ${getDeliveryLabel(invoice.deliveryMode)}`).slice(
      0,
      46
    ),
    rightCardX + 4,
    y + 21.8
  );
  doc.text(
    sanitizePdfText(`Reglement : ${getPaymentLabel(invoice.paymentMethod)}`).slice(
      0,
      46
    ),
    rightCardX + 4,
    y + 26.3
  );

  if (staffLine) {
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text(sanitizePdfText(staffLine).slice(0, 50), rightCardX + 4, y + 30.8);
  }

  y += cardsH + 7;
  y = drawTableHeader(y);

  // Item rows with automatic pagination
  const maxContentY = 266;
  invoice.items.forEach((item, idx) => {
    const nameLines = doc.splitTextToSize(
      sanitizePdfText(item.name),
      78
    ) as string[];
    const subInfo = sanitizePdfText(
      `${item.unitLabel}${item.isWholesale ? ' - Tarif gros' : ''}`
    );
    const rowH = Math.max(11, nameLines.length * 4.2 + 6.5);

    if (y + rowH > maxContentY) {
      doc.addPage();
      drawTopBanner(true);
      y = 24;
      y = drawTableHeader(y);
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, rowH, 'F');
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.line(margin, y + rowH, rightEdge, y + rowH);

    // Article name + unit
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(15, 23, 42);
    nameLines.forEach((line, lineIdx) => {
      doc.text(line, margin + 3, y + 4.8 + lineIdx * 4.2);
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(100, 116, 139);
    doc.text(subInfo, margin + 3, y + 4.8 + nameLines.length * 4.2);

    // Pole
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    if (item.pole === 'boissons') {
      doc.setTextColor(3, 105, 161);
    } else {
      doc.setTextColor(217, 83, 30);
    }
    doc.text(
      sanitizePdfText(getPoleLabel(item.pole)).toUpperCase(),
      margin + 84,
      y + 5.5
    );

    // Quantity, Unit Price, Line Total
    doc.setFont('courier', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(15, 23, 42);
    doc.text(String(item.quantity), margin + 123, y + 5.5, { align: 'right' });
    doc.text(
      formatPdfFcfa(item.appliedUnitPrice, settings.currencyLabel),
      margin + 151,
      y + 5.5,
      { align: 'right' }
    );

    doc.setFont('courier', 'bold');
    doc.text(
      formatPdfFcfa(item.lineTotal, settings.currencyLabel),
      rightEdge - 3,
      y + 5.5,
      { align: 'right' }
    );

    y += rowH;
  });

  // Ensure enough room for Totals + Notes block
  y += 7;
  const summaryBoxH = invoice.discountFcfa > 0 ? 48 : 42;
  if (y + summaryBoxH + 16 > pageHeight - 22) {
    doc.addPage();
    drawTopBanner(true);
    y = 26;
  }

  // Left side: Notes + Signature area
  const leftNoteW = 84;
  if (invoice.notes && invoice.notes.trim()) {
    const noteLines = doc.splitTextToSize(
      sanitizePdfText(invoice.notes.trim()),
      leftNoteW - 8
    ) as string[];
    const noteBoxH = Math.max(20, 10 + noteLines.slice(0, 5).length * 4);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, leftNoteW, noteBoxH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('OBSERVATIONS', margin + 4, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(51, 65, 85);
    noteLines.slice(0, 5).forEach((line, idx) => {
      doc.text(line, margin + 4, y + 10.2 + idx * 4);
    });
  } else {
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, leftNoteW, 28, 2, 2, 'D');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('CACHET & VISA CLIENT / CAISSE', margin + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(
      'Bon pour accord et reception conforme.',
      margin + 4,
      y + 23.5
    );
  }

  // Right side: Totals summary card
  const sumW = 92;
  const sumX = rightEdge - sumW;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(sumX, y, sumW, summaryBoxH, 2, 2, 'FD');

  let sy = y + 7;
  const drawSummaryRow = (
    label: string,
    val: string,
    color: [number, number, number]
  ) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.4);
    doc.setTextColor(71, 85, 105);
    doc.text(label, sumX + 4, sy);

    doc.setFont('courier', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(val, sumX + sumW - 4, sy, { align: 'right' });
    sy += 6.2;
  };

  drawSummaryRow(
    'Sous-total Ciment & Quinc.',
    formatPdfFcfa(invoice.cimentQuincaillerieSubtotal, settings.currencyLabel),
    [217, 83, 30]
  );
  drawSummaryRow(
    'Sous-total Boissons',
    formatPdfFcfa(invoice.boissonsSubtotal, settings.currencyLabel),
    [3, 105, 161]
  );
  if (invoice.discountFcfa > 0) {
    drawSummaryRow(
      'Remise accordee',
      `-${formatPdfFcfa(invoice.discountFcfa, settings.currencyLabel)}`,
      [4, 120, 87]
    );
  }
  drawSummaryRow(
    'Livraison',
    invoice.deliveryFeeFcfa === 0
      ? 'Offerte / Retrait'
      : formatPdfFcfa(invoice.deliveryFeeFcfa, settings.currencyLabel),
    [51, 65, 85]
  );

  // Total TTC highlight bar
  const totalBarY = y + summaryBoxH - 12;
  doc.setFillColor(15, 35, 66);
  doc.roundedRect(sumX, totalBarY, sumW, 12, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.2);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL GENERAL TTC', sumX + 4, totalBarY + 7.6);

  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(253, 224, 71);
  doc.text(
    formatPdfFcfa(invoice.totalFcfa, settings.currencyLabel),
    sumX + sumW - 4,
    totalBarY + 7.8,
    { align: 'right' }
  );

  // Footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 17, rightEdge, pageHeight - 17);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(100, 116, 139);
    doc.text(
      sanitizePdfText(settings.poster.location).slice(0, 95),
      margin,
      pageHeight - 12.2
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(15, 35, 66);
    doc.text(
      sanitizePdfText(settings.poster.closingSlogan),
      margin,
      pageHeight - 7.5
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${pageNum} / ${totalPages}`, rightEdge, pageHeight - 9.5, {
      align: 'right',
    });
  }

  doc.save(`${sanitizePdfText(invoice.code)}-${invoice.docType}.pdf`);
}

export async function downloadInvoiceAsPng(
  invoice: Invoice,
  settings: StoreSettings
): Promise<void> {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const w = 1240;
  const rowH = 52;
  const h = Math.max(1150, 620 + invoice.items.length * rowH + 220);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // White paper backdrop
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  // Header band
  ctx.fillStyle = '#0F2342';
  ctx.fillRect(0, 0, w, 170);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 34px "Bricolage Grotesque", sans-serif';
  ctx.fillText(
    `${settings.poster.brandAcronym} — ${settings.poster.companyName}`,
    56,
    70
  );

  ctx.fillStyle = '#FDE047';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(settings.poster.tagline, 56, 102);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '500 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `Tél : ${settings.poster.phones[0]} / ${settings.poster.phones[1]}`,
    56,
    134
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = '#F59E0B';
  ctx.font = '800 30px "Bricolage Grotesque", sans-serif';
  ctx.fillText(
    invoice.docType === 'facture' ? 'FACTURE' : 'DEVIS ESTIMATIF',
    w - 56,
    68
  );

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 22px "JetBrains Mono", monospace';
  ctx.fillText(invoice.code, w - 56, 104);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '500 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `Statut : ${getInvoiceStatusLabel(invoice.status)}`,
    w - 56,
    134
  );
  ctx.textAlign = 'left';

  // Client & Logistics block
  let y = 215;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(56, y, w - 112, 130);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.strokeRect(56, y, w - 112, 130);

  ctx.fillStyle = '#64748B';
  ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('CLIENT & RÉCEPTION', 80, y + 32);

  ctx.fillStyle = '#0F172A';
  ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(invoice.customerName, 80, y + 64);

  ctx.fillStyle = '#334155';
  ctx.font = '500 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `Tél : ${invoice.customerPhone || 'Non précisé'} · ${getDeliveryLabel(invoice.deliveryMode)}`,
    80,
    y + 92
  );
  if (invoice.customerAddress) {
    ctx.fillText(invoice.customerAddress.slice(0, 72), 80, y + 114);
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748B';
  ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ÉMIS LE & RÈGLEMENT', w - 80, y + 32);

  ctx.fillStyle = '#0F172A';
  ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    new Date(invoice.createdAt).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
    w - 80,
    y + 64
  );

  ctx.fillStyle = '#334155';
  ctx.font = '500 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(getPaymentLabel(invoice.paymentMethod), w - 80, y + 92);
  ctx.textAlign = 'left';

  // Items Table Header
  y = 385;
  ctx.fillStyle = '#0F2342';
  ctx.fillRect(56, y, w - 112, 46);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('DÉSIGNATION', 74, y + 29);
  ctx.fillText('PÔLE', 540, y + 29);
  ctx.textAlign = 'right';
  ctx.fillText('QTÉ', 740, y + 29);
  ctx.fillText('P.U.', 940, y + 29);
  ctx.fillText('TOTAL', w - 74, y + 29);
  ctx.textAlign = 'left';

  y += 46;
  invoice.items.forEach((item, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    ctx.fillRect(56, y, w - 112, rowH);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(56, y + rowH);
    ctx.lineTo(w - 56, y + rowH);
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(item.name.slice(0, 42), 74, y + 32);

    ctx.fillStyle = item.pole === 'boissons' ? '#0369A1' : '#D9531E';
    ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(getPoleLabel(item.pole).toUpperCase(), 540, y + 32);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0F172A';
    ctx.font = '600 15px "JetBrains Mono", monospace';
    ctx.fillText(String(item.quantity), 740, y + 32);
    ctx.fillText(
      formatFcfa(item.appliedUnitPrice, settings.currencyLabel),
      940,
      y + 32
    );
    ctx.font = '700 15px "JetBrains Mono", monospace';
    ctx.fillText(
      formatFcfa(item.lineTotal, settings.currencyLabel),
      w - 74,
      y + 32
    );
    ctx.textAlign = 'left';
    y += rowH;
  });

  // Separated Subtotals + Grand Total
  y += 32;
  const boxX = w - 56 - 480;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(boxX, y, 480, 195);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(boxX, y, 480, 195);

  const drawSumRow = (label: string, val: string, ry: number, bold = false, color = '#0F172A') => {
    ctx.fillStyle = '#475569';
    ctx.font = `${bold ? '700' : '500'} 15px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(label, boxX + 22, ry);
    ctx.textAlign = 'right';
    ctx.fillStyle = color;
    ctx.font = `${bold ? '800 20px' : '600 15px'} "JetBrains Mono", monospace`;
    ctx.fillText(val, boxX + 458, ry);
    ctx.textAlign = 'left';
  };

  drawSumRow(
    'Sous-total Ciment & Quincaillerie',
    formatFcfa(invoice.cimentQuincaillerieSubtotal, settings.currencyLabel),
    y + 36,
    false,
    '#D9531E'
  );
  drawSumRow(
    'Sous-total Boissons',
    formatFcfa(invoice.boissonsSubtotal, settings.currencyLabel),
    y + 68,
    false,
    '#0369A1'
  );
  drawSumRow(
    'Remise accordée',
    `-${formatFcfa(invoice.discountFcfa, settings.currencyLabel)}`,
    y + 100
  );
  drawSumRow(
    'Livraison',
    invoice.deliveryFeeFcfa === 0
      ? 'Offerte / Retrait'
      : formatFcfa(invoice.deliveryFeeFcfa, settings.currencyLabel),
    y + 132
  );

  ctx.strokeStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.moveTo(boxX + 20, y + 148);
  ctx.lineTo(boxX + 460, y + 148);
  ctx.stroke();

  drawSumRow(
    'TOTAL GÉNÉRAL TTC',
    formatFcfa(invoice.totalFcfa, settings.currencyLabel),
    y + 178,
    true,
    '#0F2342'
  );

  // Footer slogan & address
  ctx.fillStyle = '#64748B';
  ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(settings.poster.location.slice(0, 110), 56, h - 56);
  ctx.fillStyle = '#0F2342';
  ctx.font = '700 15px "Bricolage Grotesque", sans-serif';
  ctx.fillText(settings.poster.closingSlogan, 56, h - 30);

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `${invoice.code}-${invoice.docType}.png`;
  link.href = dataUrl;
  link.click();
}

export function downloadInvoiceAsCsv(
  invoice: Invoice,
  settings: StoreSettings
): void {
  const rows = [
    ['Document', invoice.docType.toUpperCase(), invoice.code],
    ['Client', invoice.customerName, invoice.customerPhone],
    ['Statut', getInvoiceStatusLabel(invoice.status), ''],
    ['', '', ''],
    ['Article', 'Pôle', 'Unité', 'Quantité', 'Prix Unitaire', 'Total Ligne'],
    ...invoice.items.map((item) => [
      item.name,
      getPoleLabel(item.pole),
      item.unitLabel,
      String(item.quantity),
      String(item.appliedUnitPrice),
      String(item.lineTotal),
    ]),
    ['', '', '', '', '', ''],
    [
      'Sous-total Ciment & Quincaillerie',
      String(invoice.cimentQuincaillerieSubtotal),
      settings.currencyLabel,
    ],
    [
      'Sous-total Boissons',
      String(invoice.boissonsSubtotal),
      settings.currencyLabel,
    ],
    ['Remise', String(invoice.discountFcfa), settings.currencyLabel],
    ['Livraison', String(invoice.deliveryFeeFcfa), settings.currencyLabel],
    ['Total TTC', String(invoice.totalFcfa), settings.currencyLabel],
  ];

  const csv = rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${invoice.code}-${invoice.docType}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
