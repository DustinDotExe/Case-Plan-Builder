import os
import json
import logging
import datetime
from flask import Flask, render_template, request, jsonify

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create the Flask application
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default-secret-key")

# Load case plan templates from JSON file
def load_case_plans():
    try:
        with open('static/data/case_plans.json', 'r') as file:
            return json.load(file)
    except Exception as e:
        logging.error(f"Error loading case plans: {e}")
        return {}

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
        
        # Load case plan templates
        case_plans = load_case_plans()
        
        # Initialize the plan structure
        generated_plan = {
            "domains": []
        }
        
        # Process each domain
        for domain in case_plans.get('domains', []):
            domain_name = domain['name']
            domain_id = domain['id']
            
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
        
        return jsonify(generated_plan)
    except Exception as e:
        logging.error(f"Error generating plan: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
