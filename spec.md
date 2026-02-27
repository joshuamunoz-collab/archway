SPEC.md — Archway



Property Management for St. Louis Section 8 Portfolios



Version 1.0 — Final Specification







1\\. What Is Archway?



Archway is an internal web application for managing ~50 rental properties in St. Louis City, MO. Many are Section 8 (Housing Choice Voucher) properties with a HAP subsidy component and tenant copay. Properties are owned by four different legal entities, each with a checking account and a money market account (8 accounts total).



Archway replaces a collection of scattered spreadsheets with a clean, modern dashboard that makes it easy to see the state of the entire portfolio at a glance and drill down into any property for full detail.



The Users (Day One)



You (Admin) — full access to everything



Your wife (Admin) — full access to everything



Assistant 1 (Staff) — full operational access, no system settings



Assistant 2 (Staff) — full operational access, no system settings



Future Users (Added Later)



Property Manager (PM role) — limited portal for tasks and bill submission



PM's Assistant (PM Staff role) — limited task view



The Property Manager



Currently manages properties on your behalf



Charges 10% of rent collected as management fee



Sends monthly spreadsheets summarizing his bills/charges



Communication and accountability is a major pain point







2\\. Design Principles



Archway should look and feel like it was designed by Julie Zhuo — the former VP of Product Design at Facebook. That means:



5-second rule: Can the user answer their core question within 5 seconds of looking at a screen? If not, redesign it.



Progressive disclosure: Dashboard shows the headline. Click to see the detail. Click deeper to see the history. Never dump everything on one screen.



Semantic color only: Red = fix this now. Yellow = watch this. Green = all good. Most of the UI is neutral. Color is reserved for signals.



Data, not decoration: Every pixel earns its place. No decorative charts. If a visualization doesn't answer a question, remove it.



Respect spreadsheet users: Tables should feel familiar. Sorting, filtering, searching, exporting — all one click.



One primary action per screen: The dashboard answers "Is everything okay?" The property page answers "What's the full picture on this property?"



Visual Design System



Background:       #FAFAFA (warm off-white)



Cards/Surfaces:   #FFFFFF with subtle shadow (shadow-sm)



Text Primary:     #1A1A1A



Text Secondary:   #6B7280 (gray-500)



Brand Accent:     #2563EB (blue-600)







Status Colors (used sparingly):



\&nbsp; Occupied:       #10B981 (emerald-500)



\&nbsp; Vacant:         #EF4444 (red-500)



\&nbsp; In Rehab:       #F97316 (orange-500)



\&nbsp; Pending:        #F59E0B (amber-500)



\&nbsp; Info:           #3B82F6 (blue-500)







Font:             Inter



Charts palette:   #2563EB, #10B981, #F59E0B, #8B5CF6, #6B7280







3\\. Feature Specification



3.1 Multi-Entity Ownership



Four legal entities, each with two bank accounts.



Entity record fields:



Name, EIN, address, phone, email



Checking account (name, institution, last 4 digits)



Money market account (name, institution, last 4 digits)



PM fee percentage (default 10%, configurable per entity)



Notes



Every view in the app can be filtered by entity. Reports can be run per-entity or portfolio-wide.



3.2 Portfolio Dashboard (Home Screen)



The first thing you see when you open Archway. Answers: "Is everything okay, or do I need to act?"



Top row — KPI cards:



Total properties / Occupied / Vacant / In Rehab / Pending



Monthly income: collected vs. expected (with progress bar)



Monthly expenses (vs. last month)



Properties approaching 60-day vacancy insurance threshold (with count, prominently warned)



Second row — Alert panels:



🔴 NEEDS IMMEDIATE ATTENTION: Vacancy insurance risk, overdue city notices, overdue PM tasks, delinquent tenant copays



🟡 WATCH LIST: Expiring leases, upcoming inspections, rehab behind schedule, PM tasks pending, insurance policies expiring



Third row — Financial snapshot:



Income vs. Expenses chart (trailing 12 months, line chart)



Income by Entity (donut or bar chart, clickable to filter)



Bottom — Property table:



Sortable, filterable, searchable



Columns: Address, Entity, Status (color badge), Tenant, Contract Rent, HAP, Copay, Days Vacant, Insurance Status



Filter bar: Entity, Status, Section 8 (yes/no)



Click any row → property detail page



\\\[Export CSV] button



Every element is clickable — KPI cards filter the view, alert items link to the relevant property/task, chart segments filter by entity.



3.3 Property Detail Page



Everything about one property. Accessed by clicking a property anywhere in the app. Uses a tab layout.



Header (always visible):



Address (large)



Entity name



Status badge (color-coded)



Section 8 badge (if applicable)



