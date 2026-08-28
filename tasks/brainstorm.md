# Brainstorming & Architecture Exploration: CosmoCnergy Full-Stack Enhancement

## 1. Problem Statement & Core Goals
We are executing a comprehensive full-stack enhancement across 4 key pillars:
1. **Information Architecture (IA) Restructuring:** Renaming core tabs (`Orders` ➔ `Procurement`, `Component & Product` ➔ `Inventory`, `Supplier` ➔ `Companies`) and synchronizing browser route states.
2. **Relational Multi-Supplier Sourcing (M:N Schema):** Moving from single-supplier-per-component to a flexible `component_suppliers` junction table supporting vendor-specific pricing, MOQ, lead times, review summaries, and multi-platform rating breakdowns (IndiaMART, Google Maps, Amazon).
3. **Hybrid AI Recommendation Engine:** Combining deterministic multi-criteria weighted pre-scoring (Cost 40%, Rating 30%, Lead Time 20%, MOQ 10%) with Gemini 3.6 Flash qualitative reasoning to award badges and select the best vendor.
4. **Zero-Storage Google Drive Image Lightbox:** Transforming Google Drive links into instant thumbnail previews without hosting image binaries on Supabase storage.

---

## 2. Architectural Trade-Offs & Design Options

### Pillar 1: Navigation & Route Synchronization
| Option | Description | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **Option A: History API with URL Query Sync** *(Recommended)* | Uses `window.history.pushState` with path & query params (`/procurement`, `/inventory`, `/companies`) alongside reactive state. | No full-page reloads, clean URLs, deep-linkable PO drafts, lightweight without heavy router dependencies. | Requires manual route listener for browser back/forward buttons. |
| **Option B: Pure State-Driven Tabs** | Internal state `activeTab` only without URL updates. | Simple implementation. | Users cannot bookmark or share links directly to a specific view or PO draft. |

---

### Pillar 2: Sourcing Comparison UI & Trigger Location
| Option | Description | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **Option A: Dual-Trigger Matrix Drawer** *(Recommended)* | Accessible via both a **"🔍 Sourcing / Compare Vendors"** button on each Inventory Component card AND inside the Companies tab. | Maximum procurement velocity; engineer can compare suppliers while looking at low stock or while browsing vendor portfolios. | Slightly more trigger points to maintain. |
| **Option B: Inventory-Only Drawer** | Only accessible from Component cards in the Inventory tab. | Minimal footprint. | Less discoverable from the Companies view. |

---

### Pillar 3: Purchase Order Direct Routing Workflow
| Option | Description | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **Option A: Instant Pre-filled Modal / Dispatch Drawer** *(Recommended)* | Clicking "Create Purchase Order" in the comparison table automatically switches to `/procurement` and opens the pre-filled PO modal with winning vendor, unit price, and MOQ already populated. | 1-Tap frictionless dispatch via WhatsApp / Webmail / PDF. | None. |
| **Option B: Raw Query Param Form** | Navigates to a blank purchase order page with URL parameters. | Standard web pattern. | Requires extra clicks to send RFQ or finalize order. |

---

### Pillar 4: Google Drive Thumbnail & Lightbox Strategy
| Option | Description | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **Option A: Multi-Endpoint Auto-Fallback** *(Recommended)* | Regex parses File ID and tries `lh3.googleusercontent.com/d/{id}=w1000` with fallback to `drive.google.com/thumbnail?id={id}&sz=w1000`. If access is restricted (private link), shows a polite warning with a direct "Open in Google Drive" button. | 100% zero-storage cost, ultra-fast CDN caching by Google, clean fallback UI. | Requires public Google Drive link permissions ("Anyone with link"). |
| **Option B: Iframe Embed Only** | Renders Google Drive preview iframe (`drive.google.com/file/d/{id}/preview`). | Supports any file type. | Slower load time, heavy UI with Google toolbars. |

---

## 3. Recommended Approach & Next Steps
We recommend proceeding with **Option A across all pillars** to achieve maximum performance, responsive UX, and seamless AI procurement.
