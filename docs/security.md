# Agent 40 — Security & RBAC Architecture

## 1. Principles of Financial Security
Financial records require significantly stricter security than generic administrative systems:
1. **Never Rely on UI Hiding**: All authorization is strictly enforced at API endpoint dependencies.
2. **Deterministic Immutability**: Historical financial records and superseded fee structures are never modified in place.
3. **Dual Authorization (Human in the Loop)**: Financial writes such as refunds, fee waivers, balance adjustments, and ledger overrides cannot be committed autonomously by AI or a single operator without approval from a `FINANCE_APPROVER`.
4. **Append-Only Auditing**: Every read of sensitive student balances and every financial mutation is permanently written to `audit_logs`.

---

## 2. Role-Based Access Control (RBAC) Matrix

| Resource / Action | STUDENT | PARENT | ACCOUNTS_OFFICER | ADMIN | MANAGEMENT | FINANCE_APPROVER | SYSTEM_ADMIN |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **View Own Statement / Demands** | ✅ | ✅ (Child only) | ✅ (All) | ✅ | ✅ | ✅ | ❌ |
| **Download Receipts / Certificates** | ✅ | ✅ (Child only) | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Initiate Payment** | ✅ | ✅ | ✅ (Counter) | ❌ | ❌ | ❌ | ❌ |
| **View Institutional Dashboards & Aging** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Record Counter / Bank Payment** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Reconcile Payments / Mismatches** | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Create Refund Proposal** | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Approve / Reject Refund Proposal** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Approve Balance Adjustment / Waiver** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Manage Fee Structures & Versions** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **View Audit Logs** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **System Health & Config** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |

---

## 3. Audit Logging Format
Audit records are structured as follows:
- `audit_id`: Unique identifier (UUID).
- `user_id`: Authenticated actor ID.
- `role`: Actor's role at time of action.
- `action`: `READ`, `CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `REJECT`, `RECONCILE`, `ALLOCATE`.
- `resource_type`: e.g. `STUDENT_FEE_DEMAND`, `PAYMENT`, `REFUND_REQUEST`, `MISMATCH`.
- `resource_id`: Primary key of resource.
- `old_value` & `new_value`: JSON snapshot of changed state.
- `ip_address` & `user_agent`: Request metadata.
- `timestamp`: UTC timestamp.
