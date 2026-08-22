import { CatalogItem, ProductFolder, Supplier, ProductBOM, SearchResultItem, SearchResultSupplier } from '../types';

export interface SearchResultSet {
  query: string;
  components: SearchResultItem[];
  folders: SearchResultItem[];
  suppliers: SearchResultItem[];
  totalCount: number;
}

/**
 * Universal Cross-Entity Relational Search Engine
 * Searches Components, Product Folders, and Suppliers with relational multi-supplier expansion.
 */
export function executeUniversalSearch(
  query: string,
  catalog: CatalogItem[],
  folders: ProductFolder[],
  suppliers: Supplier[],
  boms: ProductBOM[] = []
): SearchResultSet {
  const cleanQuery = (query || '').trim().toLowerCase();

  if (!cleanQuery) {
    return {
      query: '',
      components: [],
      folders: [],
      suppliers: [],
      totalCount: 0
    };
  }

  // 1. Search Components with Relational Supplier Expansion
  const matchingComponents: SearchResultItem[] = [];

  catalog.forEach(item => {
    const nameMatch = (item.name || '').toLowerCase().includes(cleanQuery);
    const skuMatch = (item.sku || '').toLowerCase().includes(cleanQuery);
    const specsMatch = (item.specs || '').toLowerCase().includes(cleanQuery);
    const supplierMatch = suppliers.some(
      s => s.id === item.supplier_id && (s.name || '').toLowerCase().includes(cleanQuery)
    );

    if (nameMatch || skuMatch || specsMatch || supplierMatch) {
      // Find primary supplier
      const primarySupplier = suppliers.find(s => s.id === item.supplier_id);

      // Relational Expansion: Find ALL suppliers supplying this component or similar category
      const associatedSuppliers: SearchResultSupplier[] = [];

      // 1. Primary registered supplier
      if (primarySupplier) {
        associatedSuppliers.push({
          supplierId: primarySupplier.id,
          supplierName: primarySupplier.name,
          unitPrice: item.preset_price,
          leadTime: '3-5 Days',
          isPrimary: true,
          email: primarySupplier.email,
          phone: primarySupplier.phone,
          whatsapp: primarySupplier.whatsapp,
          contactPerson: primarySupplier.contact_person
        });
      }

      // 2. Cross-match other suppliers in the system providing similar materials / components
      suppliers.forEach(s => {
        if (s.id !== item.supplier_id) {
          // Check if supplier has same category or name keywords
          const isCategoryMatch = s.category && item.specs && item.specs.toLowerCase().includes(s.category.toLowerCase());
          const isNameMatch = item.name.toLowerCase().includes('cell') && s.name.toLowerCase().includes('tech');
          const isBMSMatch = item.name.toLowerCase().includes('bms') && s.name.toLowerCase().includes('bms');
          const isBusbarMatch = item.name.toLowerCase().includes('busbar') && s.name.toLowerCase().includes('busbar');
          const isEnclosureMatch = item.name.toLowerCase().includes('enclosure') && s.name.toLowerCase().includes('sheet');

          if (isCategoryMatch || isNameMatch || isBMSMatch || isBusbarMatch || isEnclosureMatch) {
            associatedSuppliers.push({
              supplierId: s.id,
              supplierName: s.name,
              unitPrice: Math.round((item.preset_price || 0) * (0.95 + Math.random() * 0.1)),
              leadTime: '5-7 Days',
              isPrimary: false,
              email: s.email,
              phone: s.phone,
              whatsapp: s.whatsapp,
              contactPerson: s.contact_person
            });
          }
        }
      });

      // Ensure at least 2 alternate suppliers for robust multi-vendor selection demo if available
      if (associatedSuppliers.length === 1 && suppliers.length > 1) {
        const alternate = suppliers.find(s => s.id !== primarySupplier?.id);
        if (alternate) {
          associatedSuppliers.push({
            supplierId: alternate.id,
            supplierName: alternate.name,
            unitPrice: Math.round((item.preset_price || 0) * 1.05),
            leadTime: '7 Days',
            isPrimary: false,
            email: alternate.email,
            phone: alternate.phone,
            whatsapp: alternate.whatsapp,
            contactPerson: alternate.contact_person
          });
        }
      }

      matchingComponents.push({
        id: item.id,
        type: 'COMPONENT',
        title: item.name,
        subtitle: `${item.sku || 'SKU'} • ${item.specs || ''}`,
        category: 'Raw Materials & Parts',
        metadata: {
          partNumber: item.sku,
          sku: item.sku,
          specs: item.specs,
          presetPrice: item.preset_price,
          uom: item.uom,
          inStockQty: item.in_stock_qty,
          supplierCount: associatedSuppliers.length,
          suppliers: associatedSuppliers
        }
      });
    }
  });

  // 2. Search Product Folders & Sub-folders
  const matchingFolders: SearchResultItem[] = [];

  folders.forEach(folder => {
    const nameMatch = (folder.name || '').toLowerCase().includes(cleanQuery);
    const descMatch = (folder.description || '').toLowerCase().includes(cleanQuery);

    // Check if any child component inside folder matches
    const hasMatchingChild = (folder.components || []).some(comp => {
      const cat = catalog.find(c => c.id === comp.item_id);
      return cat && (cat.name.toLowerCase().includes(cleanQuery) || (cat.sku || '').toLowerCase().includes(cleanQuery));
    });

    if (nameMatch || descMatch || hasMatchingChild) {
      matchingFolders.push({
        id: folder.id,
        type: 'PRODUCT_FOLDER',
        title: folder.name,
        subtitle: folder.description || 'Battery Pack Finished Assembly Folder',
        category: 'Product Folders & BOMs',
        metadata: {
          folderPath: `/catalog-bom/product-folder/${folder.id}`,
          folderComponentsCount: (folder.components || []).length,
          linkedPosCount: (folder.linked_po_ids || []).length
        }
      });
    }
  });

  // 3. Search Suppliers & Vendors
  const matchingSuppliers: SearchResultItem[] = [];

  suppliers.forEach(supplier => {
    const nameMatch = (supplier.name || '').toLowerCase().includes(cleanQuery);
    const contactMatch = (supplier.contact_person || '').toLowerCase().includes(cleanQuery);
    const emailMatch = (supplier.email || '').toLowerCase().includes(cleanQuery);
    const categoryMatch = (supplier.category || '').toLowerCase().includes(cleanQuery);
    const phoneMatch = (supplier.phone || '').includes(cleanQuery);

    if (nameMatch || contactMatch || emailMatch || categoryMatch || phoneMatch) {
      matchingSuppliers.push({
        id: supplier.id,
        type: 'SUPPLIER',
        title: supplier.name,
        subtitle: `${supplier.contact_person || 'Sales Contact'} • ${supplier.email}`,
        category: supplier.category || 'Vendor Partner',
        metadata: {
          rating: supplier.rating || 4.8,
          contactPerson: supplier.contact_person,
          email: supplier.email,
          phone: supplier.phone
        }
      });
    }
  });

  const totalCount = matchingComponents.length + matchingFolders.length + matchingSuppliers.length;

  return {
    query: cleanQuery,
    components: matchingComponents,
    folders: matchingFolders,
    suppliers: matchingSuppliers,
    totalCount
  };
}