\\\[📍 Google Maps] link (opens https://www.google.com/maps/search/{encoded\\\_address})



\\\[🏛 Property Lookup] link (opens https://www.stlouis-mo.gov/data/address-search/index.cfm)



\\\[💰 Tax Lookup] link (opens https://property.stlouis-mo.gov/ — user searches by parcel number displayed next to the link)



Tab: Overview



Property info: type, beds, baths, sqft, year built, parcel number, ward, neighborhood



Current lease summary: tenant name, lease dates, contract rent, HAP amount, tenant copay



Quick stats cards: YTD income, YTD expenses, YTD NOI, tenant tenure



Recent activity feed (last 10 items across all categories)



Tab: Section 8



HAP contract details: contract rent, HAP amount, tenant copay, utility allowance, payment standard



PHA contact info, voucher holder info



HAP contract dates (start/end)



Recertification date with countdown



Re-leasing pipeline status (if property is in transition — see 3.9)



Tab: Financials



Income ledger: every payment with date, amount, type (HAP/copay/other), status



Expense ledger: every expense with date, amount, category, vendor, description



PM management fee (auto-calculated: 10% of collected rent per month)



P\\\&L summary with monthly and annual toggle



Charts: income trend, expense breakdown by category



Click any transaction → full detail



Tab: Insurance



Current policy: carrier, policy number, premium, liability limit, premises limit



Policy dates (effective/expiration)



Policy type: standard or vacancy



Upload declarations page



VACANCY COUNTDOWN (if property is vacant):



Days since vacant (auto-calculated from vacant\\\_since date)



Visual progress bar from 0 → 60 days



< 30 days: green (normal)



30–44 days: yellow + warning text



45–59 days: orange + "Contact insurance broker"



60+ days: red + "Standard coverage may be void"



Claim history



Notes



Tab: Taxes



Parcel number (displayed prominently, easy to copy)



Link to https://property.stlouis-mo.gov/ with instruction: "Search by parcel number above"



Annual tax amount, assessed value



Payment status: paid / unpaid / delinquent



Payment history



Notes (special assessments, abatements, tax sale risk)



Tab: City/Compliance



Log of every city notice: date received, type, description, deadline



Status: Open → Sent to PM → PM Acknowledged → In Progress → Resolved / Overdue



Assigned to (PM name)



Days since received / days until deadline



Escalation flag if PM hasn't responded within 48 hours



Upload scanned notices



Resolution notes and history



Tab: Documents



Upload any file (drag-and-drop): leases, inspection reports, insurance docs, tax bills, city notices, receipts



Each document: filename, type (dropdown), upload date, notes



Filterable by document type



Search by filename



Tab: Photos



Photo gallery with categories: exterior, interior, damage, rehab (before/during/after), insurance



Upload multiple photos at once



Each photo: caption, date taken, category



Drag to reorder



Tab: Activity



Complete audit log: every change, payment, status update, task, document upload



Timestamped, attributed to user



Filterable by type



3.4 Tenant Management



Tenant directory: name, phone, email, voucher number, PHA caseworker name/phone



Current property and lease (linked)



Payment history (copay tracking)



Move-in / move-out dates



Notes



Searchable, sortable list



3.5 PM Task \\\& Accountability System



Creating tasks:



Admin/Staff create tasks and assign to "Property Manager" (for now, just a text field — becomes a user assignment when PM portal is added)



Fields: property, task type, priority (Low/Medium/High/Urgent), title, description, due date



Task types: city\\\_notice\\\_response, maintenance, inspection\\\_prep, rehab, general



Task lifecycle:



Created → Sent to PM → PM Acknowledged → In Progress → Completed



\&nbsp;                               ↓



\&nbsp;                          Overdue (auto-flagged after due date)



Escalation logic:



If task not acknowledged within 48 hours → flag on dashboard as overdue



If task past due date → red alert on dashboard



Communication log:



Each task has a thread of notes/messages (timestamped, attributed)



When PM portal is added later, PM responds here



PM Performance metrics (visible to Admin/Staff):



Average response time (creation → acknowledgment)



Completion rate (completed / total)



Currently overdue count



Trend chart (response time over 30/60/90 days)



3.6 Expense Tracking



Every expense tied to a property, dated, categorized, with optional receipt upload.



Expense categories:



Maintenance \\\& Repairs: plumbing, electrical, HVAC, appliance, general handyman, pest control, locksmith, other



Utilities (owner-paid): MSD (sewer), Ameren (electric), Spire (gas), water, trash



City \\\& Government: license/registration fees, code violation fines, permits, other city fees



Insurance: premium payments, deductibles



Taxes: property tax payments, special assessments



Rehab / Capital: materials, labor, permits, dumpster/hauling



Professional Services: PM management fee, legal, accounting, inspection fees



Other: lawn care, snow removal, cleaning/turnover, marketing, miscellaneous



PM Management Fee:



Auto-calculated: 10% × (HAP payments received + tenant copay received) for each property per month



Shown as a line item in the property's expense ledger with category "Professional Services > PM management fee"



Configurable percentage per entity in settings (defaults to 10%)



When recording an expense, optional field: Account (defaults to entity's checking account, dropdown includes money market)



3.7 PM Bills Module



How bills enter the system (3 methods):



CSV Import (primary — PM sends monthly spreadsheet):











Upload CSV



Map columns: date, property address, description, category, amount



All imported as "Received" status



Batch review and approve



Manual entry (for one-off bills):











Click "Add Bill" → select property, enter line items, attach invoice file



Status: Received



PM Portal submission (future — when PM gets login):











PM selects property, enters line items, attaches invoice



Status: Received



Bill record:



Property, vendor/PM name, invoice number, bill date, due date



Line items: description, category, amount (multiple per bill)



Attached invoice file (PDF/photo)



Status: Received → Under Review → Approved → Paid (or Disputed → Revised)



Approved by (user), approved date



Paid date, payment method (check/ACH/Zelle/cash), reference number (check #)



Message thread for disputes (timestamped notes)



When a bill is marked "Paid":



Each line item automatically creates an expense record on that property



Expense is categorized based on the bill line item's category



Expense links back to the bill (source = 'pm\\\_bill', bill\\\_id reference)



No double entry ever



Bills dashboard:



KPI cards: Needs Review ($ amount), Approved/Unpaid ($ amount), Paid This Month



Filterable table: date, property, vendor, description, amount, status



Bulk operations: select multiple → Approve Selected / Mark Paid



Status filter tabs: Needs Review | Approved | Disputed | Paid | All



3.8 Insurance \\\& Vacancy Tracking



Insurance policy record:



Property, carrier, policy number, policy type (standard/vacancy)



Premium (annual), liability limit, premises limit



Effective date, expiration date



Declarations page upload



Notes



Vacancy tracking (automatic):



When property status changes to "vacant," vacant\\\_since date is set



Days vacant = today - vacant\\\_since (computed, not stored)



Vacancy countdown appears on:



Property detail Insurance tab (prominent)



Dashboard alert panel (when approaching thresholds)



Pipeline kanban cards



Thresholds: 30 days (yellow), 45 days (orange), 60 days (red)



3.9 Section 8 Re-Leasing Pipeline (Kanban)



Visual drag-and-drop board for properties in transition between tenants:



Tenant Notice → Move-Out → Rehab In Progress → Rehab Complete →



Marketing/Showing → Tenant Selected → Packet Submitted to PHA →



PHA Processing → Inspection Scheduled → Inspection Passed →



Lease Signed → Move-In



Each card shows: address, entity, days in current stage, total days vacant



Cards color-coded by vacancy insurance urgency



Drag between columns to update status



Click card → property detail page



Filterable by entity



3.10 Rehab Project Tracker



For properties undergoing renovation between tenants:



Project record: property, scope description, start date, target end date



Budget tracking:



Original estimate (total + line items)



Current estimate (updated when change orders happen, with date and reason)



Actual cost (sum of paid bills/expenses tagged to this project)



Variance: over/under budget



Timeline tracking:



Milestones: demo, rough plumbing, rough electrical, drywall, paint, flooring, fixtures, final clean, etc. (customizable)



Each milestone: target date, actual completion date, status



Overall: estimated vs. actual duration



Photo documentation: before/during/after photos tied to milestones



Status: Not Started / In Progress / On Hold / Completed / Over Budget / Behind Schedule



3.11 Inspection Management



Types: Initial HQS, Annual HQS, Re-inspection, City/Code inspection



Fields: property, date, type, inspector, result (pass/fail/pending), deficiencies, re-inspection deadline



Upcoming inspections visible on dashboard Watch List



Reminders at 30, 14, 7 days before scheduled date



3.12 CSV Import \\\& Export



Import wizard (used for properties, payments, expenses, PM bills):



Select what you're importing (properties / payments / expenses / bills)



Upload CSV file (drag-and-drop)



Preview first 10 rows



Map columns: each CSV column → app field (dropdown matching)



Validate: show errors/warnings before committing



Import: summary of records created, skipped, errors



Downloadable CSV templates for each import type



Export (from any list/table view):



CSV: one-click download



Excel (.xlsx): formatted with headers, column widths, entity grouping



PDF reports (polished, printable):



Portfolio Summary



Entity P\\\&L



Property P\\\&L



Rent Roll (current month — all properties, showing address, tenant, contract rent, HAP, copay, payment status)



Vacancy Report (with days vacant and insurance status)



Tax Summary (all properties, assessed values, amounts owed/paid)



PM Performance Report



Rehab Status Report



Outstanding City Notices



3.13 Notifications \\\& Alerts



Dashboard "Needs Attention" and "Watch List" panels, plus future email digests:



Alert



Threshold



Severity



Vacancy approaching insurance risk



30/45/60 days



🟡→🟠→🔴



City notice deadline approaching



14/7/0 days



🟡→🟠→🔴



PM task overdue



Past due date



🔴



PM task not acknowledged



> 48 hours



🟠



Lease expiring



< 60 days



🟡



Insurance policy expiring



< 30 days



🟠



HQS inspection upcoming



< 30 days



🟡



Recertification deadline



< 60 days



🟡



Tenant copay overdue



> 5 days past 1st



🟡



Rehab over budget or behind schedule



Any variance



🟡



Bills needing review



Any pending



🔵







3.14 Quick Links (Every Property)



Google Maps: https://www.google.com/maps/search/{address}+St.+Louis+MO



St. Louis City Property Info: https://www.stlouis-mo.gov/data/address-search/index.cfm



St. Louis City Tax Lookup: https://property.stlouis-mo.gov/ (search by parcel number)







4\\. User Roles \\\& Permissions



Role Definitions



Role



See



Do



Can't



Admin



Everything



Everything



Nothing off limits



Staff



Everything



All operations (CRUD all records, import/export, reports)



Delete properties/entities, manage users, change settings



PM (future)



Assigned properties only, no financials



View/respond to tasks, submit bills, upload photos



See money, create tasks, access reports, settings



PM Staff (future)



Same as PM



Update tasks, upload photos



Acknowledge tasks formally







Day One Setup



4 users: You (Admin), Wife (Admin), Assistant 1 (Staff), Assistant 2 (Staff)



Simple email/password login via Supabase Auth



PM portal deferred to later sprint (PM bills entered via CSV import for now)



Permission Enforcement



Layer 1 — Application middleware: Role check on every route, redirects unauthorized access



Layer 2 — Supabase Row Level Security: Database-level policies as safety net



Activity Log



Every action records: who, what, when, which property, what changed (old → new values)







5\\. Database Schema



Core Tables



-- Ownership entities (4 entities)



CREATE TABLE entities (



\&nbsp; id            UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),



\&nbsp; name          TEXT NOT NULL,



\&nbsp; ein           TEXT,



\&nbsp; address       TEXT,



\&nbsp; phone         TEXT,



\&nbsp; email         TEXT,



\&nbsp; pm\\\_fee\\\_pct    DECIMAL(5,2) DEFAULT 10.00,  -- PM fee percentage



\&nbsp; notes         TEXT,



\&nbsp; created\\\_at    TIMESTAMPTZ DEFAULT now(),



\&nbsp; updated\\\_at    TIMESTAMPTZ DEFAULT now()



);







-- Bank accounts (2 per entity = 8 total)



CREATE TABLE bank\\\_accounts (



\&nbsp; id            UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),



\&nbsp; entity\\\_id     UUID NOT NULL REFERENCES entities(id),



\&nbsp; account\\\_name  TEXT NOT NULL,       -- "Entity A Checking"



\&nbsp; account\\\_type  TEXT NOT NULL,       -- 'checking' or 'money\\\_market'



\&nbsp; institution   TEXT,                -- "Commerce Bank"



\&nbsp; last\\\_four     TEXT,                -- "4521"



\&nbsp; is\\\_default    BOOLEAN DEFAULT false, -- Default for payments



\&nbsp; notes         TEXT,



\&nbsp; created\\\_at    TIMESTAMPTZ DEFAULT now()



);







-- Properties (~50 properties, all St. Louis City)



CREATE TABLE properties (



\&nbsp; id              UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),



\&nbsp; entity\\\_id       UUID NOT NULL REFERENCES entities(id),



\&nbsp; address\\\_line1   TEXT NOT NULL,



\&nbsp; address\\\_line2   TEXT,



\&nbsp; city            TEXT NOT NULL DEFAULT 'St. Louis',



\&nbsp; state           TEXT NOT NULL DEFAULT 'MO',



\&nbsp; zip             TEXT NOT NULL,



\&nbsp; parcel\\\_number   TEXT,



\&nbsp; ward            TEXT,



\&nbsp; neighborhood    TEXT,



\&nbsp; property\\\_type   TEXT,          -- single\\\_family, duplex, multi\\\_family



\&nbsp; beds            INT,



\&nbsp; baths           DECIMAL(3,1),



\&nbsp; sqft            INT,



\&nbsp; year\\\_built      INT,



\&nbsp; is\\\_section\\\_8    BOOLEAN DEFAULT false,



\&nbsp; status          TEXT NOT NULL DEFAULT 'vacant',



\&nbsp;   -- occupied, vacant, rehab, pending\\\_inspection, pending\\\_packet



\&nbsp; vacant\\\_since    DATE,          -- Set when status → vacant



\&nbsp; notes           TEXT,



\&nbsp; created\\\_at      TIMESTAMPTZ DEFAULT now(),



\&nbsp; updated\\\_at      TIMESTAMPTZ DEFAULT now()



);



CREATE INDEX idx\\\_properties\\\_entity ON properties(entity\\\_id);



CREATE INDEX idx\\\_properties\\\_status ON properties(status);







-- Tenants



CREATE TABLE tenants (



\&nbsp; id              UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),



\&nbsp; first\\\_name      TEXT NOT NULL,



\&nbsp; last\\\_name       TEXT NOT NULL,



\&nbsp; phone           TEXT,



\&nbsp; email           TEXT,



\&nbsp; voucher\\\_number  TEXT,



\&nbsp; pha\\\_caseworker  TEXT,



\&nbsp; pha\\\_phone       TEXT,



\&nbsp; notes           TEXT,



\&nbsp; created\\\_at      TIMESTAMPTZ DEFAULT now(),



\&nbsp; updated\\\_at      TIMESTAMPTZ DEFAULT now()



);







-- Leases



CREATE TABLE leases (



\&nbsp; id                UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),



\&nbsp; property\\\_id       UUID NOT NULL REFERENCES properties(id),



\&nbsp; tenant\\\_id         UUID NOT NULL REFERENCES tenants(id),



\&nbsp; start\\\_date        DATE NOT NULL,



\&nbsp; end\\\_date          DATE,



\&nbsp; contract\\\_rent     DECIMAL(10,2) NOT NULL,



\&nbsp; hap\\\_amount        DECIMAL(10,2),



\&nbsp; tenant\\\_copay      DECIMAL(10,2),



\&nbsp; utility\\\_allowance DECIMAL(10,2),



\&nbsp; payment\\\_standard  DECIMAL(10,2),



\&nbsp; hap\\\_contract\\\_start DATE,



\&nbsp; hap\\\_contract\\\_end   DATE,



\&nbsp; recertification\\\_date DATE,



\&nbsp; status            TEXT DEFAULT 'active',  -- active, expired, terminated



\&nbsp; notes             TEXT,



\&nbsp; created\\\_at        TIMESTAMPTZ DEFAULT now(),



\&nbsp; updated\\\_at        TIMESTAMPTZ DEFAULT now()



);







