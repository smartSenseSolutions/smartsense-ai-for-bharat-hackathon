from sqlalchemy import (
    Boolean,
    Column,
    Integer,
    String,
    DateTime,
    JSON,
    ForeignKey,
    Float,
    Enum,
    Text,
)
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
import enum


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_superuser = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ProjectStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, index=True)
    project_name = Column(String, index=True)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.DRAFT)
    rfp_data = Column(JSON, nullable=True)  # Full RFP configuration/draft
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project_vendors = relationship("ProjectVendor", back_populates="project")
    quotes = relationship("Quote", back_populates="project")


class ProjectVendor(Base):
    __tablename__ = "project_vendors"

    # Tracks which vendors have been invited to a specific project
    id = Column(String, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id"))
    vendor_id = Column(String, ForeignKey("vendors.id"))
    status = Column(String, default="sent")  # sent, viewed, answered
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="project_vendors")
    vendor = relationship("Vendor", back_populates="project_vendors")


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True, unique=True)
    contact_email = Column(String, nullable=True)
    capabilities = Column(JSON, nullable=True)  # Capability score, match attributes
    certification_status = Column(String, nullable=True)  # verified, pending, invalid
    created_at = Column(DateTime, default=datetime.utcnow)

    # Bulk-upload / onboarding fields
    location = Column(String, nullable=True)  # City/state
    estd = Column(Integer, nullable=True)  # Year established
    mobile = Column(String, nullable=True)
    website = Column(String, nullable=True)
    certificates = Column(JSON, nullable=True)  # List[str] of cert/license names
    products = Column(JSON, nullable=True)  # List[str] of product names

    project_vendors = relationship("ProjectVendor", back_populates="vendor")
    quotes = relationship("Quote", back_populates="vendor")
    documents = relationship("VendorDocument", back_populates="vendor")


class Quote(Base):
    __tablename__ = "quotes"

    id = Column(String, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id"))
    vendor_id = Column(String, ForeignKey("vendors.id"))
    price = Column(Float)
    currency = Column(String, default="INR")
    status = Column(
        String, default="received"
    )  # received, short-listed, accepted, rejected, negotiating
    risk_score = Column(Float, nullable=True)
    sla_details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="quotes")
    vendor = relationship("Vendor", back_populates="quotes")


class VendorDocument(Base):
    __tablename__ = "vendor_documents"

    id = Column(String, primary_key=True, index=True)
    vendor_id = Column(String, ForeignKey("vendors.id"), nullable=False, index=True)
    document_url = Column(String, nullable=False)
    document_name = Column(String, nullable=True)
    issued_to = Column(String, nullable=True)
    issuing_authority = Column(String, nullable=True)
    issue_date = Column(String, nullable=True)
    expiry_date = Column(String, nullable=True)
    document_summary = Column(Text, nullable=True)
    document_type = Column(String, nullable=True)
    processing_status = Column(String, default="pending")  # pending, completed, failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    vendor = relationship("Vendor", back_populates="documents")


class SearchHistory(Base):
    __tablename__ = "search_history"

    id = Column(String, primary_key=True, index=True)
    query = Column(String, index=True)
    internal_results = Column(JSON, nullable=True)
    external_results = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
