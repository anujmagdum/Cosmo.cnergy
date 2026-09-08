import React, { useRef, useState } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';

export type CsvSectionType = 'components' | 'orders' | 'companies';

interface Props {
  sectionType: CsvSectionType;
  data: any[];
  onImport: (parsedRows: any[]) => Promise<number | void> | number | void;
  className?: string;
  customFilenamePrefix?: string;
}

export const CsvActionWidget: React.FC<Props> = ({
  sectionType,
  data,
  onImport,
  className = '',
  customFilenamePrefix
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 2. PARSE CSV LINE WITH PROPER QUOTATION HANDLING
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  // 3. IMPORT CSV FILE HANDLER
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const text = event.target?.result as string;
        if (!text || !text.trim()) {
          throw new Error('Selected CSV file is empty.');
        }

        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) {
          throw new Error('CSV must have a header row and at least one data row.');
        }

        const headerCols = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
        const parsedRows: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const rowValues = parseCsvLine(lines[i]);
          if (rowValues.length === 0 || rowValues.every(v => !v)) continue;

          const rowObj: Record<string, any> = {};
          headerCols.forEach((colName, idx) => {
            rowObj[colName] = rowValues[idx] || '';
          });

          if (sectionType === 'components') {
            const name =
              rowObj.componentname ||
              rowObj.name ||
              rowObj.itemname ||
              rowObj.item ||
              rowObj.description ||
              rowValues[0];

            if (!name) continue;

            parsedRows.push({
              name: name.trim(),
              category: rowObj.category || rowObj.categoryname || 'Battery Cells',
              sku: rowObj.skucode || rowObj.sku || rowObj.identifier || `SKU-${Date.now().toString().slice(-4)}-${i}`,
              preset_price: parseFloat(rowObj.priceinr || rowObj.price || rowObj.presetprice || rowObj.rate || '0') || 0,
              in_stock_qty: parseInt(rowObj.instockqty || rowObj.stockquantity || rowObj.stock || rowObj.qty || '100', 10) || 100,
              min_order_qty: parseInt(rowObj.minorderqty || rowObj.moq || '1', 10) || 1,
              uom: rowObj.uom || rowObj.unit || 'Pcs',
              company_id: rowObj.companyid || '',
              company_name: rowObj.companyname || rowObj.company || '',
              specs: rowObj.technicalspecifications || rowObj.specs || rowObj.specification || '',
              procurement_status: rowObj.procurementstatus || rowObj.status || 'TO_BE_ORDERED'
            });
          } else if (sectionType === 'orders') {
            const orderNum = rowObj.ordernumber || rowObj.orderno || rowObj.po || `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
            parsedRows.push({
              order_number: orderNum,
              type: (rowObj.documenttype || rowObj.type || 'PO').toUpperCase() === 'RFQ' ? 'RFQ' : 'PO',
              status: rowObj.orderstatus || rowObj.status || 'ORDERED',
              company_id: rowObj.companyid || '',
              company_name: rowObj.companyname || rowObj.company || '',
              total_amount: parseFloat(rowObj.totalamountinr || rowObj.totalamount || rowObj.amount || '0') || 0,
              created_by: rowObj.createdby || 'ANUJ (PROCUREMENT HEAD)',
              notes: rowObj.notes || rowObj.remarks || ''
            });
          } else if (sectionType === 'companies') {
            const name = rowObj.companyname || rowObj.name || rowObj.companyname || rowObj.company;
            if (!name) continue;

            parsedRows.push({
              name: name.trim(),
              contact_person: rowObj.contactperson || rowObj.contact || 'Sales Dept',
              email: rowObj.emailaddress || rowObj.email || 'sales@vendor.com',
              phone: rowObj.phonenumber || rowObj.phone || rowObj.mobile || '+91 98765 43210',
              whatsapp: rowObj.whatsapp || rowObj.phone || '',
              category: rowObj.category || 'General Company',
              gstin: rowObj.gstin || rowObj.gst || '',
              payment_terms: rowObj.paymentterms || rowObj.terms || 'Net 30 Days',
              address: rowObj.address || rowObj.plantaddress || '',
              buying_url: rowObj.buyingportalurl || rowObj.buyingurl || rowObj.url || '',
              rating: parseFloat(rowObj.rating || '4.8') || 4.8
            });
          }
        }

        if (parsedRows.length === 0) {
          throw new Error('No valid record rows could be extracted. Please check header columns.');
        }

        const count = await onImport(parsedRows);
        const importedCount = typeof count === 'number' ? count : parsedRows.length;

        setFeedback({
          type: 'success',
          message: `Successfully imported and synced ${importedCount} ${sectionType} records!`
        });
        setTimeout(() => setFeedback(null), 4000);
      } catch (err: any) {
        console.error('CSV Import Error:', err);
        setFeedback({
          type: 'error',
          message: err.message || 'Failed to parse CSV file.'
        });
        setTimeout(() => setFeedback(null), 5000);
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className={`flex items-center gap-2 relative ${className}`}>
      {/* Hidden File Input for CSV Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept=".csv,text/csv"
        className="hidden"
      />

      {/* Import CSV Button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#FFFFFF] text-[#0D0D0D] border border-[#E2E8F0] text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50"
        title={`Import ${sectionType} from CSV file`}
      >
        {isImporting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0b6623]" />
        ) : (
          <Upload className="w-3.5 h-3.5 text-[#0b6623]" />
        )}
        <span className="hidden sm:inline">Import CSV</span>
        <span className="sm:hidden">Import</span>
      </button>


      {/* Feedback Toast Banner */}
      {feedback && (
        <div
          className={`absolute top-full right-0 mt-2 z-50 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xl whitespace-nowrap animate-in fade-in duration-150 ${
            feedback.type === 'success'
              ? 'bg-[#0b6623] text-white shadow-[#0b6623]/20'
              : 'bg-red-600 text-white shadow-red-500/20'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
};
