# AGENT 40 — FEE & FINANCE MANAGEMENT SYSTEM (MASTER REFERENCE)
> **Institutional AI-Powered Autonomous Financial Operations & Ledger ERP**  
> *Developed for Vignan's Deemed to be University (NAAC A+, NIRF #70)*

---

## 1. EXECUTIVE SUMMARY & ARCHITECTURAL PHILOSOPHY

### 1.1 Project Overview
Agent 40 is an enterprise-grade Institutional Fee and Financial Operations Management ERP with an explainable, zero-hallucination AI Assistant. It manages end-to-end higher education financial workflows: dynamic fee structures, multi-criteria scholarship matrix, concession/waiver adjustments, priority partial allocation, bank reconciliation with mismatch resolution, exam clearance desk, cash flow forecasting, and append-only cryptographic audit logging.

### 1.2 Core Architectural Principles
The entire system is architecturally anchored to four inviolable pillars:
1. **AI RECOMMENDS**: The AI layer *never* writes directly to financial databases or executes raw queries. It interprets natural language queries, performs intent extraction, validates guardrails, and delegates execution exclusively to pre-audited, deterministic backend Python tools.
2. **RULES CALCULATE**: All financial math (fee demands, priority allocations, aging penalties, scholarship caps, refund tiers) is computed by pure, deterministic Python functions using exact `Decimal` arithmetic (`ROUND_HALF_UP`) to prevent floating-point rounding errors.
3. **HUMANS AUTHORIZE**: High-risk financial operations (waivers over threshold, refund disbursements, manual journal adjustments, attendance shortage overrides) mandate a strict "Two-Man Rule" / Multi-Level Approval workflow with separation of duties.
4. **SYSTEM AUDITS**: Every read, write, calculation, and AI query is recorded in an immutable, append-only cryptographic audit trail linking `user_id`, `role`, `action`, `resource_type`, `ip_address`, and before/after payloads.

---

## 2. TECHNOLOGY STACK & SYSTEM SPECS

### 2.1 Backend Core
- **Framework**: FastAPI (Python 3.11+ / 3.14 compatible, ASGI)
- **ORM & Data Layer**: SQLAlchemy 2.0 (Modern Declarative Mapped models, typed queries, eager loading via `joinedload` / `selectinload`)
- **Database**: SQLite 3 (zero-dependency canonical file `agent40.db` with WAL mode enabled; plug-and-play PostgreSQL support via `psycopg`)
- **Validation**: Pydantic v2 & `pydantic-settings`
- **Security & Authentication**: JWT (JSON Web Tokens via `PyJWT`, `HS256`), bcrypt password hashing (`passlib`)
- **Testing**: `pytest` (137 automated unit and integration tests, 100% pass rate)

### 2.2 Frontend Core
- **Framework**: React 18.3+ with TypeScript
- **Bundler & Tooling**: Vite 5.2+, PostCSS, Autoprefixer
- **Styling**: Tailwind CSS v3.4 (Custom curated palette: deep institutional navy, slate, indigo, and amber)
- **Icons**: Lucide React
- **HTTP Client**: Native Fetch API wrapped inside a singleton `ApiClient` handling JWT injection, error normalization, and PDF blob downloads.

---

## 3. RELATIONAL DATABASE SCHEMA & ENTITIES (33 MODELS)

The database schema spans 33 relational tables categorized into 8 domains:

### 3.1 Identity & User Management (`app/models/users.py`)
- `users`: Core identity table (`id`, `email`, `password_hash`, `full_name`, `role`, `phone`, `is_active`, `created_at`).
- `students`: Academic student profile (`id`, `roll_no`, `user_id`, `program_id`, `regulation_id`, `category_id`, `admission_year_id`, `admission_route_id`, `current_semester`, `cgpa`, `attendance_percentage`).
- `parents`: Guardian profile linked to students (`id`, `user_id`, `student_id`, `relationship_type`).

### 3.2 Academic Master Tables (`app/models/academics.py`)
- `academic_years`: E.g., 2026-27, 2025-26 (`id`, `year_name`, `is_active`, `start_date`, `end_date`).
- `programs`: Academic degrees (`id`, `code`, `name`, `department`, `duration_semesters`). E.g., B.Tech CSE, B.Tech ECE, MBA, MCA, M.Tech.
- `regulations`: Academic curricula rules (`id`, `code`, `year`, `effective_from`). E.g., R23, R20.
- `categories`: Fee reservation categories (`id`, `code`, `name`). E.g., GEN, OBC, SC, ST, EWS.
- `admission_routes`: Quota channels (`id`, `code`, `name`). E.g., JEE_MAINS, VSAT, MANAGEMENT, LATERAL_ENTRY.
- `fee_heads`: Granular breakdown heads (`id`, `code`, `name`, `head_type`, `is_refundable`). E.g., TUITION, ADMISSION, EXAM, LAB, LIBRARY, SPORTS, HOSTEL, TRANSPORT.
- `enrollments`: Student semester enrollment linking students to academic years and active semesters.

