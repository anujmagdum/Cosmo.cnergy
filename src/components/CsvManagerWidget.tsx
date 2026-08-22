import React, { useRef, useState } from 'react';
import { Download, Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';

export type CsvSectionType = 'components' | 'orders' | 'suppliers';

interface Props {
  sectionType: CsvSectionType;
  data: any[];
  onImport: (rows: any[]) => Promise<number | void> | number | void;
}

const SECTION_HEADERS_CONFIG: Record<CsvSectionType, { title: string; requiredHeaders: string[]; optionalHeaders: string[] }> = {
  components: {
    title: 'Components CSV Template',
    requiredHeaders: ['name', 'category'],
    optionalHeaders: ['preset_price', 'in_stock_qty', 'uom', 'specs', 'supplier_name', 'procurement_status']
  },
  suppliers: {
    title: 'Suppliers CSV Template',
    requiredHeaders: ['name', 'email', 'phone'],
    optionalHeaders: ['contact_person', 'category', 'gstin', 'payment_terms', 'address', 'buying_url']
  },
  orders: {
    title: 'Orders CSV Template',
    requiredHeaders: ['order_number', 'supplier_name'],
    optionalHeaders: ['type', 'status', 'total_amount', 'created_by', 'notes']
  }
};

export const CsvManagerWidget: React.FC<Props> = ({ sectionType, data, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const config = SECTION_HEADERS_CONFIG[sectionType] || SECTION_HEADERS_CONFIG.components;
  const allHeaders = [...config.requiredHeaders, ...config.optionalHeaders];

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

  // Handle CSV Download
  const handleDownloadCsv = () => {
    try {
      let headers: string[] = [];
      let rows: string[][] = [];

      if (sectionType === 'components') {
        headers = ['Component Name', 'Category', 'Price (INR)', 'Stock Qty', 'UOM', 'Specs', 'Supplier Name', 'Procurement Status'];
        rows = (data || []).map(item => [
          `"${(item.name || '').replace(/"/g, '""')}"`,
          `"${(item.category || 'Battery Cells').replace(/"/g, '""')}"`,
          item.preset_price !== undefined ? String(item.preset_price) : '0',
          item.in_stock_qty !== undefined ? String(item.in_stock_qty) : '0',
          `"${(item.uom || 'Pcs').replace(/"/g, '""')}"`,
          `"${(item.specs || '').replace(/"/g, '""')}"`,
          `"${(item.supplier?.name || item.supplier_name || '').replace(/"/g, '""')}"`,
          `"${(item.procurement_status || 'TO_BE_ORDERED').replace(/"/g, '""')}"`
        ]);
      } else if (sectionType === 'suppliers') {
        headers = ['Supplier Name', 'Contact Person', 'Email', 'Phone', 'Category', 'GSTIN', 'Payment Terms', 'Address', 'Buying URL'];
        rows = (data || []).map(item => [
          `"${(item.name || '').replace(/"/g, '""')}"`,
          `"${(item.contact_person || '').replace(/"/g, '""')}"`,
          `"${(item.email || '').replace(/"/g, '""')}"`,
          `"${(item.phone || '').replace(/"/g, '""')}"`,
          `"${(item.category || 'General Supplier').replace(/"/g, '""')}"`,
          `"${(item.gstin || '').replace(/"/g, '""')}"`,
          `"${(item.payment_terms || 'Net 30 Days').replace(/"/g, '""')}"`,
          `"${(item.address || '').replace(/"/g, '""')}"`,
          `"${(item.buying_url || '').replace(/"/g, '""')}"`
        ]);
      } else if (sectionType === 'orders') {
        headers = ['Order Number', 'Supplier Name', 'Type', 'Status', 'Total Amount (INR)', 'Created By', 'Notes', 'Created At'];
        rows = (data || []).map(item => [
          `"${(item.order_number || '').replace(/"/g, '""')}"`,
          `"${(item.supplier?.name || item.supplier_name || '').replace(/"/g, '""')}"`,
          `"${(item.type || 'PO').replace(/"/g, '""')}"`,
          `"${(item.status || 'ORDERED').replace(/"/g, '""')}"`,
          item.total_amount !== undefined ? String(item.total_amount) : '0',
          `"${(item.created_by || '').replace(/"/g, '""')}"`,
          `"${(item.notes || '').replace(/"/g, '""')}"`,
          `"${(item.created_at || '').replace(/"/g, '""')}"`
        ]);
      }

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const typeCapitalized = sectionType.charAt(0).toUpperCase() + sectionType.slice(1);
      link.setAttribute('href', url);
      link.setAttribute('download', `Export_${typeCapitalized}_${dateStr}.csv`);
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

  // Handle CSV File Upload & Parsing
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

      const headerRow = rawRows[0].map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
      const dataRows = rawRows.slice(1);

      const parsedObjects = dataRows.map(row => {
        const obj: Record<string, any> = {};
        headerRow.forEach((key, idx) => {
          let val = row[idx] !== undefined ? row[idx] : '';
          val = val.replace(/^["']|["']$/g, '').trim();

          // Normalizations for known fields
          if (key.includes('name') && !key.includes('supplier')) obj.name = val;
          else if (key.includes('supplier') && key.includes('name')) obj.supplier_name = val;
          else if (key.includes('category')) obj.category = val;
          else if (key.includes('price') || key.includes('rate') || key.includes('amount')) obj.preset_price = Number(val) || 0;
          else if (key.includes('stock') || key.includes('qty')) obj.in_stock_qty = Number(val) || 0;
          else if (key.includes('uom') || key.includes('unit')) obj.uom = val || 'Pcs';
          else if (key.includes('spec')) obj.specs = val;
          else if (key.includes('status')) obj.procurement_status = val;
          else if (key.includes('email')) obj.email = val;
          else if (key.includes('phone') || key.includes('mobile')) obj.phone = val;
          else if (key.includes('contact')) obj.contact_person = val;
          else if (key.includes('gst')) obj.gstin = val;
          else if (key.includes('term')) obj.payment_terms = val;
          else if (key.includes('order_number') || key.includes('order_no') || key.includes('po_no')) obj.order_number = val;
          else obj[key] = val;
        });
        return obj;
      });

      const count = await onImport(parsedObjects);
      const insertedCount = typeof count === 'number' ? count : parsedObjects.length;

      setStatusFeedback({ type: 'success', message: `Imported ${insertedCount} ${sectionType} successfully.` });
      setTimeout(() => setStatusFeedback(null), 4000);
    } catch (err: any) {
      console.error('CSV Import Error:', err);
      setStatusFeedback({ type: 'error', message: err.message || 'Failed to parse CSV file.' });
      setTimeout(() => setStatusFeedback(null), 5000);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full bg-[#FDF6E3] rounded-2xl border border-[#D6D1B1] p-3.5 shadow-xs flex flex-col md:flex-row justify-between items-center gap-3">
      {/* Left Child: Dynamic Expected Headers / Chips */}
      <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#073642] shrink-0">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>CSV Schema:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {config.requiredHeaders.map(h => (
            <span
              key={h}
              className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300"
              title="Required CSV Header"
            >
              {h}*
            </span>
          ))}

          {config.optionalHeaders.map(h => (
            <span
              key={h}
              className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-[#EEE8D5] text-[#586E75] border border-[#D6D1B1]"
              title="Optional CSV Header"
            >
              {h}
            </span>
          ))}
        </div>

        {statusFeedback && (
          <span
            className={`text-xs font-bold flex items-center gap-1 px-2.5 py-0.5 rounded-md ${
              statusFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'
            }`}
          >
            {statusFeedback.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{statusFeedback.message}</span>
          </span>
        )}
      </div>

      {/* Right Child: Import & Download Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          disabled={isProcessing}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EEE8D5] hover:bg-[#E4DDC7] text-[#073642] border border-[#D6D1B1] font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          title={`Upload .csv file to batch insert ${sectionType}`}
        >
          <Upload className="w-3.5 h-3.5 text-emerald-700" />
          <span>{isProcessing ? 'Importing...' : 'Import CSV'}</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
          title={`Download active ${sectionType} as formatted .csv`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download CSV</span>
        </button>
      </div>
    </div>
  );
};
