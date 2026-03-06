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
    full_name = Column(String, nullable=True)
    company_logo_url = Column(String, nullable=True)
    password_last_changed_at = Column(DateTime, default=datetime.utcnow)
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
    rfp_expiry = Column(String, nullable=True)  # RFP expiry date in dd-mm-yyyy format
    rfp_deadline = Column(DateTime, nullable=True)
    delivery_timeline = Column(DateTime, nullable=True)
    search_intent = Column(JSON, nullable=True)
    ai_recommendations = Column(
        JSON, nullable=True
    )  # Cached AI evaluations of vendor quotes
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project_vendors = relationship("ProjectVendor", back_populates="project")
    quotes = relationship("Quote", back_populates="project")
    invited_vendors = relationship(
        "ProjectInvitedVendor",
        back_populates="project",
        order_by="ProjectInvitedVendor.invited_at",
    )


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
    negotiated_price = Column(Float, nullable=True)
    sla_details = Column(JSON, nullable=True)
    delivery_timeline = Column(String, nullable=True)
    quality_standards = Column(Text, nullable=True)
    warranty_terms = Column(Text, nullable=True)
    compliance_certifications = Column(Text, nullable=True)
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


class ProjectInvitedVendor(Base):
    """Denormalised record of every vendor invited to an RFP project.

    vendor_id is stored as a plain string (no FK) so that both internal DB
    vendors and externally-discovered (AI) vendors can be tracked.
    """

    __tablename__ = "project_invited_vendors"

    id = Column(String, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    vendor_id = Column(String, nullable=True)  # None for purely external vendors
    vendor_name = Column(String, nullable=False)
    contact_email = Column(String, nullable=True)
    products = Column(String, nullable=True)  # comma-joined product list
    invited_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="invited_vendors")


class SearchHistory(Base):
    __tablename__ = "search_history"

    id = Column(String, primary_key=True, index=True)
    query = Column(String, index=True)
    internal_results = Column(JSON, nullable=True)
    external_results = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Activity(Base):
    __tablename__ = "activities"

    id = Column(String, primary_key=True, index=True)
    type = Column(String, index=True)  # rfp_publish, quote_received, etc.
    title = Column(String)
    description = Column(Text, nullable=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    vendor_id = Column(String, ForeignKey("vendors.id"), nullable=True)
    is_new = Column(Boolean, default=True)  # For that "New" tag
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project")
    vendor = relationship("Vendor")
