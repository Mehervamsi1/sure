from sqlalchemy.orm import Session
from app import crud, schemas
from app.models import AccountType, Category
from datetime import datetime, timedelta

# Master category tree based on the user's Google Form structure
CATEGORY_TREE = {
    # ── Expense Categories ──
    "Food & Dining": ["Fast Food", "Groceries", "Restaurant"],
    "Transportation": ["Cab", "Bus Pass / Presto", "Gas"],
    "Housing": ["Rent", "Home Furnishing", "Utensils"],
    "Shopping": ["Clothing", "Footwear", "Fashion", "Electronics / Tech", "Mobile / Laptop Upgrade"],
    "Health & Wellness": ["Medicines", "Hospital Bills", "Cosmetics", "Hair Care"],
    "Entertainment": ["Movies", "Party", "Recreation & Entertainment"],
    "Subscriptions": ["Software", "Streaming", "Cloud Services"],
    "Travel": ["Travel & Hotels", "Travel Bags"],
    "Finance": ["Credit Card Bill", "Debt Payment", "Fee & Charges", "Taxes", "Insurance"],
    "Investments": ["Mutual Funds", "Shares", "Crypto", "Self Investment"],
    "Personal": ["Gifts & Donations", "Personal Spending", "Lent Money", "Education"],
    "Work": ["Automations / Work Expenses / Project"],
    "Cash": ["Cash Withdraw"],
    "Miscellaneous": [],
    "Savings": [],

    # ── Income Categories (from the user's Income Google Form) ──
    "Part Time Income": ["Uber", "Petro Canada", "Hary Srilankan Work", "Misc Part Time"],
    "Full Time Income": ["Salary", "Bonus"],
    "Banking Income": ["Interest", "Banking Bonus / Gifts"],
    "Investment Returns": ["Return on Investment"],
    "GIC": [],
    "Parent's Money": [],
    "Money Return": ["SplitWise", "Refund"],
}


def seed_categories(db: Session) -> dict:
    """
    Seed the category tree. Returns a dict of {child_category_name: category_id}
    for use by the transaction seeder.
    """
    lookup = {}
    for parent_name, children in CATEGORY_TREE.items():
        # Check if parent already exists
        existing = db.query(Category).filter(Category.name == parent_name, Category.parent_id == None).first()
        if existing:
            parent = existing
        else:
            parent = crud.category.create(db, obj_in=schemas.CategoryCreate(name=parent_name))
        lookup[parent_name] = parent.id

        for child_name in children:
            existing_child = db.query(Category).filter(Category.name == child_name, Category.parent_id == parent.id).first()
            if not existing_child:
                child = crud.category.create(db, obj_in=schemas.CategoryCreate(name=child_name, parent_id=parent.id))
                lookup[child_name] = child.id
            else:
                lookup[child_name] = existing_child.id

    return lookup


def seed_db(db: Session) -> None:
    # 1. Seed categories first
    cat_lookup = seed_categories(db)

    # 2. Seed user
    user = crud.user.get_by_email(db, email="admin@sure.com")
    if not user:
        user_in = schemas.UserCreate(
            email="admin@sure.com",
            password="securepassword",
            first_name="Admin",
            last_name="User"
        )
        user = crud.user.create(db, obj_in=user_in)

    # 3. Seed accounts (including a Cash Wallet!)
    accounts = crud.account.get_by_user(db, user_id=user.id)
    if not accounts:
        acc1 = crud.account.create(db, obj_in=schemas.AccountCreate(
            user_id=user.id,
            name="Chase Sapphire Reserve",
            type=AccountType.CREDIT_CARD,
            balance=-3240.50,
            institution_name="Chase"
        ))
        
        acc2 = crud.account.create(db, obj_in=schemas.AccountCreate(
            user_id=user.id,
            name="Vanguard Total Stock ETF",
            type=AccountType.INVESTMENT,
            balance=84200.00,
            institution_name="Vanguard"
        ))

        acc3 = crud.account.create(db, obj_in=schemas.AccountCreate(
            user_id=user.id,
            name="Mercury Operating Account",
            type=AccountType.DEPOSITORY,
            balance=43540.50,
            institution_name="Mercury"
        ))

        # The Cash Wallet — crucial for physical cash tracking
        acc4 = crud.account.create(db, obj_in=schemas.AccountCreate(
            user_id=user.id,
            name="Cash Wallet",
            type=AccountType.OTHER_ASSET,
            balance=320.00,
            institution_name=None
        ))

        # 4. Seed transactions with category_id references
        now = datetime.now()
        
        crud.transaction.create(db, obj_in=schemas.TransactionCreate(
            account_id=acc1.id,
            amount=-14.20,
            date=now - timedelta(days=1),
            name="Sweetgreen",
            merchant_name="Sweetgreen",
            type="expense",
            category_id=cat_lookup.get("Fast Food")
        ))
        
        crud.transaction.create(db, obj_in=schemas.TransactionCreate(
            account_id=acc2.id,
            amount=112.40,
            date=now - timedelta(days=2),
            name="Dividend Reinvestment",
            merchant_name="Vanguard",
            type="income",
            category_id=cat_lookup.get("Return on Investment")
        ))
        
        crud.transaction.create(db, obj_in=schemas.TransactionCreate(
            account_id=acc3.id,
            amount=4200.00,
            date=now - timedelta(days=3),
            name="Stripe Payout",
            merchant_name="Stripe",
            type="income",
            category_id=cat_lookup.get("Salary")
        ))

        crud.transaction.create(db, obj_in=schemas.TransactionCreate(
            account_id=acc1.id,
            amount=-350.00,
            date=now - timedelta(days=4),
            name="Equinox All-Access",
            merchant_name="Equinox",
            type="expense",
            category_id=cat_lookup.get("Hospital Bills"),  # Health & Wellness
            is_subscription=True,
            billing_cycle="monthly"
        ))

        # Cash expense example
        crud.transaction.create(db, obj_in=schemas.TransactionCreate(
            account_id=acc4.id,
            amount=-12.50,
            date=now - timedelta(days=1),
            name="Street Vendor Lunch",
            merchant_name=None,
            type="expense",
            category_id=cat_lookup.get("Fast Food"),
            notes="Paid cash at the food truck"
        ))
