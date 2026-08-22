import { Supplier, CatalogItem, ProductBOM, ProcurementOrder, ProductFolder } from '../types';

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'CellTech Energy Systems',
    contact_person: 'Rajesh Sharma',
    email: 'sales@celltechenergy.com',
    phone: '+91 98765 43210',
    whatsapp: '919876543210',
    buying_url: 'https://celltechenergy.com/portal',
    address: 'Plot 45, Electronics City Phase 1, Bengaluru',
    category: 'Battery Cells',
    rating: 4.8
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'BMS Master Solutions',
    contact_person: 'Anita Desai',
    email: 'orders@bmsmasters.com',
    phone: '+91 98123 45678',
    whatsapp: '919812345678',
    buying_url: 'https://bmsmasters.com/b2b',
    address: 'Sector 62, Tech Zone, Noida',
    category: 'Electronics / BMS',
    rating: 4.9
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Busbar & Connector Corp',
    contact_person: 'Vikram Verma',
    email: 'supply@busbarcorp.com',
    phone: '+91 99887 76655',
    whatsapp: '919988776655',
    buying_url: 'https://busbarcorp.com/store',
    address: 'GIDC Industrial Estate, Vadodara',
    category: 'Connectors & Busbars',
    rating: 4.6
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'ThermalShield Enclosures',
    contact_person: 'Sanjay Gupta',
    email: 'info@thermalshield.in',
    phone: '+91 97654 32109',
    whatsapp: '919765432109',
    buying_url: 'https://thermalshield.in/portal',
    address: 'Ambattur Industrial Estate, Chennai',
    category: 'Metal Enclosures',
    rating: 4.7
  }
];

export const INITIAL_CATALOG: CatalogItem[] = [
  {
    id: 'c1111111-1111-1111-1111-111111111111',
    sku: 'CELL-3.2V-100AH',
    name: '3.2V 100Ah LFP Grade A Cell',
    category: 'Battery Cells',
    category_id: 'catg-1',
    specs: 'LiFePO4, 3.2V, 100Ah, 6000 Cycles, M6 Terminals',
    uom: 'Pcs',
    preset_price: 2850.00,
    supplier_id: '11111111-1111-1111-1111-111111111111',
    min_order_qty: 16,
    in_stock_qty: 640,
    procurement_status: 'TO_BE_ORDERED'
  },
  {
    id: 'c2222222-2222-2222-2222-222222222222',
    sku: 'BMS-16S-100A',
    name: '16S 100A Smart Bluetooth BMS',
    category: 'Electronics / BMS',
    category_id: 'catg-2',
    specs: 'UART/CAN Bus, Active Balancing 1A, Temp Sensors',
    uom: 'Pcs',
    preset_price: 3400.00,
    supplier_id: '22222222-2222-2222-2222-222222222222',
    min_order_qty: 1,
    in_stock_qty: 45,
    procurement_status: 'TO_BE_ORDERED'
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    sku: 'BUS-CU-100A',
    name: 'Flexible Copper Busbar 100A',
    category: 'Connectors & Busbars',
    category_id: 'catg-3',
    specs: 'Nickel Plated Copper, Hole Pitch 65mm',
    uom: 'Pcs',
    preset_price: 85.00,
    supplier_id: '33333333-3333-3333-3333-333333333333',
    min_order_qty: 15,
    in_stock_qty: 800,
    procurement_status: 'TO_BE_ORDERED'
  },
  {
    id: 'c4444444-4444-4444-4444-444444444444',
    sku: 'ENC-51V-METAL',
    name: 'Heavy Duty Steel Cabinet 51.2V',
    category: 'Metal Enclosures',
    category_id: 'catg-4',
    specs: 'IP65 Rated, Powder Coated, Handles & Display Cutout',
    uom: 'Set',
    preset_price: 4500.00,
    supplier_id: '44444444-4444-4444-4444-444444444444',
    min_order_qty: 1,
    in_stock_qty: 20,
    procurement_status: 'TO_BE_ORDERED'
  },
  {
    id: 'c5555555-5555-5555-5555-555555555555',
    sku: 'WIRE-HARN-100A',
    name: 'High Current Wire Harness 4AWG',
    category: 'Wiring & Harnesses',
    category_id: 'catg-5',
    specs: 'Silicone Insulated, Amphenol Connectors',
    uom: 'Set',
    preset_price: 420.00,
    supplier_id: '33333333-3333-3333-3333-333333333333',
    min_order_qty: 1,
    in_stock_qty: 120,
    procurement_status: 'TO_BE_ORDERED'
  }
];

