"""
Add income categories to the database.
Run: cd backend && python -m app.db.migrate_income_categories
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.database import SessionLocal, engine, Base
from app.models import Category

INCOME_CATEGORIES = {
    "Assets": [
        "Collectibles", "Marketplace Sales", "Old Item Resale", "Property Sale",
        "Selling Electronics", "Selling Furniture", "Trade-ins", "Vehicle Sale"
    ],
    "Creative": [
        "Blogging", "Content Creation", "Design Work", "Influencer Deals",
        "Music Royalties", "Photography", "Sponsorships", "Streaming Income",
        "Writing", "YouTube Revenue"
    ],
    "Enterprise": [
        "Affiliate Marketing", "Agency Income", "Business Income", "Client Payments",
        "Digital Products", "Dropshipping", "E-commerce Sales", "Side Hustle",
        "Startup Revenue", "Subscription Revenue"
    ],
    "Family": [
        "Allowance", "Family Support", "Festival Gifts", "Gifts Received",
        "Parent's Money", "Pocket Money", "Relatives Support", "Sponsorship"
    ],
    "Finance (Income)": [
        "Banking", "Cashback", "Credit Card Rewards", "Financial Incentives",
        "Foreign Exchange Gains", "Interest Earned", "Reward Points", "Tax Refund"
    ],
    "Investments (Income)": [
        "Bond Returns", "Capital Gains", "Crypto Profits", "Dividends",
        "ETFs", "Investment Returns", "Mutual Funds", "Rental Income",
        "SIP Withdrawals", "Stocks"
    ],
    "Reimbursements": [
        "Cashbacks", "Expense Claims", "Insurance Claims", "Money Return",
        "Refunds", "Repaid Advances", "Returned Loans", "Security Deposit Return",
        "Splitwise Settlement"
    ],
    "Salary": [
        "Bonus", "Commission", "Consulting", "Contract Work",
        "Freelancing", "Full Time", "Internship", "Overtime Pay",
        "Part Time", "Remote Work"
    ],
    "Scholarships": [
        "Competition Rewards", "Educational Aid", "Fellowships",
        "Grants", "Research Funding", "Scholarships"
    ],
    "Windfalls": [
        "Contest Winnings", "Donations Received", "Event Rewards",
        "Gambling Wins", "Inheritance", "Lottery",
        "Prize Money", "Unexpected Income"
    ],
}

def migrate():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for parent_name, children in INCOME_CATEGORIES.items():
            existing = db.query(Category).filter(Category.name == parent_name, Category.parent_id == None).first()
            if existing:
                print(f"[--] '{parent_name}' already exists, skipping.")
                continue

            parent = Category(name=parent_name, parent_id=None)
            db.add(parent)
            db.commit()
            db.refresh(parent)

            for child_name in children:
                child = Category(name=child_name, parent_id=parent.id)
                db.add(child)
            db.commit()
            print(f"[OK] Created '{parent_name}' with {len(children)} subcategories.")

        total = db.query(Category).count()
        print(f"\n[DONE] Total categories now: {total}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
