import React, { useState, useMemo } from 'react';
import { ProductBOM, CatalogItem, ProductFolder } from '../types';
import {
  Calculator,
  Cpu,
  Search,
  AlertCircle,
  RefreshCw,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Package,
  ArrowDownRight
} from 'lucide-react';

interface Props {
  boms: ProductBOM[];
  catalog: CatalogItem[];
  folders?: ProductFolder[];
}

export interface InventoryBottleneckItem {
  id: string;
  skuOrPartNumber: string;
  name: string;
  currentStock: number;
  targetThreshold: number;
  percentageRemaining: number;
  shortageQty: number;
  uom: string;
  category?: string;
  isBuildCritical?: boolean;
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
    details: { name: string; required: number; available: number; buildable: number; itemId?: string }[];
  } | null>(null);

  const filteredProducts = allProductOptions.filter(p =>
    p.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 1. Live SKU Build Capacity Calculator Logic
  const handleCalculateCapacity = () => {
    if (!selectedProduct) return;

    // Check if selectedProduct matches a live Product Folder
    const targetFolder = folders.find(f => f.name === selectedProduct || f.id === selectedProduct);

    if (targetFolder && targetFolder.components && targetFolder.components.length > 0) {
      let minBuildable = Infinity;
      let bottleneck = '';

      const details = targetFolder.components.map(comp => {
        const catItem =
          catalog.find(c => c.id === comp.item_id) ||
          catalog.find(c => c.name.toLowerCase() === comp.item_id.toLowerCase());
        const available = catItem?.in_stock_qty !== undefined ? Number(catItem.in_stock_qty) : 100;
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
          buildable,
          itemId: catItem?.id || comp.item_id
        };
      });

      setCalculatedResult({
        maxUnits: minBuildable === Infinity ? 0 : minBuildable,
        bottleneckComponent: bottleneck || 'N/A',
        details
      });
      return;
    }

    // Fallback to registered BOM items if folder components are empty
    const productComponents = boms.filter(
      b => b.product_name === selectedProduct || b.product_code === selectedProduct
    );
    if (productComponents.length === 0) {
      setCalculatedResult({
        maxUnits: 0,
        bottleneckComponent:
          'No recipe components assigned to this folder yet. Use "+ Component" to assign raw materials.',
        details: []
      });
      return;
    }

    let minBuildable = Infinity;
    let bottleneck = '';

    const details = productComponents.map(comp => {
      const catItem = catalog.find(c => c.id === comp.raw_material_id) || comp.raw_material;
      const available = catItem?.in_stock_qty !== undefined ? Number(catItem.in_stock_qty) : 100;
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
        buildable,
        itemId: catItem?.id || comp.raw_material_id
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

  // 2. Stock Bottleneck & Shortage Calculation Logic (Stock <= 20% Threshold or Build Demand Deficit)
  const inventoryBottlenecks = useMemo<InventoryBottleneckItem[]>(() => {
    const bottleneckList: InventoryBottleneckItem[] = [];
    const seenIds = new Set<string>();

    catalog.forEach(item => {
      const currentStock = Number(item.in_stock_qty ?? 0);
      const targetThreshold = Math.max(Number(item.min_order_qty || 0), 50);
      const stockRatio = targetThreshold > 0 ? currentStock / targetThreshold : 1;
      const percentageRemaining = Math.max(0, Math.round(stockRatio * 100));

      // Check if item is part of currently calculated SKU build demand
      let isBuildCritical = false;
      let buildDemandShortage = 0;

      if (calculatedResult && calculatedResult.details.length > 0) {
        const buildDetail = calculatedResult.details.find(
          d => d.itemId === item.id || d.name.toLowerCase() === item.name.toLowerCase()
        );
        if (buildDetail) {
          const targetBuildUnits = 50; // benchmark standard build batch
          const totalDemand = buildDetail.required * targetBuildUnits;
          const buildCoverRatio = totalDemand > 0 ? buildDetail.available / totalDemand : 1;

          if (buildCoverRatio <= 0.20) {
            isBuildCritical = true;
            buildDemandShortage = Math.max(0, totalDemand - buildDetail.available);
          }
        }
      }

      // Condition: Current stock <= 20% of safe reorder threshold OR <= 20% of SKU build demand
      if (stockRatio <= 0.20 || isBuildCritical) {
        const shortageQty = Math.max(
          Math.max(0, targetThreshold - currentStock),
          buildDemandShortage
        );

        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          bottleneckList.push({
            id: item.id,
            skuOrPartNumber: item.component_id || item.sku || item.id,
            name: item.name,
            currentStock,
            targetThreshold,
            percentageRemaining,
            shortageQty: shortageQty || Math.max(1, targetThreshold - currentStock),
            uom: item.uom || 'Pcs',
            category: item.category || 'General',
            isBuildCritical
          });
        }
      }
    });

    // Sort by most critical percentage remaining first
    return bottleneckList.sort((a, b) => a.percentageRemaining - b.percentageRemaining);
  }, [catalog, calculatedResult]);

  return (
    <div className="space-y-4">
      {/* SKU Capacity Calculator Card */}
      <div className="glass-card bg-[white] p-5 rounded-2xl border border-[#e2e8f0] shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#e2e8f0]/60 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-bold text-[#0f172a]">SKU Build Capacity Calculator</h3>
              <p className="text-[11px] text-[#64748b]">
                Calculate maximum buildable finished units based on live Product Folder recipes & inventory stock
              </p>
            </div>
          </div>

          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
            Recipe Math Sync
          </span>
        </div>

        {/* Form Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          {/* Search SKU Recipe */}
          <div className="relative col-span-1">
            <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter recipes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[white] border border-[#e2e8f0] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-emerald-500 font-medium"
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
              className="w-full bg-[white] border border-[#e2e8f0] rounded-xl px-3 py-1.5 text-xs text-[#0f172a] font-semibold focus:outline-none focus:border-emerald-500"
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
              className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Calculate</span>
            </button>

            {calculatedResult !== null && (
              <button
                onClick={handleResetCalculator}
                className="py-1.5 px-2.5 rounded-xl bg-[white] hover:bg-[#E4DDC7] text-[#0f172a] font-bold text-xs border border-[#e2e8f0] transition-all flex items-center justify-center gap-1 cursor-pointer"
                title="Reset"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Calculation Results Details */}
        {calculatedResult && (
          <div className="pt-1 space-y-2.5">
            <div className="p-3.5 rounded-xl bg-[white] border border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
                  Max Buildable Finished Units:
                </span>
                <div className="text-2xl font-extrabold text-emerald-800 font-mono">
                  {calculatedResult.maxUnits.toLocaleString()} Units
                </div>
              </div>

              <div className="bg-[white] p-2.5 rounded-lg border border-[#e2e8f0] text-xs">
                <span className="text-[#64748b] block text-[9px] uppercase font-bold">
                  Bottleneck Component:
                </span>
                <span className="font-bold text-red-600 flex items-center gap-1 text-xs">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {calculatedResult.bottleneckComponent}
                </span>
              </div>
            </div>

            {/* Component Inventory Breakdown */}
            {calculatedResult.details.length > 0 && (
              <div className="space-y-1 text-xs">
                <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">
                  Component Stock Breakdown ({calculatedResult.details.length} Items):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {calculatedResult.details.map((d, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                        d.buildable === calculatedResult.maxUnits
                          ? 'bg-red-50 border-red-300 text-red-900 font-semibold'
                          : 'bg-[white]/70 border-[#e2e8f0] text-[#0f172a]'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-bold truncate text-xs">{d.name}</div>
                        <div className="text-[10px] text-[#64748b]">
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

      {/* 3. DYNAMIC INVENTORY BOTTLENECK ALERT BANNER (COMPACT SCALE: SHORT HEIGHT, HORIZONTAL STRIP) */}
      {inventoryBottlenecks.length > 0 ? (
        <div className="bg-[#FFFBEB] border border-amber-400 text-[#0f172a] rounded-xl px-3.5 py-2 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 animate-in fade-in">
          {/* Left: Scaled Header Label */}
          <div className="flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
            <span className="text-xs font-black text-[#0f172a] whitespace-nowrap">
              Inventory Bottlenecks (&le; 20%):
            </span>
            <span className="bg-amber-200 text-amber-950 border border-amber-400 text-[10px] px-2 py-0.5 rounded-full font-black font-mono shrink-0 shadow-2xs">
              {inventoryBottlenecks.length} Items
            </span>
          </div>

          {/* Center / Right: Horizontal Scale Strip of Deficit Components */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin py-0.5 flex-1 max-w-full">
            {inventoryBottlenecks.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-2 bg-[#FEF3C7] hover:bg-[#FDE68A] border border-amber-300 hover:border-amber-400 rounded-lg px-2.5 py-1 text-xs whitespace-nowrap shadow-2xs transition-all shrink-0 cursor-default"
                title={`${item.name} | SKU: ${item.skuOrPartNumber} | Current Stock: ${item.currentStock}/${item.targetThreshold} (${item.percentageRemaining}%)`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#0f172a] text-xs max-w-[140px] truncate">
                    {item.name}
                  </span>
                  {item.isBuildCritical && (
                    <span className="bg-red-600 text-white text-[8px] font-black px-1 py-0.2 rounded uppercase">
                      Blocker
                    </span>
                  )}
                </div>

                <span className="text-[10px] text-[#64748b] font-mono font-medium border-l border-amber-300/80 pl-2">
                  <strong className="text-[#0f172a]">{item.currentStock}</strong>/{item.targetThreshold}
                  <span className="text-red-700 font-bold ml-0.5">({item.percentageRemaining}%)</span>
                </span>

                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded font-mono shadow-2xs">
                  +{item.shortageQty} {item.uom}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Optimal Stock Levels Banner (Slim Scale Format) */
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl px-3.5 py-2 flex items-center justify-between shadow-xs text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="font-bold text-[#0f172a]">
              Stock Levels Optimal &mdash; All active inventory items have &gt; 20% safe buffer.
            </span>
          </div>
          <span className="text-[10px] font-black bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded-full border border-emerald-300 font-mono">
            Healthy Buffers
          </span>
        </div>
      )}
    </div>
  );
};

export default SKUCapacityCalculator;
