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
 * Normalizes text for resilient fuzzy matching by stripping non-alphanumeric characters,
 * spaces, dashes, slashes, and symbols.
 * Example: "LiFePO4-48V-100Ah" -> "lifepo448v100ah"
 */
export function normalizeFuzzy(text: string): string {
  return (text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Multi-token & fuzzy substring matcher.
 * Matches if:
 * 1. Target contains the full normalized query (handles dashes/spaces variations e.g. "lifepo4 48v" matches "LiFePO4-48V-100Ah")
 * 2. Every whitespace/delimiter token in the query matches in target
 */
export function isFuzzyMatch(targetText: string, queryTokens: string[], normalizedQuery: string): boolean {
  if (!targetText) return false;
  const normalizedTarget = normalizeFuzzy(targetText);
  if (normalizedTarget.includes(normalizedQuery)) return true;

  if (queryTokens.length > 1) {
    return queryTokens.every(token => {
      const normToken = normalizeFuzzy(token);
      return normToken ? normalizedTarget.includes(normToken) : true;
    });
  }

  return false;
}

/**
 * Universal Master Data Cross-Entity Relational Search Engine
 * Features resilient fuzzy part-number & multi-term matching across Components,
 * Companies, Product Folders, and Procurement Orders.
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
  const normalizedQuery = normalizeFuzzy(cleanQuery);
  const queryTokens = cleanQuery.split(/[\s\-_/,.+:]+/).filter(Boolean);

  if (!cleanQuery || !normalizedQuery) {
    return {
      query: '',
      components: [],
      folders: [],
      companies: [],
      orders: [],
      totalCount: 0
    };
  }

  // 1. Search Components with Fuzzy Part Number & Relational Company Expansion
  const matchingComponents: SearchResultItem[] = [];

  catalog.forEach(item => {
    const combinedSearchable = `${item.name} ${item.sku || ''} ${item.specs || ''} ${item.category || ''}`;
    const primaryCompany = companies.find(s => s.id === item.company_id);
    const fullText = `${combinedSearchable} ${primaryCompany?.name || ''}`;

    const isMatch =
      fullText.toLowerCase().includes(cleanQuery) ||
      isFuzzyMatch(fullText, queryTokens, normalizedQuery);

    if (isMatch) {
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
    const fullFolderText = `${folder.name} ${folder.description || ''}`;
    const folderMatch =
      fullFolderText.toLowerCase().includes(cleanQuery) ||
      isFuzzyMatch(fullFolderText, queryTokens, normalizedQuery);

    const hasMatchingChild = (folder.components || []).some(comp => {
      const cat = catalog.find(c => c.id === comp.item_id);
      if (!cat) return false;
      const childText = `${cat.name} ${cat.sku || ''}`;
      return childText.toLowerCase().includes(cleanQuery) || isFuzzyMatch(childText, queryTokens, normalizedQuery);
    });

    if (folderMatch || hasMatchingChild) {
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
    const fullCompanyText = `${company.name} ${company.contact_person || ''} ${company.email || ''} ${company.phone || ''} ${company.category || ''} ${company.gstin || ''} ${company.address || ''}`;
    const companyMatch =
      fullCompanyText.toLowerCase().includes(cleanQuery) ||
      isFuzzyMatch(fullCompanyText, queryTokens, normalizedQuery);

    if (companyMatch) {
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
    const fullOrderText = `${order.order_number} ${order.company?.name || ''} ${order.notes || ''} ${order.created_by || ''} ${order.status} ${order.type} ${order.total_amount}`;
    const orderMatch =
      fullOrderText.toLowerCase().includes(cleanQuery) ||
      isFuzzyMatch(fullOrderText, queryTokens, normalizedQuery);

    if (orderMatch) {
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
