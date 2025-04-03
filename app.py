import os
import json
import logging
import datetime
from flask import Flask, render_template, request, jsonify, flash, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, login_user, logout_user, login_required, current_user

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create Flask application
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default-secret-key")

# Database configuration
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Initialize SQLAlchemy with the app
class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
db.init_app(app)

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Import the models after initializing db
from models import User, CasePlan, DomainRiskLevel

# Create tables within application context
with app.app_context():
    db.create_all()

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Load case plan templates from JSON file
def load_case_plans():
    try:
        with open('static/data/case_plans.json', 'r') as file:
            return json.load(file)
    except Exception as e:
        logging.error(f"Error loading case plans: {e}")
        return {}

# Authentication routes
@app.route('/register', methods=['GET', 'POST'])
def register():
    """User registration page"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
        
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        # Basic validation
        if not username or not email or not password:
            flash('All fields are required', 'danger')
            return redirect(url_for('register'))
            
        if password != confirm_password:
            flash('Passwords do not match', 'danger')
            return redirect(url_for('register'))
            
        # Check if username or email already exists
        existing_user = User.query.filter((User.username == username) | (User.email == email)).first()
        if existing_user:
            flash('Username or email already exists', 'danger')
            return redirect(url_for('register'))
            
        # Create new user
        new_user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password)
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        flash('Registration successful! Please log in.', 'success')
        return redirect(url_for('login'))
        
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """User login page"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
        
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        remember = request.form.get('remember', False)
        
        # Find user by username
        user = User.query.filter_by(username=username).first()
        
        # Check if user exists and password is correct
        if user and check_password_hash(user.password_hash, password):
            login_user(user, remember=remember)
            next_page = request.args.get('next')
            flash('Login successful!', 'success')
            return redirect(next_page or url_for('dashboard'))
        else:
            flash('Invalid username or password', 'danger')
            
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    """Logout the current user"""
    logout_user()
    flash('You have been logged out', 'info')
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    """User dashboard showing saved case plans"""
    user_case_plans = CasePlan.query.filter_by(user_id=current_user.id).order_by(CasePlan.updated_at.desc()).all()
    return render_template('dashboard.html', case_plans=user_case_plans)

@app.route('/')
def index():
    """Render the main page"""
    case_plans = load_case_plans()
    now = datetime.datetime.now()
    return render_template('index.html', domains=case_plans.get('domains', []), now=now)

@app.route('/generate_plan', methods=['POST'])
def generate_plan():
    """Generate a case plan based on selected risk levels"""
    try:
        # Get the form data
        form_data = request.form.to_dict()
        
        # Get client name and plan title
        client_name = form_data.get("client_name", "")
        plan_title = form_data.get("plan_title", "Case Plan")
        
        # Validate required fields
        if not client_name:
            return jsonify({"error": "Client name is required"}), 400
            
        # Load case plan templates
        case_plans = load_case_plans()
        
        # Initialize the plan structure
        generated_plan = {
            "domains": [],
            "client_name": client_name,
            "plan_title": plan_title,
            "created_date": datetime.datetime.now().strftime('%Y-%m-%d')
        }
        
        # Track selected domains for database
        selected_domains = []
        
        # Process each domain
        for domain in case_plans.get('domains', []):
            domain_name = domain['name']
            domain_id = domain['id']
            
            # Check if domain is toggled to be included
            include_domain = form_data.get(f"include_{domain_id}", "false")
            if include_domain.lower() in ("false", "0", ""):
                continue
                
            # Get the selected risk level for this domain
            selected_risk = form_data.get(f"risk_{domain_id}", "")
            
            # Skip if no risk level was selected
            if not selected_risk:
                continue
                
            # Find the plan template for this domain and risk level
            domain_plan = None
            for template in domain.get('templates', []):
                if template['risk_level'] == selected_risk:
                    domain_plan = template
                    break
            
            if domain_plan:
                # Add the domain plan to the generated plan
                generated_plan['domains'].append({
                    "name": domain_name,
                    "id": domain_id,
                    "risk_level": selected_risk,
                    "goals": domain_plan.get('goals', []),
                    "objectives": domain_plan.get('objectives', []),
                    "tasks": domain_plan.get('tasks', [])
                })
                
                # Track selected domain for database storage
                selected_domains.append({
                    "domain_id": domain_id,
                    "domain_name": domain_name,
                    "risk_level": selected_risk
                })
        
        # Save to database if user is authenticated and requested
        if current_user.is_authenticated and form_data.get('save_to_database') == 'true':
            # Create a new case plan in the database
            case_plan = CasePlan(
                title=generated_plan['plan_title'],
                client_name=generated_plan['client_name'],
                user_id=current_user.id,
                plan_data=generated_plan
            )
            
            db.session.add(case_plan)
            db.session.flush()  # Get the ID before committing
            
            # Add each domain selection
            for domain in selected_domains:
                domain_selection = DomainRiskLevel(
                    domain_id=domain['domain_id'],
                    domain_name=domain['domain_name'],
                    risk_level=domain['risk_level'],
                    case_plan_id=case_plan.id
                )
                db.session.add(domain_selection)
                
            db.session.commit()
            
            # Add the ID to the generated plan
            generated_plan['id'] = case_plan.id
            flash('Case plan saved successfully', 'success')
        
        return jsonify(generated_plan)
    except Exception as e:
        logging.error(f"Error generating plan: {e}")
        return jsonify({"error": str(e)}), 500