### 3.3 Fee Structure & Versioning (`app/models/fee_structures.py`)
- `fee_structures`: Base structure header (`id`, `code`, `program_id`, `regulation_id`, `category_id`, `academic_year_id`, `semester`, `currency`, `total_amount`, `status`, `version`).
- `fee_structure_items`: Head-wise breakdown (`id`, `fee_structure_id`, `fee_head_id`, `amount`, `priority`, `is_optional`). E.g., Tuition Fee (Priority 1), Exam Fee (Priority 2), Lab Fee (Priority 3).

### 3.4 Demands, Reductions & Installments (`app/models/fee_demands.py`)
- `fee_demands`: The authoritative debit bill per student (`id`, `student_id`, `academic_year_id`, `semester`, `gross_demand`, `scholarship_amount`, `concession_amount`, `waiver_amount`, `net_demand`, `paid_amount`, `outstanding_amount`, `status`, `due_date`).
- `fee_demand_items`: Line-item breakdown of individual heads billed to the student.
- `scholarships`: Merit/Government scholarships awarded (`id`, `fee_demand_id`, `name`, `code`, `amount`, `criteria`, `status`).
- `concessions`: Institutional discounts (`id`, `fee_demand_id`, `reason`, `amount`, `status`, `approved_by`).
- `fee_waivers`: Approved reductions for special hardships (`id`, `fee_demand_id`, `reason`, `amount`, `status`, `approved_by`).
- `installment_plans`: Split payment terms (`id`, `fee_demand_id`, `total_installments`, `status`).
- `installments`: Individual split milestone (`id`, `plan_id`, `installment_number`, `amount`, `due_date`, `status`).

### 3.5 Payments & Allocations (`app/models/payments.py`)
- `payments`: Credit entries (`id`, `student_id`, `fee_demand_id`, `amount`, `channel`, `transaction_id`, `reference_number`, `status`, `payment_date`, `is_reconciled`).
- `payment_allocations`: Authoritative waterfall partial allocations mapping a payment to specific fee demand heads in strict priority sequence.
- `payment_channel_configs`: Gateway parameters, fee surcharges, and webhook verification secrets.

### 3.6 Bank Reconciliations & Mismatches (`app/models/reconciliations.py`)
- `bank_transactions`: Parsed external bank statements/feeds (`id`, `bank_account`, `transaction_id`, `amount`, `utr_number`, `transaction_date`, `status`).
- `reconciliations`: Match entity between an internal `Payment` and an external `BankTransaction`.
- `mismatches`: Discrepancy logs with classifications:
  - `AMOUNT_MISMATCH`: Gateway collected ₹50,000, Bank credited ₹49,850 (gateway MDR charge deducted).
  - `MISSING_IN_BANK`: Payment verified internally via receipt, but not reflected in bank statement.
  - `MISSING_IN_LEDGER`: Direct NEFT/IMPS credit landed in university account without a student reference.

### 3.7 Governance, Approvals & Documents (`app/models/approvals.py`, `documents.py`, `audit.py`)
- `approval_requests`: Two-Man rule request tickets (`id`, `type`, `status`, `requested_by`, `assigned_to`, `payload`).
- `approval_actions`: Approval or rejection audit logs (`request_id`, `actor_id`, `action`, `comments`).
- `receipts`: Generated official money receipts (`id`, `payment_id`, `receipt_number`, `receipt_date`, `sha256_hash`).
- `certificates`: Financial Clearance and No-Due certificates.
- `audit_logs`: Immutable, append-only logs (`id`, `user_id`, `role`, `action`, `resource_type`, `resource_id`, `ip_address`, `details`, `timestamp`).

---

## 4. DETERMINISTIC FINANCIAL RULE ENGINES

All business logic runs inside isolated Python modules (`app/rules/` and `app/services/`):

