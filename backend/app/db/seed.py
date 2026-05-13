"""
Seed script for findance. database.
Populates default user, categories with children, sample accounts,
and default income dropdown options.

Run: cd backend && python -m app.db.seed
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.database import SessionLocal, engine, Base
from app.models import User, Category, Account, AccountType, IncomeOption

def seed():
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # ─── User ──────────────────────────────────────────────
        existing_user = db.query(User).first()
        if not existing_user:
            user = User(
                email="meher@findance.app",
                hashed_password="placeholder_hash",
                first_name="Meher",
                last_name="Vamsi",
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print("[OK] Created default user: meher@findance.app")
        else:
            user = existing_user
            print("[--] User already exists, skipping.")

        # ─── Categories ────────────────────────────────────────
        existing_cats = db.query(Category).count()
        if existing_cats == 0:
            category_tree = {
                "Housing": ["Rent/Mortgage", "Property Tax", "Home Insurance", "Maintenance"],
                "Utilities": ["Electricity", "Water", "Gas", "Internet", "Phone"],
                "Food & Dining": ["Groceries", "Restaurants", "Coffee", "Delivery"],
                "Transportation": ["Gas/Fuel", "Public Transit", "Car Insurance", "Parking", "Ride Share"],
                "Entertainment": ["Streaming", "Movies", "Games", "Concerts"],
                "Shopping": ["Clothing", "Electronics", "Home Goods", "Personal Care"],
                "Health": ["Insurance Premium", "Doctor/Dentist", "Pharmacy", "Gym"],
                "Subscriptions": ["Software", "Memberships", "Magazines"],
                "Education": ["Tuition", "Books", "Courses"],
                "Investments": ["Stocks", "Crypto", "Retirement", "Real Estate"],
                "Income": ["Salary", "Freelance", "Interest", "Dividends", "Other"],
                "Transfers": [],
            }
            
            for parent_name, children in category_tree.items():
                parent = Category(name=parent_name, parent_id=None)
                db.add(parent)
                db.commit()
                db.refresh(parent)
                
                for child_name in children:
                    child = Category(name=child_name, parent_id=parent.id)
                    db.add(child)
                
                db.commit()
            
            total = db.query(Category).count()
            print(f"[OK] Created {total} categories.")
        else:
            print(f"[--] {existing_cats} categories already exist, skipping.")

        # ─── Sample Accounts ───────────────────────────────────
        existing_accounts = db.query(Account).filter(Account.user_id == user.id).count()
        if existing_accounts == 0:
            sample_accounts = [
                Account(user_id=user.id, name="Primary Checking", type=AccountType.DEPOSITORY, balance=8420.50, currency="USD", institution_name="Chase"),
                Account(user_id=user.id, name="High-Yield Savings", type=AccountType.DEPOSITORY, balance=25000.00, currency="USD", institution_name="Marcus"),
                Account(user_id=user.id, name="Brokerage", type=AccountType.INVESTMENT, balance=45230.00, currency="USD", institution_name="Fidelity"),
                Account(user_id=user.id, name="Credit Card", type=AccountType.CREDIT_CARD, balance=-2340.00, currency="USD", institution_name="Amex"),
                Account(user_id=user.id, name="Student Loan", type=AccountType.LOAN, balance=-12500.00, currency="USD", institution_name="SoFi"),
            ]
            db.add_all(sample_accounts)
            db.commit()
            print(f"[OK] Created {len(sample_accounts)} sample accounts.")
        else:
            print(f"[--] {existing_accounts} accounts already exist, skipping.")

        # ─── Default Income Options ────────────────────────────
        existing_options = db.query(IncomeOption).count()
        if existing_options == 0:
            default_options = [
                # Part Time Names
                IncomeOption(category="part_time_name", label="Uber"),
                IncomeOption(category="part_time_name", label="Petro Canada"),
                IncomeOption(category="part_time_name", label="Misc"),
                IncomeOption(category="part_time_name", label="Hary Srilankan Work"),
                # Full Time Names
                IncomeOption(category="full_time_name", label="Eg Job"),
                # Banking Sources
                IncomeOption(category="banking_source", label="Interest"),
                IncomeOption(category="banking_source", label="Bonus/Gifts"),
                # Investment Types
                IncomeOption(category="investment_type", label="Return"),
                # Receipt Types
                IncomeOption(category="receipt_type", label="Cash"),
                IncomeOption(category="receipt_type", label="Interact"),
                IncomeOption(category="receipt_type", label="Bank Transfer CIBC"),
                IncomeOption(category="receipt_type", label="Bank Transfer RBC"),
                IncomeOption(category="receipt_type", label="Cheque"),
            ]
            db.add_all(default_options)
            db.commit()
            print(f"[OK] Created {len(default_options)} default income options.")
        else:
            print(f"[--] {existing_options} income options already exist, skipping.")

        print("\n[DONE] Seed complete!")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