-- Payments (HAP and copay tracked separately)



CREATE TABLE payments (



\&nbsp; id              UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),



\&nbsp; property\\\_id     UUID NOT NULL REFERENCES properties(id),



\&nbsp; lease\\\_id        UUID REFERENCES leases(id),



\&nbsp; bank\\\_account\\\_id UUID REFERENCES bank\\\_accounts(id),



\&nbsp; date            DATE NOT NULL,



\&nbsp; amount          DECIMAL(10,2) NOT NULL,



\&nbsp; type            TEXT NOT NULL,   -- 'hap', 'copay', 'other\\\_income'



\&nbsp; status          TEXT DEFAULT 'received', -- received, pending, overdue, nsf



\&nbsp; reference\\\_number TEXT,



\&nbsp; notes           TEXT,



\&nbsp; created\\\_at      TIMESTAMPTZ DEFAULT now()



);



CREATE INDEX idx\\\_payments\\\_property ON payments(property\\\_id);



CREATE INDEX idx\\\_payments\\\_date ON payments(date);



CREATE INDEX idx\\\_payments\\\_type ON payments(type);







-- Expenses



CREATE TABLE expenses (



\&nbsp; id              UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),



\&nbsp; property\\\_id     UUID NOT NULL REFERENCES properties(id),



