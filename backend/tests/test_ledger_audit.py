"""
Comprehensive Test Suite for Student Ledger Financial Consistency & Calculations.
Tests 20 required audit scenarios:
1. Fully paid student
2. Partially paid student
3. Unpaid student
4. Overdue student
5. Scholarship student
6. Concession student
7. Waiver student
8. Scholarship + concession
9. Scholarship + waiver
10. Multiple payments
11. Payment equal to demand
12. Payment less than demand
13. Payment greater than demand
14. Zero outstanding
15. Positive outstanding
16. No negative outstanding
17. Correct status derivation
18. Dashboard aggregate consistency
19. Student Registry consistency
20. Detail modal consistency
"""
import pytest
from decimal import Decimal
from datetime import date, timedelta
from app.services.ledger_calculator import calculate_student_financials, to_decimal
from app.models.enums import FeeDemandStatus, PaymentStatus

class DummyItem:
    def __init__(self, gross_amount):
        self.gross_amount = gross_amount

class DummyScholarship:
    def __init__(self, amount, status="APPROVED"):
        self.amount = amount
        self.status = status

class DummyConcession:
    def __init__(self, amount, status="APPROVED"):
        self.amount = amount
        self.status = status

class DummyWaiver:
    def __init__(self, amount, status="APPROVED"):
        self.amount = amount
        self.status = status

class DummyPayment:
    def __init__(self, amount, status=PaymentStatus.RECONCILED):
        self.amount = amount
        self.status = status

class DummyDemand:
    def __init__(self, items, scholarships=None, concessions=None, waivers=None, due_date=None, gross_demand=None):
        self.items = items
        self.scholarships = scholarships or []
        self.concessions = concessions or []
        self.waivers = waivers or []
        self.due_date = due_date or date.today() + timedelta(days=30)
        self.gross_demand = gross_demand

# 1. Fully paid student
def test_fully_paid_student():
    items = [DummyItem(80000.0), DummyItem(20000.0)]
    demand = DummyDemand(items=items)
    payments = [DummyPayment(100000.0)]
    calc = calculate_student_financials(demand, payments)
    assert calc["gross_demand"] == Decimal("100000.00")
    assert calc["net_demand"] == Decimal("100000.00")
    assert calc["paid_amount"] == Decimal("100000.00")
    assert calc["outstanding_amount"] == Decimal("0.00")
    assert calc["status"] == "PAID"

# 2. Partially paid student
def test_partially_paid_student():
    items = [DummyItem(100000.0)]
    demand = DummyDemand(items=items, due_date=date.today() + timedelta(days=30))
    payments = [DummyPayment(60000.0)]
    calc = calculate_student_financials(demand, payments)
    assert calc["outstanding_amount"] == Decimal("40000.00")
    assert calc["status"] == "PARTIALLY_PAID"

# 3. Unpaid student
def test_unpaid_student():
    items = [DummyItem(100000.0)]
    demand = DummyDemand(items=items, due_date=date.today() + timedelta(days=30))
    payments = []
    calc = calculate_student_financials(demand, payments)
    assert calc["paid_amount"] == Decimal("0.00")
    assert calc["outstanding_amount"] == Decimal("100000.00")
    assert calc["status"] == "PENDING"

# 4. Overdue student
def test_overdue_student():
    items = [DummyItem(100000.0)]
    demand = DummyDemand(items=items, due_date=date.today() - timedelta(days=15))
    payments = [DummyPayment(30000.0)]
    calc = calculate_student_financials(demand, payments)
    assert calc["outstanding_amount"] == Decimal("70000.00")
    assert calc["status"] == "OVERDUE"

# 5. Scholarship student
def test_scholarship_student():
    items = [DummyItem(168000.0)]
    scholarships = [DummyScholarship(35000.0)]
    demand = DummyDemand(items=items, scholarships=scholarships)
    payments = [DummyPayment(133000.0)]
    calc = calculate_student_financials(demand, payments)
    assert calc["gross_demand"] == Decimal("168000.00")
    assert calc["scholarship_amount"] == Decimal("35000.00")
    assert calc["net_demand"] == Decimal("133000.00")
    assert calc["outstanding_amount"] == Decimal("0.00")
    assert calc["status"] == "PAID"

# 6. Concession student
def test_concession_student():
    items = [DummyItem(178000.0)]
    concessions = [DummyConcession(15000.0)]
    demand = DummyDemand(items=items, concessions=concessions)
    payments = [DummyPayment(81500.0)]
    calc = calculate_student_financials(demand, payments)
    assert calc["concession_amount"] == Decimal("15000.00")
    assert calc["net_demand"] == Decimal("163000.00")
    assert calc["outstanding_amount"] == Decimal("81500.00")

# 7. Waiver student
def test_waiver_student():
    items = [DummyItem(100000.0)]
    waivers = [DummyWaiver(20000.0)]
    demand = DummyDemand(items=items, waivers=waivers)
    calc = calculate_student_financials(demand, [])
    assert calc["waiver_amount"] == Decimal("20000.00")
    assert calc["net_demand"] == Decimal("80000.00")

# 8. Scholarship + concession stacking
def test_scholarship_and_concession():
    items = [DummyItem(200000.0)]
    scholarships = [DummyScholarship(50000.0)]
    concessions = [DummyConcession(20000.0)]
    demand = DummyDemand(items=items, scholarships=scholarships, concessions=concessions)
    calc = calculate_student_financials(demand, [])
    assert calc["total_reductions"] == Decimal("70000.00")
    assert calc["net_demand"] == Decimal("130000.00")

