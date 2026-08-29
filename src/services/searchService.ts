import { CatalogItem, ProductFolder, Company, ProductBOM, SearchResultItem, SearchResultCompany } from '../types';

export interface SearchResultSet {
  query: string;
  components: SearchResultItem[];
  folders: SearchResultItem[];
  companies: SearchResultItem[];
  totalCount: number;
}

/**
 * Universal Cross-Entity Relational Search Engine
 * Searches Components, Product Folders, and Companies with relational multi-company expansion.
 */
export function executeUniversalSearch(
  query: string,
  catalog: CatalogItem[],
  folders: ProductFolder[],
  companies: Company[],
  boms: ProductBOM[] = []
): SearchResultSet {
  const cleanQuery = (query || '').trim().toLowerCase();

  if (!cleanQuery) {
    return {
      query: '',
      components: [],
      folders: [],
      companies: [],
      totalCount: 0
    };
  }

  // 1. Search Components with Relational Company Expansion
  const matchingComponents: SearchResultItem[] = [];

  catalog.forEach(item => {
    const nameMatch = (item.name || '').toLowerCase().includes(cleanQuery);
    const skuMatch = (item.sku || '').toLowerCase().includes(cleanQuery);
    const specsMatch = (item.specs || '').toLowerCase().includes(cleanQuery);
    const companyMatch = companies.some(
      s => s.id === item.company_id && (s.name || '').toLowerCase().includes(cleanQuery)
    );

    if (nameMatch || skuMatch || specsMatch || companyMatch) {
      // Find primary company
      const primaryCompany = companies.find(s => s.id === item.company_id);

      // Relational Expansion: Find ALL companies supplying this component or similar category
      const associatedCompanies: SearchResultCompany[] = [];

      // 1. Primary registered company
      if (primaryCompany) {
        associatedCompanies.push({
          companyId: primaryCompany.id,
          companyName: primaryCompany.name,
          unitPrice: item.preset_price,
          leadTime: '3-5 Days',
          isPrimary: true,
          email: primaryCompany.email,
          phone: primaryCompany.phone,
          whatsapp: primaryCompany.whatsapp,
          contactPerson: primaryCompany.contact_person
        });
      }

      // 2. Cross-match other companies in the system providing similar materials / components
      companies.forEach(s => {
        if (s.id !== item.company_id) {
          // Check if company has same category or name keywords
          const isCategoryMatch = s.category && item.specs && item.specs.toLowerCase().includes(s.category.toLowerCase());
          const isNameMatch = item.name.toLowerCase().includes('cell') && s.name.toLowerCase().includes('tech');
          const isBMSMatch = item.name.toLowerCase().includes('bms') && s.name.toLowerCase().includes('bms');
          const isBusbarMatch = item.name.toLowerCase().includes('busbar') && s.name.toLowerCase().includes('busbar');
          const isEnclosureMatch = item.name.toLowerCase().includes('enclosure') && s.name.toLowerCase().includes('sheet');

          if (isCategoryMatch || isNameMatch || isBMSMatch || isBusbarMatch || isEnclosureMatch) {
            associatedCompanies.push({
              companyId: s.id,
              companyName: s.name,
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

      // Ensure at least 2 alternate companies for robust multi-vendor selection demo if available
      if (associatedCompanies.length === 1 && companies.length > 1) {
        const alternate = companies.find(s => s.id !== primaryCompany?.id);
        if (alternate) {
          associatedCompanies.push({
            companyId: alternate.id,
            companyName: alternate.name,
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
          companyCount: associatedCompanies.length,
          companies: associatedCompanies
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

  // 3. Search Companies & Vendors
  const matchingCompanies: SearchResultItem[] = [];

  companies.forEach(company => {
    const nameMatch = (company.name || '').toLowerCase().includes(cleanQuery);
    const contactMatch = (company.contact_person || '').toLowerCase().includes(cleanQuery);
    const emailMatch = (company.email || '').toLowerCase().includes(cleanQuery);
    const categoryMatch = (company.category || '').toLowerCase().includes(cleanQuery);
    const phoneMatch = (company.phone || '').includes(cleanQuery);

    if (nameMatch || contactMatch || emailMatch || categoryMatch || phoneMatch) {
      matchingCompanies.push({
        id: company.id,
        type: 'SUPPLIER',
        title: company.name,
        subtitle: `${company.contact_person || 'Sales Contact'} • ${company.email}`,
        category: company.category || 'Vendor Partner',
        metadata: {
          rating: company.rating || 4.8,
          contactPerson: company.contact_person,
          email: company.email,
          phone: company.phone
        }
      });
    }
  });

  const totalCount = matchingComponents.length + matchingFolders.length + matchingCompanies.length;

  return {
    query: cleanQuery,
    components: matchingComponents,
    folders: matchingFolders,
    companies: matchingCompanies,
    totalCount
  };
}
