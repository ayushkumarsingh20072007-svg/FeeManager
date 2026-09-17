from fastapi import APIRouter
from app.api.routes import auth, health, audit, rbac_test, ledger, fee_demands, fees, receipts, payments, reconciliation, ai_chat, webhooks, integrations, risk, analytics

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(audit.router)
api_router.include_router(rbac_test.router)
api_router.include_router(ledger.router)
api_router.include_router(fee_demands.router)
api_router.include_router(fees.router)
api_router.include_router(receipts.router)
api_router.include_router(payments.router)
api_router.include_router(reconciliation.router)
api_router.include_router(ai_chat.router)
api_router.include_router(webhooks.router)
api_router.include_router(integrations.router)
api_router.include_router(risk.router)
api_router.include_router(analytics.router)

# Health is included directly at root and under api/v1
root_router = APIRouter()
root_router.include_router(health.router)
root_router.include_router(api_router)


