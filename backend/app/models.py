from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Enum, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class AccountType(str, enum.Enum):
    DEPOSITORY = "depository"
    CREDIT_CARD = "credit_card"
    LOAN = "loan"
    PROPERTY = "property"
    INVESTMENT = "investment"
    VEHICLE = "vehicle"
    CRYPTO = "crypto"
    OTHER_ASSET = "other_asset"
    OTHER_LIABILITY = "other_liability"

class TransactionType(str, enum.Enum):
    EXPENSE = "expense"
    INCOME = "income"
    TRANSFER = "transfer"
    INVESTMENT = "investment"

class HoldingType(str, enum.Enum):
    STOCK = "stock"
    ETF = "etf"
    MUTUAL_FUND = "mutual_fund"
    CRYPTO = "crypto"
    COMMODITY = "commodity"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    gender = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    accounts = relationship("Account", back_populates="owner")

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    
    parent = relationship("Category", remote_side=[id], backref="children")

class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(Enum(AccountType), nullable=False)
    balance = Column(Float, default=0.0)
    currency = Column(String, default="USD")
    institution_name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", foreign_keys="[Transaction.account_id]", back_populates="account")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    destination_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    date = Column(DateTime(timezone=True), nullable=False)
    name = Column(String, nullable=False)
    merchant_name = Column(String)
    pending = Column(Boolean, default=False)
    
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    type = Column(Enum(TransactionType), default=TransactionType.EXPENSE, nullable=False)
    
    is_subscription = Column(Boolean, default=False)
    billing_cycle = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    receipt_url = Column(String, nullable=True)

    # Income-specific fields (only populated when type == "income")
    income_source = Column(String, nullable=True)      # gic, parents_money, part_time, banking, investment_returns, money_return, full_time
    source_detail = Column(String, nullable=True)       # Sub-source: Uber, Interest, Return, etc.
    bank_name = Column(String, nullable=True)           # Banking flow only
    investment_name = Column(String, nullable=True)     # Investment flow only
    receipt_type = Column(String, nullable=True)        # cash, interact, bank_transfer_cibc, bank_transfer_rbc, cheque, other
    holding_id = Column(Integer, ForeignKey("holdings.id"), nullable=True)
    holding = relationship("Holding", back_populates="transactions")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    account = relationship("Account", foreign_keys=[account_id], back_populates="transactions")
    destination_account = relationship("Account", foreign_keys=[destination_account_id])
    category = relationship("Category")


class Holding(Base):
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    ticker = Column(String, nullable=False)
    asset_name = Column(String, nullable=False)
    asset_type = Column(Enum(HoldingType), nullable=False)
    exchange = Column(String, nullable=True)
    quantity = Column(Float, nullable=False)
    avg_cost_price = Column(Float, nullable=False)
    total_invested = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    purchase_date = Column(DateTime(timezone=True), nullable=True)
    broker_name = Column(String, nullable=True)
    broker_account_last4 = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User")
    account = relationship("Account")
    transactions = relationship("Transaction", back_populates="holding")


class IncomeOption(Base):
    """User-managed dropdown options for the income form.
    
    category examples: 'part_time_name', 'full_time_name', 'banking_source', 'investment_type', 'receipt_type'
    """
    __tablename__ = "income_options"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, nullable=False, index=True)  # Which dropdown this option belongs to
    label = Column(String, nullable=False)                   # Display label
    created_at = Column(DateTime(timezone=True), server_default=func.now())

