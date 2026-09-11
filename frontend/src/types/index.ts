export type UserRole =
  | 'STUDENT'
  | 'PARENT'
  | 'ACCOUNTS_OFFICER'
  | 'ADMIN'
  | 'MANAGEMENT'
  | 'FINANCE_APPROVER'
  | 'SYSTEM_ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  is_active: boolean;
  student_id?: string;
  roll_no?: string;
  parent_id?: string;
}

export interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface HealthStatus {
  status: string;
  database: string;
  version: string;
  environment: string;
  details?: Record<string, any>;
}

export interface AuditLogItem {
  id: string;
  user_id?: string;
  role?: UserRole;
  action: string;
  resource_type: string;
  resource_id?: string;
  timestamp: string;
  old_value?: string;
  new_value?: string;
  approval_id?: string;
  reason?: string;
  ip_address?: string;
  request_id?: string;
}

export interface LedgerStats {
  total_students: number;
  total_demand: number;
  total_net_demand?: number;
  total_collected: number;
  total_outstanding: number;
  overdue_90plus: number;
  paid_students?: number;
  partially_paid_students?: number;
  unpaid_students?: number;
  overdue_students?: number;
  total_payments: number;
  reconciled_payments: number;
  unreconciled_payments: number;
  mismatches: number;
  pending_approvals: number;
  pending_refunds: number;
  collection_percentage: number;
}

export interface StudentRecord {
  id: string;
  roll_no: string;
  name: string;
  email: string;
  program_code: string;
  program_name: string;
  academic_year: string;
  category: string;
  semester: number;
  enrollment_status: string;
  gross_demand: number;
  scholarship_amount?: number;
  concession_amount?: number;
  waiver_amount?: number;
  net_demand?: number;
  paid_amount: number;
  outstanding_amount: number;
  demand_status: string;
  due_date: string;
}

export interface FeeHeadItem {
  head_code: string;
  head_name: string;
  amount: number;
  priority: number;
  is_refundable: boolean;
}

export interface FeeStructureRecord {
  id: string;
  academic_year: string;
  program_code: string;
  program_name: string;
  regulation: string;
  category: string;
  admission_route: string;
  version: number;
  status: string;
  total_amount: number;
  effective_from: string;
  effective_to?: string | null;
  items: FeeHeadItem[];
}

export interface PaymentAllocationItem {
  id: string;
  fee_demand_item_id: string;
  fee_head_name?: string;
  fee_head_type?: string;
  allocated_amount: number;
  priority_applied?: string;
}

export interface PaymentRecord {
  id: string;
  payment_ref: string;
  student_id?: string;
  student_roll: string;
  student_name: string;
  fee_demand_id?: string;
  amount: number;
  channel: string;
  status: string;
  transaction_id: string;
  utr_number?: string;
  receipt_number?: string;
  receipt_id?: string;
  payment_date: string;
  gateway_name?: string;
  notes?: string;
  allocations?: PaymentAllocationItem[];
  created_at?: string;
}

export interface BankTransactionRecord {
  id: string;
  bank_transaction_id: string;
  transaction_date: string;
  value_date?: string;
  amount: number;
  reference_number?: string;
  bank_reference?: string;
  description?: string;
  account_identifier?: string;
  reconciliation_status: string;
  matched_payment_id?: string;
  reconciled_at?: string;
  reconciled_by?: string;
  resolution_notes?: string;
}

export interface MismatchRecord {
  id: string;
  mismatch_code: string;
  category: string;
  transaction_ref: string;
  student_id?: string;
  student_roll: string;
  expected_amount: number;
  actual_amount: number;
  variance: number;
  status: string;
  flagged_message: string;
  resolution_notes?: string;
}

export interface ApprovalRecord {
  id: string;
  approval_code: string;
  approval_type: string;
  entity_type: string;
  requested_by: string;
  requested_amount: number;
  status: string;
  reason: string;
  created_at: string;
}

export interface RefundRecord {
  id: string;
  request_code: string;
  student_roll: string;
  student_name: string;
  policy_name: string;
  withdrawal_date: string;
  total_paid: number;
  non_refundable: number;
  policy_deduction: number;
  proposed_refund: number;
  status: string;
  reason: string;
}

export interface ReceiptFeeItem {
  head_code: string;
  head_name: string;
  allocated_amount: number;
}

export interface ReceiptResponse {
  receipt_id: string;
  receipt_number: string;
  issue_date: string;
  verification_hash?: string;
  payment_id: string;
  payment_ref: string;
  transaction_id: string;
  payment_channel: string;
  payment_status: string;
  payment_date: string;
  current_payment_amount: number;
  student_id: string;
  student_roll: string;
  student_name: string;
  program_name: string;
  program_code: string;
  academic_year: string;
  semester: number;
  category: string;
  gross_demand: number;
  scholarship_amount: number;
  concession_amount: number;
  waiver_amount: number;
  total_reductions: number;
  net_demand: number;
  cumulative_paid: number;
  remaining_outstanding: number;
  fee_head_items: ReceiptFeeItem[];
}