# 9. Scholarship + waiver
def test_scholarship_and_waiver():
    items = [DummyItem(150000.0)]
    scholarships = [DummyScholarship(30000.0)]
    waivers = [DummyWaiver(10000.0)]
    demand = DummyDemand(items=items, scholarships=scholarships, waivers=waivers)
    calc = calculate_student_financials(demand, [])
    assert calc["net_demand"] == Decimal("110000.00")

# 10. Multiple payments
def test_multiple_payments():
    items = [DummyItem(100000.0)]
    demand = DummyDemand(items=items)
    payments = [DummyPayment(30000.0), DummyPayment(20000.0), DummyPayment(50000.0)]
    calc = calculate_student_financials(demand, payments)
    assert calc["paid_amount"] == Decimal("100000.00")
    assert calc["outstanding_amount"] == Decimal("0.00")
    assert calc["status"] == "PAID"

# 11. Payment equal to demand
def test_payment_equal_to_demand():
    items = [DummyItem(50000.0)]
    demand = DummyDemand(items=items)
    payments = [DummyPayment(50000.0)]
    calc = calculate_student_financials(demand, payments)
    assert calc["outstanding_amount"] == Decimal("0.00")
    assert calc["status"] == "PAID"

# 12. Payment less than demand
def test_payment_less_than_demand():
    items = [DummyItem(50000.0)]
    demand = DummyDemand(items=items)
    payments = [DummyPayment(30000.0)]
    calc = calculate_student_financials(demand, payments)
    assert calc["outstanding_amount"] == Decimal("20000.00")

# 13. Payment greater than demand (overpayment handling)
def test_payment_greater_than_demand():
    items = [DummyItem(50000.0)]
    demand = DummyDemand(items=items)
    payments = [DummyPayment(60000.0)]
    calc = calculate_student_financials(demand, payments)
    assert calc["outstanding_amount"] == Decimal("0.00")
    assert calc["status"] == "PAID"

# 14. Zero outstanding
def test_zero_outstanding():
    items = [DummyItem(75000.0)]
    demand = DummyDemand(items=items)
    payments = [DummyPayment(75000.0)]
    calc = calculate_student_financials(demand, payments)
    assert calc["outstanding_amount"] == Decimal("0.00")

# 15. Positive outstanding
def test_positive_outstanding():
    items = [DummyItem(75000.0)]
    demand = DummyDemand(items=items)
    payments = [DummyPayment(25000.0)]
    calc = calculate_student_financials(demand, payments)
    assert calc["outstanding_amount"] == Decimal("50000.00")

# 16. No negative outstanding
def test_no_negative_outstanding():
    items = [DummyItem(10000.0)]
    scholarships = [DummyScholarship(15000.0)]
    demand = DummyDemand(items=items, scholarships=scholarships)
    payments = [DummyPayment(5000.0)]
    calc = calculate_student_financials(demand, payments)
    assert calc["net_demand"] == Decimal("0.00")
    assert calc["outstanding_amount"] == Decimal("0.00")

# 17. Correct status derivation hierarchy (OVERDUE takes precedence)
def test_status_derivation_overdue_precedence():
    items = [DummyItem(100000.0)]
    demand = DummyDemand(items=items, due_date=date.today() - timedelta(days=1))
    payments = [DummyPayment(50000.0)]  # Partially paid but overdue
    calc = calculate_student_financials(demand, payments)
    assert calc["status"] == "OVERDUE"

# 18. Dashboard aggregate consistency
def test_dashboard_aggregate_consistency(client, auth_headers):
    resp_stats = client.get("/api/v1/ledger/stats", headers=auth_headers)
    assert resp_stats.status_code == 200
    stats = resp_stats.json()

    resp_students = client.get("/api/v1/ledger/students?limit=300", headers=auth_headers)
    assert resp_students.status_code == 200
    students = resp_students.json()

    assert stats["total_students"] == len(students)
    sum_gross = sum(s["gross_demand"] for s in students)
    sum_net = sum(s["net_demand"] for s in students)
    sum_paid = sum(s["paid_amount"] for s in students)
    sum_out = sum(s["outstanding_amount"] for s in students)

    assert pytest.approx(stats["total_demand"], 0.01) == sum_gross
    assert pytest.approx(stats["total_net_demand"], 0.01) == sum_net
    assert pytest.approx(stats["total_collected"], 0.01) == sum_paid
    assert pytest.approx(stats["total_outstanding"], 0.01) == sum_out

# 19. Student Registry consistency
def test_student_registry_authoritative_values(client, auth_headers):
    resp = client.get("/api/v1/ledger/students?limit=100", headers=auth_headers)
    assert resp.status_code == 200
    students = resp.json()
    for s in students:
        expected_net = max(0.0, s["gross_demand"] - (s["scholarship_amount"] + s["concession_amount"] + s["waiver_amount"]))
        expected_out = max(0.0, expected_net - s["paid_amount"])
        assert pytest.approx(s["net_demand"], 0.01) == expected_net
        assert pytest.approx(s["outstanding_amount"], 0.01) == expected_out

# 20. Detail modal consistency
def test_student_detail_modal_endpoint_consistency(client, auth_headers):
    resp = client.get("/api/v1/ledger/students?limit=5", headers=auth_headers)
    assert resp.status_code == 200
    students = resp.json()
    for s in students:
        detail_resp = client.get(f"/api/v1/ledger/students/{s['id']}", headers=auth_headers)
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert detail["gross_demand"] == s["gross_demand"]
        assert detail["net_demand"] == s["net_demand"]
        assert detail["paid_amount"] == s["paid_amount"]
        assert detail["outstanding_amount"] == s["outstanding_amount"]
        assert detail["demand_status"] == s["demand_status"]