export const INITIAL_BOMS: ProductBOM[] = [
  {
    id: 'b1',
    product_name: '51.2V 100Ah Solar Energy Storage Pack',
    product_code: 'PACK-51.2V-100AH',
    raw_material_id: 'c1111111-1111-1111-1111-111111111111',
    qty_per_unit: 16,
    notes: '16 cells required for 16S series connection'
  },
  {
    id: 'b2',
    product_name: '51.2V 100Ah Solar Energy Storage Pack',
    product_code: 'PACK-51.2V-100AH',
    raw_material_id: 'c2222222-2222-2222-2222-222222222222',
    qty_per_unit: 1,
    notes: '1 Smart BMS controller per pack'
  },
  {
    id: 'b3',
    product_name: '51.2V 100Ah Solar Energy Storage Pack',
    product_code: 'PACK-51.2V-100AH',
    raw_material_id: 'c3333333-3333-3333-3333-333333333333',
    qty_per_unit: 15,
    notes: '15 inter-cell busbars required'
  },
  {
    id: 'b4',
    product_name: '51.2V 100Ah Solar Energy Storage Pack',
    product_code: 'PACK-51.2V-100AH',
    raw_material_id: 'c4444444-4444-4444-4444-444444444444',
    qty_per_unit: 1,
    notes: '1 Metal Enclosure Box'
  },
  {
    id: 'b5',
    product_name: '51.2V 100Ah Solar Energy Storage Pack',
    product_code: 'PACK-51.2V-100AH',
    raw_material_id: 'c5555555-5555-5555-5555-555555555555',
    qty_per_unit: 1,
    notes: '1 Internal silicone wiring harness'
  }
];

export const INITIAL_ORDERS: ProcurementOrder[] = [
  {
    id: 'po111111-1111-1111-1111-111111111111',
    order_number: 'PO-2026-0801',
    supplier_id: '11111111-1111-1111-1111-111111111111',
    supplier: INITIAL_SUPPLIERS[0],
    type: 'PO',
    status: 'ORDERED',
    total_amount: 45600.00,
    notes: 'Order for 16x LFP cells for Pack Assembly Batch A',
    created_by: 'Anuj Procurement Manager',
    created_at: '2026-08-01T10:30:00Z',
    items: [
      {
        item_id: 'c1111111-1111-1111-1111-111111111111',
        item: INITIAL_CATALOG[0],
        quantity: 16,
        unit_price: 2850.00,
        total_price: 45600.00
      }
    ]
  },
  {
    id: 'po222222-2222-2222-2222-222222222222',
    order_number: 'RFQ-2026-0802',
    supplier_id: '22222222-2222-2222-2222-222222222222',
    supplier: INITIAL_SUPPLIERS[1],
    type: 'RFQ',
    status: 'RFQ_SENT',
    total_amount: 34000.00,
    notes: 'RFQ for 10x 16S Smart BMS units',
    created_by: 'Anuj Procurement Manager',
    created_at: '2026-08-02T14:15:00Z',
    items: [
      {
        item_id: 'c2222222-2222-2222-2222-222222222222',
        item: INITIAL_CATALOG[1],
        quantity: 10,
        unit_price: 3400.00,
        total_price: 34000.00
      }
    ]
  },
  {
    id: 'po333333-3333-3333-3333-333333333333',
    order_number: 'PO-2026-0803',
    supplier_id: '33333333-3333-3333-3333-333333333333',
    supplier: INITIAL_SUPPLIERS[2],
    type: 'PO',
    status: 'TO_BE_ORDERED',
    total_amount: 1275.00,
    notes: 'Pending purchase of 15x Busbars',
    created_by: 'Production Team',
    created_at: '2026-08-03T09:00:00Z',
    items: [
      {
        item_id: 'c3333333-3333-3333-3333-333333333333',
        item: INITIAL_CATALOG[2],
        quantity: 15,
        unit_price: 85.00,
        total_price: 1275.00
      }
    ]
  }
];

export const INITIAL_FOLDERS: ProductFolder[] = [
  {
    id: 'f-512v-100ah',
    name: '51.2V 100Ah Pack Assembly',
    description: 'High-density 16S LFP energy storage pack recipe',
    linked_po_ids: ['po111111-1111-1111-1111-111111111111', 'po222222-2222-2222-2222-222222222222'],
    components: [
      { item_id: 'c1111111-1111-1111-1111-111111111111', qty_per_unit: 16 },
      { item_id: 'c2222222-2222-2222-2222-222222222222', qty_per_unit: 1 },
      { item_id: 'c3333333-3333-3333-3333-333333333333', qty_per_unit: 15 },
      { item_id: 'c4444444-4444-4444-4444-444444444444', qty_per_unit: 1 }
    ],
    created_at: '2026-08-01T10:00:00Z'
  },
  {
    id: 'f-48v-200ah',
    name: '48V 200Ah Telecom Rack Unit',
    description: '15S2P Telecom backup power assembly recipe',
    linked_po_ids: [],
    components: [
      { item_id: 'c1111111-1111-1111-1111-111111111111', qty_per_unit: 30 },
      { item_id: 'c2222222-2222-2222-2222-222222222222', qty_per_unit: 1 }
    ],
    created_at: '2026-08-02T11:30:00Z'
  }
];
