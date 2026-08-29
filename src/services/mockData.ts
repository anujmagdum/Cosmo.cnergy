import { Company, CatalogItem, ProductBOM, ProcurementOrder, ProductFolder, ComponentCompany } from '../types';

export const INITIAL_SUPPLIERS: Company[] = [
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
    company_id: '11111111-1111-1111-1111-111111111111',
    min_order_qty: 16,
    in_stock_qty: 640,
    procurement_status: 'TO_BE_ORDERED',
    image_drive_url: 'https://drive.google.com/file/d/1Bzi4f03-P2k9i2bY1Z3f9b8c7d6e5a4/view?usp=sharing'
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
    company_id: '22222222-2222-2222-2222-222222222222',
    min_order_qty: 1,
    in_stock_qty: 45,
    procurement_status: 'TO_BE_ORDERED',
    image_drive_url: 'https://drive.google.com/file/d/18yqV9Z2_bX3cW4e5f6g7h8i9j0k1l2m/view?usp=sharing'
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
    company_id: '33333333-3333-3333-3333-333333333333',
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
    company_id: '44444444-4444-4444-4444-444444444444',
    min_order_qty: 1,
    in_stock_qty: 20,
    procurement_status: 'TO_BE_ORDERED',
    image_drive_url: 'https://drive.google.com/file/d/1234567890abcdefghijklmnopqrstuvwxyz/view?usp=sharing'
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
    company_id: '33333333-3333-3333-3333-333333333333',
    min_order_qty: 1,
    in_stock_qty: 120,
    procurement_status: 'TO_BE_ORDERED'
  }
];

export const INITIAL_COMPONENT_SUPPLIERS: ComponentCompany[] = [
  // Competitors for 3.2V 100Ah LFP Grade A Cell (c1111111)
  {
    id: 'cs-1',
    component_id: 'c1111111-1111-1111-1111-111111111111',
    company_id: '11111111-1111-1111-1111-111111111111', // CellTech Energy
    unit_price: 2850.00,
    rfq_quoted_price: 2750.00,
    moq: 16,
    lead_time_days: 5,
    part_number_vendor: 'LF105-CATL-SPEC',
    external_rating: 4.8,
    review_summary: 'Consistently Grade A internal resistance (<0.32mΩ) and timely Bangalore dispatch.',
    rating_sources: { indiamart: 4.9, google_maps: 4.8, amazon: 4.7, tradeindia: 4.8 }
  },
  {
    id: 'cs-2',
    component_id: 'c1111111-1111-1111-1111-111111111111',
    company_id: '22222222-2222-2222-2222-222222222222', // BMS Master Solutions
    unit_price: 2950.00,
    rfq_quoted_price: 2890.00,
    moq: 32,
    lead_time_days: 7,
    part_number_vendor: 'EVE-100AH-PRISMATIC',
    external_rating: 4.6,
    review_summary: 'Authorized distributor, certified batch test certificates provided on delivery.',
    rating_sources: { indiamart: 4.7, google_maps: 4.4, amazon: 4.5, moglix: 4.6 }
  },
  {
    id: 'cs-3',
    component_id: 'c1111111-1111-1111-1111-111111111111',
    company_id: '33333333-3333-3333-3333-333333333333', // Busbar Corp
    unit_price: 3100.00,
    rfq_quoted_price: 2920.00,
    moq: 8,
    lead_time_days: 10,
    part_number_vendor: 'GENERIC-LFP-100',
    external_rating: 4.2,
    review_summary: 'Reliable secondary company, lower MOQ but slightly higher price.',
    rating_sources: { indiamart: 4.3, google_maps: 4.1, tradeindia: 4.2 }
  },
  // Competitors for 16S 100A Smart Bluetooth BMS (c2222222)
  {
    id: 'cs-4',
    component_id: 'c2222222-2222-2222-2222-222222222222',
    company_id: '22222222-2222-2222-2222-222222222222', // BMS Master
    unit_price: 3400.00,
    rfq_quoted_price: 3250.00,
    moq: 1,
    lead_time_days: 3,
    part_number_vendor: 'DALY-16S-100A-SMART',
    external_rating: 4.9,
    review_summary: 'Direct OEM tier partner, full Bluetooth app calibration support and warranty.',
    rating_sources: { indiamart: 4.9, google_maps: 4.9, amazon: 4.8, moglix: 4.9 }
  },
  {
    id: 'cs-5',
    component_id: 'c2222222-2222-2222-2222-222222222222',
    company_id: '11111111-1111-1111-1111-111111111111', // CellTech
    unit_price: 3550.00,
    rfq_quoted_price: 3480.00,
    moq: 5,
    lead_time_days: 6,
    part_number_vendor: 'JBD-16S-100A-UART',
    external_rating: 4.7,
    review_summary: 'JBD smart board with solid thermal cutoff accuracy, quick technical support.',
    rating_sources: { indiamart: 4.7, google_maps: 4.6, amazon: 4.5 }
  },
  // Competitors for Flexible Copper Busbar (c3333333)
  {
    id: 'cs-6',
    component_id: 'c3333333-3333-3333-3333-333333333333',
    company_id: '33333333-3333-3333-3333-333333333333', // Busbar Corp
    unit_price: 85.00,
    rfq_quoted_price: 78.00,
    moq: 20,
    lead_time_days: 2,
    part_number_vendor: 'BUS-CU-NICKEL-65MM',
    external_rating: 4.7,
    review_summary: 'Extremely fast 48h dispatch from Vadodara with clean nickel plating.',
    rating_sources: { indiamart: 4.8, google_maps: 4.6, tradeindia: 4.7, industrybuying: 4.6 }
  },
  {
    id: 'cs-7',
    component_id: 'c3333333-3333-3333-3333-333333333333',
    company_id: '44444444-4444-4444-4444-444444444444', // ThermalShield
    unit_price: 92.00,
    rfq_quoted_price: 88.00,
    moq: 50,
    lead_time_days: 5,
    part_number_vendor: 'CU-BAR-EXT-100',
    external_rating: 4.5,
    review_summary: 'Good conductivity, bundled packaging available with fasteners.',
    rating_sources: { indiamart: 4.5, google_maps: 4.4, amazon: 4.3 }
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
    company_id: '11111111-1111-1111-1111-111111111111',
    company: INITIAL_SUPPLIERS[0],
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
    company_id: '22222222-2222-2222-2222-222222222222',
    company: INITIAL_SUPPLIERS[1],
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
    company_id: '33333333-3333-3333-3333-333333333333',
    company: INITIAL_SUPPLIERS[2],
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
