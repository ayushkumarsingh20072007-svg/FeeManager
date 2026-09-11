# FeeManager — Agent 40 Fee & Finance Management System

> **AI-Powered Institutional Financial Operations System**
> Enterprise-grade fee structures, multi-channel payment reconciliation, priority partial allocation, aging analytics, refund lifecycle management, and explainable AI assistant.

---

## 🌟 Key Architecture Principles
- **AI RECOMMENDS**: Interprets natural language queries, maps user intent to authoritative financial tools.
- **RULES CALCULATE**: Pure deterministic Python business logic calculating demands, priority allocations, aging, and refund formulas.
- **HUMANS AUTHORIZE**: Two-man rule and strict role-based sign-offs on sensitive financial write actions (refunds, waivers, adjustments).
- **SYSTEM AUDITS**: Append-only log of every financial read and write action.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ (Node 24 supported) & npm
- (Optional) Docker & PostgreSQL

### 1. Backend Setup & Run
```bash
# Navigate to backend
cd backend

# Create and activate virtual environment (optional/recommended)
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Unix/Mac:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations (or initialize tables) and seed demo data
python seed.py

# Run automated tests
pytest

# Start FastAPI backend server
uvicorn app.main:app --reload --port 8000
```
Backend API will be running at `http://localhost:8000`
API docs available at `http://localhost:8000/docs`
Health check at `http://localhost:8000/health`

### 2. Frontend Setup & Run
```bash
# Navigate to frontend in a new terminal
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend web application will be accessible at `http://localhost:5173`

---

## 🔑 Demo Seed Accounts (Password: `password123` for all)

| Role | Email | Purpose |
| :--- | :--- | :--- |
| **ACCOUNTS_OFFICER** | `accounts@university.edu` | Full fee operations, payments, reconciliation |
| **FINANCE_APPROVER** | `finance.approver@university.edu` | Sensitive financial approvals & refunds |
| **MANAGEMENT** | `director@university.edu` | Executive analytics, aging & collection dashboards |
| **ADMIN** | `admin@university.edu` | Master configuration, fee structures & versions |
| **STUDENT** | `aravind.k@student.edu` | B.Tech CSE Student (General Category) |
| **STUDENT** | `priya.s@student.edu` | B.Tech ECE Student (Scholarship Recipient) |
| **PARENT** | `parent.aravind@gmail.com` | Dependent Fee Portal |

---

## 📂 Project Structure
```
agent40/
├── backend/
│   ├── app/
│   │   ├── api/          # Route definitions & RBAC dependencies
│   │   ├── core/         # Config, Database engine, Security & Logging
│   │   ├── models/       # Complete SQLAlchemy 2.0 ORM schemas
│   │   ├── schemas/      # Pydantic validation schemas
│   │   ├── services/     # Business logic & services
│   │   ├── repositories/ # Database persistence layer
│   │   ├── rules/        # Deterministic financial rule engines
│   │   ├── agents/       # AI Orchestrator & Tool router
│   │   ├── tools/        # 28+ Financial Tool definitions
│   │   └── audit/        # Append-only audit logger
│   ├── alembic/          # Database migrations
│   ├── tests/            # Pytest test suite
│   ├── requirements.txt
│   └── seed.py           # Seed script with realistic synthetic data
├── frontend/             # React + Vite + TypeScript + Tailwind CSS UI
├── docs/                 # Architecture, Database, Security & API docs
├── .env.example
├── docker-compose.yml
└── README.md
```
