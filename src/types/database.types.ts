export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      components: {
        Row: {
          id: string
          name: string
          sku: string | null
          category: string | null
          category_id: string | null
          specs: string | null
          uom: string | null
          preset_price: number | null
          supplier_id: string | null
          min_order_qty: number | null
          in_stock_qty: number | null
          procurement_status: string | null
          alert_threshold_percent: number | null
          image_drive_url: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          sku?: string | null
          category?: string | null
          category_id?: string | null
          specs?: string | null
          uom?: string | null
          preset_price?: number | null
          supplier_id?: string | null
          min_order_qty?: number | null
          in_stock_qty?: number | null
          procurement_status?: string | null
          alert_threshold_percent?: number | null
          image_drive_url?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          sku?: string | null
          category?: string | null
          category_id?: string | null
          specs?: string | null
          uom?: string | null
          preset_price?: number | null
          supplier_id?: string | null
          min_order_qty?: number | null
          in_stock_qty?: number | null
          procurement_status?: string | null
          alert_threshold_percent?: number | null
          image_drive_url?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          contact_person: string | null
          email: string | null
          phone: string | null
          whatsapp: string | null
          buying_url: string | null
          address: string | null
          category: string | null
          rating: number | null
          gstin: string | null
          payment_terms: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          whatsapp?: string | null
          buying_url?: string | null
          address?: string | null
          category?: string | null
          rating?: number | null
          gstin?: string | null
          payment_terms?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          whatsapp?: string | null
          buying_url?: string | null
          address?: string | null
          category?: string | null
          rating?: number | null
          gstin?: string | null
          payment_terms?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      component_suppliers: {
        Row: {
          id: string
          component_id: string
          supplier_id: string
          unit_price: number
          rfq_quoted_price: number | null
          moq: number
          lead_time_days: number
          part_number_vendor: string | null
          external_rating: number
          review_summary: string | null
          rating_sources: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          component_id: string
          supplier_id: string
          unit_price: number
          rfq_quoted_price?: number | null
          moq?: number
          lead_time_days?: number
          part_number_vendor?: string | null
          external_rating?: number
          review_summary?: string | null
          rating_sources?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          component_id?: string
          supplier_id?: string
          unit_price?: number
          rfq_quoted_price?: number | null
          moq?: number
          lead_time_days?: number
          part_number_vendor?: string | null
          external_rating?: number
          review_summary?: string | null
          rating_sources?: Json
          created_at?: string
          updated_at?: string
        }
      }
      procurement_orders: {
        Row: {
          id: string
          po_number: string
          supplier_id: string | null
          supplier_name: string | null
          items: Json
          status: string
          total_amount: number
          created_at: string
          channel_dispatched: string | null
        }
        Insert: {
          id?: string
          po_number: string
          supplier_id?: string | null
          supplier_name?: string | null
          items: Json
          status?: string
          total_amount?: number
          created_at?: string
          channel_dispatched?: string | null
        }
        Update: {
          id?: string
          po_number?: string
          supplier_id?: string | null
          supplier_name?: string | null
          items?: Json
          status?: string
          total_amount?: number
          created_at?: string
          channel_dispatched?: string | null
        }
      }
    }
  }
}
