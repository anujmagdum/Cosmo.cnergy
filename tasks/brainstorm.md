# Brainstorming & Architecture Exploration: CosmoCnergy Smart Procurement OS

## 1. Problem Statement & Core Goals
* **Problem:** Internal procurement for manufacturing/assembly teams is often slow, manual, and prone to error when calculating raw material quantities, matching suppliers, and sending RFQs/POs.
* **Core Goal:** Build **CosmoCnergy**, an ultra-fast, 1-tap internal procurement web app powered by Supabase, Vercel, and Gemini AI. Inspired by the sleek UI and architecture of Datlion Cnergy.
* **Key Innovations:**
  1. **BOM Engine & Auto-Splitting:** 1-click product selection automatically calculates required raw materials and splits orders across multiple suppliers.
  2. **1-Tap Dispatch:** Direct PDF generation and background serverless email/Nodemailer + WhatsApp integration.
  3. **AI Photo & Voice Procurement:** Multimodal Gemini processing converts voice audio and paper lists/invoices into structured procurement drafts.
  4. **Color-Coded Realtime Tracking:** Instant status visual indicators (`To Be Ordered`, `RFQ Sent`, `Ordered`, `Delivered`, `On Hold`) synced with Supabase Realtime.
  5. **Supplier Action Hub:** Interactive supplier cards with quick actions (`WhatsApp`, `Email`, `Quick RFQ`, `Buying Link`).

---

## 2. Option Comparison Matrix

| Feature Dimension | Option A: **1-Tap Quick Catalog & Dispatch** (Selected) | Option B: **Conversational Assistant** | Option C: **Manual Form Builder** |
| :--- | :--- | :--- | :--- |
| **Procurement Speed** | **Ultra-Fast (~5 seconds)** | Medium (~20 seconds) | Slow (~2-3 minutes) |
| **BOM Auto-Splitting** | **Automated multi-supplier breakdown** | Prompt-driven splitting | Manual line-item entry |
| **AI Integration** | **Photo OCR & Voice-to-Order** | Text Chat Bot | None |
| **User Barrier** | **Zero-learning curve for internal teams** | Medium | High |
| **Technical Complexity**| Medium (Clean React 18 + Supabase + Vercel) | High | Low |

---

## 3. Recommended Architecture & Functional Design

### A. Core Modules
1. **Auth & Session:** Supabase Email/Password Auth for internal staff.
2. **Dashboard & Quick Re-Order:** Visual catalog cards, top re-order widgets, and recent procurement activity feed.
3. **BOM Engine & Cart:** Select finished assembly $\to$ Auto-populate raw material items $\to$ Auto-group items by supplier ID.
4. **Supplier Hub:** Directory of vendors with color-coded status, direct buying portal URLs, email/WhatsApp hyperlinks, and Quick RFQ action bar.
5. **AI Procurement Studio:** Voice note recorder & Photo invoice/note uploader using Gemini 3 Flash API.
6. **Multi-Channel Dispatch Engine:**
   - PDF Generation via `html2pdf.js`
   - Serverless email API endpoint via `@vercel/functions` & Nodemailer
   - Direct WhatsApp message builder (`wa.me`)
7. **Real-time Status Tracking:** Color-coded badges backed by Supabase PostgreSQL realtime subscriptions.

### B. Database Schema Blueprint (Supabase)
* `suppliers`: `id`, `name`, `contact_person`, `email`, `phone`, `whatsapp`, `buying_url`, `created_at`
* `catalog_items`: `id`, `name`, `specs`, `unit_of_measure`, `preset_price`, `supplier_id`, `created_at`
* `product_boms`: `id`, `product_name`, `raw_material_id`, `required_qty_per_unit`
* `procurement_orders`: `id`, `order_number`, `supplier_id`, `status` (`TO_BE_ORDERED`, `RFQ_SENT`, `ORDERED`, `DELIVERED`, `ON_HOLD`), `total_amount`, `pdf_url`, `created_by`, `created_at`
* `order_items`: `id`, `order_id`, `item_id`, `quantity`, `unit_price`, `total_price`

---

## 4. Color-Coded Status Guide
* 🟡 **`TO_BE_ORDERED`** — Amber (`bg-amber-100 text-amber-800 border-amber-300`)
* 🔵 **`RFQ_SENT`** — Blue (`bg-blue-100 text-blue-800 border-blue-300`)
* 🟣 **`ORDERED`** — Purple (`bg-purple-100 text-purple-800 border-purple-300`)
* 🟢 **`DELIVERED`** — Emerald/Green (`bg-emerald-100 text-emerald-800 border-emerald-300`)
* 🔴 **`ON_HOLD`** — Red (`bg-red-100 text-red-800 border-red-300`)

---

## 5. Next Steps & Implementation Roadmap
1. **Environment Setup:** Initialize Vite + React + TypeScript + Tailwind CSS project in `D:\CosmoCnergy`.
2. **Environment Variables (`.env`):** Configure Supabase URL/Anon Key & Gemini API Key.
3. **Database Setup:** Create SQL migrations for tables, seed initial pre-loaded catalog and suppliers.
4. **Core UI & State:** Build Header, Navigation, Catalog, BOM Selector, and Supplier Hub using Datlion Cnergy visual tokens.
5. **AI & Dispatch:** Integrate Gemini Vision/Audio service & Vercel serverless email endpoint.