# Routes for managing saved case plans
@app.route('/case_plan/<int:plan_id>')
@login_required
def view_case_plan(plan_id):
    """View a specific case plan"""
    plan = CasePlan.query.filter_by(id=plan_id, user_id=current_user.id).first_or_404()
    return render_template('view_plan.html', plan=plan)

@app.route('/case_plan/<int:plan_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_case_plan(plan_id):
    """Edit a specific case plan"""
    # For new plans (id=0), create a new plan object
    if plan_id == 0:
        plan = CasePlan(user_id=current_user.id)
        is_new_plan = True
    else:
        plan = CasePlan.query.filter_by(id=plan_id, user_id=current_user.id).first_or_404()
        is_new_plan = False
    
    if request.method == 'POST':
        # Get updated plan data
        updated_plan = request.json
        
        if updated_plan:
            # Update plan data
            plan.plan_data = updated_plan
            
            # Update main plan info
            plan.title = updated_plan.get('plan_title', plan.title or 'Case Plan')
            plan.client_name = updated_plan.get('client_name', plan.client_name or 'Client')
            plan.updated_at = datetime.datetime.now()
            
            # Ensure plan data has consistent client and title
            plan.plan_data['client_name'] = plan.client_name
            plan.plan_data['plan_title'] = plan.title
            
            # For new plans, add to the database
            if is_new_plan:
                db.session.add(plan)
                
                # Only flush to get the ID before saving domain selections
                db.session.flush()
                
                # Add domain selections
                for domain in updated_plan.get('domains', []):
                    domain_selection = DomainRiskLevel(
                        domain_id=domain.get('id'),
                        domain_name=domain.get('name'),
                        risk_level=domain.get('risk_level'),
                        case_plan_id=plan.id
                    )
                    db.session.add(domain_selection)
            
            db.session.commit()
            
            # Return success message with redirect to view page for new plans
            response = {
                "success": True, 
                "message": "Plan saved successfully"
            }
            
            if is_new_plan:
                response["redirect_url"] = url_for('view_case_plan', plan_id=plan.id)
                response["plan_id"] = plan.id
                
            return jsonify(response)
        else:
            return jsonify({"success": False, "message": "Invalid plan data"}), 400
    
    # Load template for risk level selection during edit
    case_plans_templates = load_case_plans()
    
    return render_template('edit_plan.html', plan=plan, templates=case_plans_templates)

@app.route('/case_plan/<int:plan_id>/delete', methods=['POST'])
@login_required
def delete_case_plan(plan_id):
    """Delete a specific case plan"""
    plan = CasePlan.query.filter_by(id=plan_id, user_id=current_user.id).first_or_404()
    
    db.session.delete(plan)
    db.session.commit()
    
    flash('Case plan deleted successfully', 'success')
    return redirect(url_for('dashboard'))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