### 4.1 Authoritative Single Calculation Path (`app/services/ledger_calculator.py`)
- **Gross Demand**: $\sum \text{FeeDemandItem.gross\_amount}$
- **Total Reductions**: $\text{Scholarships} + \text{Concessions} + \text{Waivers}$
- **Net Demand**: $\max(0, \text{Gross Demand} - \text{Total Reductions})$
- **Valid Payments**: $\sum \text{Payment.amount}$ for records with status $\in \{\text{RECEIVED}, \text{RECONCILED}\}$
- **Outstanding Balance**: $\max(0, \text{Net Demand} - \text{Valid Payments})$
- **Status Derivation**:
  - If $\text{Outstanding} > 0$ and $\text{due\_date} < \text{current\_date} \implies \mathbf{OVERDUE}$
  - Else if $\text{Outstanding} == 0$ and $\text{Net Demand} > 0 \implies \mathbf{PAID}$
  - Else if $\text{Valid Payments} > 0$ and $\text{Outstanding} > 0 \implies \mathbf{PARTIALLY\_PAID}$
  - Else if $\text{Valid Payments} == 0 \implies \mathbf{PENDING}$

### 4.2 Waterfall Priority Partial Allocation (`app/rules/allocation_engine.py`)
When a student pays an amount less than their full net demand, the payment is consumed sequentially by fee head priority:
1. **Priority 1**: Tuition Fee (Must be satisfied first)
2. **Priority 2**: Examination Fee (Required for hall ticket clearance)
3. **Priority 3**: Laboratory / Practical Fee
4. **Priority 4**: Library & Digital Resources
5. **Priority 5**: Sports & Extracurriculars
6. **Priority 6**: Transportation / Hostel Amenities
*Result*: An immutable `PaymentAllocation` row is created per head specifying `amount_allocated` and `remaining_head_balance`.

### 4.3 Aging Analysis Buckets (`app/rules/aging_engine.py`)
Overdue demands are classified into aging tiers based on elapsed days past `due_date`:
- **Current / Not Due**: Due date in future
- **Bucket 1 (1–30 Days)**: Mild reminder notices; hall ticket conditional eligibility
- **Bucket 2 (31–60 Days)**: Escalated notices to parent email/SMS; hall ticket blocked
- **Bucket 3 (61–90 Days)**: Finance committee review; exam registration suspended
- **Bucket 4 (90+ Days)**: Critical default; enrollment hold placed

### 4.4 UGC-Compliant Refund Engine (`app/rules/refund_engine.py`)
Refunds for course withdrawals follow official statutory percentage matrices relative to the academic session commencement date:
- **$\ge 15$ days before session**: $100\%$ refund (less deduction of $\le 5\%$ or max ₹5,000 as processing fee)
- **$< 15$ days before session**: $90\%$ refund
- **$\le 15$ days after session**: $80\%$ refund
- **$16 - 30$ days after session**: $50\%$ refund
- **$> 30$ days after session**: $0\%$ refund

### 4.5 Default-Risk Scoring Engine (`app/rules/risk_engine.py`)
- **Philosophy**: 100% deterministic, audit-compliant, explainable rule-weighted scoring — **zero black-box ML model**. This guarantees complete auditability for financial decisions (no "why did the model say that" moments during live audits).
- **Weighted Capped Factors (0–100 Total Score)**:
  1. **Past payment delay pattern** (Max 30 pts): Evaluates historical average days late on payments and active overdue duration.
  2. **Current aging bucket** (Max 25 pts): Measures active delinquency severity (>60d = 25 pts, 31-60d = 20 pts, 1-30d = 15 pts, approaching due date = 5-12 pts).
  3. **Partial payment ratio** (Max 20 pts): Scales linearly with unpaid balance ratio $20 \times (1 - \text{paid\_amount} / \text{net\_demand})$.
  4. **Installment plan adherence** (Max 15 pts): Evaluates ratio of overdue/missed installment tranches out of total plan tranches.
  5. **Category / Scholarship dependency** (Max 10 pts): Flags students awaiting government/merit scholarship disbursement with low personal payments.
- **Mathematical Integrity**: All point calculations use exact Python `Decimal` arithmetic. The sum of `contributing_factors` points is mathematically guaranteed to equal the total `risk_score` with zero rounding drift.
- **Risk Tiers**:
  - `LOW (0-30)`: Minimal default risk (e.g. STU1001 Aravind Kumar = 0 pts).
  - `MEDIUM (31-60)`: Moderate default probability requiring early reminders.
  - `HIGH (61-100)`: High default likelihood requiring proactive finance follow-up (e.g. STU1002 Priya Sharma = 68 pts).