\&nbsp; bank\\\_account\\\_id UUID REFERENCES bank\\\_accounts(id),



\&nbsp; date            DATE NOT NULL,



\&nbsp; amount          DECIMAL(10,2) NOT NULL,



\&nbsp; category        TEXT NOT NULL,



\&nbsp; subcategory     TEXT,



\&nbsp; vendor          TEXT,



\&nbsp; description     TEXT,



\&nbsp; receipt\\\_url     TEXT,



\&nbsp; source          TEXT DEFAULT 'manual', -- 'manual', 'pm\\\_bill', 'auto\\\_pm\\\_fee'



\&nbsp; bill\\\_id         UUID REFERENCES pm\\\_bills(id),



\&nbsp; notes           TEXT,



\&nbsp; created\\\_at      TIMESTAMPTZ DEFAULT now()



);



CREATE INDEX idx\\\_expenses\\\_property ON expenses(property\\\_id);



CREATE INDEX idx\\\_expenses\\\_date ON expenses(date);



CREATE INDEX idx\\\_expenses\\\_category ON expenses(category);







-- Insurance policies



CREATE TABLE insurance\\\_policies (



\&nbsp; id              UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),



\&nbsp; property\\\_id     UUID NOT NULL REFERENCES properties(id),



\&nbsp; carrier         TEXT NOT NULL,



