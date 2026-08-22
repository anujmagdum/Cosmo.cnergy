export type OrderStatus = 'TO_BE_ORDERED' | 'RFQ_SENT' | 'ORDERED' | 'DELIVERED' | 'ON_HOLD';

export interface OrderStatusConfig {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  iconName: string;
}

export const STATUS_MAP: Record<OrderStatus, OrderStatusConfig> = {
  TO_BE_ORDERED: {
    label: 'To Be Ordered',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-300',
    dotColor: 'bg-amber-500',
    iconName: 'Clock'
  },
  RFQ_SENT: {
    label: 'RFQ Sent',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-300',
    dotColor: 'bg-blue-500',
    iconName: 'Send'
  },
  ORDERED: {
    label: 'PO Issued / Ordered',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    badgeBorder: 'border-purple-300',
    dotColor: 'bg-purple-500',
    iconName: 'CheckCircle2'
  },
  DELIVERED: {
    label: 'Delivered',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-300',
    dotColor: 'bg-emerald-500',
    iconName: 'PackageCheck'
  },
  ON_HOLD: {
    label: 'On Hold',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-800',
    badgeBorder: 'border-red-300',
    dotColor: 'bg-red-500',
    iconName: 'AlertTriangle'
  }
};

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

export interface ProductFolderComponent {
  item_id: string;
  qty_per_unit: number;
}

export interface ProductFolder {
  id: string;
  name: string;
  description?: string;
  linked_po_ids: string[];
  components?: ProductFolderComponent[];
  created_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  whatsapp?: string;
  buying_url?: string;
  address?: string;
  category?: string;
  category_id?: string;
  rating?: number;
  gstin?: string;
  payment_terms?: string;
  created_at?: string;
}

// In Add Component schema: only 'name' is required; all other fields are nullable/optional
export interface CatalogItem {
  id: string;
  name: string; // REQUIRED
  sku?: string;
  category?: string;
  category_id?: string;
  specs?: string;
  uom?: string;
  preset_price?: number;
  supplier_id?: string;
  supplier?: Supplier;
  min_order_qty?: number;
  in_stock_qty?: number;
  supplier_url?: string;
  procurement_status?: OrderStatus;
  created_at?: string;
}

export interface WebmailAccount {
  id: string;
  email: string;
  senderName: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  username: string;
  password?: string;
  isDefault?: boolean;
}

export interface EmailAttachment {
  filename: string;
  size: string;
  type: string;
  dataBase64?: string;
}

export interface EmailMessage {
  id: string;
  accountEmail: string;
  folder: 'inbox' | 'sent' | 'starred' | 'drafts' | 'trash';
  from: string;
  to: string;
  cc?: string;
  subject: string;
  date: string;
  timestamp: number;
  snippet: string;
  bodyHtml: string;
  isUnread: boolean;
  isStarred: boolean;
  hasAttachments?: boolean;
  attachments?: EmailAttachment[];
}

export interface QueuedMailDraft {
  id: string;
  supplier: Supplier;
  to: string;
  subject: string;
  body: string;
  context?: string;
  productName?: string;
  totalAmount?: number;
  itemsCount?: number;
  orderToConfirm?: any;
}

export interface ProductBOM {
  id: string;
  product_name: string;
  product_code: string;
  raw_material_id: string;
  raw_material?: CatalogItem;
  qty_per_unit: number;
  notes?: string;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  item_id: string;
  item?: CatalogItem;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ProcurementOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  supplier?: Supplier;
  type: 'PO' | 'RFQ';
  status: OrderStatus;
  total_amount: number;
  notes?: string;
  created_by: string;
  pdf_url?: string;
  created_at: string;
  updated_at?: string;
  items?: OrderItem[];
}

export type OrderType = 'RFQ' | 'PO';

export function determineOrderType(context: string, colorCodeState?: string): OrderType {
  if (context === 'CATALOG_BOM') {
    return 'PO';
  }
  
  if (context === 'LIVE_ORDER') {
    if (colorCodeState === 'TO_BE_ORDERED') {
      return 'RFQ';
    }
    if (colorCodeState === 'RFQ_SENT') {
      return 'PO';
    }
  }

  return 'RFQ';
}

export function formatProcurementSubject(orderType: OrderType, productName: string): string {
  const name = productName || 'Inventory Components';
  if (orderType === 'RFQ') {
    return `Request for Quotation (RFQ) - ${name}`;
  }
  return `Purchase Order (PO) - ${name}`;
}

export interface MultiSupplierPODraft {
  supplier: Supplier;
  items: {
    catalogItem: CatalogItem;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
  total_amount: number;
}

export interface SearchResultSupplier {
  supplierId: string;
  supplierName: string;
  unitPrice?: number;
  leadTime?: string;
  isPrimary?: boolean;
  email?: string;
  phone?: string;
  whatsapp?: string;
  contactPerson?: string;
}

export interface SearchResultItem {
  id: string;
  type: 'COMPONENT' | 'PRODUCT_FOLDER' | 'SUPPLIER';
  title: string;
  subtitle?: string;
  category?: string;
  metadata?: {
    partNumber?: string;
    folderPath?: string;
    sku?: string;
    specs?: string;
    presetPrice?: number;
    uom?: string;
    inStockQty?: number;
    supplierCount?: number;
    suppliers?: SearchResultSupplier[];
    folderComponentsCount?: number;
    linkedPosCount?: number;
    rating?: number;
    contactPerson?: string;
    email?: string;
    phone?: string;
  };
}