- **Access Control & RBAC**: Restricted exclusively to staff roles (`ACCOUNTS_OFFICER`, `FINANCE_APPROVER`, `MANAGEMENT`, `ADMIN`). Hidden from student/parent views.


---

## 5. ROLE-BASED ACCESS CONTROL (RBAC) & ZERO-TRUST SECURITY

### 5.1 The 7 System Personas
| Role | Identifier | Purpose / Capabilities |
| :--- | :--- | :--- |
| **ACCOUNTS_OFFICER** | `accounts@university.edu` | Daily financial transactions, fee demands, counter payments, receipts, payment allocation |
| **FINANCE_APPROVER** | `finance.approver@university.edu` | Two-man sign-offs on refund payouts, concessions, fee waivers, payment reversals |
| **MANAGEMENT** | `director@university.edu` | High-level executive analytics, revenue realization, aging buckets, cashflow forecasts |
| **ADMIN** | `admin@university.edu` | Academic structures, regulation fees, admission routes, rate cards, system configuration |
| **SYSTEM_ADMIN** | `sysadmin@university.edu` | Technical administration, audit log integrity review, database maintenance |
| **STUDENT** | `aravind.k@student.edu` *(STU1001)* | Self-service ledger view, fee receipts, payment checkout, exam hall ticket clearance |
| **PARENT** | `parent.aravind@gmail.com` | Dependent ledger view, online installment settlement, challan generation |

### 5.2 Zero-Trust Student Data Isolation
- Students are strictly isolated: `current_user.id` is checked against `student.user_id`. A student requesting `/ledger/students/STU1002` when logged in as `STU1001` receives an immediate HTTP 403 Forbidden.
- **Student Password Inviolability**: By architectural policy, a student's login password is required to be their exact **Student ID / Roll Number** (e.g., `STU1001`). This ensures complete zero-trust verification between the ERP roster and the student portal.

---

## 6. AI FINANCIAL AGENT & QUERY PLANNER ARCHITECTURE (AGENT 40)

Agent 40 features a hybrid AI architecture adhering strictly to **"AI Recommends, Rules Calculate, Humans Authorize."**
The AI layer never writes to the database directly and never performs math. It operates across two modes:
1. **Single-Tool Query Router**: Directly maps atomic queries to a single audited tool.
2. **Multi-Step, Multi-Filter Query Planner (DAG Executor)**: Decomposes compound, cross-domain natural language questions into structured filter predicates, compiles a Directed Acyclic Graph (DAG, max depth = 5), validates all tools via an all-or-nothing RBAC gatekeeper, and evaluates candidate cohorts using deterministic Python set-intersection math.

```
Compound NL Query ("Which OBC students in CSE are overdue AND have exam clearance blocked?")
                                  │
                                  ▼
                     [ 1. Guardrails Inspection ] ──(Prompt Injections)──► [ Intercept & Audit ]
                                  │
                                  ▼
               [ 2. Compound Detection & Predicate Extractor ]
               Decomposes into:
               - Predicate 1: Academic (category='OBC', program='CSE')
               - Predicate 2: Financial (status='OVERDUE')
               - Predicate 3: Exam Clearance (clearance='BLOCKED')
                                  │
                                  ▼
                  [ 3. Execution DAG Compiler (Max Depth 5) ]
                  Phase 1: filter_students(category='OBC', program='CSE')
                  Phase 2: filter_by_payment_status(status='OVERDUE')
                  Phase 3: filter_by_exam_clearance(status='BLOCKED')
                                  │
                                  ▼
                 [ 4. All-or-Nothing RBAC Gatekeeper ]
            (Checks caller role against EVERY tool in the DAG)
                  ├── Caller Unauthorized on ANY tool ──► HTTP 403 Forbidden
                  └── Caller Authorized on ALL tools
                                  │
                                  ▼
              [ 5. Deterministic Python Set Intersection ]
                  Step 1: Set_1 = {matched student IDs} (e.g. 11 students)
                  Step 2: Set_2 = Set_1 ∩ {overdue student IDs} (e.g. 1 student)
                  Step 3: Set_3 = Set_2 ∩ {blocked student IDs} (STU1010)
                                  │
                                  ▼
                 [ 6. Explainable Reasoning Trace Assembly ]
                  "1. Filter students by category=OBC, program=CSE -> 11 matched"
                  "2. Narrow to payment_status=OVERDUE -> 1 matched"
                  "3. Narrow to exam_clearance=BLOCKED -> 1 matched"
                                  │
                                  ▼
               [ 7. Natural Language Response & Audit Trail ]
                  - Formats response using authoritative tool data
                  - Emits append-only audit logs for every step
                  - Returns structured JSON with reasoning trace & cohort card
```

