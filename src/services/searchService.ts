import { CatalogItem, ProductFolder, Company, ProductBOM, ProcurementOrder, SearchResultItem, SearchResultCompany } from '../types';

export interface SearchResultSet {
  query: string;
  components: SearchResultItem[];
  folders: SearchResultItem[];
  companies: SearchResultItem[];
  orders: SearchResultItem[];
  totalCount: number;
}

/**
 * Universal Master Data Cross-Entity Relational Search Engine
 * Searches Components, Product Folders, Companies, and Procurement Orders/Invoices.
 */
export function executeUniversalSearch(
  query: string,
  catalog: CatalogItem[],
  folders: ProductFolder[],
  companies: Company[],
  boms: ProductBOM[] = [],
  orders: ProcurementOrder[] = []
): SearchResultSet {
  const cleanQuery = (query || '').trim().toLowerCase();

  if (!cleanQuery) {
    return {
      query: '',
      components: [],
      folders: [],
      companies: [],
      orders: [],
      totalCount: 0
    };
  }

  // 1. Search Components with Relational Company Expansion
  const matchingComponents: SearchResultItem[] = [];

  catalog.forEach(item => {
    const nameMatch = (item.name || '').toLowerCase().includes(cleanQuery);
    const skuMatch = (item.sku || '').toLowerCase().includes(cleanQuery);
    const specsMatch = (item.specs || '').toLowerCase().includes(cleanQuery);
    const catMatch = (item.category || '').toLowerCase().includes(cleanQuery);
    const companyMatch = companies.some(
      s => s.id === item.company_id && (s.name || '').toLowerCase().includes(cleanQuery)
    );

    if (nameMatch || skuMatch || specsMatch || catMatch || companyMatch) {
      const primaryCompany = companies.find(s => s.id === item.company_id);
      const associatedCompanies: SearchResultCompany[] = [];

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

      companies.forEach(s => {
        if (s.id !== item.company_id) {
          const isCategoryMatch = s.category && item.category && s.category.toLowerCase() === item.category.toLowerCase();
          if (isCategoryMatch) {
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

      matchingComponents.push({
        id: item.id,
        type: 'COMPONENT',
        title: item.name,
        subtitle: `${item.sku || 'SKU'} • ${item.category || 'Component'} • ${item.specs || ''}`,
        category: item.category || 'Component',
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

    const hasMatchingChild = (folder.components || []).some(comp => {
      const cat = catalog.find(c => c.id === comp.item_id);
      return cat && (cat.name.toLowerCase().includes(cleanQuery) || (cat.sku || '').toLowerCase().includes(cleanQuery));
    });

    if (nameMatch || descMatch || hasMatchingChild) {
      matchingFolders.push({
        id: folder.id,
        type: 'PRODUCT_FOLDER',
        title: folder.name,
        subtitle: folder.description || 'Product Recipe Folder',
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
    const gstinMatch = (company.gstin || '').toLowerCase().includes(cleanQuery);

    if (nameMatch || contactMatch || emailMatch || categoryMatch || phoneMatch || gstinMatch) {
      matchingCompanies.push({
        id: company.id,
        type: 'SUPPLIER',
        title: company.name,
        subtitle: `${company.contact_person || 'Sales'} • ${company.category || 'Vendor'} • ${company.email}`,
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

  // 4. Search Procurement Orders & Invoices
  const matchingOrders: SearchResultItem[] = [];

  orders.forEach(order => {
    const numMatch = (order.order_number || '').toLowerCase().includes(cleanQuery);
    const suppMatch = (order.company?.name || '').toLowerCase().includes(cleanQuery);
    const notesMatch = (order.notes || '').toLowerCase().includes(cleanQuery);
    const creatorMatch = (order.created_by || '').toLowerCase().includes(cleanQuery);
    const statusMatch = (order.status || '').toLowerCase().includes(cleanQuery);
    const amountMatch = (order.total_amount || '').toString().includes(cleanQuery);

    if (numMatch || suppMatch || notesMatch || creatorMatch || statusMatch || amountMatch) {
      matchingOrders.push({
        id: order.id,
        type: 'ORDER',
        title: `${order.type} #${order.order_number}`,
        subtitle: `To: ${order.company?.name || 'Vendor'} • Total: ₹${Number(order.total_amount).toLocaleString('en-IN')} • Status: ${order.status}`,
        category: 'Procurement Order',
        metadata: {
          orderNumber: order.order_number,
          orderType: order.type,
          status: order.status,
          totalAmount: order.total_amount,
          notes: order.notes,
          companyName: order.company?.name
        }
      });
    }
  });

  const totalCount = matchingComponents.length + matchingFolders.length + matchingCompanies.length + matchingOrders.length;

  return {
    query: cleanQuery,
    components: matchingComponents,
    folders: matchingFolders,
    companies: matchingCompanies,
    orders: matchingOrders,
    totalCount
  };
}
