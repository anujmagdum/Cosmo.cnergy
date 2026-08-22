import React, { useState, useMemo } from 'react';
import { ProductBOM, CatalogItem, ProductFolder } from '../types';
import { Calculator, Cpu, Search, AlertCircle, RefreshCw, Layers } from 'lucide-react';

interface Props {
  boms: ProductBOM[];
  catalog: CatalogItem[];
  folders?: ProductFolder[];
}

export const SKUCapacityCalculator: React.FC<Props> = ({ boms, catalog, folders = [] }) => {
  // Combine Product Folders & BOM Products into single list
  const folderNames = folders.map(f => f.name);
  const bomNames = Array.from(new Set(boms.map(b => b.product_name)));
  const allProductOptions = Array.from(new Set([...folderNames, ...bomNames]));
  
  const defaultProduct = allProductOptions[0] || (folders[0]?.name || '51.2V 100Ah Pack Assembly');

  const [selectedProduct, setSelectedProduct] = useState<string>(defaultProduct);
  const [searchTerm, setSearchTerm] = useState('');
  const [calculatedResult, setCalculatedResult] = useState<{
    maxUnits: number;
    bottleneckComponent: string;
    details: { name: string; required: number; available: number; buildable: number }[];
  } | null>(null);

  const filteredProducts = allProductOptions.filter(p =>
    p.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCalculateCapacity = () => {
    if (!selectedProduct) return;

    // 1. Check if selectedProduct matches a live Product Folder
    const targetFolder = folders.find(f => f.name === selectedProduct || f.id === selectedProduct);

    if (targetFolder && targetFolder.components && targetFolder.components.length > 0) {
      let minBuildable = Infinity;
      let bottleneck = '';

      const details = targetFolder.components.map(comp => {
        const catItem = catalog.find(c => c.id === comp.item_id) || catalog.find(c => c.name.toLowerCase() === comp.item_id.toLowerCase());
        const available = catItem?.in_stock_qty !== undefined ? catItem.in_stock_qty : 100;
        const required = comp.qty_per_unit || 1;
        const buildable = Math.floor(available / required);

        if (buildable < minBuildable) {
          minBuildable = buildable;
          bottleneck = catItem?.name || 'Raw Material Item';
        }

        return {
          name: catItem?.name || 'Component Item',
          required,
          available,
          buildable
        };
      });

      setCalculatedResult({
        maxUnits: minBuildable === Infinity ? 0 : minBuildable,
        bottleneckComponent: bottleneck || 'N/A',
        details
      });
      return;
    }

    // 2. Fallback to registered BOM items if folder components are empty
    const productComponents = boms.filter(b => b.product_name === selectedProduct || b.product_code === selectedProduct);
    if (productComponents.length === 0) {
      setCalculatedResult({
        maxUnits: 0,
        bottleneckComponent: 'No recipe components assigned to this folder yet. Use "+ Component" to assign raw materials.',
        details: []
      });
      return;
    }

    let minBuildable = Infinity;
    let bottleneck = '';

    const details = productComponents.map(comp => {
      const catItem = catalog.find(c => c.id === comp.raw_material_id) || comp.raw_material;
      const available = catItem?.in_stock_qty !== undefined ? catItem.in_stock_qty : 100;
      const required = comp.qty_per_unit || 1;
      const buildable = Math.floor(available / required);

      if (buildable < minBuildable) {
        minBuildable = buildable;
        bottleneck = catItem?.name || comp.product_code;
      }

      return {
        name: catItem?.name || comp.product_code,
        required,
        available,
        buildable
      };
    });

    setCalculatedResult({
      maxUnits: minBuildable === Infinity ? 0 : minBuildable,
      bottleneckComponent: bottleneck || 'N/A',
      details
    });
  };

  // Reset Calculator State
  const handleResetCalculator = () => {
    setSelectedProduct(defaultProduct);
    setSearchTerm('');
    setCalculatedResult(null);
  };

  return (
    <div className="glass-card bg-[#FDF6E3] p-5 rounded-2xl border border-[#D6D1B1] shadow-xs space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#D6D1B1]/60 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-[#073642]">SKU Build Capacity Calculator</h3>
            <p className="text-[11px] text-[#586E75]">
              Calculate maximum buildable finished units based on live Product Folder recipes & inventory stock
            </p>
          </div>
        </div>

        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
          Live Recipe Math Sync
        </span>
      </div>

      {/* Form Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
        {/* Search SKU Recipe */}
        <div className="relative col-span-1">
          <Search className="w-3.5 h-3.5 text-[#586E75] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filter recipes..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        {/* Select SKU Recipe Dropdown */}
        <div className="col-span-1 sm:col-span-2">
          <select
            value={selectedProduct}
            onChange={e => {
              setSelectedProduct(e.target.value);
              setCalculatedResult(null);
            }}
            className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl px-3 py-1.5 text-xs text-[#073642] font-semibold focus:outline-none focus:border-emerald-500"
          >
            {filteredProducts.map(prod => (
              <option key={prod} value={prod}>
                📁 {prod}
              </option>
            ))}
          </select>
        </div>

        {/* Action Triggers */}
        <div className="col-span-1 flex items-center gap-2">
          <button
            onClick={handleCalculateCapacity}
            className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Calculate</span>
          </button>

          {calculatedResult !== null && (
            <button
              onClick={handleResetCalculator}
              className="py-1.5 px-2.5 rounded-xl bg-[#EEE8D5] hover:bg-[#E4DDC7] text-[#073642] font-bold text-xs border border-[#D6D1B1] transition-all flex items-center justify-center gap-1"
              title="Reset"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Calculation Results Banner */}
      {calculatedResult && (
        <div className="pt-1 space-y-2.5">
          <div className="p-3.5 rounded-xl bg-[#EEE8D5] border border-[#D6D1B1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-[#586E75] uppercase tracking-wider">
                Max Buildable Finished Units:
              </span>
              <div className="text-2xl font-extrabold text-emerald-800 font-mono">
                {calculatedResult.maxUnits.toLocaleString()} Units
              </div>
            </div>

            <div className="bg-[#FDF6E3] p-2.5 rounded-lg border border-[#D6D1B1] text-xs">
              <span className="text-[#586E75] block text-[9px] uppercase font-bold">Bottleneck Component:</span>
              <span className="font-bold text-red-600 flex items-center gap-1 text-xs">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {calculatedResult.bottleneckComponent}
              </span>
            </div>
          </div>

          {/* Component Inventory Breakdown */}
          {calculatedResult.details.length > 0 && (
            <div className="space-y-1 text-xs">
              <div className="text-[10px] font-semibold text-[#586E75] uppercase tracking-wider">
                Component Stock Breakdown ({calculatedResult.details.length} Items):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {calculatedResult.details.map((d, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                      d.buildable === calculatedResult.maxUnits
                        ? 'bg-red-50 border-red-300 text-red-900 font-semibold'
                        : 'bg-[#EEE8D5]/70 border-[#D6D1B1] text-[#073642]'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-bold truncate text-xs">{d.name}</div>
                      <div className="text-[10px] text-[#586E75]">
                        Req: {d.required}/unit • Stock: {d.available}
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono font-bold text-emerald-800 text-xs">
                      {d.buildable} units
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
