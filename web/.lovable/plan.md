This is a large request. I'll split it into two phases so we can ship value fast and avoid one giant unreviewable change.

---

## Phase 1 — Fixes + content/tool gaps (ship first)

Small, safe, high-impact. All frontend, uses existing mock stores.

1. **Route fixes**
   - `/summaries/advance-tax-rates` (and other summary slugs) currently 404 — wire `SummaryDetail.tsx` to the slug param and render from `lawsAndSummaries` data.
   - Procedures: make all procedure pages free to read (remove `PaywallGate` from procedures routes only; keep it on summaries/laws full content).

2. **Global UX**
   - `ScrollToTop` component on every route change (App.tsx Router-level).
   - Floating **"Back to top"** button (appears after 400px scroll) on all public pages.

3. **Tools page** — add 2 new calculators alongside existing 3:
   - VAT toggle already exists (inclusive/exclusive) — relabel clearly.
   - **Nepali Number to Text Converter** (e.g. 1,25,000 → "One Lakh Twenty Five Thousand" + Nepali script).
   - **Nepali Land Measurement Converter** (Ropani/Aana/Paisa/Daam ↔ Bigha/Kattha/Dhur ↔ sqft/sqm).

4. **Summaries** — list page + detail page both dynamic from `lawsAndSummaries.ts` (already exists but detail not wired).

5. **User Resources dropdown** — add Notices page (`/notices`) with tag filter + "Issued By" filter (mock data via adminStore), plus Forum, Articles, Samples placeholders.

6. **About sub-pages** — add `/about/background`, `/about/our-team`, `/about/our-services` using the practice-area sidebar layout pattern already in the project. Content editable via existing CMS About module (extend it with these tabs).

---

## Phase 2 — Major feature pack (ship after Phase 1 is approved)

These are bigger and need decisions before building. I'll ask 4 questions at the end.

### A. AI Chatbot — tiered
- Replace mock `ChatWidget` mock-reply logic with **Lovable AI Gateway** (edge function, streaming).
- **Free tier**: 5 messages/day, basic model (`gemini-3-flash-preview`), standard widget.
- **Subscriber tier**: 100 messages/day, stronger model (`gpt-5` or `gemini-2.5-pro`), premium widget styling (gradient border, larger panel, file-upload-ready, conversation history saved).
- Token/quota tracked per user (in adminStore for now, Cloud later).

### B. Auth: SMS + Email OTP
- Subscribe SMS confirmation, forgot-password OTP via phone & email, reset-password flows.
- Requires SMS provider (Twilio or similar) + Lovable Cloud Auth.

### C. Secure Document Management
- Encrypted file uploads, version history per document, download audit log.
- Admin can see full history; user sees their own.
- Requires Lovable Cloud (storage + RLS).

### D. Online Appointments + Video
- Calendar booking UI, time-slot picker, payment-before-booking (eSewa/Khalti already wired in settings).
- Zoom or Google Meet link auto-generated on confirmation.

### E. Automated Document Generator (premium-only)
- Admin-managed templates: Rental Agreement, NDA, Partnership Deed, Power of Attorney.
- User fills form → server generates PDF (jsPDF or pdfmake on client; or edge function with Puppeteer).
- Gated by subscription tier.

### F. Knowledge Base / Legal Library
- Public SEO-friendly section: Articles, Case studies, FAQs.
- Each article: title, slug, body (rich text), tags, JSON-LD `Article` schema, meta tags.
- Admin CRUD already partly exists in `AdminContent` — extend it.

### G. Analytics dashboard upgrade
- Add: cases count, revenue per client, top services, conversion rate funnel.
- Extend existing `AdminAnalytics.tsx`.

---

## Recommended order
1. **Phase 1** — I do this immediately on approval (~1 build).
2. **Knowledge Base + Analytics upgrade** — pure frontend, do next.
3. **Enable Lovable Cloud** — required for everything else (chatbot persistence, OTP, secure docs, appointments, doc generator storage).
4. **AI chatbot tiered** (after Cloud).
5. **Auth + OTP**, **Secure docs**, **Appointments**, **Doc generator** — each as its own build.

---

## Decisions I need before Phase 2

I'll ask these in a follow-up question block once you approve this plan.

