"""
Full Student Ledger Audit Script — Phase 1 Correctness Pass.
Inspects EVERY student in the database, verifying:
- Gross Demand from SUM(FeeDemandItem.gross_amount)
- Approved Reductions (Scholarships, Concessions, Waivers)
- Net Demand = max(0, Gross Demand - Reductions)
- Valid Payments = SUM(Payment.amount)
- Authoritative Outstanding = max(0, Net Demand - Valid Payments)
- Authoritative Status (OVERDUE, PAID, PARTIALLY_PAID, PENDING)
- Stored vs Calculated Discrepancies
- Database Integrity & Relationship Links
"""
import sys
import os
from datetime import date
from decimal import Decimal
from typing import List, Dict, Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import joinedload
from app.core.database import SessionLocal
from app.models.users import Student
from app.models.fee_demands import FeeDemand, FeeDemandItem, Scholarship, Concession, FeeWaiver
from app.models.payments import Payment
from app.models.reconciliations import Mismatch
from app.services.ledger_calculator import calculate_student_financials, to_decimal

def run_audit() -> Dict[str, Any]:
    db = SessionLocal()
    try:
        students = db.query(Student).options(
            joinedload(Student.user),
            joinedload(Student.program),
            joinedload(Student.category),
            joinedload(Student.admission_year),
            joinedload(Student.fee_demands).joinedload(FeeDemand.items),
            joinedload(Student.fee_demands).joinedload(FeeDemand.scholarships),
            joinedload(Student.fee_demands).joinedload(FeeDemand.concessions),
            joinedload(Student.fee_demands).joinedload(FeeDemand.waivers),
            joinedload(Student.fee_demands).joinedload(FeeDemand.payments),
        ).all()

        total_students = len(students)
        no_issue_count = 0
        calc_issue_count = 0
        status_issue_count = 0
        payment_inconsistency_count = 0
        demand_inconsistency_count = 0
        reduction_issue_count = 0

        audit_rows = []

        print("=" * 140)
        print(f"{'ROLL NO':<10} | {'STUDENT NAME':<20} | {'GROSS (ITEM)':<12} | {'REDUCTIONS':<10} | {'NET DEMAND':<12} | {'PAID':<10} | {'CALC OUT':<10} | {'STORED OUT':<10} | {'CALC STAT':<14} | {'STORED STAT':<14} | {'RESULT'}")
        print("=" * 140)

        for s in students:
            name = s.user.full_name if s.user else "N/A"
            demand = s.fee_demands[0] if s.fee_demands else None
            payments = demand.payments if (demand and demand.payments) else []

            calc = calculate_student_financials(demand, payments, date.today())

            gross_items_sum = calc["gross_demand"]
            reductions = calc["total_reductions"]
            net_demand = calc["net_demand"]
            valid_paid = calc["paid_amount"]
            calc_out = calc["outstanding_amount"]
            calc_status = calc["status"]

            stored_gross = to_decimal(demand.gross_demand) if demand else Decimal("0.00")
            stored_net = to_decimal(demand.net_demand) if demand else Decimal("0.00")
            stored_paid = to_decimal(demand.paid_amount) if demand else Decimal("0.00")
            stored_out = to_decimal(demand.outstanding_amount) if demand else Decimal("0.00")
            stored_status = demand.status.value if demand else "N/A"

            # Check for issues
            has_calc_issue = False
            has_status_issue = False
            has_demand_issue = False
            has_payment_issue = False
            has_reduction_issue = False

            if gross_items_sum != stored_gross or net_demand != stored_net:
                has_demand_issue = True
                demand_inconsistency_count += 1

            if valid_paid != stored_paid:
                has_payment_issue = True
                payment_inconsistency_count += 1

            if calc_out != stored_out:
                has_calc_issue = True
                calc_issue_count += 1

            if calc_status != stored_status:
                has_status_issue = True
                status_issue_count += 1

            if reductions != to_decimal((demand.scholarship_amount if demand else 0) + (demand.concession_amount if demand else 0) + (demand.waiver_amount if demand else 0)):
                has_reduction_issue = True
                reduction_issue_count += 1

            is_consistent = not (has_calc_issue or has_status_issue or has_demand_issue or has_payment_issue or has_reduction_issue)
            if is_consistent:
                no_issue_count += 1
                result_str = "CONSISTENT"
            else:
                result_str = "INCONSISTENT"

            row_text = f"{s.roll_no:<10} | {name[:20]:<20} | Rs.{float(gross_items_sum):<7.0f} | Rs.{float(reductions):<5.0f} | Rs.{float(net_demand):<7.0f} | Rs.{float(valid_paid):<5.0f} | Rs.{float(calc_out):<5.0f} | Rs.{float(stored_out):<5.0f} | {calc_status:<14} | {stored_status:<14} | {result_str}"
            print(row_text)

            audit_rows.append({
                "student_id": s.id,
                "roll_no": s.roll_no,
                "name": name,
                "gross_demand": gross_items_sum,
                "reductions": reductions,
                "net_demand": net_demand,
                "paid_amount": valid_paid,
                "calculated_outstanding": calc_out,
                "stored_outstanding": stored_out,
                "calculated_status": calc_status,
                "stored_status": stored_status,
                "is_consistent": is_consistent
            })

        print("=" * 140)
        print(f"\nAUDIT SUMMARY:")
        print(f"Total students audited: {total_students}")
        print(f"Students with no issues: {no_issue_count}")
        print(f"Students with calculation issues: {calc_issue_count}")
        print(f"Students with status issues: {status_issue_count}")
        print(f"Students with payment inconsistencies: {payment_inconsistency_count}")
        print(f"Students with demand inconsistencies: {demand_inconsistency_count}")
        print(f"Students with scholarship/concession/waiver issues: {reduction_issue_count}")

        mismatches = db.query(Mismatch).count()
        print(f"Intentional reconciliation mismatches preserved: {mismatches}")

        return {
            "total_students": total_students,
            "no_issue_count": no_issue_count,
            "calc_issue_count": calc_issue_count,
            "status_issue_count": status_issue_count,
            "payment_inconsistency_count": payment_inconsistency_count,
            "demand_inconsistency_count": demand_inconsistency_count,
            "reduction_issue_count": reduction_issue_count,
            "mismatches": mismatches,
            "audit_rows": audit_rows
        }
    finally:
        db.close()

if __name__ == "__main__":
    run_audit()