\&nbsp; policy\\\_number   TEXT,



\&nbsp; policy\\\_type     TEXT DEFAULT 'standard', -- standard, vacancy



\&nbsp; premium\\\_annual  DECIMAL(10,2),



\&nbsp; liability\\\_limit DECIMAL(12,2),



\&nbsp; premises\\\_limit  DECIMAL(12,2),



\&nbsp; effective\\\_date  DATE,



\&nbsp; expiration\\\_date DATE,



\&nbsp; declaration\\\_url TEXT,



\&nbsp; notes           TEXT,



\&nbsp; created\\\_at      TIMESTAMPTZ DEFAULT now(),



\&nbsp; updated\\\_at      TIMESTAMPTZ DEFAULT now()



);







-- Property taxes



CREATE TABLE property\\\_taxes (



\&nbsp; id              UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),



\&nbsp; property\\\_id     UUID NOT NULL REFERENCES properties(id),



\&nbsp; tax\\\_year        INT NOT NULL,



\&nbsp; assessed\\\_value  DECIMAL(12,2),



\&nbsp; annual\\\_amount   DECIMAL(10,2),



\&nbsp; status          TEXT DEFAULT 'unpaid', -- paid, unpaid, delinquent



\&nbsp; paid\\\_date       DATE,



\&nbsp; paid\\\_amount     DECIMAL(10,2),



\&nbsp; notes           TEXT,



\&nbsp; created\\\_at      TIMESTAMPTZ DEFAULT now()



);







-- City notices



CREATE TABLE city\\\_notices (



\&nbsp; id              UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),



\&nbsp; property\\\_id     UUID NOT NULL REFERENCES properties(id),



\&nbsp; date\\\_received   DATE NOT NULL,



\&nbsp; notice\\\_type     TEXT,



\&nbsp; description     TEXT NOT NULL,



\&nbsp; deadline        DATE,



\&nbsp; assigned\\\_to     TEXT,          -- PM name (text for now, user\\\_id later)



\&nbsp; status          TEXT DEFAULT 'open',



\&nbsp; sent\\\_to\\\_pm\\\_date DATE,



\&nbsp; pm\\\_response\\\_date DATE,



\&nbsp; resolved\\\_date   DATE,



\&nbsp; resolution\\\_notes TEXT,



\&nbsp; document\\\_url    TEXT,



\&nbsp; created\\\_at      TIMESTAMPTZ DEFAULT now(),



\&nbsp; updated\\\_at      TIMESTAMPTZ DEFAULT now()



);







-- PM Tasks



CREATE TABLE pm\\\_tasks (



\&nbsp; id              UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),



\&nbsp; property\\\_id     UUID REFERENCES properties(id),



