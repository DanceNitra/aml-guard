"""
AML Guard — Data Models
All database models in one file for Alembic auto-detection.
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import (
    Boolean, Column, Date, DateTime, DECIMAL, Enum, Float, ForeignKey,
    Integer, JSON, String, Text, UniqueConstraint, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, TimestampMixin, JSONSerializable


def gen_uuid():
    return str(uuid.uuid4())


def one_year_from_now():
    return datetime.utcnow() + timedelta(days=365)


# ─── USER ───

class User(Base, TimestampMixin, JSONSerializable):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    company_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("companies.id"), nullable=True)
    
    # Relationships
    company = relationship("Company", back_populates="members")
    training_records = relationship("TrainingRecord", back_populates="user")


# ─── COMPANY ───

class Company(Base, TimestampMixin, JSONSerializable):
    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    ico: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    dic: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    jurisdiction: Mapped[str] = mapped_column(String(2), default="SK", nullable=False)  # SK or CZ
    company_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # realestate, accounting, auto, legal, crypto
    employee_count: Mapped[int] = mapped_column(Integer, default=1)
    compliance_officer: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    risk_level: Mapped[str] = mapped_column(String(10), default="low")  # low, medium, high
    subscription_tier: Mapped[str] = mapped_column(String(20), default="free")  # free, solo, small, medium, enterprise
    subscription_status: Mapped[str] = mapped_column(String(20), default="inactive")  # active, inactive, past_due, cancelled
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    members = relationship("User", back_populates="company")
    policies = relationship("Policy", back_populates="company", cascade="all, delete-orphan")
    cdd_records = relationship("CDDRecord", back_populates="company", cascade="all, delete-orphan")
    ubo_records = relationship("UBORecord", back_populates="company", cascade="all, delete-orphan")
    str_reports = relationship("STRReport", back_populates="company", cascade="all, delete-orphan")


# ─── AML POLICY ───

class Policy(Base, TimestampMixin, JSONSerializable):
    __tablename__ = "policies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft, active, archived
    policy_type: Mapped[str] = mapped_column(String(50), default="aml_policy")  # aml_policy, risk_assessment, cdd_procedure, str_procedure
    jurisdiction: Mapped[str] = mapped_column(String(2), default="SK")
    content: Mapped[dict] = mapped_column(JSON, default=dict)
    pdf_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    approved_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    company = relationship("Company", back_populates="policies")


# ─── CDD RECORD (KYC) ───

class CDDRecord(Base, TimestampMixin, JSONSerializable):
    __tablename__ = "cdd_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    
    # Person details
    person_type: Mapped[str] = mapped_column(String(20), default="individual")  # individual, legal_entity
    first_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    legal_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ico: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    nationality: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    birth_date: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # ID document
    id_document_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    id_document_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    id_document_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    id_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    id_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Risk
    is_pep: Mapped[bool] = mapped_column(Boolean, default=False)
    pep_source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    risk_level: Mapped[str] = mapped_column(String(10), default="low")  # low, medium, high
    risk_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Business relationship
    business_relationship: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    purpose_of_business: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active, archived, rejected

    company = relationship("Company", back_populates="cdd_records")


# ─── UBO RECORD ───

class UBORecord(Base, TimestampMixin, JSONSerializable):
    __tablename__ = "ubo_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    cdd_record_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("cdd_records.id"), nullable=True)
    
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    birth_date: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    nationality: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    citizenship_country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ownership_percent: Mapped[float] = mapped_column(Float, nullable=False)
    ownership_type: Mapped[str] = mapped_column(String(20), default="direct")  # direct, indirect
    controlling_entity: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_statutory: Mapped[bool] = mapped_column(Boolean, default=False)
    id_document_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    company = relationship("Company", back_populates="ubo_records")


# ─── STR REPORT ───

class STRReport(Base, TimestampMixin, JSONSerializable):
    __tablename__ = "str_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    cdd_record_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("cdd_records.id"), nullable=True)
    
    report_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft, submitted, archived
    
    # Transaction details
    transaction_date: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    transaction_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    transaction_currency: Mapped[str] = mapped_column(String(3), default="EUR")
    transaction_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # cash, transfer, crypto, other
    
    # Suspicion
    suspicion_reasons: Mapped[Optional[dict]] = mapped_column(JSON, default=list)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    supporting_docs: Mapped[Optional[dict]] = mapped_column(JSON, default=list)
    
    # Submission
    submitted_to: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    company = relationship("Company", back_populates="str_reports")


# ─── TRAINING RECORD ───

class TrainingRecord(Base, TimestampMixin, JSONSerializable):
    __tablename__ = "training_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    
    training_type: Mapped[str] = mapped_column(String(20), default="annual")  # initial, annual, special
    module_name: Mapped[str] = mapped_column(String(255), nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.utcnow())
    score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # percentage 0-100
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    certificate_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    valid_until: Mapped[datetime] = mapped_column(DateTime, default=one_year_from_now)

    company = relationship("Company")
    user = relationship("User", back_populates="training_records")


# ─── INDEXES ───

__all__ = [
    "User", "Company", "Policy", "CDDRecord",
    "UBORecord", "STRReport", "TrainingRecord",
]