### 6.1 Authoritative Tool Registry (32 Granular Tools)

All tools enforce strict Pydantic schemas, role-based authorization, and pipeline chaining via `student_ids`:

#### Academic Domain Tools (`app/ai/tools/filter_tools.py`)
- `filter_students`: Multi-attribute academic filter (program, category, route, CGPA, attendance).
- `filter_by_program`: Filter by degree code (BTECH-CSE, BTECH-ECE, MBA, MCA, MECH, etc.).
- `filter_by_category`: Filter by reservation category (GEN, OBC, SC, ST, EWS).
- `filter_by_admission_route`: Filter by quota channel (JEE_MAINS, VSAT, MANAGEMENT).
- `filter_by_attendance_shortage`: Filter students with attendance below statutory threshold (< 75%).
- `filter_by_cgpa_range`: Filter students within cumulative GPA bands.
- `get_student_profile`: Comprehensive academic and profile summary.

#### Financial Status & Ledger Filtering Tools (`app/ai/tools/filter_tools.py`)
- `filter_by_payment_status`: Filter by derived ledger status (OVERDUE, PARTIALLY_PAID, PENDING, PAID).
- `filter_by_aging_bucket`: Filter delinquency cohorts by aging bucket (1-30, 31-60, 61-90, 90+ days).
- `filter_by_outstanding_range`: Filter by outstanding balance amount range.
- `filter_by_scholarship_recipient`: Filter students with active merit/means scholarships.
- `filter_by_concession`: Filter students with approved institutional concessions.
- `filter_by_waiver`: Filter students with approved special fee waivers.
- `filter_by_installment_plan`: Filter students enrolled in installment split plans.

#### Examination & Gate Clearance Tools (`app/ai/tools/filter_tools.py`)
- `filter_by_exam_clearance`: Filter students by hall ticket status (CLEARED, BLOCKED, CONDITIONAL_HOLD).
- `check_exam_clearance`: Granular audit check of a single student's fee dues, holds, and attendance clearance.

#### Student Financial Services Tools (`app/ai/tools/student_fee_tools.py`)
- `get_outstanding_amount`: Exact real-time outstanding balance, net demand, and paid amount.
- `get_fee_breakup`: Itemized head-wise breakdown (Tuition, Exam, Lab, Library, etc.).
- `get_payment_history`: Ledger payment receipts and transaction records.

#### Institutional Analytics & Reporting Tools (`app/ai/tools/reporting_tools.py`)
- `get_financial_summary`: Campus-wide demand, collection, and outstanding metrics.
- `get_overdue_students`: Program-wise overdue defaulters listing with contact and balance.
- `explain_reconciliation_mismatch`: Bank statement vs gateway discrepancy diagnostics.
- `calculate_refund`: UGC-compliant withdrawal refund calculation.
- `get_cashflow_forecast`: 30/60/90-day cash flow projection using historical realization patterns.


---

## 7. FRONTEND USER EXPERIENCE & INTERFACES

The frontend provides 18 dedicated modules:

