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

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    accounts = relationship("Account", back_populates="owner")

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
    transactions = relationship("Transaction", back_populates="account")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    date = Column(DateTime(timezone=True), nullable=False)
    name = Column(String, nullable=False)
    merchant_name = Column(String)
    pending = Column(Boolean, default=False)
    category = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    account = relationship("Account", back_populates="transactions")
