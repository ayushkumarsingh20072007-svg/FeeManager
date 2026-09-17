from decimal import Decimal
from datetime import date, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session, joinedload

from app.models.users import Student
from app.models.fee_demands import FeeDemand
from app.models.academics import Program
from app.schemas.integrations import CashflowForecastResponse
from app.services.ledger_calculator import calculate_student_financials, to_decimal

# Historic realization probability coefficients based on overdue duration
REALIZATION_PROBABILITIES = {
    "CURRENT_DUE": Decimal("0.90"),      # 90% expected realization within due date
    "OVERDUE_1_30": Decimal("0.75"),     # 75% for 1-30 days overdue
    "OVERDUE_31_60": Decimal("0.55"),    # 55% for 31-60 days overdue
    "OVERDUE_61_90": Decimal("0.35"),    # 35% for 61-90 days overdue
    "OVERDUE_90_PLUS": Decimal("0.18"),  # 18% recovery rate for 90+ days
}

class ForecastingService:
    @classmethod
    def generate_cashflow_forecast(
        cls,
        db: Session,
        horizon_days: int = 90,
        forecast_date: date = None
    ) -> CashflowForecastResponse:
        """
        Computes probabilistic institutional cashflow forecast based on outstanding
        aging buckets, demand schedules, and historic realization curves.
        """
        if forecast_date is None:
            forecast_date = date.today()

        students = db.query(Student).options(
            joinedload(Student.program),
            joinedload(Student.fee_demands).joinedload(FeeDemand.items),
            joinedload(Student.fee_demands).joinedload(FeeDemand.scholarships),
            joinedload(Student.fee_demands).joinedload(FeeDemand.concessions),
            joinedload(Student.fee_demands).joinedload(FeeDemand.waivers),
            joinedload(Student.fee_demands).joinedload(FeeDemand.payments),
        ).all()

        total_outstanding_pool = Decimal("0.00")
        bucket_amounts = {
            "CURRENT_DUE": Decimal("0.00"),
            "OVERDUE_1_30": Decimal("0.00"),
            "OVERDUE_31_60": Decimal("0.00"),
            "OVERDUE_61_90": Decimal("0.00"),
            "OVERDUE_90_PLUS": Decimal("0.00"),
        }

        program_map: Dict[str, Dict[str, Any]] = {}

        for s in students:
            prog_code = s.program.code if s.program else "OTHER"
            prog_name = s.program.name if s.program else "Other"

            if prog_code not in program_map:
                program_map[prog_code] = {
                    "program_code": prog_code,
                    "program_name": prog_name,
                    "student_count": 0,
                    "outstanding_pool": Decimal("0.00"),
                    "projected_realization": Decimal("0.00")
                }
            program_map[prog_code]["student_count"] += 1

            latest_demand = s.fee_demands[0] if s.fee_demands else None
            if not latest_demand:
                continue

            calc = calculate_student_financials(latest_demand, latest_demand.payments or [], forecast_date)
            out_amt = calc["outstanding_amount"]
            if out_amt <= Decimal("0.00"):
                continue

            total_outstanding_pool += out_amt
            program_map[prog_code]["outstanding_pool"] += out_amt

            # Classify into aging bucket
            due_date = calc.get("due_date")
            if not due_date or due_date >= forecast_date:
                bucket = "CURRENT_DUE"
            else:
                days_overdue = (forecast_date - due_date).days
                if days_overdue <= 30:
                    bucket = "OVERDUE_1_30"
                elif days_overdue <= 60:
                    bucket = "OVERDUE_31_60"
                elif days_overdue <= 90:
                    bucket = "OVERDUE_61_90"
                else:
                    bucket = "OVERDUE_90_PLUS"

            bucket_amounts[bucket] += out_amt

            # Program realization
            prob = REALIZATION_PROBABILITIES[bucket]
            program_map[prog_code]["projected_realization"] += (out_amt * prob)

        # Compute projected total realization
        projected_total = Decimal("0.00")
        bucket_breakdown = []
        for bucket, amt in bucket_amounts.items():
            prob = REALIZATION_PROBABILITIES[bucket]
            realized = (amt * prob).quantize(Decimal("0.01"))
            projected_total += realized
            bucket_breakdown.append({
                "bucket": bucket,
                "outstanding_amount": float(amt),
                "recovery_probability": float(prob),
                "projected_realization": float(realized)
            })

        overall_rate = float((projected_total / total_outstanding_pool * 100).quantize(Decimal("0.1"))) if total_outstanding_pool > 0 else 0.0

        program_breakdown = []
        for p in program_map.values():
            program_breakdown.append({
                "program_code": p["program_code"],
                "program_name": p["program_name"],
                "student_count": p["student_count"],
                "outstanding_pool": float(p["outstanding_pool"]),
                "projected_realization": float(p["projected_realization"].quantize(Decimal("0.01")))
            })

        return CashflowForecastResponse(
            forecast_date=forecast_date,
            horizon_days=horizon_days,
            projected_total_realization=float(projected_total.quantize(Decimal("0.01"))),
            current_outstanding_pool=float(total_outstanding_pool),
            expected_realization_rate=overall_rate,
            bucket_breakdown=bucket_breakdown,
            program_breakdown=program_breakdown
        )