\&nbsp; city\\\_notice\\\_id  UUID REFERENCES city\\\_notices(id),



\&nbsp; task\\\_type       TEXT NOT NULL,



\&nbsp; priority        TEXT DEFAULT 'medium',



\&nbsp; title           TEXT NOT NULL,



\&nbsp; description     TEXT,



\&nbsp; assigned\\\_to     TEXT,          -- PM name (text for now)



\&nbsp; due\\\_date        DATE,



\&nbsp; acknowledged\\\_at TIMESTAMPTZ,



\&nbsp; completed\\\_at    TIMESTAMPTZ,



\&nbsp; status          TEXT DEFAULT 'created',



\&nbsp; created\\\_at      TIMESTAMPTZ DEFAULT now(),



\&nbsp; updated\\\_at      TIMESTAMPTZ DEFAULT now()



);







-- PM Task messages (thread)



CREATE TABLE pm\\\_task\\\_messages (



\&nbsp; id              UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),



\&nbsp; task\\\_id         UUID NOT NULL REFERENCES pm\\\_tasks(id),



\&nbsp; user\\\_id         UUID NOT NULL REFERENCES user\\\_profiles(id),



\&nbsp; message         TEXT NOT NULL,



\&nbsp; created\\\_at      TIMESTAMPTZ DEFAULT now()



);







-- PM Bills



CREATE TABLE pm\\\_bills (



\&nbsp; id              UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),



\&nbsp; property\\\_id     UUID NOT NULL REFERENCES properties(id),



\&nbsp; vendor\\\_name     TEXT,



\&nbsp; invoice\\\_number  TEXT,



\&nbsp; bill\\\_date       DATE NOT NULL,



\&nbsp; due\\\_date        DATE,



\&nbsp; total\\\_amount    DECIMAL(10,2) NOT NULL,



\&nbsp; status          TEXT DEFAULT 'received',



\&nbsp; approved\\\_by     UUID REFERENCES user\\\_profiles(id),



\&nbsp; approved\\\_at     TIMESTAMPTZ,



\&nbsp; paid\\\_date       DATE,



\&nbsp; payment\\\_method  TEXT,



\&nbsp; payment\\\_reference TEXT,



\&nbsp; bank\\\_account\\\_id UUID REFERENCES bank\\\_accounts(id),



\&nbsp; invoice\\\_url     TEXT,



\&nbsp; notes           TEXT,



\&nbsp; created\\\_at      TIMESTAMPTZ DEFAULT now(),



\&nbsp; updated\\\_at      TIMESTAMPTZ DEFAULT now()



);



CREATE INDEX idx\\\_pm\\\_bills\\\_status ON pm\\\_bills(status);



CREATE INDEX idx\\\_pm\\\_bills\\\_property ON pm\\\_bills(property\\\_id);







-- PM Bill line items



CREATE TABLE pm\\\_bill\\\_line\\\_items (



\&nbsp; id              UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),



\&nbsp; bill\\\_id         UUID NOT NULL REFERENCES pm\\\_bills(id) ON DELETE CASCADE,



\&nbsp; description     TEXT NOT NULL,



\&nbsp; category        TEXT,



\&nbsp; subcategory     TEXT,



\&nbsp; amount          DECIMAL(10,2) NOT NULL,



\&nbsp; sort\\\_order      INT DEFAULT 0



);







-- PM Bill messages (dispute thread)



CREATE TABLE pm\\\_bill\\\_messages (



\&nbsp; id              UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),



\&nbsp; bill\\\_id         UUID NOT NULL REFERENCES pm\\\_bills(id),



\&nbsp; user\\\_id         UUID NOT NULL REFERENCES user\\\_profiles(id),



\&nbsp; message         TEXT NOT NULL,



\&nbsp; created\\\_at      TIMESTAMPTZ DEFAULT now()



);







-- Rehab projects



CREATE TABLE rehab\\\_projects (



\&nbsp; id                UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),



\&nbsp; property\\\_id       UUID NOT NULL REFERENCES properties(id),



\&nbsp; scope             TEXT,



\&nbsp; start\\\_date        DATE,



\&nbsp; target\\\_end\\\_date   DATE,



\&nbsp; actual\\\_end\\\_date   DATE,



\&nbsp; original\\\_estimate DECIMAL(10,2),



\&nbsp; current\\\_estimate  DECIMAL(10,2),



\&nbsp; actual\\\_cost       DECIMAL(10,2) DEFAULT 0,



\&nbsp; status            TEXT DEFAULT 'not\\\_started',



\&nbsp; notes             TEXT,



\&nbsp; created\\\_at        TIMESTAMPTZ DEFAULT now(),



\&nbsp; updated\\\_at        TIMESTAMPTZ DEFAULT now()



);







CREATE TABLE rehab\\\_milestones (



\&nbsp; id                UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),



\&nbsp; rehab\\\_project\\\_id  UUID NOT NULL REFERENCES rehab\\\_projects(id),



\&nbsp; name              TEXT NOT NULL,



\&nbsp; sort\\\_order        INT,



\&nbsp; target\\\_date       DATE,



\&nbsp; actual\\\_date       DATE,



\&nbsp; status            TEXT DEFAULT 'pending',



\&nbsp; notes             TEXT,



\&nbsp; created\\\_at        TIMESTAMPTZ DEFAULT now()



);







-- Inspections



