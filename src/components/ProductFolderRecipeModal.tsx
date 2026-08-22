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
      <div className="bg-[#FDF6E3] w-full max-w-2xl rounded-3xl p-6 border border-[#D6D1B1] shadow-2xl space-y-5 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#D6D1B1]/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 flex items-center justify-center font-bold">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#073642]">
                Configure Product Recipe & Components
              </h3>
              <p className="text-xs text-emerald-800 font-semibold">
                Folder: <span className="font-bold text-[#073642]">{folder.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#586E75] hover:text-[#073642] font-bold p-1.5 rounded-full hover:bg-[#EEE8D5] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-xs text-[#586E75]">
          Select raw material items and specify the required quantity per finished product build unit.
        </p>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#586E75] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search catalog by SKU, item name, or specs..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#EEE8D5] border border-[#D6D1B1] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#073642] focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        {/* Searchable Multi-Select Component List */}
        <div className="max-h-72 overflow-y-auto space-y-2.5 border border-[#D6D1B1] rounded-2xl p-3 bg-[#EEE8D5]/50">
          {filteredCatalog.length === 0 ? (
            <div className="text-center py-8 text-[#586E75] text-xs">
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
                      ? 'bg-emerald-50/90 border-emerald-500 text-[#073642] shadow-sm'
                      : 'bg-[#FDF6E3] border-[#D6D1B1] text-[#073642] hover:border-[#93A1A1]'
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
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 shrink-0"
                    />
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-[#073642] flex items-center gap-2">
                        <span>{item.name}</span>
                        <span className="font-mono text-[10px] bg-[#EEE8D5] px-2 py-0.5 rounded text-[#073642] border border-[#D6D1B1]">
                          {item.sku}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#586E75] flex items-center gap-3">
                        <span>Stock: <strong className="text-emerald-800">{item.in_stock_qty || 100} {item.uom}</strong></span>
                        <span>Preset: ₹{Number(item.preset_price).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Input Field */}
                  {isSelected && (
                    <div className="flex items-center gap-2 shrink-0 bg-[#FDF6E3] p-1.5 rounded-xl border border-emerald-400 shadow-xs">
                      <span className="text-[10px] font-bold text-[#586E75] uppercase">Qty / Build:</span>
                      <input
                        type="number"
                        min={1}
                        value={currentQty}
                        onChange={e => handleQtyChange(item.id, Number(e.target.value) || 1)}
                        className="w-16 font-mono font-bold text-xs bg-[#EEE8D5] border border-[#D6D1B1] rounded-lg px-2 py-1 text-center text-[#073642] focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-[11px] font-semibold text-[#586E75]">{item.uom}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Foot Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#D6D1B1]/60">
          <span className="text-xs text-emerald-800 font-bold">
            {selectedComponents.size} Component(s) Selected
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#EEE8D5] text-[#073642] font-semibold text-xs hover:bg-[#E4DDC7] transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
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
