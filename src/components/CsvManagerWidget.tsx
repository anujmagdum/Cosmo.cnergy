import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, FileDown, Info, HelpCircle } from 'lucide-react';

export type CsvSectionType = 'components' | 'orders' | 'companies';

interface Props {
  sectionType: CsvSectionType;
  data?: any[];
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
    title: 'Inventory Components CSV Schema',
    filenamePrefix: 'Inventory_Components',
    requiredHeaders: [
      { key: 'name', label: 'Component Name', example: 'LiFePO4 Battery Cell' },
      { key: 'category', label: 'Category', example: 'Capacitor' },
      { key: 'part_name', label: 'Part Name', example: 'LFP-48V-100AH' },
      { key: 'specs', label: 'Technical Specification', example: '48V 100Ah, 3.2V nominal, 6000 cycles' }
    ],
    optionalHeaders: [],
    sampleRows: [
      {
        name: 'LiFePO4 Battery Cell',
        category: 'Capacitor',
        part_name: 'LFP-48V-100AH',
        specs: '48V 100Ah, 3.2V nominal, 6000 cycles'
      },
      {
        name: 'Smart BMS Controller',
        category: 'Micro-Controller',
        part_name: 'BMS-16S-100A',
        specs: '16S 100A continuous, CANBUS 2.0B, RS485 isolated port'
      },
      {
        name: 'Steel Battery Enclosure',
        category: 'Push Button',
        part_name: 'ENC-IP65-100A',
        specs: 'Powder-coated CRCA steel, IP65 silicone gasket'
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
  const [showColumnsPopover, setShowColumnsPopover] = useState(false);
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
        if (sectionType === 'components') {
          // Extract: Component Name, Category, Part Name, Technical Specification
          // All other fields remain completely blank
          let componentName = '';
          let category = '';
          let partName = '';
          let technicalSpec = '';

          headerRow.forEach((normKey, colIdx) => {
            let val = row[colIdx] !== undefined ? row[colIdx] : '';
            val = val.replace(/^["']|["']$/g, '').trim();

            if (
              normKey.includes('componentname') ||
              normKey === 'component' ||
              normKey === 'itemname' ||
              (normKey.includes('name') && !normKey.includes('part') && !normKey.includes('company') && !normKey.includes('person') && !normKey.includes('cat'))
            ) {
              componentName = val;
            } else if (normKey.includes('category') || normKey === 'domain' || normKey === 'cat') {
              category = val;
            } else if (
              normKey.includes('partname') ||
              normKey.includes('partnumber') ||
              normKey.includes('partcode') ||
              normKey === 'part' ||
              normKey === 'sku' ||
              normKey === 'mpn'
            ) {
              partName = val;
            } else if (
              normKey.includes('technicalspecification') ||
              normKey.includes('technicalspec') ||
              normKey.includes('technical') ||
              normKey.includes('specification') ||
              normKey.includes('specs') ||
              normKey.includes('spec') ||
              normKey === 'description'
            ) {
              technicalSpec = val;
            }
          });

          // Fallback by column position if headers didn't match:
          // Col 0: Component Name, Col 1: Category, Col 2: Part Name, Col 3: Technical Specification
          if (!componentName && row[0]) {
            componentName = (row[0] || '').replace(/^["']|["']$/g, '').trim();
          }
          if (row.length >= 4) {
            if (!category && row[1]) category = (row[1] || '').replace(/^["']|["']$/g, '').trim();
            if (!partName && row[2]) partName = (row[2] || '').replace(/^["']|["']$/g, '').trim();
            if (!technicalSpec && row[3]) technicalSpec = (row[3] || '').replace(/^["']|["']$/g, '').trim();
          } else {
            // 3-column fallback: Col 0: Name, Col 1: Part Name, Col 2: Specs
            if (!partName && row[1]) partName = (row[1] || '').replace(/^["']|["']$/g, '').trim();
            if (!technicalSpec && row[2]) technicalSpec = (row[2] || '').replace(/^["']|["']$/g, '').trim();
          }

          if (!componentName) {
            componentName = `Component ${rowIdx + 1}`;
          }

          return {
            name: componentName,
            category: category,
            sku: partName,
            part_name: partName,
            specs: technicalSpec,
            technical_spec: technicalSpec
          };
        }

        const obj: Record<string, any> = {};

        headerRow.forEach((normKey, colIdx) => {
          let val = row[colIdx] !== undefined ? row[colIdx] : '';
          val = val.replace(/^["']|["']$/g, '').trim();

          if (normKey.includes('companyname') || normKey === 'supplier' || normKey === 'vendor' || (normKey.includes('company') && sectionType !== 'companies') || (normKey === 'name' && sectionType === 'companies')) {
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
            obj.buying_url = val;
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
    <div className="w-full bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-slate-800 transition-all">
      {/* Left: CSV Context, Template Download & Columns Tooltip */}
      <div className="flex flex-wrap items-center gap-2 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 shrink-0 mr-1">
          <FileSpreadsheet className="w-4 h-4 text-[#0b6623]" />
          <span>CSV Engine:</span>
        </div>

        {/* Download Sample Template */}
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 font-semibold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
          title={`Download sample CSV template for ${sectionType}`}
        >
          <FileDown className="w-3.5 h-3.5 text-slate-800" />
          <span>Download Template</span>
        </button>

        {/* View Required Columns Info Popover */}
        <div className="relative inline-block">
          <button
            type="button"
            onMouseEnter={() => setShowColumnsPopover(true)}
            onMouseLeave={() => setShowColumnsPopover(false)}
            onClick={() => setShowColumnsPopover(!showColumnsPopover)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 font-semibold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
            title="Hover or click to view required and optional columns"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-700" />
            <span>View Required Columns</span>
          </button>

          {/* Popover Card */}
          {showColumnsPopover && (
            <div
              onMouseEnter={() => setShowColumnsPopover(true)}
              onMouseLeave={() => setShowColumnsPopover(false)}
              className="absolute left-0 top-full mt-2 w-80 sm:w-96 p-4 rounded-xl bg-white border border-slate-200 shadow-2xl z-50 text-xs text-slate-800 space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-950 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#0b6623]" />
                  <span>{schema.title}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-800">RFC 4180</span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                  Required Header:
                </span>
                <div className="flex flex-wrap gap-1">
                  {schema.requiredHeaders.map(h => (
                    <span
                      key={h.key}
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
                    >
                      {h.label}*
                    </span>
                  ))}
                </div>
              </div>

              {schema.optionalHeaders.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    Supported Optional Headers:
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pr-1">
                    {schema.optionalHeaders.map(h => (
                      <span
                        key={h.key}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200"
                        title={`Example: ${h.example}`}
                      >
                        {h.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-1 text-[11px] text-slate-700 border-t border-slate-100">
                {sectionType === 'components'
                  ? 'Imports: Component Name, Category, Part Name, and Technical Specification. All other fields remain blank.'
                  : 'Headers are case-insensitive and spaces/dashes are normalized automatically.'}
              </div>
            </div>
          )}
        </div>

        {/* Feedback Alert */}
        {statusFeedback && (
          <span
            className={`text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg shadow-2xs ${
              statusFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {statusFeedback.type === 'success' ? (
              <Check className="w-3.5 h-3.5 text-[#0b6623]" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            )}
            <span>{statusFeedback.message}</span>
          </span>
        )}
      </div>

      {/* Right: Import Action Button */}
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
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
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0b6623] hover:bg-[#084d1a] text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          title={`Upload .csv file to batch insert ${sectionType}`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{isProcessing ? 'Importing...' : 'Import'}</span>
        </button>
      </div>
    </div>
  );
};
