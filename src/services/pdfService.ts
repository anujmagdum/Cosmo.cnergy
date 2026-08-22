import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProcurementOrder } from '../types';

/**
 * Generates a 100% native vector PDF with selectable, highlightable text,
 * corporate styling, Datlion Cnergy branding, autotable line items, and tax breakdown.
 */
export const buildOrderPDFDoc = (order: ProcurementOrder): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const isRFQ = order.type === 'RFQ';
  const docTitle = isRFQ ? 'REQUEST FOR QUOTATION (RFQ)' : 'PURCHASE ORDER (PO)';
  const companyName = import.meta.env.VITE_COMPANY_NAME || 'Cosmo Cnergy Procurement Ltd.';
  const companyAddress = import.meta.env.VITE_COMPANY_ADDRESS || 'Unit 4, Energy Tech Park, Pune Plant, Maharashtra, India';
  const companyPhone = import.meta.env.VITE_COMPANY_PHONE || '+91 98765 43210';
  const companyEmail = import.meta.env.VITE_COMPANY_EMAIL || 'procurement@cosmocnergy.com';

  const grandTotal = Number(order.total_amount) || 0;
  const subtotal = grandTotal / 1.18;
  const gstAmount = grandTotal - subtotal;

  // Primary brand colors (Emerald #059669 -> [5, 150, 105], Dark #0B192C -> [11, 25, 44])
  const emerald: [number, number, number] = [5, 150, 105];
  const darkNavy: [number, number, number] = [11, 25, 44];
  const slateText: [number, number, number] = [51, 65, 85];
  const mutedText: [number, number, number] = [100, 116, 139];
  const bgLight: [number, number, number] = [248, 250, 252];

  // 1. TOP HEADER ACCENT BAR
  doc.setFillColor(...emerald);
  doc.rect(0, 0, 210, 4, 'F');

  // 2. COMPANY LOGO / BRAND MARK & TITLE
  doc.setFillColor(...emerald);
  doc.roundedRect(14, 11, 9, 9, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('C', 17.2, 17.5);

  // Company Name
  doc.setTextColor(...darkNavy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(companyName, 26, 18);

  // Subtitle / Address
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...mutedText);
  doc.text(companyAddress, 14, 25.5);
  doc.text(`Phone: ${companyPhone}  |  Email: ${companyEmail}`, 14, 29.5);

  // Right Header: Badge & Doc Title
  doc.setFillColor(...emerald);
  doc.roundedRect(144, 10, 52, 5.5, 1.2, 1.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('DATLION CNERGY OFFICIAL', 148, 14);

  doc.setTextColor(...darkNavy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(docTitle, 196, 21.5, { align: 'right' });

  doc.setTextColor(...emerald);
  doc.setFontSize(10.5);
  doc.text(`#${order.order_number}`, 196, 26, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...mutedText);
  const issuedDate = order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  doc.text(`Issued Date: ${issuedDate}`, 196, 30, { align: 'right' });

  // Divider Line
  doc.setDrawColor(...emerald);
  doc.setLineWidth(0.5);
  doc.line(14, 34, 196, 34);

  // 3. VENDOR & ORDER METADATA BOXES
  // Left Box: Supplier Entity
  doc.setFillColor(...bgLight);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 37, 88, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...emerald);
  doc.text('SUPPLIER / VENDOR ENTITY:', 18, 42.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...darkNavy);
  doc.text(order.supplier?.name || 'Supplier Vendor Entity', 18, 47.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slateText);
  doc.text(`Attn: ${order.supplier?.contact_person || '-'}`, 18, 52);
  doc.text(`Email: ${order.supplier?.email || '-'}`, 18, 56);
  doc.text(`Phone: ${order.supplier?.phone || '-'}`, 18, 60);
  if (order.supplier?.address) {
    doc.text(`Address: ${order.supplier.address.substring(0, 48)}`, 18, 64);
  }

  // Right Box: Order Parameters
  doc.setFillColor(...bgLight);
  doc.roundedRect(108, 37, 88, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...emerald);
  doc.text('ORDER PARAMETERS & ROUTING:', 112, 42.5);

  // Status Badge
  doc.setFillColor(209, 250, 229);
  doc.roundedRect(112, 45, 38, 5, 1, 1, 'F');
  doc.setTextColor(6, 95, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(`STATUS: ${order.status.replace(/_/g, ' ')}`, 114, 48.7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slateText);
  doc.text(`Procurement Officer: ${order.created_by || 'ANUJ (PROCUREMENT HEAD)'}`, 112, 55);
  doc.text('Plant Location: Pune Battery Plant, Maharashtra', 112, 59.5);
  doc.text(`Order Type: ${order.type === 'RFQ' ? 'Request for Quotation' : 'Purchase Order'}`, 112, 64);

  // 4. AUTOTABLE FOR LINE ITEMS
  const tableHead = [['#', 'Item Particulars', 'Technical Specifications', 'Qty', 'Unit Rate (INR)', 'Total Amount']];
  const tableBody = (order.items || []).map((item, idx) => [
    (idx + 1).toString(),
    `${item.item?.name || 'Catalog Item'}\nSKU: ${item.item?.sku || '-'}`,
    item.item?.specs || '-',
    `${item.quantity} ${item.item?.uom || 'Pcs'}`,
    `₹${Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    `₹${Number(item.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  ]);

  autoTable(doc, {
    startY: 71,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: emerald,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2.5
    },
    bodyStyles: {
      textColor: darkNavy,
      fontSize: 7.5,
      cellPadding: 2.5
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 52 },
      2: { cellWidth: 55 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 25 },
      5: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14 }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 115;

  // 5. FINANCIAL TOTALS & TERMS
  // Left Box: Terms & Notes
  doc.setFillColor(...bgLight);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, finalY + 5, 105, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...darkNavy);
  doc.text('TERMS & SPECIAL INSTRUCTIONS:', 18, finalY + 10);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...slateText);
  const termsText = order.notes || '1. Confirm dispatch schedule within 24h.\n2. Inspection upon delivery at Pune Plant.\n3. Tax Invoice required with physical shipment.';
  const splitTerms = doc.splitTextToSize(termsText, 97);
  doc.text(splitTerms, 18, finalY + 14.5);

  // Right Box: Subtotal, GST, Grand Total
  doc.setFillColor(...bgLight);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(125, finalY + 5, 71, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...slateText);
  doc.text('Subtotal (Excl. GST):', 129, finalY + 10.5);
  doc.text(`₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 192, finalY + 10.5, { align: 'right' });

  doc.text('Estimated GST (18%):', 129, finalY + 15.5);
  doc.text(`₹${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 192, finalY + 15.5, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(129, finalY + 19, 192, finalY + 19);
  doc.setLineDashPattern([], 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...darkNavy);
  doc.text('Grand Total:', 129, finalY + 25.5);
  doc.setTextColor(...emerald);
  doc.setFontSize(10.5);
  doc.text(`₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 192, finalY + 25.5, { align: 'right' });

  // 6. BRAND FOOTER
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, pageHeight - 14, 196, pageHeight - 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...darkNavy);
  doc.text('Cosmo Cnergy Smart 1-Tap Procurement OS', 105, pageHeight - 10, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...mutedText);
  doc.text('Powered by Datlion Cnergy Enterprise System. Official vector document with crisp selectable text.', 105, pageHeight - 6.5, { align: 'center' });

  return doc;
};

/**
 * Triggers direct browser download of the crisp vector PDF
 */
export const generateOrderPDF = async (order: ProcurementOrder): Promise<void> => {
  const doc = buildOrderPDFDoc(order);
  const safeSupplierName = (order.supplier?.name || 'Vendor').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${order.order_number}_${safeSupplierName}.pdf`;
  doc.save(filename);
};

/**
 * Generates an in-memory Blob URL for live vector preview
 */
export const generateOrderPDFBlobUri = (order: ProcurementOrder): string => {
  const doc = buildOrderPDFDoc(order);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
};
