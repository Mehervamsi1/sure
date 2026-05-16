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
                "Transit": ["Bus Pass / Presto", "Cab / Taxi", "Fuel", "Parking", "Auto & Transport", "Vehicle Maintenance", "Ride Sharing", "Toll Charges", "Travel & Hotels", "Travel Bags", "Flight Tickets", "Train Tickets"],
                "Cuisine": ["Groceries", "Food & Dining", "Fast Food", "Coffee", "Snacks", "Bakery", "Party", "Fine Dining", "Food Delivery", "Beverages"],
                "Habitat": ["Rent", "Utilities", "Electricity", "Water Bill", "Internet", "Home Furnishing", "Utensils", "Appliances", "Home Maintenance", "Cleaning Supplies"],
                "Vogue": ["Clothing", "Fashion", "Footwear", "Cosmetics", "Hair Care", "Skincare", "Accessories", "Jewelry", "Grooming", "Perfumes"],
                "Digital": ["Electronics / Tech", "Mobile Bill", "Mobile / Laptop Upgrade", "Software", "Gadgets", "Accessories", "Gaming", "Cloud Storage", "Subscriptions", "Streaming Services"],
                "Finance": ["Credit Card Bill", "Debt Payment", "Investments", "Savings", "Taxes", "Insurance", "Lent Money", "Cash Withdraw", "Bank Charges", "EMI", "Loan Repayment", "Mutual Funds"],
                "Wellness": ["Hospital Bills", "Medicines", "Doctor Consultation", "Dental Care", "Therapy", "Fitness", "Gym", "Health Checkups", "Supplements"],
                "Career": ["Work Expenses", "Projects", "Automations", "Education", "Courses", "Certifications", "Office Supplies", "Business Tools", "Workshops", "Books"],
                "Leisure": ["Movies", "Recreation & Entertainment", "Concerts", "Sports", "Hobbies", "Gaming", "Events", "Outings", "Streaming", "Vacation Activities"],
                "Retail": ["Shopping", "Personal Spending", "Miscellaneous", "Online Orders", "Impulse Purchases", "Marketplace Purchases", "Stationery", "Household Items"],
                "Benevolence": ["Gifts", "Donations", "Charity", "Family Support", "Festivals", "Celebrations", "Contributions"],
                "Charges": ["Fee & Charges", "Service Charges", "Penalties", "Processing Fees", "Convenience Fees", "Transaction Fees", "Late Fees", "Membership Fees"],
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
