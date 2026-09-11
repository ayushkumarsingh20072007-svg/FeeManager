"""
Official Fee Receipt & PDF Generator Service — Agent 40.
Uses ReportLab to generate printable, high-resolution institutional PDF receipts.
Provides receipt metadata, unique receipt numbering (REC-2026-XXXXXX),
and accurate cumulative payment and outstanding balance accounting.
"""
import io
import hashlib
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)

from app.models.payments import Payment, PaymentAllocation
from app.models.fee_demands import FeeDemand, FeeDemandItem
from app.models.documents import Receipt
from app.models.users import Student
from app.services.fee_calculator import to_decimal

class ReceiptGenerator:

    @classmethod
    def get_or_create_receipt(cls, db: Session, payment_id: str) -> Dict[str, Any]:
        """
        Retrieves or initializes an official Receipt record for a given Payment.
        Computes accurate cumulative paid amount and remaining outstanding balance.
        """
        payment = db.query(Payment).options(
            joinedload(Payment.student).joinedload(Student.user),
            joinedload(Payment.student).joinedload(Student.program),
            joinedload(Payment.student).joinedload(Student.category),
            joinedload(Payment.student).joinedload(Student.regulation),
            joinedload(Payment.fee_demand).joinedload(FeeDemand.academic_year),
            joinedload(Payment.fee_demand).joinedload(FeeDemand.items).joinedload(FeeDemandItem.fee_head),
            joinedload(Payment.allocations).joinedload(PaymentAllocation.fee_demand_item).joinedload(FeeDemandItem.fee_head),
            joinedload(Payment.receipts),
        ).filter(Payment.id == payment_id).first()

        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Payment record '{payment_id}' not found."
            )

        student = payment.student
        demand = payment.fee_demand

        # Retrieve existing receipt or generate deterministic new receipt
        receipt_obj = payment.receipts[0] if payment.receipts else None

        if not receipt_obj:
            # Count existing receipts to generate deterministic sequential number
            total_rcps = db.query(Receipt).count()
            receipt_number = f"REC-2026-{total_rcps + 1:06d}"

            # Compute SHA-256 verification hash
            hash_input = f"{receipt_number}:{payment.payment_ref}:{payment.amount}:{payment.payment_date}"
            verif_hash = hashlib.sha256(hash_input.encode()).hexdigest()

            receipt_obj = Receipt(
                receipt_number=receipt_number,
                payment_id=payment.id,
                issue_date=datetime.now(timezone.utc),
                verification_hash=verif_hash,
            )
            db.add(receipt_obj)
            db.commit()
            db.refresh(receipt_obj)

        # Compute cumulative financial ledger values
        all_student_payments = db.query(Payment).filter(
            Payment.fee_demand_id == demand.id if demand else Payment.student_id == student.id,
            Payment.status.in_(["RECONCILED", "RECEIVED"]),
            Payment.payment_date <= payment.payment_date,
        ).all() if (demand or student) else [payment]

        cumulative_paid = sum(to_decimal(p.amount) for p in all_student_payments)
        net_demand = to_decimal(demand.net_demand) if demand else to_decimal(payment.amount)
        gross_demand = to_decimal(demand.gross_demand) if demand else to_decimal(payment.amount)
        scholarship_amt = to_decimal(demand.scholarship_amount) if demand else Decimal("0.00")
        concession_amt = to_decimal(demand.concession_amount) if demand else Decimal("0.00")
        waiver_amt = to_decimal(demand.waiver_amount) if demand else Decimal("0.00")
        total_reductions = scholarship_amt + concession_amt + waiver_amt

        remaining_outstanding = max(Decimal("0.00"), net_demand - cumulative_paid)

        # Build fee head allocations breakdown
        fee_head_items = []
        if payment.allocations:
            for alloc in payment.allocations:
                head = alloc.fee_demand_item.fee_head if alloc.fee_demand_item else None
                fee_head_items.append({
                    "head_code": head.code if head else "FEE",
                    "head_name": head.name if head else "Institutional Fee Head",
                    "allocated_amount": float(to_decimal(alloc.allocated_amount)),
                })
        elif demand and demand.items:
            # If no allocations recorded, list itemized demand heads proportionally
            for it in demand.items:
                head = it.fee_head
                fee_head_items.append({
                    "head_code": head.code if head else "FEE",
                    "head_name": head.name if head else "Fee Head",
                    "allocated_amount": float(to_decimal(it.gross_amount)),
                })
        else:
            fee_head_items.append({
                "head_code": "TUITION",
                "head_name": "Academic Tuition & Institutional Charges",
                "allocated_amount": float(to_decimal(payment.amount)),
            })

        return {
            "receipt_id": receipt_obj.id,
            "receipt_number": receipt_obj.receipt_number,
            "issue_date": receipt_obj.issue_date.strftime("%d %b %Y, %I:%M %p") if receipt_obj.issue_date else "N/A",
            "verification_hash": receipt_obj.verification_hash,
            "payment_id": payment.id,
            "payment_ref": payment.payment_ref,
            "transaction_id": payment.transaction_id or payment.utr_number or payment.receipt_number or "N/A",
            "payment_channel": payment.channel.value if hasattr(payment.channel, "value") else str(payment.channel),
            "payment_status": payment.status.value if hasattr(payment.status, "value") else str(payment.status),
            "payment_date": payment.payment_date.strftime("%d %b %Y") if payment.payment_date else "N/A",
            "current_payment_amount": float(to_decimal(payment.amount)),
            "student_id": student.id if student else "N/A",
            "student_roll": student.roll_no if student else "N/A",
            "student_name": student.user.full_name if (student and student.user) else "Student",
            "program_name": student.program.name if (student and student.program) else "B.Tech",
            "program_code": student.program.code if (student and student.program) else "ENG",
            "academic_year": demand.academic_year.year_code if (demand and demand.academic_year) else "2026-27",
            "semester": student.current_semester if student else 1,
            "category": student.category.name if (student and student.category) else "General",
            "gross_demand": float(gross_demand),
            "scholarship_amount": float(scholarship_amt),
            "concession_amount": float(concession_amt),
            "waiver_amount": float(waiver_amt),
            "total_reductions": float(total_reductions),
            "net_demand": float(net_demand),
            "cumulative_paid": float(cumulative_paid),
            "remaining_outstanding": float(remaining_outstanding),
            "fee_head_items": fee_head_items,
        }

    @classmethod
    def generate_receipt_pdf(cls, db: Session, payment_id: str) -> bytes:
        """
        Generates a professional, printable PDF receipt buffer using ReportLab.
        """
        rcp = cls.get_or_create_receipt(db, payment_id)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36,
        )

        styles = getSampleStyleSheet()

        # Custom styles
        header_title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#0f172a"),
            alignment=1, # Center
        )
        header_sub_style = ParagraphStyle(
            "DocSubTitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#64748b"),
            alignment=1,
        )
        badge_style = ParagraphStyle(
            "DocBadge",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#1e40af"),
            alignment=1,
        )
        section_heading = ParagraphStyle(
            "SectionHeading",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#1e293b"),
        )
        label_style = ParagraphStyle(
            "LabelStyle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#475569"),
        )
        value_style = ParagraphStyle(
            "ValueStyle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#0f172a"),
        )
        money_bold = ParagraphStyle(
            "MoneyBold",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            alignment=2, # Right
            textColor=colors.HexColor("#0f172a"),
        )
        money_regular = ParagraphStyle(
            "MoneyRegular",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            alignment=2,
            textColor=colors.HexColor("#334155"),
        )
        footer_style = ParagraphStyle(
            "FooterStyle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=7,
            leading=9,
            textColor=colors.HexColor("#94a3b8"),
            alignment=1,
        )

        elements = []

        # 1. Institution Header
        elements.append(Paragraph("VIGNAN UNIVERSITY • AGENT 40", header_title_style))
        elements.append(Paragraph("DIRECTORATE OF FINANCE & STUDENT ACCOUNTS • OFFICIAL E-RECEIPT", header_sub_style))
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563eb"), spaceAfter=10))

        # 2. Receipt Badge & Meta Table
        elements.append(Paragraph("OFFICIAL STUDENT FEE PAYMENT RECEIPT", badge_style))
        elements.append(Spacer(1, 8))

        meta_data = [
            [
                Paragraph("Receipt Number:", label_style),
                Paragraph(rcp["receipt_number"], value_style),
                Paragraph("Payment Date:", label_style),
                Paragraph(rcp["payment_date"], value_style),
            ],
            [
                Paragraph("Payment Reference:", label_style),
                Paragraph(rcp["payment_ref"], value_style),
                Paragraph("Transaction / UTR:", label_style),
                Paragraph(rcp["transaction_id"], value_style),
            ],
            [
                Paragraph("Payment Channel:", label_style),
                Paragraph(rcp["payment_channel"], value_style),
                Paragraph("Payment Status:", label_style),
                Paragraph(f"<b>{rcp['payment_status']}</b>", value_style),
            ],
        ]

        meta_table = Table(meta_data, colWidths=[110, 160, 110, 160])
        meta_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 12))

        # 3. Student Details Section
        elements.append(Paragraph("STUDENT & ENROLLMENT INFORMATION", section_heading))
        elements.append(Spacer(1, 4))

        student_data = [
            [
                Paragraph("Student Name:", label_style),
                Paragraph(f"<b>{rcp['student_name']}</b>", value_style),
                Paragraph("Roll Number:", label_style),
                Paragraph(f"<b>{rcp['student_roll']}</b>", value_style),
            ],
            [
                Paragraph("Program / Branch:", label_style),
                Paragraph(f"{rcp['program_name']} ({rcp['program_code']})", value_style),
                Paragraph("Academic Year:", label_style),
                Paragraph(rcp["academic_year"], value_style),
            ],
            [
                Paragraph("Current Semester:", label_style),
                Paragraph(f"Semester {rcp['semester']}", value_style),
                Paragraph("Student Category:", label_style),
                Paragraph(rcp["category"], value_style),
            ],
        ]

        student_table = Table(student_data, colWidths=[110, 160, 110, 160])
        student_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(student_table)
        elements.append(Spacer(1, 14))

        # 4. Itemized Fee Heads & Allocation Table
        elements.append(Paragraph("ITEMIZED FEE HEAD BREAKDOWN & ALLOCATIONS", section_heading))
        elements.append(Spacer(1, 4))

        fee_table_data = [
            [
                Paragraph("<b>Fee Head Code</b>", label_style),
                Paragraph("<b>Head Description</b>", label_style),
                Paragraph("<b>Allocated / Paid Amount</b>", money_bold),
            ]
        ]

        for it in rcp["fee_head_items"]:
            fee_table_data.append([
                Paragraph(it["head_code"], value_style),
                Paragraph(it["head_name"], value_style),
                Paragraph(f"Rs. {it['allocated_amount']:,.2f}", money_regular),
            ])

        # Current Payment Subtotal Row
        fee_table_data.append([
            Paragraph("<b>AMOUNT RECEIVED IN THIS TRANSACTION</b>", label_style),
            Paragraph("", value_style),
            Paragraph(f"<b>Rs. {rcp['current_payment_amount']:,.2f}</b>", money_bold),
        ])

        fee_table = Table(fee_table_data, colWidths=[110, 290, 140])
        fee_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#ecfdf5")), # Light green for total
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(fee_table)
        elements.append(Spacer(1, 14))

        # 5. Financial Ledger Summary Box
        elements.append(Paragraph("OVERALL FEE LEDGER & OUTSTANDING ACCOUNTING", section_heading))
        elements.append(Spacer(1, 4))

        summary_data = [
            [
                Paragraph("Gross Institutional Demand:", label_style),
                Paragraph(f"Rs. {rcp['gross_demand']:,.2f}", money_regular),
                Paragraph("Current Payment Received:", label_style),
                Paragraph(f"<b>Rs. {rcp['current_payment_amount']:,.2f}</b>", money_bold),
            ],
            [
                Paragraph("Total Approved Reductions:", label_style),
                Paragraph(f"- Rs. {rcp['total_reductions']:,.2f}", money_regular),
                Paragraph("Cumulative Total Paid to Date:", label_style),
                Paragraph(f"<b>Rs. {rcp['cumulative_paid']:,.2f}</b>", money_bold),
            ],
            [
                Paragraph("Net Billed Demand:", label_style),
                Paragraph(f"Rs. {rcp['net_demand']:,.2f}", money_regular),
                Paragraph("Net Outstanding Balance:", label_style),
                Paragraph(f"<b>Rs. {rcp['remaining_outstanding']:,.2f}</b>", money_bold),
            ],
        ]

        summary_table = Table(summary_data, colWidths=[140, 130, 140, 130])
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 16))

        # 6. Official Footer & Verification Hash
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94a3b8"), spaceAfter=8))
        elements.append(Paragraph(
            f"Verification Hash: <font name='Courier'>{rcp['verification_hash']}</font>",
            footer_style
        ))
        elements.append(Paragraph(
            "This is an electronically generated authentic institutional fee receipt. No physical signature is required. Issued by Agent 40 Financial Core.",
            footer_style
        ))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
