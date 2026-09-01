import React, { useRef, useState } from 'react';
import { Download, Upload, FileSpreadsheet, Check, AlertCircle, FileDown, Info } from 'lucide-react';

export type CsvSectionType = 'components' | 'orders' | 'companies';

interface Props {
  sectionType: CsvSectionType;
  data: any[];
  onImport: (rows: any[]) => Promise<number | void> | number | void;
}

interface SchemaHeaderConfig {
  title: string;
  filenamePrefix: string;
  requiredHeaders: { key: string; label: string; example: string }[];
  optionalHeaders: { key: string; label: string; example: string }[];
  sampleRows: Record<string, string>[];
}

const SECTION_SCHEMAS: Record<CsvSectionType, SchemaHeaderConfig> = {
  components: {
    title: 'Inventory & Components CSV Schema',
    filenamePrefix: 'Inventory_Components',
    requiredHeaders: [
      { key: 'name', label: 'Component Name', example: '3.2V 100Ah LFP Grade A Cell' }
    ],
    optionalHeaders: [
      { key: 'category', label: 'Category', example: 'Battery Cells' },
      { key: 'sku', label: 'SKU / Part Code', example: 'LFP-100AH-32V' },
      { key: 'preset_price', label: 'Unit Price (INR)', example: '2850' },
      { key: 'in_stock_qty', label: 'Stock Qty', example: '640' },
      { key: 'min_order_qty', label: 'MOQ', example: '50' },
      { key: 'uom', label: 'UOM', example: 'Pcs' },
      { key: 'company_name', label: 'Company / Supplier', example: 'CellTech Energy Systems' },
      { key: 'specs', label: 'Specifications', example: '3.2V 100Ah LFP Grade A, 6000 Cycles, M6 Terminals' },
      { key: 'procurement_status', label: 'Procurement Status', example: 'TO_BE_ORDERED' },
      { key: 'image_drive_url', label: 'Image Drive URL', example: 'https://drive.google.com/file/d/sample-view/view?usp=sharing' }
    ],
    sampleRows: [
      {
        name: '3.2V 100Ah LFP Grade A Cell',
        category: 'Battery Cells',
        sku: 'LFP-100AH-32V',
        preset_price: '2850',
        in_stock_qty: '640',
        min_order_qty: '50',
        uom: 'Pcs',
        company_name: 'CellTech Energy Systems',
        specs: '3.2V 100Ah LFP Grade A, 6000 Cycles, M6 Terminals',
        procurement_status: 'TO_BE_ORDERED',
        image_drive_url: ''
      },
      {
        name: '16S 100A Smart LiFePO4 BMS (CAN/RS485)',
        category: 'Electronics / BMS',
        sku: 'BMS-16S-100A-SMART',
        preset_price: '4200',
        in_stock_qty: '80',
        min_order_qty: '10',
        uom: 'Units',
        company_name: 'SmartBMS Controls India',
        specs: '16S 100A continuous, CANBUS 2.0B, RS485 isolated port, active balancer',
        procurement_status: 'ORDERED',
        image_drive_url: ''
      },
      {
        name: '48V 100Ah CRCA Steel Battery Enclosure (IP65)',
        category: 'Metal Enclosures',
        sku: 'ENC-48V100AH-IP65',
        preset_price: '3800',
        in_stock_qty: '35',
        min_order_qty: '5',
        uom: 'Sets',
        company_name: 'Custom Enclosures Pune',
        specs: 'Powder-coated CRCA steel, IP65 silicone gasket, wall-mount brackets',
        procurement_status: 'RFQ_SENT',
        image_drive_url: ''
      }
    ]
  },
  companies: {
    title: 'Companies & Suppliers CSV Schema',
    filenamePrefix: 'Companies_Suppliers',
    requiredHeaders: [
      { key: 'name', label: 'Company Name', example: 'CellTech Energy Systems' }
    ],
    optionalHeaders: [
      { key: 'contact_person', label: 'Contact Person', example: 'Rajesh Sharma' },
      { key: 'email', label: 'Email Address', example: 'sales@celltechenergy.com' },
      { key: 'phone', label: 'Phone Number', example: '+91 98765 43210' },
      { key: 'whatsapp', label: 'WhatsApp', example: '+91 98765 43210' },
      { key: 'category', label: 'Category / Domain', example: 'Battery Cell Manufacturer' },
      { key: 'gstin', label: 'GSTIN', example: '27AAACB2134Q1Z8' },
      { key: 'payment_terms', label: 'Payment Terms', example: 'Net 30 Days' },
      { key: 'address', label: 'Address / Plant Location', example: 'Plot 45, MIDC Bhosari, Pune, Maharashtra - 411026' },
      { key: 'buying_url', label: 'Buying Portal / Web URL', example: 'https://celltechenergy.com' },
      { key: 'rating', label: 'Rating (1-5)', example: '4.8' }
    ],
    sampleRows: [
      {
        name: 'CellTech Energy Systems',
        contact_person: 'Rajesh Sharma',
        email: 'sales@celltechenergy.com',
        phone: '+91 98765 43210',
        whatsapp: '+91 98765 43210',
        category: 'Battery Cell Manufacturer',
        gstin: '27AAACB2134Q1Z8',
        payment_terms: 'Net 30 Days',
        address: 'Plot 45, MIDC Bhosari, Pune, Maharashtra - 411026',
        buying_url: 'https://celltechenergy.com',
        rating: '4.9'
      },
      {
        name: 'SmartBMS Controls India',
        contact_person: 'Pooja Hegde',
        email: 'contact@smartbmscontrols.in',
        phone: '+91 98220 11223',
        whatsapp: '+91 98220 11223',
        category: 'BMS & Electronics',
        gstin: '27AABCS9876R1ZV',
        payment_terms: '50% Advance, 50% on Dispatch',
        address: 'Electronic City, Bengaluru, Karnataka - 560100',
        buying_url: 'https://smartbmscontrols.in',
        rating: '4.7'
      }
    ]
  },
  orders: {
    title: 'Procurement Orders CSV Schema',
    filenamePrefix: 'Procurement_Orders',
    requiredHeaders: [
      { key: 'company_name', label: 'Company / Supplier Name', example: 'CellTech Energy Systems' }
    ],
    optionalHeaders: [
      { key: 'order_number', label: 'Order Number', example: 'PO-2026-0801' },
      { key: 'type', label: 'Type (PO/RFQ)', example: 'PO' },
      { key: 'status', label: 'Status', example: 'ORDERED' },
      { key: 'total_amount', label: 'Total Amount (INR)', example: '1824000' },
      { key: 'notes', label: 'Notes / Items Detail', example: '640 Units 3.2V 100Ah LFP Cells' },
      { key: 'created_by', label: 'Created By', example: 'Anuj Magdum' },
      { key: 'created_at', label: 'Order Date', example: '2026-08-31' }
    ],
    sampleRows: [
      {
        order_number: 'PO-2026-0801',
        company_name: 'CellTech Energy Systems',
        type: 'PO',
        status: 'ORDERED',
        total_amount: '1824000',
        notes: '640 Units of 3.2V 100Ah LFP Grade A Cells for Batch Production',
        created_by: 'Anuj Magdum',
        created_at: new Date().toISOString().slice(0, 10)
      },
      {
        order_number: 'RFQ-2026-0802',
        company_name: 'SmartBMS Controls India',
        type: 'RFQ',
        status: 'RFQ_SENT',
        total_amount: '336000',
        notes: 'Commercial quotation request for 80 units 16S 100A Smart BMS',
        created_by: 'Anuj Magdum',
        created_at: new Date().toISOString().slice(0, 10)
      }
    ]
  }
};

