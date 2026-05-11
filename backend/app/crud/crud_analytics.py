from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Account, Transaction, AccountType, Category
from app.schemas.analytics import NetWorthResponse, CashflowResponse, CategorySpendingResponse, CategorySpending

class CRUDAnalytics:
    def get_net_worth(self, db: Session, user_id: int) -> NetWorthResponse:
        # Calculate total assets
        assets = db.query(func.sum(Account.balance)).filter(
            Account.user_id == user_id,
            Account.type.in_([AccountType.DEPOSITORY, AccountType.INVESTMENT, AccountType.PROPERTY, AccountType.VEHICLE, AccountType.CRYPTO, AccountType.OTHER_ASSET])
        ).scalar() or 0.0

        # Calculate total liabilities
        liabilities = db.query(func.sum(Account.balance)).filter(
            Account.user_id == user_id,
            Account.type.in_([AccountType.CREDIT_CARD, AccountType.LOAN, AccountType.OTHER_LIABILITY])
        ).scalar() or 0.0

        return NetWorthResponse(
            total_assets=assets,
            total_liabilities=abs(liabilities),  # Liabilities are often stored as negative, but we want absolute value for representation
            net_worth=assets - abs(liabilities) if liabilities < 0 else assets - liabilities
        )

    def get_cashflow(self, db: Session, user_id: int, month: int, year: int) -> CashflowResponse:
        inflow = db.query(func.sum(Transaction.amount)).join(Account).filter(
            Account.user_id == user_id,
            Transaction.amount > 0
        ).scalar() or 0.0

        outflow = db.query(func.sum(Transaction.amount)).join(Account).filter(
            Account.user_id == user_id,
            Transaction.amount < 0
        ).scalar() or 0.0

        return CashflowResponse(
            total_inflow=inflow,
            total_outflow=abs(outflow),
            net_cashflow=inflow + outflow
        )

    def get_spending_by_category(self, db: Session, user_id: int) -> CategorySpendingResponse:
        # Group by category name where amount is < 0 (expenses)
        results = db.query(
            Category.name, 
            func.sum(Transaction.amount).label("total")
        ).join(Category, Transaction.category_id == Category.id).join(
            Account, Transaction.account_id == Account.id
        ).filter(
            Account.user_id == user_id,
            Transaction.amount < 0,
            Transaction.category_id != None
        ).group_by(Category.name).all()

        breakdown = [CategorySpending(category=row[0], amount=abs(row[1])) for row in results]
        
        return CategorySpendingResponse(breakdown=breakdown)

analytics = CRUDAnalytics()
