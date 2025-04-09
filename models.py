from app import db
from datetime import datetime
from flask_login import UserMixin


class User(UserMixin, db.Model):
    """User model for authentication and user management"""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship with CasePlans
    case_plans = db.relationship('CasePlan', backref='author', lazy='dynamic')

    def __repr__(self):
        return f'<User {self.username}>'


class CasePlan(db.Model):
    """Case plan model to store generated plans"""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    client_name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime,
                           default=datetime.utcnow,
                           onupdate=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # Store the complete case plan as JSON
    plan_data = db.Column(db.JSON, nullable=False)

    # Relationships with domain risk levels
    domain_selections = db.relationship('DomainRiskLevel',
                                        backref='case_plan',
                                        lazy='dynamic',
                                        cascade='all, delete-orphan')

    def __repr__(self):
        return f'<CasePlan {self.title} for {self.client_name}>'


class DomainRiskLevel(db.Model):
    """Stores the selected risk levels for each domain in a case plan"""
    id = db.Column(db.Integer, primary_key=True)
    domain_id = db.Column(db.String(50),
                          nullable=False)  # e.g., "criminal_history"
    domain_name = db.Column(db.String(100),
                            nullable=False)  # e.g., "Criminal History"
    risk_level = db.Column(db.String(20),
                           nullable=False)  # "Low", "Medium", or "High"
    case_plan_id = db.Column(db.Integer,
                             db.ForeignKey('case_plan.id'),
                             nullable=False)

    def __repr__(self):
        return f'<DomainRiskLevel {self.domain_name}: {self.risk_level}>'
