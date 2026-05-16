"""
Migrate categories to the new elite vocabulary system.
Run: cd backend && python -m app.db.migrate_categories
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.database import SessionLocal, engine, Base
from app.models import Category

ELITE_CATEGORIES = {
    "Transit": [
        "Bus Pass / Presto", "Cab / Taxi", "Fuel", "Parking",
        "Auto & Transport", "Vehicle Maintenance", "Ride Sharing",
        "Toll Charges", "Travel & Hotels", "Travel Bags",
        "Flight Tickets", "Train Tickets"
    ],
    "Cuisine": [
        "Groceries", "Food & Dining", "Fast Food", "Coffee",
        "Snacks", "Bakery", "Party", "Fine Dining",
        "Food Delivery", "Beverages"
    ],
    "Habitat": [
        "Rent", "Utilities", "Electricity", "Water Bill",
        "Internet", "Home Furnishing", "Utensils", "Appliances",
        "Home Maintenance", "Cleaning Supplies"
    ],
    "Vogue": [
        "Clothing", "Fashion", "Footwear", "Cosmetics",
        "Hair Care", "Skincare", "Accessories", "Jewelry",
        "Grooming", "Perfumes"
    ],
    "Digital": [
        "Electronics / Tech", "Mobile Bill", "Mobile / Laptop Upgrade",
        "Software", "Gadgets", "Accessories", "Gaming",
        "Cloud Storage", "Subscriptions", "Streaming Services"
    ],
    "Finance": [
        "Credit Card Bill", "Debt Payment", "Investments", "Savings",
        "Taxes", "Insurance", "Lent Money", "Cash Withdraw",
        "Bank Charges", "EMI", "Loan Repayment", "Mutual Funds"
    ],
    "Wellness": [
        "Hospital Bills", "Medicines", "Doctor Consultation",
        "Dental Care", "Therapy", "Fitness", "Gym",
        "Health Checkups", "Supplements"
    ],
    "Career": [
        "Work Expenses", "Projects", "Automations", "Education",
        "Courses", "Certifications", "Office Supplies",
        "Business Tools", "Workshops", "Books"
    ],
    "Leisure": [
        "Movies", "Recreation & Entertainment", "Concerts",
        "Sports", "Hobbies", "Gaming", "Events",
        "Outings", "Streaming", "Vacation Activities"
    ],
    "Retail": [
        "Shopping", "Personal Spending", "Miscellaneous",
        "Online Orders", "Impulse Purchases", "Marketplace Purchases",
        "Stationery", "Household Items"
    ],
    "Benevolence": [
        "Gifts", "Donations", "Charity", "Family Support",
        "Festivals", "Celebrations", "Contributions"
    ],
    "Charges": [
        "Fee & Charges", "Service Charges", "Penalties",
        "Processing Fees", "Convenience Fees", "Transaction Fees",
        "Late Fees", "Membership Fees"
    ],
}

def migrate():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(Category).count()
        if existing > 0:
            print(f"[!!] Clearing {existing} old categories...")
            db.query(Category).filter(Category.parent_id != None).delete()
            db.commit()
            db.query(Category).delete()
            db.commit()
            print("[OK] Old categories removed.")

        for parent_name, children in ELITE_CATEGORIES.items():
            parent = Category(name=parent_name, parent_id=None)
            db.add(parent)
            db.commit()
            db.refresh(parent)

            for child_name in children:
                child = Category(name=child_name, parent_id=parent.id)
                db.add(child)
            db.commit()

        total = db.query(Category).count()
        print(f"[OK] Created {total} categories ({len(ELITE_CATEGORIES)} parents).")
        print("\n[DONE] Category migration complete!")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
