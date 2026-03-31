# Project Requirements Document (PRD): Hnah's Finance Dashboard (Vite-Only Local Edition)

## 1. Project Overview
- **Name:** Hnah's Finance Dashboard (Local SPA)
- **Description:** A 100% client-side, single-page web application designed for personal use. It connects to the user's Gmail account via Google OAuth, parses transaction emails using the Gmail REST API, and allows the user to quickly categorize them. 
- **Architecture:** Frontend-only (Client-side rendering). No backend server.
- **Design Philosophy:** Minimalist, clean, single-page dashboard, highly optimized for speed and 1-click actions.

## 2. Tech Stack & Key Libraries
- **Framework:** React 18+ (Vite), TypeScript.
- **Styling:** Tailwind CSS, Lucide React (for icons), Shadcn UI (or raw Tailwind for minimalist components).
- **Authentication:** `@react-oauth/google` (Google OAuth 2.0 Implicit flow / Token granting).
- **API Client:** Native `fetch` or `axios` to call `https://gmail.googleapis.com/gmail/v1/...`.
- **Database:** `dexie` and `dexie-react-hooks` (Wrapper for browser's native IndexedDB).

## 3. Core Workflow
1. **Auth:** User clicks "Login with Google" on the UI and grants Read-only Gmail access (`https://www.googleapis.com/auth/gmail.readonly`).
2. **Fetch:** App calls Gmail API to search for emails from VPBank (`from:vpbank`) newer than the `LastSyncTimestamp` stored in IndexedDB.
3. **Parse (Client-side):** Extract `Amount`, `Date/Time`, and `Description` from the email body using Regex.
4. **Store:** Save parsed transactions to IndexedDB (via Dexie) with `status = 'unclassified'`. Update the `LastSyncTimestamp`.
5. **Categorize:** Frontend fetches unclassified transactions from Dexie. User clicks a 1-touch emoji/icon to assign a `category`.
6. **Complete:** Transaction updates in IndexedDB and moves from "Inbox" to "History/Analytics".

## 4. Specific Logic & Rules
### A. Email Parsing Logic (VPBank Format)
- **Regex Extraction Requirements:**
  - `Amount`: Find `+` or `-` followed by digits and commas, ending with `VND`. (e.g., `-150,000 VND`). Parse into a numeric value.
  - `Description`: Text following the keyword `Nội dung:` or `Description:`.
  - `Time/Date`: Extract the timestamp within the email body.

### B. Database Schema (Dexie IndexedDB)
- **Database Name:** `VpTrackerDB`
- **Store `transactions`:** `++id` (Auto-increment), `emailId` (Unique string from Gmail to prevent duplicates), `amount` (Number), `description` (String), `date` (Date/Timestamp), `category` (String, nullable), `status` (String: 'unclassified' | 'classified').
- **Store `settings`:** `key` (String, primary key), `value` (Any). Used to store `lastSyncDate`.

## 5. UI/UX Guidelines
- **Theme Color:** Modern Blue. 
  - Primary: `#2563EB` (Blue 600)
  - Background: `#F8FAFC` (Slate 50)
  - Text: `#1E293B` (Slate 800) for headings, `#64748B` (Slate 500) for body text.
  - Semantic: `#EF4444` (Red/Expense), `#10B981` (Green/Income).
- **Layout:** Single-page Desktop view.
- **Components:**
  - **Header:** App title, Monthly Summary (Balance, Income, Expense), "Sync" button, and "Logout" button.
  - **Inbox Section (Unclassified):** A vertical list of white cards. Each card shows Amount, Date, and original Description (in a subtle monospace font).
  - **Quick Action Row:** Under each unclassified card, a row of 5-6 circular buttons with emojis (🍔, 🚗, 🛒, 💡, ➕). Clicking one instantly updates the DB, triggers a fade-out animation, and removes it from the Inbox list.
  - **Analytics Section:** A Donut Chart for spending distribution and a simplified table for classified transaction history.

## 6. Execution Phases for AI Agent
- **Phase 1: Foundation.** Initialize Vite + React + TS project. Install Tailwind, Dexie, and Google OAuth libraries.
- **Phase 2: Data Layer.** Setup `db.ts` using Dexie, defining the `transactions` and `settings` stores.
- **Phase 3: Auth & API Service.** Implement Google Login component. Create a `gmailService.ts` to handle fetching emails via Gmail REST API and applying the VPBank Regex parser.
- **Phase 4: Main UI (Inbox).** Build the main dashboard layout. Implement the Inbox list fetching from Dexie, and the Quick Action categorization buttons.
- **Phase 5: Analytics.** Build the Donut Chart and History table based on classified data from Dexie.