CREATE TABLE inspections (



\&nbsp; id              UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),



\&nbsp; property\\\_id     UUID NOT NULL REFERENCES properties(id),



\&nbsp; inspection\\\_type TEXT NOT NULL,



\&nbsp; scheduled\\\_date  DATE,



\&nbsp; completed\\\_date  DATE,



\&nbsp; inspector       TEXT,



\&nbsp; result          TEXT,



\&nbsp; deficiencies    TEXT,



\&nbsp; reinspection\\\_deadline DATE,



\&nbsp; notes           TEXT,



\&nbsp; created\\\_at      TIMESTAMPTZ DEFAULT now()



);







-- Documents



CREATE TABLE documents (



\&nbsp; id              UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),



\&nbsp; property\\\_id     UUID REFERENCES properties(id),



\&nbsp; tenant\\\_id       UUID REFERENCES tenants(id),



\&nbsp; doc\\\_type        TEXT,



\&nbsp; filename        TEXT NOT NULL,



\&nbsp; file\\\_url        TEXT NOT NULL,



\&nbsp; file\\\_size       INT,



\&nbsp; uploaded\\\_at     TIMESTAMPTZ DEFAULT now(),



\&nbsp; notes           TEXT



);







-- Photos



CREATE TABLE photos (



\&nbsp; id                UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),



\&nbsp; property\\\_id       UUID NOT NULL REFERENCES properties(id),



\&nbsp; rehab\\\_project\\\_id  UUID REFERENCES rehab\\\_projects(id),



\&nbsp; category          TEXT,



\&nbsp; caption           TEXT,



\&nbsp; file\\\_url          TEXT NOT NULL,



\&nbsp; taken\\\_at          DATE,



\&nbsp; uploaded\\\_at       TIMESTAMPTZ DEFAULT now()



);







-- User profiles



CREATE TABLE user\\\_profiles (



\&nbsp; id          UUID PRIMARY KEY REFERENCES auth.users(id),



\&nbsp; email       TEXT NOT NULL,



\&nbsp; full\\\_name   TEXT NOT NULL,



\&nbsp; role        TEXT NOT NULL DEFAULT 'staff', -- admin, staff, pm, pm\\\_staff



\&nbsp; phone       TEXT,



\&nbsp; is\\\_active   BOOLEAN DEFAULT true,



\&nbsp; created\\\_at  TIMESTAMPTZ DEFAULT now(),



\&nbsp; updated\\\_at  TIMESTAMPTZ DEFAULT now()



);







-- Activity log



CREATE TABLE activity\\\_log (



\&nbsp; id          UUID PRIMARY KEY DEFAULT gen\\\_random\\\_uuid(),



\&nbsp; entity\\\_type TEXT NOT NULL,



\&nbsp; entity\\\_id   UUID NOT NULL,



\&nbsp; action      TEXT NOT NULL,



\&nbsp; details     JSONB,



\&nbsp; user\\\_id     UUID REFERENCES user\\\_profiles(id),



\&nbsp; created\\\_at  TIMESTAMPTZ DEFAULT now()



);



CREATE INDEX idx\\\_activity\\\_entity ON activity\\\_log(entity\\\_type, entity\\\_id);



CREATE INDEX idx\\\_activity\\\_date ON activity\\\_log(created\\\_at);



Key Computed Values (App Logic, Not Stored)



days\\\_vacant = TODAY - properties.vacant\\\_since



vacancy\\\_urgency = green(<30) / yellow(30-44) / orange(45-59) / red(60+)



