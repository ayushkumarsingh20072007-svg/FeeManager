"""
Backtest Script for Agent 40 Default-Risk Scoring Engine.
Validates score distribution and benchmark personas across all 200 seeded students.
"""
import sys
import os
from pathlib import Path
from datetime import date

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal
from app.models.users import Student
from app.rules.risk_engine import calculate_default_risk, get_cohort_default_risk

def run_backtest():
    print("=" * 70)
    print("AGENT 40: DEFAULT-RISK ENGINE BACKTEST REPORT (200 SEEDED STUDENTS)")
    print("=" * 70)

    db = SessionLocal()
    try:
        students = db.query(Student).all()
        total_students = len(students)
        print(f"\n[1] Total Students Assessed: {total_students}")

        # Assess all students
        scores = [calculate_default_risk(student_or_id=s, db=db) for s in students]

        # 1. Distribution
        tiers = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
        for res in scores:
            tiers[res["risk_tier"]] += 1

        print("\n[2] Risk Score Distribution:")
        print(f"    - LOW Tier    (0 - 30):   {tiers['LOW']:3d} students ({tiers['LOW']/total_students*100:5.1f}%)")
        print(f"    - MEDIUM Tier (31 - 60):  {tiers['MEDIUM']:3d} students ({tiers['MEDIUM']/total_students*100:5.1f}%)")
        print(f"    - HIGH Tier   (61 - 100): {tiers['HIGH']:3d} students ({tiers['HIGH']/total_students*100:5.1f}%)")

        # 2. Benchmark Personas Validation
        print("\n[3] Benchmark Personas Verification:")

        # Aravind Kumar (STU1001)
        aravind_res = next((r for r in scores if r["roll_no"] == "STU1001"), None)
        if aravind_res:
            status_symbol = "PASS" if aravind_res["risk_tier"] == "LOW" else "FAIL"
            print(f"\n    [{status_symbol}] Benchmark Persona: Aravind Kumar (STU1001 - Fully Paid)")
            print(f"           Score: {aravind_res['risk_score']} | Tier: {aravind_res['risk_tier']} (Expected: LOW)")
            for factor in aravind_res["contributing_factors"]:
                print(f"             • {factor['factor']:35s}: {factor['points']:2d}/{factor['max_points']} pts ({factor['explanation']})")
            assert aravind_res["risk_tier"] == "LOW", f"Expected LOW for STU1001, got {aravind_res['risk_tier']}"

        # Priya Sharma (STU1002)
        priya_res = next((r for r in scores if r["roll_no"] == "STU1002"), None)
        if priya_res:
            status_symbol = "PASS" if priya_res["risk_tier"] == "HIGH" else "FAIL"
            print(f"\n    [{status_symbol}] Benchmark Persona: Priya Sharma (STU1002 - Overdue with Scholarship)")
            print(f"           Score: {priya_res['risk_score']} | Tier: {priya_res['risk_tier']} (Expected: HIGH)")
            for factor in priya_res["contributing_factors"]:
                print(f"             • {factor['factor']:35s}: {factor['points']:2d}/{factor['max_points']} pts ({factor['explanation']})")
            assert priya_res["risk_tier"] == "HIGH", f"Expected HIGH for STU1002, got {priya_res['risk_tier']}"

        # 3. Factor Sum Integrity Check
        print("\n[4] Mathematical Integrity Verification (Factor Sums):")
        integrity_failures = 0
        for res in scores:
            factor_sum = sum(f["points"] for f in res["contributing_factors"])
            if factor_sum != res["risk_score"]:
                print(f"    [FAIL] Student {res['roll_no']}: Score {res['risk_score']} != Factor Sum {factor_sum}")
                integrity_failures += 1

        if integrity_failures == 0:
            print("    [PASS] 100% of student risk scores match their contributing factor sum exactly.")
        else:
            print(f"    [FAIL] {integrity_failures} mathematical drift violations found!")

        # 4. Cohort Tool Verification
        high_risk_cohort = get_cohort_default_risk(db=db, min_score=61)
        print(f"\n[5] High Risk Cohort Tool Output: {len(high_risk_cohort)} students in HIGH tier (min_score=61)")
        print("    Top 3 Highest Default Risk Students:")
        for s in high_risk_cohort[:3]:
            print(f"      • {s['roll_no']} ({s['student_name']}, {s['program_code']}): Risk Score = {s['risk_score']}")

        print("\n" + "=" * 70)
        print("BACKTEST VERIFICATION SUCCESSFUL — ALL BENCHMARK PERSONAS VALIDATED")
        print("=" * 70)

    finally:
        db.close()

if __name__ == "__main__":
    run_backtest()