export const CsvManagerWidget: React.FC<Props> = ({ sectionType, data, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSchemaGuide, setShowSchemaGuide] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const schema = SECTION_SCHEMAS[sectionType] || SECTION_SCHEMAS.components;
  const allHeaders = [...schema.requiredHeaders, ...schema.optionalHeaders];

  // Helper to escape values for CSV
  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  // Robust RFC-4180 CSV line parser
  const parseCsvLines = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          cell += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(cell.trim());
        cell = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        row.push(cell.trim());
        if (row.some(c => c.length > 0)) {
          lines.push(row);
        }
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }

    if (cell.length > 0 || row.length > 0) {
      row.push(cell.trim());
      if (row.some(c => c.length > 0)) {
        lines.push(row);
      }
    }

    return lines;
  };

  // 1. Download Pre-filled Sample CSV Template
  const handleDownloadTemplate = () => {
    try {
      const headers = allHeaders.map(h => escapeCsv(h.label));
      const rows = schema.sampleRows.map(rowObj => {
        return allHeaders.map(h => escapeCsv(rowObj[h.key] || ''));
      });

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
      const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `Sample_Template_${schema.filenamePrefix}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusFeedback({ type: 'success', message: `Sample template downloaded for ${sectionType}!` });
      setTimeout(() => setStatusFeedback(null), 3500);
    } catch (err: any) {
      console.error('Download Template Error:', err);
      setStatusFeedback({ type: 'error', message: 'Failed to download sample template.' });
      setTimeout(() => setStatusFeedback(null), 4000);
    }
  };

  // 2. Download Live Section CSV
  const handleDownloadCsv = () => {
    try {
      if (!data || data.length === 0) {
        handleDownloadTemplate();
        return;
      }

      let headers: string[] = [];
      let rows: string[][] = [];

      if (sectionType === 'components') {
        headers = allHeaders.map(h => escapeCsv(h.label));
        rows = data.map(item => [
          escapeCsv(item.name || ''),
          escapeCsv(item.category || 'Battery Cells'),
          escapeCsv(item.sku || ''),
          escapeCsv(item.preset_price ?? 0),
          escapeCsv(item.in_stock_qty ?? 0),
          escapeCsv(item.min_order_qty ?? 1),
          escapeCsv(item.uom || 'Pcs'),
          escapeCsv(item.company?.name || item.company_name || ''),
          escapeCsv(item.specs || ''),
          escapeCsv(item.procurement_status || 'TO_BE_ORDERED'),
          escapeCsv(item.image_drive_url || '')
        ]);
      } else if (sectionType === 'companies') {
        headers = allHeaders.map(h => escapeCsv(h.label));
        rows = data.map(item => [
          escapeCsv(item.name || ''),
          escapeCsv(item.contact_person || ''),
          escapeCsv(item.email || ''),
          escapeCsv(item.phone || ''),
          escapeCsv(item.whatsapp || item.phone || ''),
          escapeCsv(item.category || 'General Company'),
          escapeCsv(item.gstin || ''),
          escapeCsv(item.payment_terms || 'Net 30 Days'),
          escapeCsv(item.address || ''),
          escapeCsv(item.buying_url || ''),
          escapeCsv(item.rating || 4.8)
        ]);
      } else if (sectionType === 'orders') {
        headers = allHeaders.map(h => escapeCsv(h.label));
        rows = data.map(item => [
          escapeCsv(item.company?.name || item.company_name || ''),
          escapeCsv(item.order_number || ''),
          escapeCsv(item.type || 'PO'),
          escapeCsv(item.status || 'ORDERED'),
          escapeCsv(item.total_amount ?? 0),
          escapeCsv(item.notes || ''),
          escapeCsv(item.created_by || ''),
          escapeCsv(item.created_at ? new Date(item.created_at).toISOString().slice(0, 10) : '')
        ]);
      }

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
      const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      link.href = url;
      link.download = `Export_${schema.filenamePrefix}_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusFeedback({ type: 'success', message: `Exported ${rows.length} ${sectionType} rows successfully.` });
      setTimeout(() => setStatusFeedback(null), 3500);
    } catch (err: any) {
      console.error('CSV Export Error:', err);
      setStatusFeedback({ type: 'error', message: 'Failed to export CSV: ' + (err.message || err) });
      setTimeout(() => setStatusFeedback(null), 4000);
    }
  };

  // 3. Smart CSV Upload & Normalization
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusFeedback(null);

    try {
      const text = await file.text();
      const rawRows = parseCsvLines(text);

      if (rawRows.length < 2) {
        throw new Error('CSV file is empty or missing data rows.');
      }

      const headerRow = rawRows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const dataRows = rawRows.slice(1);

      const parsedObjects = dataRows.map((row, rowIdx) => {
        const obj: Record<string, any> = {};

        headerRow.forEach((normKey, colIdx) => {
          let val = row[colIdx] !== undefined ? row[colIdx] : '';
          val = val.replace(/^["']|["']$/g, '').trim();

          if (normKey.includes('componentname') || normKey === 'itemname' || normKey === 'partname' || (normKey.includes('name') && !normKey.includes('company') && !normKey.includes('person') && sectionType === 'components')) {
            obj.name = val;
          } else if (normKey.includes('companyname') || normKey === 'supplier' || normKey === 'vendor' || (normKey.includes('company') && sectionType !== 'companies') || (normKey === 'name' && sectionType === 'companies')) {
            if (sectionType === 'companies') obj.name = val;
            else obj.company_name = val;
          } else if (normKey.includes('contactperson') || normKey === 'contact' || normKey === 'representative') {
            obj.contact_person = val;
          } else if (normKey.includes('email') || normKey === 'mail') {
            obj.email = val;
          } else if (normKey.includes('whatsapp') || normKey === 'wa') {
            obj.whatsapp = val;
          } else if (normKey.includes('phone') || normKey.includes('mobile') || normKey === 'tel') {
            obj.phone = val;
          } else if (normKey.includes('category') || normKey === 'domain') {
            obj.category = val;
          } else if (normKey.includes('sku') || normKey.includes('partnumber') || normKey === 'partcode' || normKey === 'mpn') {
            obj.sku = val;
          } else if (normKey.includes('price') || normKey.includes('rate') || normKey === 'cost') {
            obj.preset_price = Number(val.replace(/[^0-9.-]+/g, '')) || 0;
          } else if (normKey.includes('stock') || normKey === 'inventory') {
            obj.in_stock_qty = Number(val.replace(/[^0-9.-]+/g, '')) || 0;
          } else if (normKey.includes('moq') || normKey.includes('minorder') || normKey.includes('minimumorder')) {
            obj.min_order_qty = Number(val.replace(/[^0-9.-]+/g, '')) || 1;
          } else if (normKey.includes('uom') || normKey === 'unit') {
            obj.uom = val || 'Pcs';
          } else if (normKey.includes('spec') || normKey.includes('technical') || normKey === 'description') {
            obj.specs = val;
          } else if (normKey.includes('gstin') || normKey.includes('gst')) {
            obj.gstin = val;
          } else if (normKey.includes('payment') || normKey.includes('term') || normKey === 'credit') {
            obj.payment_terms = val;
          } else if (normKey.includes('address') || normKey.includes('location') || normKey === 'plant') {
            obj.address = val;
          } else if (normKey.includes('url') || normKey.includes('website') || normKey.includes('portal') || normKey === 'link') {
            if (sectionType === 'components') obj.image_drive_url = val;
            else obj.buying_url = val;
          } else if (normKey.includes('rating') || normKey.includes('score')) {
            obj.rating = Number(val) || 4.8;
          } else if (normKey.includes('ordernumber') || normKey.includes('orderno') || normKey === 'ponumber' || normKey === 'rfqnumber') {
            obj.order_number = val;
          } else if (normKey.includes('type') || normKey === 'doctype') {
            obj.type = val.toUpperCase().includes('RFQ') ? 'RFQ' : 'PO';
          } else if (normKey.includes('status')) {
            obj.status = val;
            obj.procurement_status = val;
          } else if (normKey.includes('amount') || normKey.includes('total')) {
            obj.total_amount = Number(val.replace(/[^0-9.-]+/g, '')) || 0;
          } else if (normKey.includes('createdby') || normKey === 'buyer') {
            obj.created_by = val;
          } else if (normKey.includes('notes') || normKey.includes('remark') || normKey.includes('comment') || normKey.includes('itemdetail')) {
            obj.notes = val;
          } else if (normKey.includes('date') || normKey.includes('createdat')) {
            obj.created_at = val;
          } else {
            obj[normKey] = val;
          }
        });

        if (!obj.name && sectionType !== 'orders') {
          obj.name = row[0] || `Imported ${sectionType.slice(0, -1)} ${rowIdx + 1}`;
        }

        return obj;
      });

      const validObjects = parsedObjects.filter(item => {
        if (sectionType === 'components' || sectionType === 'companies') {
          return !!item.name && item.name.trim().length > 0;
        }
        return true;
      });

      if (validObjects.length === 0) {
        throw new Error(`No valid ${sectionType} rows found. Please check that column headers match the expected schema.`);
      }

      const count = await onImport(validObjects);
      const insertedCount = typeof count === 'number' ? count : validObjects.length;

      setStatusFeedback({ type: 'success', message: `Imported & synced ${insertedCount} ${sectionType} rows successfully!` });
      setTimeout(() => setStatusFeedback(null), 4500);
    } catch (err: any) {
      console.error('CSV Import Error:', err);
      setStatusFeedback({ type: 'error', message: err.message || 'Failed to parse CSV file.' });
      setTimeout(() => setStatusFeedback(null), 5500);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full bg-[#FDF6E3] rounded-2xl border border-[#D6D1B1] p-3.5 shadow-xs flex flex-col gap-2.5 transition-all">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        {/* Left Section: Header Chips & Schema Info */}
        <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#073642] shrink-0">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>CSV Schema:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {schema.requiredHeaders.map(h => (
              <span
                key={h.key}
                className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300"
                title={`Required: ${h.label} (e.g. ${h.example})`}
              >
                {h.label}*
              </span>
            ))}

            {schema.optionalHeaders.slice(0, 5).map(h => (
              <span
                key={h.key}
                className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-[#EEE8D5] text-[#586E75] border border-[#D6D1B1]"
                title={`Optional: ${h.label} (e.g. ${h.example})`}
              >
                {h.label}
              </span>
            ))}

            {schema.optionalHeaders.length > 5 && (
              <button
                type="button"
                onClick={() => setShowSchemaGuide(!showSchemaGuide)}
                className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#E4DDC7] text-[#073642] hover:bg-[#D6D1B1] transition-colors cursor-pointer"
                title="View all supported columns and format guide"
              >
                +{schema.optionalHeaders.length - 5} More
              </button>
            )}
          </div>

          {statusFeedback && (
            <span
              className={`text-xs font-bold flex items-center gap-1 px-2.5 py-0.5 rounded-md shadow-2xs ${
                statusFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {statusFeedback.type === 'success' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <AlertCircle className="w-3.5 h-3.5 text-red-700" />}
              <span>{statusFeedback.message}</span>
            </span>
          )}
        </div>

        {/* Right Section: Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Download Sample Template */}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EEE8D5] hover:bg-[#E4DDC7] text-[#073642] border border-[#D6D1B1] font-semibold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
            title={`Download clean sample CSV template with example data for ${sectionType}`}
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-700" />
            <span>Sample Template</span>
          </button>

          {/* Import CSV */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title={`Upload .csv file to batch insert ${sectionType}`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isProcessing ? 'Importing...' : 'Import CSV'}</span>
          </button>

          {/* Export / Download CSV */}
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
            title={`Download active ${sectionType} dataset as formatted .csv`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Expandable Schema Column & Mapping Guide */}
      {showSchemaGuide && (
        <div className="pt-2.5 mt-1 border-t border-[#D6D1B1]/60 text-xs text-[#073642] animate-in fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-[11px] uppercase tracking-wider text-[#586E75] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-emerald-600" />
              <span>Full Supported CSV Schema for {schema.title}</span>
            </span>
            <button
              type="button"
              onClick={() => setShowSchemaGuide(false)}
              className="text-[10px] text-[#586E75] hover:text-[#073642] font-semibold underline cursor-pointer"
            >
              Hide Guide
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
            {allHeaders.map(h => (
              <div key={h.key} className="p-2 rounded-xl bg-[#EEE8D5] border border-[#D6D1B1] flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#073642]">{h.label}</span>
                  {schema.requiredHeaders.some(req => req.key === h.key) ? (
                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">Required</span>
                  ) : (
                    <span className="text-[9px] text-[#586E75]">Optional</span>
                  )}
                </div>
                <span className="text-[10px] text-[#586E75] font-mono truncate">Key: {h.key}</span>
                <span className="text-[10px] text-[#073642] italic truncate">Example: "{h.example}"</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
