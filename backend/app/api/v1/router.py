from fastapi import APIRouter
from app.api.v1.endpoints import accounts, transactions, analytics, users, categories, income_options, email

api_router = APIRouter()

api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(income_options.router, prefix="/income-options", tags=["income-options"])
api_router.include_router(email.router, prefix="/email", tags=["email"])
