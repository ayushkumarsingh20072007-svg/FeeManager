# Agent 40 — API Documentation & Catalog

## 1. Implemented Endpoints (Phase 1 Foundation)

### System & Health
- **`GET /health`**
  - Public endpoint verifying application status, database connectivity, and version.
  - Response: `{"status": "healthy", "database": "connected", "version": "0.1.0"}`

### Authentication & Identity
- **`POST /api/v1/auth/login`**
  - Authenticates user credentials and returns JWT Bearer access & refresh tokens.
- **`GET /api/v1/auth/me`**
  - Returns authenticated user profile, active role, permissions, and linked student/parent IDs.
- **`POST /api/v1/auth/refresh`**
  - Issues refreshed access token given a valid refresh token.

### RBAC Verification
- **`GET /api/v1/rbac-test/student-only`**
  - Restricted to `STUDENT` and `PARENT` roles.
- **`GET /api/v1/rbac-test/finance-only`**
  - Restricted to `ACCOUNTS_OFFICER`, `FINANCE_APPROVER`, `MANAGEMENT`, `ADMIN`.
- **`GET /api/v1/rbac-test/approver-only`**
  - Restricted to `FINANCE_APPROVER` and `ADMIN`.

### Audit Logs (Read-Only)
- **`GET /api/v1/audit-logs`**
  - Paginated access to append-only audit trail. Requires `ADMIN`, `MANAGEMENT`, or `SYSTEM_ADMIN`.

---

## 2. Planned API Endpoints (Phases 2-6)

### Students & Profiles
- `GET /api/v1/students`
- `GET /api/v1/students/{id}`
- `GET /api/v1/students/{id}/statement`
- `GET /api/v1/students/{id}/outstanding`

### Fee Master & Demands
- `GET /api/v1/fee-structures`
- `POST /api/v1/fee-structures`
- `GET /api/v1/fee-structures/{id}`
- `POST /api/v1/fee-demands/generate`
- `GET /api/v1/fee-demands/{id}`

### Payments & Reconciliation
- `POST /api/v1/payments`
- `POST /api/v1/payments/{id}/allocate`
- `POST /api/v1/reconciliation/run`
- `GET /api/v1/reconciliation/mismatches`
- `POST /api/v1/reconciliation/mismatches/{id}/resolve`

### Refunds & Approvals
- `GET /api/v1/refunds/policies`
- `POST /api/v1/refunds/calculate`
- `POST /api/v1/refunds/proposals`
- `POST /api/v1/approvals/{id}/approve`
- `POST /api/v1/approvals/{id}/reject`

### AI Agent
- `POST /api/v1/agent/chat`
- `POST /api/v1/agent/tools/execute`