1. **Vignan Header**: Official branding (NAAC A+, NIRF 70), academic year selector, instant notifications drawer, live demo reset button, and multi-role instant impersonation switcher.
2. **Executive Dashboard (`DashboardPage.tsx`)**: Real-time cards for Gross Demand, Collections Realized, Outstanding Receivables, Collection Rate %, Deterministic Default-Risk card, and the **Analytics & Visual Intelligence** suite (6-month Collection Trend Composed Chart, Aging Distribution Donut with slice drill-down, and Program × Aging Defaulter Heatmap with cell hover and click filtering).
3. **Student Directory & Detail Modal (`StudentsPage.tsx`)**: Search, filter by program/cohort, with an itemized student fee ledger modal detailing every billed head, scholarship credit, payment allocation, and explainable Default Risk Breakdown.
4. **Fee Structures (`FeeStructuresPage.tsx`)**: Regulation-wise master rate cards (R23, R20) with versioning and head-level priorities.
5. **Fee Demands Management (`FeeDemandsPage.tsx` & `FeeManagementPage.tsx`)**: Batch generation of semester demands, calculation previews, and scholarship deductions.
6. **Payment Operations (`PaymentsPage.tsx`)**: Collect payments (UPI, NEFT, Netbanking, Counter), view allocation breakdowns, generate instant official receipts, and download PDF receipts.
7. **Reconciliation Desk (`ReconciliationPage.tsx`)**: Match gateway/counter records with bank statement UTR numbers, resolve flagged mismatches, and trace audit approvals.
8. **Aging Analysis (`AgingPage.tsx`)**: Color-coded delinquency cohorts (0-30, 31-60, 61-90, 90+ days) with bulk notification dispatch.
9. **Refund Lifecycle (`RefundsPage.tsx`)**: Manage withdrawal refund requests with policy adherence formulas and two-man sign-offs.
10. **Approvals Desk (`ApprovalsPage.tsx`)**: Review pending financial waivers, concessions, refund disbursements, and exam clearance overrides.
11. **AI Chat Assistant (`ChatInterface.tsx` & `RobotHero.tsx`)**: Conversational bot with quick prompt suggestions, tools-used badges, and embedded structured financial cards.
12. **Student Portal (`StudentPortalPage.tsx`)**: Student self-service view featuring Fee Balance, Payment History, Online Payment modal, Exam Hall Ticket clearance status, and Downloadable Hall Ticket.
13. **Integrations & Clearance (`IntegrationsPage.tsx`)**: Webhook simulations, Cashflow Forecaster (30, 60, 90 days), Examination Permission Desk, and Automated Notification Logs.
14. **Audit Logs Explorer (`AuditLogsPage.tsx`)**: Searchable, tamper-evident log table displaying user, role, IP address, action, and JSON details.

---

## 8. DEMO BENCHMARKS & TEST PERSONAS

The system comes pre-seeded with 28 benchmark student profiles and realistic synthetic cohorts (200 students total):

- **Benchmark 1: Aravind Kumar (`STU1001` / `aravind.k@student.edu`)**
  - *Program*: B.Tech CSE (Gen Quota)
  - *Status*: Net demand ₹1,68,000 | Paid ₹1,68,000 | Outstanding: ₹0 | **Status: PAID**
  - *Exam Clearance*: CLEARED (Hall Ticket unlocked & downloadable)
  - *Login*: Identifier `STU1001`, Password `STU1001`
- **Benchmark 2: Priya Sharma (`STU1002` / `priya.s@student.edu`)**
  - *Program*: B.Tech ECE (Merit Scholarship)
  - *Status*: Gross ₹1,68,000 - ₹50,000 Scholarship = Net ₹1,18,000 | Paid: ₹0 | **Status: OVERDUE**
  - *Exam Clearance*: BLOCKED (Fee Defaulter)
  - *Login*: Identifier `STU1002`, Password `STU1002`
- **Benchmark 3: Meera Iyer (`STU1014` / `meera.i@student.edu`)**
  - *Program*: B.Tech CSE
  - *Status*: Fees 100% Paid, but Attendance is 68% (Shortage < 75% threshold)
  - *Exam Clearance*: CONDITIONAL_HOLD (Demonstrates academic approval desk override)
  - *Login*: Identifier `STU1014`, Password `STU1014`
- **Benchmark 4: Deepika Rao (`STU1004` / `deepika.r@student.edu`)**
  - *Status*: Course Withdrawal with ₹1,00,000 advance payment; demonstrates UGC tier refund calculation.

---

## 9. STEP-BY-STEP RUN & VERIFICATION GUIDE

### 9.1 Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate          # Windows
# source venv/bin/activate       # Linux/macOS

pip install -r requirements.txt
python seed.py                  # Populates schema & 200 benchmark students
pytest                          # Runs all 137 unit tests
python -m uvicorn app.main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/health`

### 9.2 Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 10. ARCHITECTURAL SAFEGUARDS
1. **Canonical SQLite Resolution**: `backend/app/core/config.py` anchors to `backend/agent40.db` ensuring no database splitting across execution contexts.
2. **Environment Variable AI Resolution**: `backend/app/ai/providers.py` checks both `settings.GEMINI_API_KEY` and OS environment variables.
3. **Session Safe Teardown**: `backend/tests/conftest.py` contains a post-test seed restore to guarantee zero test data leakage into development environments.
4. **Header Multi-Role Switcher**: Features Accounts Officer, Finance Approver, Management, and Admin in `VignanHeader.tsx`.
5. **Student Demo Refresh**: `App.tsx` refreshes student tokens via `/auth/me` without requiring re-entering passwords.
