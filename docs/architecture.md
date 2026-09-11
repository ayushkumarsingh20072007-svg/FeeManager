# Agent 40 — Fee Management Agent: Architecture Specification

## 1. System Overview
**Agent 40** is an enterprise-grade institutional financial operations platform paired with an explainable AI assistant. It provides deterministic, audited fee management for universities and colleges across India.

### The Golden Rule of Agent 40
```
AI RECOMMENDS
      ↓
RULES CALCULATE
      ↓
HUMANS AUTHORIZE
      ↓
SYSTEM AUDITS
```
- **AI Layer**: Interprets natural language queries, maps user intent to backend tool calls, and generates human-readable explanations based solely on authoritative database outputs.
- **Rules Engine**: Pure deterministic Python logic executing fee demands, scholarship/waiver deductions, priority payment allocation, aging bucketing, and refund formulas.
- **Authorization Engine**: Enforces strict Role-Based Access Control (RBAC) and human-in-the-loop approvals for sensitive financial write actions.
- **Audit Engine**: Append-only ledger recording every read and write of financial entities with actor, timestamp, delta, and cryptographic/reference tracking.

---

## 2. Layered Architecture

```
+-------------------------------------------------------------------------+
|                              FRONTEND                                   |
|   React + TypeScript + Vite + Tailwind CSS + Lucide + Chart Dashboards   |
+-------------------------------------------------------------------------+
                                     │  (HTTPS / JWT Bearer)
                                     ▼
+-------------------------------------------------------------------------+
|                             API LAYER                                   |
|  FastAPI Router • Route Handlers • Pydantic Schemas • CORS • Middleware |
+-------------------------------------------------------------------------+
           │                                          │
           ▼ (Auth / Audit Dependency)                ▼ (Agent Orchestrator)
+-------------------------------------+   +-------------------------------+
|         SECURITY & AUDIT            |   |       AI AGENT LAYER          |
|  JWT • Password Hashing (bcrypt)    |   |  Natural Language Intent      |
|  RBAC (7 Roles) • Read/Write Audit  |   |  28+ Tool Definitions         |
+-------------------------------------+   |  LLM Context & Explanations   |
           │                              +-------------------------------+
           ▼                                          │
+-------------------------------------------------------------------------+
|                        SERVICES & BUSINESS RULES                        |
|  FeeCalculationEngine • PaymentAllocator • AgingEngine • RefundEngine   |
|  ReconciliationEngine • ApprovalService • DocumentService (PDF)         |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                        REPOSITORIES & ORM MODELS                        |
|  SQLAlchemy 2.0 ORM • Explicit Foreign Keys • Relationships • Enums    |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                                DATABASE                                 |
|  SQLite (Local Zero-Config Dev) / PostgreSQL 16 (Enterprise Prod)      |
+-------------------------------------------------------------------------+
```

---

## 3. Key Subsystems
1. **Versioned Fee Structure**: Fee structures are immutable per academic year, program, regulation, category, and admission route. Version tags ensure historical demands remain untainted.
2. **Fee Demand Generator**: Calculates gross demand, applies scholarships/concessions/waivers, and generates net balance and installment schedules.
3. **Multi-Channel Payment Allocator**: Ingests Gateway, Bank Transfer (NEFT/RTGS/UTR), and Counter receipts, allocating funds strictly by institutional priority (e.g. Tuition -> Exam -> Lab -> Library -> Hostel -> Transport -> Other).
4. **Aging & Receivables Engine**: Classifies balances into `0-30`, `31-60`, `61-90`, `91-180`, and `180+` day aging buckets.
5. **Refund Engine**: Implements date-based institutional refund policies with mandatory human authorization proposals.
6. **Accounting Reconciliation & Mismatch Triage**: Flags `FINANCE_REVIEW_REQUIRED` for amount, duplicate, date, or student mismatches.
7. **External Agent Integration**:
   - Inbound: Consumes scholarships/concessions from **Agent 42**.
   - Outbound: Feeds student financial status to **Agents 30, 41, 43, 71**.
