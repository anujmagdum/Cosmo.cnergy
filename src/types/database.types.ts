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
      catalog_items: {
        Row: {
          id: string
          name: string
          sku: string | null
          category: string | null
          category_id: string | null
          specs: string | null
          uom: string | null
          preset_price: number | null
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
          min_order_qty?: number | null
          in_stock_qty?: number | null
          procurement_status?: string | null
          alert_threshold_percent?: number | null
          image_drive_url?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
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
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
          min_order_qty?: number | null
          in_stock_qty?: number | null
          procurement_status?: string | null
          alert_threshold_percent?: number | null
          image_drive_url?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      companies: {
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
          categories: string[] | null
          category_id: string | null
          rating: number | null
          gstin: string | null
          payment_terms: string | null
          remark: string | null
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
          categories?: string[] | null
          category_id?: string | null
          rating?: number | null
          gstin?: string | null
          payment_terms?: string | null
          remark?: string | null
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
          categories?: string[] | null
          category_id?: string | null
          rating?: number | null
          gstin?: string | null
          payment_terms?: string | null
          remark?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      component_companies: {
        Row: {
          id: string
          component_id: string
          company_id: string
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
          company_id: string
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
          company_id?: string
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
      product_folders: {
        Row: {
          id: string
          name: string
          description: string | null
          linked_po_ids: string[] | null
          components: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          linked_po_ids?: string[] | null
          components?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          linked_po_ids?: string[] | null
          components?: Json | null
          created_at?: string
        }
      }
      product_boms: {
        Row: {
          id: string
          product_name: string
          product_code: string
          raw_material_id: string
          qty_per_unit: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_name: string
          product_code: string
          raw_material_id: string
          qty_per_unit: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_name?: string
          product_code?: string
          raw_material_id?: string
          qty_per_unit?: number
          notes?: string | null
          created_at?: string
        }
      }
      procurement_orders: {
        Row: {
          id: string
          po_number: string
          company_id: string | null
          company_name: string | null
          items: Json
          status: string
          total_amount: number
          notes: string | null
          created_by: string | null
          created_at: string
          channel_dispatched: string | null
        }
        Insert: {
          id?: string
          po_number: string
          company_id?: string | null
          company_name?: string | null
          items?: Json
          status?: string
          total_amount?: number
          notes?: string | null
          created_by?: string | null
          created_at?: string
          channel_dispatched?: string | null
        }
        Update: {
          id?: string
          po_number?: string
          company_id?: string | null
          company_name?: string | null
          items?: Json
          status?: string
          total_amount?: number
          notes?: string | null
          created_by?: string | null
          created_at?: string
          channel_dispatched?: string | null
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          item_id: string
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          item_id: string
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          item_id?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
        }
      }
      webmail_accounts: {
        Row: {
          id: string
          email: string
          sender_name: string
          imap_host: string
          imap_port: number
          smtp_host: string
          smtp_port: number
          auth_username: string
          auth_password: string | null
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          sender_name: string
          imap_host: string
          imap_port: number
          smtp_host: string
          smtp_port: number
          auth_username: string
          auth_password?: string | null
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          sender_name?: string
          imap_host?: string
          imap_port?: number
          smtp_host?: string
          smtp_port?: number
          auth_username?: string
          auth_password?: string | null
          is_default?: boolean
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          role?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: string | null
          created_at?: string
        }
      }
    }
  }
}
