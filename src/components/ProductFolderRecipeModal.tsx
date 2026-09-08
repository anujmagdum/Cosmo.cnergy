import React, { useState } from 'react';
import { ProductFolder, CatalogItem, ProductFolderComponent } from '../types';
import { PlusCircle, Search, X, Check, Package, AlertCircle } from 'lucide-react';

interface Props {
  folder: ProductFolder;
  catalog: CatalogItem[];
  onClose: () => void;
  onSaveRecipe: (folderId: string, components: ProductFolderComponent[]) => void;
}

export const ProductFolderRecipeModal: React.FC<Props> = ({
  folder,
  catalog,
  onClose,
  onSaveRecipe
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pre-select existing components
  const [selectedComponents, setSelectedComponents] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    (folder.components || []).forEach(comp => {
      map.set(comp.item_id, comp.qty_per_unit || 1);
    });
    return map;
  });

  const filteredCatalog = catalog.filter(
    item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.specs || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleItemSelection = (itemId: string) => {
    const newMap = new Map(selectedComponents);
    if (newMap.has(itemId)) {
      newMap.delete(itemId);
    } else {
      newMap.set(itemId, 1);
    }
    setSelectedComponents(newMap);
  };

  const handleQtyChange = (itemId: string, qty: number) => {
    const newMap = new Map(selectedComponents);
    newMap.set(itemId, Math.max(1, qty));
    setSelectedComponents(newMap);
  };

  const handleSave = () => {
    const componentsList: ProductFolderComponent[] = Array.from(selectedComponents.entries()).map(
      ([item_id, qty_per_unit]) => ({
        item_id,
        qty_per_unit
      })
    );
    onSaveRecipe(folder.id, componentsList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#FFFFFF] w-full max-w-2xl rounded-3xl p-6 border border-[#E2E8F0] shadow-2xl space-y-5 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0]/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-[#0b6623] border border-[#0b6623]/30 flex items-center justify-center font-bold">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#0D0D0D]">
                Configure Product Recipe & Components
              </h3>
              <p className="text-xs text-[#0b6623] font-semibold">
                Folder: <span className="font-bold text-[#0D0D0D]">{folder.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#334155] hover:text-[#0D0D0D] font-bold p-1.5 rounded-full hover:bg-[#FFFFFF] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-xs text-[#334155]">
          Select raw material items and specify the required quantity per finished product build unit.
        </p>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#334155] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search catalog by SKU, item name, or specs..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#0D0D0D] focus:outline-none focus:border-[#0b6623] font-medium"
          />
        </div>

        {/* Searchable Multi-Select Component List */}
        <div className="max-h-72 overflow-y-auto space-y-2.5 border border-[#E2E8F0] rounded-2xl p-3 bg-[#FFFFFF]/50">
          {filteredCatalog.length === 0 ? (
            <div className="text-center py-8 text-[#334155] text-xs">
              No matching catalog raw materials found. Add items via "Add Component" workflow first.
            </div>
          ) : (
            filteredCatalog.map(item => {
              const isSelected = selectedComponents.has(item.id);
              const currentQty = selectedComponents.get(item.id) || 1;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                    isSelected
                      ? 'bg-emerald-50/90 border-[#0b6623] text-[#0D0D0D] shadow-sm'
                      : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#0D0D0D] hover:border-[#94a3b8]'
                  }`}
                >
                  <div
                    onClick={() => toggleItemSelection(item.id)}
                    className="flex items-center gap-3 cursor-pointer flex-1"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 text-[#0b6623] rounded focus:ring-[#0b6623] shrink-0"
                    />
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-[#0D0D0D] flex items-center gap-2">
                        <span>{item.name}</span>
                        <span className="font-mono text-[10px] bg-[#FFFFFF] px-2 py-0.5 rounded text-[#0D0D0D] border border-[#E2E8F0]">
                          {item.sku}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#334155] flex items-center gap-3">
                        <span>Stock: <strong className="text-[#0b6623]">{item.in_stock_qty || 100} {item.uom}</strong></span>
                        <span>Preset: ₹{Number(item.preset_price).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Input Field */}
                  {isSelected && (
                    <div className="flex items-center gap-2 shrink-0 bg-[#FFFFFF] p-1.5 rounded-xl border border-[#0b6623] shadow-xs">
                      <span className="text-[10px] font-bold text-[#334155] uppercase">Qty / Build:</span>
                      <input
                        type="number"
                        min={1}
                        value={currentQty}
                        onChange={e => handleQtyChange(item.id, Number(e.target.value) || 1)}
                        className="w-16 font-mono font-bold text-xs bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-2 py-1 text-center text-[#0D0D0D] focus:outline-none focus:border-[#0b6623]"
                      />
                      <span className="text-[11px] font-semibold text-[#334155]">{item.uom}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Foot Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]/60">
          <span className="text-xs text-[#0b6623] font-bold">
            {selectedComponents.size} Component(s) Selected
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#FFFFFF] text-[#0D0D0D] font-semibold text-xs hover:bg-[#f8fafc] transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b6623] hover:bg-[#084d1a] text-white font-bold text-xs shadow-md shadow-[#0b6623]/20 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Save to Product Recipe</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
