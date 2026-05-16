from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.models import Account, Transaction, AccountType, Category
from app.schemas.analytics import (
    NetWorthResponse, CashflowResponse, CategorySpendingResponse,
    CategorySpending, NetWorthHistoryResponse, NetWorthDataPoint
)

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
        from sqlalchemy import extract
        base_query = db.query(func.sum(Transaction.amount)).join(
            Account, Transaction.account_id == Account.id
        ).filter(
            Account.user_id == user_id,
            extract('month', Transaction.date) == month,
            extract('year', Transaction.date) == year
        )

        inflow = base_query.filter(Transaction.amount > 0).scalar() or 0.0
        outflow = base_query.filter(Transaction.amount < 0).scalar() or 0.0

        return CashflowResponse(
            total_inflow=inflow,
            total_outflow=abs(outflow),
            net_cashflow=inflow + outflow
        )

    def get_spending_by_category(self, db: Session, user_id: int) -> CategorySpendingResponse:
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

    def get_net_worth_history(
        self, db: Session, user_id: int, days: int = 30,
        rates: dict[str, float] | None = None, display_currency: str = "USD"
    ) -> NetWorthHistoryResponse:
        """
        Reconstruct net worth over time by walking backward from current balances
        through transactions. Converts everything to display_currency using rates.
        """
        from app.core.currency import convert_amount as _convert

        accounts = db.query(Account).filter(Account.user_id == user_id).all()

        asset_types = {AccountType.DEPOSITORY, AccountType.INVESTMENT, AccountType.PROPERTY, AccountType.VEHICLE, AccountType.CRYPTO, AccountType.OTHER_ASSET}
        liability_types = {AccountType.CREDIT_CARD, AccountType.LOAN, AccountType.OTHER_LIABILITY}

        def to_display(amount: float, currency: str) -> float:
            if not rates or currency == display_currency:
                return amount
            return _convert(amount, currency, display_currency, rates)

        # Build a map of account_id -> currency for transaction conversion
        acct_currency = {a.id: a.currency for a in accounts}

        total_assets = sum(
            to_display(a.balance, a.currency) for a in accounts if a.type in asset_types
        )
        total_liabilities = sum(
            abs(to_display(a.balance, a.currency)) for a in accounts if a.type in liability_types
        )
        current_net_worth = total_assets - total_liabilities

        today = datetime.now().date()
        start_date = today - timedelta(days=days)

        account_ids = [a.id for a in accounts]
        if not account_ids:
            return NetWorthHistoryResponse(history=[
                NetWorthDataPoint(date=str(today), net_worth=0.0)
            ])

        transactions = db.query(Transaction).filter(
            Transaction.account_id.in_(account_ids),
            Transaction.date >= datetime.combine(start_date, datetime.min.time())
        ).order_by(Transaction.date.desc()).all()

        daily_deltas: dict[str, float] = {}
        for tx in transactions:
            day_key = tx.date.strftime("%Y-%m-%d") if isinstance(tx.date, datetime) else str(tx.date)[:10]
            tx_currency = tx.currency or acct_currency.get(tx.account_id, display_currency)
            converted = to_display(tx.amount, tx_currency)
            daily_deltas[day_key] = daily_deltas.get(day_key, 0.0) + converted

        total_delta_since_start = sum(daily_deltas.values())
        nw_at_start = current_net_worth - total_delta_since_start

        history = []
        running = nw_at_start
        for i in range(days + 1):
            d = start_date + timedelta(days=i)
            day_str = str(d)
            history.append(NetWorthDataPoint(date=day_str, net_worth=round(running, 2)))
            delta = daily_deltas.get(day_str, 0.0)
            running += delta

        return NetWorthHistoryResponse(history=history)

analytics = CRUDAnalytics()