monthly\\\_expected\\\_income = SUM(active leases' contract\\\_rent)



monthly\\\_actual\\\_income = SUM(payments this month)



collection\\\_rate = actual / expected × 100



property\\\_noi = income - expenses (for date range)



pm\\\_fee = collected\\\_rent × entity.pm\\\_fee\\\_pct / 100







6\\. Tech Stack



Layer



Technology



Framework



Next.js 15 (App Router, Server Components default)



Language



TypeScript (strict mode)



Styling



Tailwind CSS + shadcn/ui



Database



PostgreSQL via Supabase



ORM



Prisma



Auth



Supabase Auth (email/password)



File Storage



Supabase Storage



Charts



Recharts



Tables



TanStack Table + shadcn



Kanban



@dnd-kit/core



CSV Parse



PapaParse



Excel Export



SheetJS (xlsx)



PDF Reports



@react-pdf/renderer



Hosting



Vercel



Version Control



Git + GitHub







Estimated monthly cost: $0–$12







7\\. Navigation Structure



Sidebar:



\&nbsp; 🏠 Dashboard          /dashboard



\&nbsp; 🏘️ Properties         /properties  (also the property table on dashboard)



\&nbsp;    └─ Property Detail  /properties/\\\[id]



\&nbsp; 👥 Tenants            /tenants



\&nbsp; 📋 Tasks              /tasks



\&nbsp; 📄 Bills              /bills



\&nbsp; 🔄 Pipeline           /pipeline  (kanban board)



\&nbsp; 🔨 Rehabs             /rehabs



\&nbsp; 💰 Financials         /financials



\&nbsp; 📊 Reports            /reports



\&nbsp; 📥 Import             /import



\&nbsp; ⚙️ Settings           /settings



\&nbsp;    ├─ Entities        /settings/entities



\&nbsp;    ├─ Users           /settings/users



\&nbsp;    ├─ Categories      /settings/categories



\&nbsp;    └─ Preferences     /settings/preferences







8\\. Build Order (Sprints)



Sprint 1: Foundation + Properties (Days 1–5)



Goal: See all 50 properties with their status on day one.



Initialize Next.js + TypeScript + Tailwind + shadcn/ui



Set up Supabase (database + auth + storage)



Configure Prisma, run migrations for ALL tables



Build Supabase Auth: login page, signup disabled (admin invites only)



Create 4 user accounts (you, wife, 2 assistants)



Build entity management (Settings → Entities): add 4 entities with bank accounts



Build CSV import wizard (properties first)



Build property list page with status badges, entity filter, search, sort



Deploy to Vercel



Deliverable: You log in and see your 50 properties with color-coded status badges. You can filter by entity. It's real.



Sprint 2: Dashboard + Property Detail (Days 6–12)



Dashboard layout: KPI cards, alert panels, financial snapshot placeholders



Property detail page with all tabs (Overview, Section 8, Insurance, Taxes, City/Compliance, Documents, Photos, Activity)



Google Maps links and tax lookup links per property



Photo upload and gallery



Document upload



Vacancy countdown on Insurance tab



Deliverable: Click any property → see everything about it. Vacancy warnings are live.



Sprint 3: Tenants + Leases + Payments (Days 13–18)



Tenant CRUD



Lease management (create/edit with HAP/copay split)



Payment recording (HAP and copay separately)



CSV import for payments



Payment history on property Financials tab



Dashboard KPIs now show real income data



Deliverable: You can track rent received, split into subsidy and copay. Income numbers are real.



Sprint 4: Expenses + PM Bills (Days 19–25)



Manual expense entry with full category system



PM Bills module: create, review, approve/dispute, pay



Bill → Expense auto-creation when paid



PM management fee auto-calculation (10% of collected rent)



CSV import for expenses and PM bills



Bulk approve / bulk pay operations



Property Financials tab: complete P\\\&L



Financial charts (Recharts)



Deliverable: Full financial picture per property. PM bills flow through cleanly.



Sprint 5: PM Tasks + City Notices (Days 26–31)



City notice logging



PM task system: create, assign, track deadlines



Escalation logic (auto-flag overdue)



Task message thread



PM performance metrics



Dashboard alert integration (overdue tasks, approaching deadlines)



Deliverable: PM accountability system is live. You assign tasks, set deadlines, track response times.



Sprint 6: Pipeline + Rehabs + Inspections (Days 32–38)



Kanban board for re-leasing pipeline



Drag-and-drop status updates



Vacancy day counts on cards



Rehab project tracker (budget, timeline, milestones)



Inspection management



Photo documentation for rehabs



Deliverable: Visual pipeline for properties in transition. Rehab budgets tracked.



Sprint 7: Reports + Exports (Days 39–44)



CSV export from every table view



Excel export (formatted .xlsx)



PDF report generation: Portfolio Summary, Entity P\\\&L, Property P\\\&L, Rent Roll, Vacancy Report, Tax Summary



Report builder page with template selection and date ranges



Deliverable: One-click exports for everything. Polished PDF reports.



Sprint 8: Polish + Production (Days 45–50)



Mobile responsiveness



Empty states and error handling



Loading skeletons



Notification system refinement



User activity log viewing



Edge case testing with real data



Performance optimization



Final deploy



Deliverable: Production-ready. Clean, fast, reliable.







9\\. CSV Templates



Properties Import Template



address,unit,city,state,zip,entity\\\_name,parcel\\\_number,type,beds,baths,sqft,year\\\_built,is\\\_section\\\_8,status,vacant\\\_since,neighborhood,ward



"1815 Arsenal St","","St. Louis","MO","63118","Entity A LLC","1234-56-789","single\\\_family",3,1,1100,1924,true,"occupied","","Fox Park","9"



Payments Import Template



date,property\\\_address,amount,type,status,reference\\\_number,notes



"2025-02-01","1815 Arsenal St",850.00,"hap","received","HAP-Feb2025",""



"2025-02-03","1815 Arsenal St",250.00,"copay","received","",""



Expenses Import Template



date,property\\\_address,amount,category,subcategory,vendor,description



"2025-02-10","1815 Arsenal St",340.00,"maintenance","plumbing","Mike's Plumbing","Replace kitchen faucet"



PM Bills Import Template



date,property\\\_address,description,category,amount,invoice\\\_number



"2025-02-20","1815 Arsenal St","Replace kitchen faucet","plumbing",185.00,"INV-0342"



"2025-02-20","1815 Arsenal St","Parts (faucet + supply lines)","plumbing",78.50,"INV-0342"







10\\. Key Business Rules



When property status changes to "vacant," vacant\\\_since is auto-set to today



When property status changes to "occupied," vacant\\\_since is cleared



PM management fee = entity.pm\\\_fee\\\_pct × monthly collected rent per property



When a PM bill is marked "Paid," expense records are auto-created from line items



Tasks not acknowledged within 48 hours auto-escalate to dashboard alert



Tasks past due date are flagged red on dashboard



Vacancy countdown: 30d=yellow, 45d=orange, 60d=red



All mutations logged to activity\\\_log with user\\\_id and timestamp



Staff cannot delete properties, entities, or users



All financial amounts stored as DECIMAL(10,2) — never floating point













