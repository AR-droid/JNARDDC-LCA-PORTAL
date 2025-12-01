from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from datetime import datetime, timedelta
import jwt
import sqlite3
import hashlib
import uuid
import os
import io
from dotenv import load_dotenv

# Excel generation
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from openpyxl.utils import get_column_letter

# Load environment variables
load_dotenv()

# Try to import Groq (optional dependency)
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    print("⚠️  Groq not installed. AI features will use rule-based fallback.")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

SECRET_KEY = "supersecret123"
DATABASE = "users.db"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# Initialize Groq client if available
groq_client = None
if GROQ_AVAILABLE and GROQ_API_KEY:
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
        print("✅ Groq AI client initialized")
    except Exception as e:
        print(f"⚠️  Groq initialization failed: {e}")


def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200

@app.route('/api/v1/auth/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        full_name = data.get('full_name', '')
        org_name = data.get('organization_name', '')
        
        if not email or not password:
            return jsonify({"detail": "Email and password required"}), 400
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        # Check if user exists
        c.execute("SELECT * FROM users WHERE email = ?", (email,))
        if c.fetchone():
            conn.close()
            return jsonify({"detail": "Email already registered"}), 400
        
        # Create user
        user_id = str(uuid.uuid4())
        hashed_pw = hash_password(password)
        created_at = datetime.utcnow().isoformat()
        
        c.execute("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)",
                  (user_id, email, hashed_pw, full_name, org_name, created_at))
        conn.commit()
        conn.close()
        
        # Create token
        token = jwt.encode({
            'user_id': user_id,
            'email': email,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": email,
                "full_name": full_name,
                "organization_name": org_name
            }
        }), 201
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"detail": str(e)}), 500

@app.route('/api/v1/auth/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        # Handle both JSON and form data
        if request.content_type == 'application/json':
            data = request.get_json()
            email = data.get('email')
            password = data.get('password')
        else:
            email = request.form.get('username') or request.form.get('email')
            password = request.form.get('password')
        
        if not email or not password:
            return jsonify({"detail": "Email and password required"}), 400
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE email = ?", (email,))
        user = c.fetchone()
        conn.close()
        
        if not user or user[2] != hash_password(password):
            return jsonify({"detail": "Invalid credentials"}), 401
        
        # Create token
        token = jwt.encode({
            'user_id': user[0],
            'email': user[1],
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user[0],
                "email": user[1],
                "full_name": user[3],
                "organization_name": user[4]
            }
        }), 200
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"detail": str(e)}), 500

@app.route('/api/v1/auth/me', methods=['GET', 'OPTIONS'])
def get_me():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"detail": "Not authenticated"}), 401
        
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE id = ?", (payload['user_id'],))
        user = c.fetchone()
        conn.close()
        
        if not user:
            return jsonify({"detail": "User not found"}), 404
        
        return jsonify({
            "id": user[0],
            "email": user[1],
            "full_name": user[3],
            "organization_name": user[4]
        }), 200
    except jwt.ExpiredSignatureError:
        return jsonify({"detail": "Token expired"}), 401
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"detail": "Invalid token"}), 401

@app.route('/api/v1/projects', methods=['GET', 'OPTIONS'])
def list_projects():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"detail": "Not authenticated"}), 401
        
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute("""SELECT id, name, description, status, product_category, 
                     target_lifespan, is_designed_for_disassembly, user_id, 
                     COALESCE(gwp_total, 0) as gwp_total, 
                     COALESCE(mci_score, 0) as mci_score,
                     created_at 
                     FROM projects WHERE user_id = ? ORDER BY created_at DESC""", (payload['user_id'],))
        projects = c.fetchall()
        conn.close()
        
        return jsonify([{
            "id": p[0],
            "name": p[1],
            "description": p[2],
            "status": p[3],
            "product_category": p[4],
            "target_lifespan": p[5],
            "is_designed_for_disassembly": bool(p[6]) if p[6] is not None else False,
            "user_id": p[7],
            "gwp_total": float(p[8]) if p[8] is not None else 0.0,
            "mci_score": float(p[9]) if p[9] is not None else 0.0,
            "created_at": p[10]
        } for p in projects]), 200
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"detail": str(e)}), 500

@app.route('/api/v1/projects', methods=['POST'])
def create_project():
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"detail": "Not authenticated"}), 401
        
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        
        data = request.get_json()
        name = data.get('name')
        if not name:
            return jsonify({"detail": "Project name required"}), 400
        
        project_id = str(uuid.uuid4())
        description = data.get('description', '')
        status = 'draft'
        product_category = data.get('product_category', '')
        target_lifespan = data.get('target_lifespan')
        is_disassembly = data.get('is_designed_for_disassembly', False)
        created_at = datetime.utcnow().isoformat()
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute("""INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                  (project_id, name, description, status, product_category, 
                   target_lifespan, 1 if is_disassembly else 0, payload['user_id'], 
                   0, 0, 0, created_at))  # gwp_total=0, mci_score=0, circular_design_score=0
        conn.commit()
        conn.close()
        
        return jsonify({
            "id": project_id,
            "name": name,
            "description": description,
            "status": status,
            "product_category": product_category,
            "target_lifespan": target_lifespan,
            "is_designed_for_disassembly": is_disassembly,
            "created_at": created_at
        }), 201
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"detail": str(e)}), 500

@app.route('/api/v1/projects/<project_id>', methods=['GET', 'OPTIONS'])
def get_project(project_id):
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"detail": "Not authenticated"}), 401
        
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute("""SELECT id, name, description, status, product_category, 
                     target_lifespan, is_designed_for_disassembly, user_id, 
                     COALESCE(gwp_total, 0) as gwp_total, created_at 
                     FROM projects WHERE id = ? AND user_id = ?""", (project_id, payload['user_id']))
        project = c.fetchone()
        conn.close()
        
        if not project:
            return jsonify({"detail": "Project not found"}), 404
        
        return jsonify({
            "id": project[0],
            "name": project[1],
            "description": project[2],
            "status": project[3],
            "product_category": project[4],
            "target_lifespan": project[5],
            "is_designed_for_disassembly": bool(project[6]) if project[6] is not None else False,
            "user_id": project[7],
            "gwp_total": float(project[8]) if project[8] is not None else 0.0,
            "created_at": project[9]
        }), 200
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"detail": str(e)}), 500

@app.route('/api/v1/projects/<project_id>', methods=['PUT', 'OPTIONS'])
def update_project(project_id):
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"detail": "Not authenticated"}), 401
        
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        
        data = request.get_json()
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        # Build dynamic update query
        updates = []
        values = []
        
        if 'name' in data:
            updates.append("name = ?")
            values.append(data['name'])
        if 'description' in data:
            updates.append("description = ?")
            values.append(data['description'])
        if 'status' in data:
            updates.append("status = ?")
            values.append(data['status'])
        if 'product_category' in data:
            updates.append("product_category = ?")
            values.append(data['product_category'])
        if 'target_lifespan' in data:
            updates.append("target_lifespan = ?")
            values.append(data['target_lifespan'])
        
        if not updates:
            return jsonify({"detail": "No fields to update"}), 400
        
        values.extend([project_id, payload['user_id']])
        query = f"UPDATE projects SET {', '.join(updates)} WHERE id = ? AND user_id = ?"
        c.execute(query, values)
        conn.commit()
        
        if c.rowcount == 0:
            conn.close()
            return jsonify({"detail": "Project not found"}), 404
        
        # Fetch updated project
        c.execute("""SELECT id, name, description, status, product_category, 
                     target_lifespan, is_designed_for_disassembly, user_id, 
                     COALESCE(gwp_total, 0) as gwp_total, created_at 
                     FROM projects WHERE id = ?""", (project_id,))
        project = c.fetchone()
        conn.close()
        
        return jsonify({
            "id": project[0],
            "name": project[1],
            "description": project[2],
            "status": project[3],
            "product_category": project[4],
            "target_lifespan": project[5],
            "is_designed_for_disassembly": bool(project[6]) if project[6] is not None else False,
            "gwp_total": float(project[8]) if project[8] is not None else 0.0,
            "created_at": project[9]
        }), 200
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"detail": str(e)}), 500

@app.route('/api/v1/projects/<project_id>', methods=['DELETE', 'OPTIONS'])
def delete_project(project_id):
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"detail": "Not authenticated"}), 401
        
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        # Delete materials first
        c.execute("DELETE FROM project_materials WHERE project_id = ?", (project_id,))
        
        # Delete project
        c.execute("DELETE FROM projects WHERE id = ? AND user_id = ?", (project_id, payload['user_id']))
        conn.commit()
        
        if c.rowcount == 0:
            conn.close()
            return jsonify({"detail": "Project not found"}), 404
        
        conn.close()
        return jsonify({"message": "Project deleted successfully"}), 200
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"detail": str(e)}), 500


# =====================================================
# JNARRDC VERIFICATION WORKFLOW
# =====================================================

# In-memory storage for verification requests (would be database in production)
VERIFICATION_REQUESTS = {}

@app.route('/api/v1/projects/<project_id>/verification', methods=['GET', 'OPTIONS'])
def get_verification_status(project_id):
    """Get verification status for a project"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        verification = VERIFICATION_REQUESTS.get(project_id, {
            'status': 'not_submitted',
            'submitted_at': None,
            'verified_at': None,
            'verifier_notes': None,
            'certificate_id': None
        })
        
        return jsonify(verification), 200
    except Exception as e:
        return jsonify({"detail": str(e)}), 500


@app.route('/api/v1/projects/<project_id>/verification/submit', methods=['POST', 'OPTIONS'])
def submit_for_verification(project_id):
    """Submit project for JNARRDC verification"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"detail": "Not authenticated"}), 401
        
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user_id = payload['user_id']
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        # Get project
        c.execute("SELECT * FROM projects WHERE id = ? AND user_id = ?", (project_id, user_id))
        project = c.fetchone()
        if not project:
            conn.close()
            return jsonify({"detail": "Project not found"}), 404
        
        # Get materials
        c.execute("SELECT COUNT(*) FROM project_materials WHERE project_id = ?", (project_id,))
        material_count = c.fetchone()[0]
        
        # Get user info
        c.execute("SELECT full_name, organization_name, email FROM users WHERE id = ?", (user_id,))
        user = c.fetchone()
        conn.close()
        
        # Check if project has materials
        if material_count == 0:
            return jsonify({"detail": "Cannot submit empty project for verification. Add materials first."}), 400
        
        # Check if already submitted
        if project_id in VERIFICATION_REQUESTS and VERIFICATION_REQUESTS[project_id]['status'] != 'rejected':
            return jsonify({"detail": "Project already submitted for verification"}), 400
        
        # Create verification request
        request_id = f"VER-{project_id[:8].upper()}-{datetime.now().strftime('%Y%m%d%H%M')}"
        
        VERIFICATION_REQUESTS[project_id] = {
            'request_id': request_id,
            'project_id': project_id,
            'project_name': project[1],
            'user_id': user_id,
            'user_name': user[0] if user else 'Unknown',
            'organization': user[1] if user else 'Unknown',
            'status': 'pending',  # pending, under_review, verified, rejected
            'submitted_at': datetime.now().isoformat(),
            'material_count': material_count,
            'gwp_total': project[8] if len(project) > 8 else 0,
            'mci_score': project[10] if len(project) > 10 else 0,
            'verified_at': None,
            'verifier_name': None,
            'verifier_notes': None,
            'certificate_id': None,
            'flags': []
        }
        
        # Add AI-generated flags (simulated)
        flags = []
        if project[8] and project[8] > 1000:  # High GWP
            flags.append({'type': 'warning', 'message': 'High GWP value - manual review recommended'})
        if material_count > 20:
            flags.append({'type': 'info', 'message': 'Large BOM - detailed verification may take longer'})
        
        VERIFICATION_REQUESTS[project_id]['flags'] = flags
        
        return jsonify({
            "message": "Project submitted for JNARRDC verification",
            "request_id": request_id,
            "status": "pending",
            "estimated_review_time": "3-5 business days"
        }), 200
        
    except Exception as e:
        print(f"Verification Submit Error: {e}")
        return jsonify({"detail": str(e)}), 500


@app.route('/api/v1/projects/<project_id>/verification/certificate', methods=['GET', 'OPTIONS'])
def get_verification_certificate(project_id):
    """Get verification certificate if project is verified"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        verification = VERIFICATION_REQUESTS.get(project_id)
        
        if not verification or verification['status'] != 'verified':
            return jsonify({"detail": "Project not verified. Certificate not available."}), 404
        
        # Generate certificate data
        certificate = {
            'certificate_id': verification['certificate_id'],
            'project_name': verification['project_name'],
            'organization': verification['organization'],
            'verified_at': verification['verified_at'],
            'verifier_name': verification['verifier_name'],
            'gwp_total': verification['gwp_total'],
            'mci_score': verification['mci_score'],
            'validity': '1 year from verification date',
            'issuer': 'JNARRDC - Ministry of Mines, Government of India',
            'qr_code_data': f"https://jnarrdc.gov.in/verify/{verification['certificate_id']}"
        }
        
        return jsonify(certificate), 200
        
    except Exception as e:
        return jsonify({"detail": str(e)}), 500


# Admin endpoint to simulate verification (for demo purposes)
@app.route('/api/v1/admin/verify-project/<project_id>', methods=['POST', 'OPTIONS'])
def admin_verify_project(project_id):
    """Admin endpoint to verify a project (demo only)"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json() or {}
        action = data.get('action', 'verify')  # verify or reject
        notes = data.get('notes', '')
        
        if project_id not in VERIFICATION_REQUESTS:
            return jsonify({"detail": "No verification request found"}), 404
        
        if action == 'verify':
            cert_id = f"JNARRDC-{datetime.now().year}-{uuid.uuid4().hex[:8].upper()}"
            VERIFICATION_REQUESTS[project_id].update({
                'status': 'verified',
                'verified_at': datetime.now().isoformat(),
                'verifier_name': 'JNARRDC Verification Team',
                'verifier_notes': notes or 'LCA data verified and approved.',
                'certificate_id': cert_id
            })
            return jsonify({"message": "Project verified", "certificate_id": cert_id}), 200
        else:
            VERIFICATION_REQUESTS[project_id].update({
                'status': 'rejected',
                'verified_at': datetime.now().isoformat(),
                'verifier_name': 'JNARRDC Verification Team',
                'verifier_notes': notes or 'Verification rejected. Please review and resubmit.'
            })
            return jsonify({"message": "Project verification rejected"}), 200
            
    except Exception as e:
        return jsonify({"detail": str(e)}), 500


@app.route('/api/v1/projects/<project_id>/materials', methods=['GET', 'OPTIONS'])
def list_materials(project_id):
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"detail": "Not authenticated"}), 401
        
        token = auth_header.split(' ')[1]
        jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute("SELECT * FROM project_materials WHERE project_id = ?", (project_id,))
        materials = c.fetchall()
        conn.close()
        
        return jsonify([{
            "id": m[0],
            "project_id": m[1],
            "material_name": m[2],
            "material_type": m[3],
            "quantity": m[4],
            "unit": m[5],
            "recycled_content": m[6],
            "gwp": m[7],
            "transport_distance": m[8],
            "created_at": m[9]
        } for m in materials]), 200
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"detail": str(e)}), 500

@app.route('/api/v1/projects/<project_id>/materials', methods=['POST'])
def add_material(project_id):
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"detail": "Not authenticated"}), 401
        
        token = auth_header.split(' ')[1]
        jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        
        data = request.get_json()
        material_id = str(uuid.uuid4())
        
        # Calculate GWP based on material type and quantity
        gwp = calculate_gwp(
            data.get('material_type'),
            data.get('quantity', 0),
            data.get('recycled_content', 0),
            data.get('transport_distance', 0)
        )
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute("""INSERT INTO project_materials VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                  (material_id, project_id, data.get('material_name'), 
                   data.get('material_type'), data.get('quantity'), data.get('unit'),
                   data.get('recycled_content', 0), gwp, data.get('transport_distance', 0),
                   datetime.utcnow().isoformat()))
        conn.commit()
        
        # Update project total GWP and MCI score
        c.execute("SELECT SUM(gwp) FROM project_materials WHERE project_id = ?", (project_id,))
        total_gwp = c.fetchone()[0] or 0
        
        # Calculate MCI score based on all materials
        c.execute("""SELECT material_type, quantity, recycled_content 
                     FROM project_materials WHERE project_id = ?""", (project_id,))
        all_materials = c.fetchall()
        
        # Get project info for MCI calculation
        c.execute("""SELECT target_lifespan, is_designed_for_disassembly, product_category 
                     FROM projects WHERE id = ?""", (project_id,))
        project_info = c.fetchone()
        target_lifespan = project_info[0] or 10
        is_designed_for_disassembly = bool(project_info[1])
        product_category = project_info[2] or 'other'
        
        # Calculate weighted average recycled content
        total_mass = sum(m[1] or 0 for m in all_materials)
        weighted_recycled = sum((m[1] or 0) * (m[2] or 0) for m in all_materials) / total_mass if total_mass > 0 else 0
        
        # Get industry benchmark
        benchmark = INDUSTRY_BENCHMARKS.get(product_category, INDUSTRY_BENCHMARKS['other'])
        industry_avg_lifespan = benchmark['avg_lifespan']
        
        # Calculate MCI
        mci_score = calculate_mci(
            weighted_recycled,  # recycled input
            weighted_recycled * 0.8,  # assume 80% of input can be recycled at end of life
            target_lifespan,
            industry_avg_lifespan,
            is_designed_for_disassembly
        )
        
        c.execute("UPDATE projects SET status = ?, gwp_total = ?, mci_score = ? WHERE id = ?", 
                  ('calculated', total_gwp, mci_score, project_id))
        conn.commit()
        conn.close()
        
        return jsonify({
            "id": material_id,
            "project_id": project_id,
            "material_name": data.get('material_name'),
            "material_type": data.get('material_type'),
            "quantity": data.get('quantity'),
            "unit": data.get('unit'),
            "recycled_content": data.get('recycled_content', 0),
            "gwp": gwp,
            "transport_distance": data.get('transport_distance', 0)
        }), 201
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"detail": str(e)}), 500

@app.route('/api/v1/projects/<project_id>/materials/batch', methods=['POST'])
def add_materials_batch(project_id):
    """Batch add multiple materials at once - for BOM upload"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"detail": "Not authenticated"}), 401
        
        token = auth_header.split(' ')[1]
        jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        
        data = request.get_json()
        materials = data.get('materials', [])
        
        if not materials:
            return jsonify({"detail": "No materials provided"}), 400
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        added_materials = []
        failed_materials = []
        
        for item in materials:
            try:
                material_id = str(uuid.uuid4())
                
                # Calculate GWP
                gwp = calculate_gwp(
                    item.get('material_type'),
                    item.get('quantity', 0),
                    item.get('recycled_content', 0),
                    item.get('transport_distance', 0)
                )
                
                c.execute("""INSERT INTO project_materials VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                          (material_id, project_id, item.get('material_name'), 
                           item.get('material_type'), item.get('quantity'), item.get('unit', 'kg'),
                           item.get('recycled_content', 0), gwp, item.get('transport_distance', 0),
                           datetime.utcnow().isoformat()))
                
                added_materials.append({
                    "id": material_id,
                    "material_name": item.get('material_name'),
                    "gwp": gwp
                })
            except Exception as e:
                failed_materials.append({
                    "material_name": item.get('material_name'),
                    "error": str(e)
                })
        
        conn.commit()
        
        # Update project total GWP and MCI score
        c.execute("SELECT SUM(gwp) FROM project_materials WHERE project_id = ?", (project_id,))
        total_gwp = c.fetchone()[0] or 0
        
        # Calculate MCI score based on all materials
        c.execute("""SELECT material_type, quantity, recycled_content 
                     FROM project_materials WHERE project_id = ?""", (project_id,))
        all_materials = c.fetchall()
        
        # Get project info for MCI calculation
        c.execute("""SELECT target_lifespan, is_designed_for_disassembly, product_category 
                     FROM projects WHERE id = ?""", (project_id,))
        project_info = c.fetchone()
        target_lifespan = project_info[0] or 10
        is_designed_for_disassembly = bool(project_info[1])
        product_category = project_info[2] or 'other'
        
        # Calculate weighted average recycled content
        total_mass = sum(m[1] or 0 for m in all_materials)
        weighted_recycled = sum((m[1] or 0) * (m[2] or 0) for m in all_materials) / total_mass if total_mass > 0 else 0
        
        # Get industry benchmark
        benchmark = INDUSTRY_BENCHMARKS.get(product_category, INDUSTRY_BENCHMARKS['other'])
        industry_avg_lifespan = benchmark['avg_lifespan']
        
        # Calculate MCI
        mci_score = calculate_mci(
            weighted_recycled,
            weighted_recycled * 0.8,
            target_lifespan,
            industry_avg_lifespan,
            is_designed_for_disassembly
        )
        
        c.execute("UPDATE projects SET status = ?, gwp_total = ?, mci_score = ? WHERE id = ?", 
                  ('calculated', total_gwp, mci_score, project_id))
        conn.commit()
        conn.close()
        
        return jsonify({
            "added": len(added_materials),
            "failed": len(failed_materials),
            "materials": added_materials,
            "errors": failed_materials,
            "total_gwp": total_gwp,
            "mci_score": mci_score
        }), 201
    except Exception as e:
        print(f"Error in batch add: {e}")
        return jsonify({"detail": str(e)}), 500

@app.route('/api/v1/projects/<project_id>/materials/<material_id>', methods=['DELETE', 'OPTIONS'])
def delete_material(project_id, material_id):
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"detail": "Not authenticated"}), 401
        
        token = auth_header.split(' ')[1]
        jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        # Delete material
        c.execute("DELETE FROM project_materials WHERE id = ? AND project_id = ?", (material_id, project_id))
        conn.commit()
        
        if c.rowcount == 0:
            conn.close()
            return jsonify({"detail": "Material not found"}), 404
        
        # Recalculate project total GWP
        c.execute("SELECT SUM(gwp) FROM project_materials WHERE project_id = ?", (project_id,))
        total_gwp = c.fetchone()[0] or 0
        
        # Update project status
        c.execute("SELECT COUNT(*) FROM project_materials WHERE project_id = ?", (project_id,))
        material_count = c.fetchone()[0]
        status = 'calculated' if material_count > 0 else 'draft'
        
        c.execute("UPDATE projects SET status = ?, gwp_total = ? WHERE id = ?", 
                  (status, total_gwp, project_id))
        conn.commit()
        conn.close()
        
        return jsonify({"message": "Material deleted successfully", "new_total_gwp": total_gwp}), 200
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"detail": str(e)}), 500

def calculate_gwp(material_type, quantity, recycled_content, transport_distance):
    """Calculate GWP based on material type and parameters"""
    
    # Emission factors (kg CO2-eq per kg material) - includes critical minerals
    emission_factors = {
        # Base Metals
        'aluminium_primary': 12.5,
        'aluminium_secondary': 0.6,
        'copper_primary': 3.5,
        'copper_secondary': 0.5,
        'steel_primary': 2.1,
        'steel_secondary': 0.4,
        # Battery Minerals
        'lithium': 15.0,
        'lithium_carbonate': 15.0,
        'lithium_hydroxide': 18.0,
        'cobalt': 10.0,
        'cobalt_sulfate': 10.0,
        'nickel': 8.5,
        'nickel_class1': 12.5,
        'nickel_ferronickel': 8.5,
        'manganese': 2.8,
        'graphite': 4.2,
        # Rare Earths
        'neodymium': 35.0,
        'dysprosium': 45.0,
        'praseodymium': 32.0,
        'terbium': 50.0,
        'rare_earth_mixed': 38.0,
        # Other Critical Minerals
        'tungsten': 22.0,
        'vanadium': 28.0,
        'titanium': 8.1,
        'tantalum': 48.0,
        'indium': 142.0,
        'gallium': 185.0,
        'germanium': 165.0,
        # Precious Metals
        'platinum': 12500.0,
        'palladium': 9800.0,
    }
    
    # Get base emission factor
    base_ef = emission_factors.get(material_type, 5.0)  # Default if not found
    
    # Calculate virgin and recycled portions
    virgin_fraction = (100 - recycled_content) / 100
    recycled_fraction = recycled_content / 100
    
    # Calculate material emissions
    virgin_emissions = quantity * base_ef * virgin_fraction
    
    # Recycled material has ~90% lower emissions
    recycled_emissions = quantity * (base_ef * 0.1) * recycled_fraction
    
    # Transport emissions (kg CO2-eq per ton-km)
    transport_emissions = (quantity / 1000) * transport_distance * 0.062
    
    # Total GWP
    total_gwp = virgin_emissions + recycled_emissions + transport_emissions
    
    return round(total_gwp, 2)


def get_scarcity_score(material_type):
    """Get Abiotic Depletion Potential (scarcity) score for critical minerals"""
    scarcity_scores = {
        # Battery Minerals
        'lithium': 85, 'lithium_carbonate': 85, 'lithium_hydroxide': 85,
        'cobalt': 92, 'cobalt_sulfate': 92,
        'nickel': 65, 'nickel_class1': 65, 'nickel_ferronickel': 55,
        'manganese': 40,
        'graphite': 70,
        # Rare Earths
        'neodymium': 95,
        'dysprosium': 98,
        'praseodymium': 90,
        'terbium': 96,
        'rare_earth_mixed': 93,
        # Other Critical
        'tungsten': 78,
        'vanadium': 72,
        'titanium': 45,
        'tantalum': 88,
        'indium': 82,
        'gallium': 80,
        'germanium': 84,
        # Precious Metals
        'platinum': 88,
        'palladium': 86,
        # Base metals (lower scarcity)
        'aluminium_primary': 20, 'aluminium_secondary': 20,
        'copper_primary': 35, 'copper_secondary': 35,
        'steel_primary': 15, 'steel_secondary': 15,
    }
    return scarcity_scores.get(material_type, 0)


# Industry benchmark lifespans (in years)
INDUSTRY_BENCHMARKS = {
    'batteries': {'avg_lifespan': 8, 'avg_mci': 0.35, 'name': 'Battery Pack'},
    'ev_battery': {'avg_lifespan': 10, 'avg_mci': 0.32, 'name': 'EV Battery Pack'},
    'electronics': {'avg_lifespan': 5, 'avg_mci': 0.28, 'name': 'Electronics'},
    'automotive': {'avg_lifespan': 15, 'avg_mci': 0.45, 'name': 'Automotive Component'},
    'industrial': {'avg_lifespan': 20, 'avg_mci': 0.40, 'name': 'Industrial Equipment'},
    'construction': {'avg_lifespan': 50, 'avg_mci': 0.52, 'name': 'Construction Material'},
    'packaging': {'avg_lifespan': 1, 'avg_mci': 0.65, 'name': 'Packaging'},
    'renewable_energy': {'avg_lifespan': 25, 'avg_mci': 0.48, 'name': 'Renewable Energy'},
    'magnets': {'avg_lifespan': 20, 'avg_mci': 0.25, 'name': 'Permanent Magnets'},
    'other': {'avg_lifespan': 10, 'avg_mci': 0.35, 'name': 'General Product'}
}

# Emission factors for virgin and recycled materials (kg CO2-eq per kg)
EMISSION_FACTORS = {
    # Base Metals
    'aluminium_primary': {'virgin': 12.5, 'recycled': 0.6},
    'aluminium_secondary': {'virgin': 0.6, 'recycled': 0.6},
    'copper_primary': {'virgin': 3.5, 'recycled': 0.5},
    'copper_secondary': {'virgin': 0.5, 'recycled': 0.5},
    'steel_primary': {'virgin': 2.1, 'recycled': 0.4},
    'steel_secondary': {'virgin': 0.4, 'recycled': 0.4},
    
    # Critical Minerals - Battery Metals
    'lithium_carbonate': {'virgin': 15.0, 'recycled': 1.5, 'scarcity_score': 85},
    'lithium_hydroxide': {'virgin': 18.0, 'recycled': 1.8, 'scarcity_score': 85},
    'lithium': {'virgin': 15.0, 'recycled': 1.5, 'scarcity_score': 85},
    'cobalt_sulfate': {'virgin': 10.0, 'recycled': 1.0, 'scarcity_score': 92},
    'cobalt': {'virgin': 10.0, 'recycled': 1.0, 'scarcity_score': 92},
    'nickel_class1': {'virgin': 12.5, 'recycled': 1.25, 'scarcity_score': 65},
    'nickel_ferronickel': {'virgin': 8.5, 'recycled': 0.85, 'scarcity_score': 55},
    'nickel': {'virgin': 8.5, 'recycled': 0.85, 'scarcity_score': 65},
    'manganese': {'virgin': 2.8, 'recycled': 0.3, 'scarcity_score': 40},
    'graphite': {'virgin': 4.2, 'recycled': 0.5, 'scarcity_score': 70},
    
    # Rare Earths
    'neodymium': {'virgin': 35.0, 'recycled': 5.0, 'scarcity_score': 95},
    'dysprosium': {'virgin': 45.0, 'recycled': 6.0, 'scarcity_score': 98},
    'praseodymium': {'virgin': 32.0, 'recycled': 4.5, 'scarcity_score': 90},
    'terbium': {'virgin': 50.0, 'recycled': 7.0, 'scarcity_score': 96},
    'rare_earth_mixed': {'virgin': 38.0, 'recycled': 5.5, 'scarcity_score': 93},
    
    # Other Critical Minerals
    'tungsten': {'virgin': 22.0, 'recycled': 3.0, 'scarcity_score': 78},
    'vanadium': {'virgin': 28.0, 'recycled': 4.0, 'scarcity_score': 72},
    'titanium': {'virgin': 8.1, 'recycled': 1.2, 'scarcity_score': 45},
    'platinum': {'virgin': 12500, 'recycled': 800, 'scarcity_score': 88},
    'palladium': {'virgin': 9800, 'recycled': 650, 'scarcity_score': 86},
    'indium': {'virgin': 142, 'recycled': 15, 'scarcity_score': 82},
    'gallium': {'virgin': 185, 'recycled': 20, 'scarcity_score': 80},
    'germanium': {'virgin': 165, 'recycled': 18, 'scarcity_score': 84},
    'tantalum': {'virgin': 48.0, 'recycled': 6.5, 'scarcity_score': 88},
}


def calculate_mci(recycled_content_input, recycled_content_output, 
                  target_lifespan, industry_avg_lifespan, 
                  is_designed_for_disassembly=False):
    """
    Calculate Material Circularity Indicator (MCI) using Ellen MacArthur Foundation formula
    
    MCI = 1 - LFI × F(X)
    
    Where:
    - LFI = Linear Flow Index = (V + W) / (2M)
    - V = Virgin material input = M × (1 - Fr)
    - W = Unrecoverable waste = M × (1 - Cr) × (1 - Ef)
    - Fr = Fraction from recycled sources (recycled_content_input)
    - Cr = Fraction going to recycling (recycled_content_output)
    - Ef = Efficiency of recycling process (assume 0.9)
    - F(X) = Utility factor based on lifespan
    """
    
    # Material mass (normalized to 1)
    M = 1.0
    
    # Recycling efficiency
    Ef = 0.9
    
    # Convert percentages to fractions
    Fr = recycled_content_input / 100.0  # Fraction from recycled sources
    Cr = recycled_content_output / 100.0  # Fraction going to recycling
    
    # Boost recycling output if designed for disassembly
    if is_designed_for_disassembly:
        Cr = min(1.0, Cr * 1.2)  # 20% improvement in recyclability
    
    # Virgin material input
    V = M * (1 - Fr)
    
    # Unrecoverable waste
    W = M * (1 - Cr) * (1 - Ef)
    
    # Linear Flow Index
    LFI = (V + W) / (2 * M)
    
    # Utility factor F(X) based on lifespan comparison
    # F(X) = 0.9 / X, where X = L/Lav (actual lifespan / average lifespan)
    if industry_avg_lifespan > 0 and target_lifespan > 0:
        X = target_lifespan / industry_avg_lifespan
        F_X = 0.9 / X if X > 0 else 0.9
    else:
        F_X = 0.9
    
    # Cap F(X) at reasonable bounds
    F_X = max(0.1, min(1.0, F_X))
    
    # Calculate MCI
    MCI = 1 - (LFI * F_X)
    
    # Ensure MCI is between 0 and 1
    MCI = max(0, min(1, MCI))
    
    return round(MCI, 3)


def calculate_circular_design_score(mci_score, target_lifespan, industry_avg_lifespan,
                                    is_designed_for_disassembly, avg_recycled_content):
    """
    Calculate Circular Design Score (0-100)
    Combines: MCI (40%) + Durability (30%) + Design for Recycling (30%)
    """
    
    # MCI contribution (0-40 points)
    mci_points = mci_score * 40
    
    # Durability contribution (0-30 points)
    # Based on lifespan vs industry average
    if industry_avg_lifespan > 0:
        lifespan_ratio = target_lifespan / industry_avg_lifespan
        durability_points = min(30, lifespan_ratio * 20)  # Cap at 30
    else:
        durability_points = 15
    
    # Design for Recycling contribution (0-30 points)
    # Based on recyclability + disassembly + recycled content
    recycling_points = 0
    
    if is_designed_for_disassembly:
        recycling_points += 15
    
    # Recycled content contribution (0-15 points)
    recycling_points += (avg_recycled_content / 100) * 15
    
    # Total score
    total_score = mci_points + durability_points + recycling_points
    
    return round(min(100, max(0, total_score)), 1)


# =====================================================
# NLP PARSING ENGINE - Natural Language to BOM
# =====================================================

# Material patterns for NLP matching
NLP_MATERIAL_PATTERNS = {
    'aluminium': {
        'keywords': ['aluminium', 'aluminum'],
        'forms': ['sheet', 'wire', 'rod', 'bar', 'plate', 'tube', 'foil', 'ingot', 'casting', 'alloy'],
        'default_type': 'aluminium_primary',
        'recycled_type': 'aluminium_secondary',
        'national_baseline_recycled': 25,  # India avg recycled content %
        'gwp_factor': 12.5
    },
    'copper': {
        'keywords': ['copper', 'brass', 'bronze'],
        'forms': ['wire', 'cable', 'sheet', 'rod', 'tube', 'pipe', 'coil'],
        'default_type': 'copper_primary',
        'recycled_type': 'copper_secondary',
        'national_baseline_recycled': 35,  # India avg recycled content %
        'gwp_factor': 3.5
    },
    'steel': {
        'keywords': ['steel', 'stainless steel', 'carbon steel', 'mild steel'],
        'forms': ['sheet', 'rod', 'bar', 'beam', 'wire', 'plate', 'tube', 'coil', 'shank'],
        'default_type': 'steel_primary',
        'recycled_type': 'steel_secondary',
        'national_baseline_recycled': 40,  # India avg recycled content %
        'gwp_factor': 2.1
    },
    'iron': {
        'keywords': ['iron', 'cast iron', 'pig iron', 'wrought iron'],
        'forms': ['casting', 'ingot', 'bar', 'plate'],
        'default_type': 'steel_primary',
        'recycled_type': 'steel_secondary',
        'national_baseline_recycled': 40,
        'gwp_factor': 1.9
    },
    'lithium': {
        'keywords': ['lithium', 'lithium-ion', 'li-ion', 'lifepo4', 'lithium carbonate', 'lithium hydroxide'],
        'forms': ['carbonate', 'hydroxide', 'oxide', 'battery', 'cell'],
        'default_type': 'lithium',
        'recycled_type': 'lithium',
        'national_baseline_recycled': 5,
        'gwp_factor': 15.0
    },
    'cobalt': {
        'keywords': ['cobalt', 'cobalt sulfate', 'cobalt oxide'],
        'forms': ['sulfate', 'oxide', 'powder', 'metal'],
        'default_type': 'cobalt',
        'recycled_type': 'cobalt',
        'national_baseline_recycled': 10,
        'gwp_factor': 10.0
    },
    'nickel': {
        'keywords': ['nickel', 'nickel sulfate', 'ferronickel'],
        'forms': ['class1', 'ferronickel', 'sulfate', 'plating'],
        'default_type': 'nickel',
        'recycled_type': 'nickel',
        'national_baseline_recycled': 15,
        'gwp_factor': 8.5
    },
    # Critical Minerals - Expanded
    'manganese': {
        'keywords': ['manganese', 'mn'],
        'forms': ['dioxide', 'oxide', 'sulfate', 'electrolytic'],
        'default_type': 'manganese',
        'recycled_type': 'manganese',
        'national_baseline_recycled': 20,
        'gwp_factor': 2.8,
        'scarcity_score': 40
    },
    'graphite': {
        'keywords': ['graphite', 'carbon', 'anode'],
        'forms': ['natural', 'synthetic', 'spherical', 'flake'],
        'default_type': 'graphite',
        'recycled_type': 'graphite',
        'national_baseline_recycled': 5,
        'gwp_factor': 4.2,
        'scarcity_score': 70
    },
    # Rare Earths
    'neodymium': {
        'keywords': ['neodymium', 'nd', 'ndfeb', 'neo'],
        'forms': ['magnet', 'oxide', 'metal', 'alloy'],
        'default_type': 'neodymium',
        'recycled_type': 'neodymium',
        'national_baseline_recycled': 2,
        'gwp_factor': 35.0,
        'scarcity_score': 95
    },
    'dysprosium': {
        'keywords': ['dysprosium', 'dy'],
        'forms': ['oxide', 'metal', 'magnet'],
        'default_type': 'dysprosium',
        'recycled_type': 'dysprosium',
        'national_baseline_recycled': 1,
        'gwp_factor': 45.0,
        'scarcity_score': 98
    },
    'praseodymium': {
        'keywords': ['praseodymium', 'pr'],
        'forms': ['oxide', 'metal'],
        'default_type': 'praseodymium',
        'recycled_type': 'praseodymium',
        'national_baseline_recycled': 1,
        'gwp_factor': 32.0,
        'scarcity_score': 90
    },
    'rare_earth': {
        'keywords': ['rare earth', 'ree', 'rare-earth', 'lanthanide'],
        'forms': ['oxide', 'metal', 'mixed', 'concentrate'],
        'default_type': 'rare_earth_mixed',
        'recycled_type': 'rare_earth_mixed',
        'national_baseline_recycled': 2,
        'gwp_factor': 38.0,
        'scarcity_score': 93
    },
    # Other Critical Minerals
    'tungsten': {
        'keywords': ['tungsten', 'tungsten carbide', 'wolfram', 'carbide alloy'],
        'forms': ['carbide', 'powder', 'wire', 'electrode', 'alloy', 'bit', 'tool'],
        'default_type': 'tungsten',
        'recycled_type': 'tungsten',
        'national_baseline_recycled': 30,
        'gwp_factor': 22.0,
        'scarcity_score': 78
    },
    'vanadium': {
        'keywords': ['vanadium', 'vanadium oxide', 'vanadium pentoxide'],
        'forms': ['oxide', 'pentoxide', 'alloy', 'redox'],
        'default_type': 'vanadium',
        'recycled_type': 'vanadium',
        'national_baseline_recycled': 15,
        'gwp_factor': 28.0,
        'scarcity_score': 72
    },
    'titanium': {
        'keywords': ['titanium', 'titanium nitride', 'titanium dioxide', 'titanium oxide'],
        'forms': ['sponge', 'ingot', 'sheet', 'powder', 'dioxide', 'nitride', 'coating', 'oxide'],
        'default_type': 'titanium',
        'recycled_type': 'titanium',
        'national_baseline_recycled': 25,
        'gwp_factor': 8.1,
        'scarcity_score': 45
    },
    'tantalum': {
        'keywords': ['tantalum'],
        'forms': ['powder', 'capacitor', 'wire'],
        'default_type': 'tantalum',
        'recycled_type': 'tantalum',
        'national_baseline_recycled': 20,
        'gwp_factor': 48.0,
        'scarcity_score': 88
    },
    'indium': {
        'keywords': ['indium', 'indium tin oxide', 'ito'],
        'forms': ['oxide', 'tin oxide', 'metal'],
        'default_type': 'indium',
        'recycled_type': 'indium',
        'national_baseline_recycled': 35,
        'gwp_factor': 142.0,
        'scarcity_score': 82
    },
    'gallium': {
        'keywords': ['gallium', 'gallium arsenide', 'gaas', 'gallium nitride'],
        'forms': ['arsenide', 'nitride', 'metal'],
        'default_type': 'gallium',
        'recycled_type': 'gallium',
        'national_baseline_recycled': 25,
        'gwp_factor': 185.0,
        'scarcity_score': 80
    },
    'platinum': {
        'keywords': ['platinum', 'pt', 'pgm'],
        'forms': ['catalyst', 'wire', 'sheet', 'powder'],
        'default_type': 'platinum',
        'recycled_type': 'platinum',
        'national_baseline_recycled': 40,
        'gwp_factor': 12500.0,
        'scarcity_score': 88
    },
    'palladium': {
        'keywords': ['palladium', 'pd'],
        'forms': ['catalyst', 'alloy', 'powder'],
        'default_type': 'palladium',
        'recycled_type': 'palladium',
        'national_baseline_recycled': 45,
        'gwp_factor': 9800.0,
        'scarcity_score': 86
    },
    # Refractory and Ceramic Materials
    'magnesia': {
        'keywords': ['magnesia', 'magnesium oxide', 'mgo', 'magnesia-chrome', 'mag-chrome'],
        'forms': ['brick', 'refractory', 'lining', 'block', 'castable'],
        'default_type': 'magnesia_refractory',
        'recycled_type': 'magnesia_refractory',
        'national_baseline_recycled': 10,
        'gwp_factor': 1.8,
        'scarcity_score': 25
    },
    'zirconia': {
        'keywords': ['zirconia', 'zirconium oxide', 'zro2', 'yttria-stabilized zirconia', 'ysz'],
        'forms': ['coating', 'layer', 'ceramic', 'brick', 'powder', 'thermal barrier'],
        'default_type': 'zirconia_ceramic',
        'recycled_type': 'zirconia_ceramic',
        'national_baseline_recycled': 5,
        'gwp_factor': 8.5,
        'scarcity_score': 55
    },
    'chrome': {
        'keywords': ['chrome', 'chromium', 'chromite', 'chrome-magnesia', 'ferrochrome'],
        'forms': ['refractory', 'brick', 'ore', 'plating', 'alloy'],
        'default_type': 'chrome_refractory',
        'recycled_type': 'chrome_refractory',
        'national_baseline_recycled': 20,
        'gwp_factor': 5.2,
        'scarcity_score': 50
    },
    'refractory': {
        'keywords': ['refractory', 'firebite', 'high alumina', 'silica brick', 'fire brick'],
        'forms': ['brick', 'lining', 'castable', 'mortar', 'cement'],
        'default_type': 'refractory_generic',
        'recycled_type': 'refractory_generic',
        'national_baseline_recycled': 15,
        'gwp_factor': 1.5,
        'scarcity_score': 20
    },
    'silicon_carbide': {
        'keywords': ['silicon carbide', 'sic', 'carborundum'],
        'forms': ['brick', 'crucible', 'abrasive', 'heating element'],
        'default_type': 'silicon_carbide',
        'recycled_type': 'silicon_carbide',
        'national_baseline_recycled': 10,
        'gwp_factor': 12.0,
        'scarcity_score': 40
    },
    'alumina': {
        'keywords': ['alumina', 'aluminum oxide', 'al2o3', 'corundum'],
        'forms': ['ceramic', 'brick', 'powder', 'coating', 'abrasive'],
        'default_type': 'alumina_ceramic',
        'recycled_type': 'alumina_ceramic',
        'national_baseline_recycled': 10,
        'gwp_factor': 3.2,
        'scarcity_score': 30
    }
}

# Product category detection
PRODUCT_CATEGORIES = {
    'mining': ['mining', 'drill', 'drilling', 'excavation', 'extraction', 'ore', 'quarry', 'underground'],
    'metallurgy': ['metallurgy', 'smelting', 'foundry', 'casting', 'forging', 'metal processing', 'furnace', 'crucible', 'ladle', 'converter'],
    'ev_battery': ['battery', 'cell', 'ev', 'electric vehicle', 'lithium-ion', 'bms', 'cathode', 'anode'],
    'power_transmission': ['transformer', 'cable', 'wire', 'conductor', 'transmission', 'power line'],
    'construction': ['building', 'structure', 'beam', 'rebar', 'construction', 'roof'],
    'automotive': ['car', 'vehicle', 'automobile', 'automotive'],
    'electronics': ['pcb', 'circuit', 'electronic', 'component', 'chip', 'semiconductor'],
    'packaging': ['can', 'container', 'foil', 'packaging', 'wrap'],
    'appliances': ['appliance', 'refrigerator', 'ac', 'washing', 'machine'],
    'renewable_energy': ['solar', 'wind', 'turbine', 'panel', 'inverter', 'generator'],
    'magnets': ['magnet', 'permanent magnet', 'ndfeb', 'motor magnet'],
    'industrial_tools': ['tool', 'drill bit', 'cutting', 'milling', 'lathe', 'cnc'],
    'refractory': ['refractory', 'kiln', 'incinerator', 'boiler', 'heat exchanger']
}


def parse_nlp_input(description):
    """
    Parse natural language description into structured project/material data
    
    Input: "10kg copper wire, PVC coated, used in a motor for 10 years"
    Output: {
        materials: [{name, type, quantity, unit, recycled_content, ...}],
        project: {product_category, target_lifespan, ...},
        assumptions: [{field, value, reason}]
    }
    """
    import re
    
    description_lower = description.lower()
    result = {
        'materials': [],
        'project': {
            'product_category': '',
            'target_lifespan': None,
            'is_designed_for_disassembly': False
        },
        'assumptions': [],
        'tokens': []
    }
    
    # === TOKENIZATION ===
    
    # Extract quantity patterns with units (e.g., "10kg", "5 kg", "100 grams", "800kg")
    # Store as tuples of (value, unit) to convert properly
    quantity_with_unit_patterns = [
        (r'(\d+(?:\.\d+)?)\s*(?:kg|kilogram|kilograms)\b', 'kg'),
        (r'(\d+(?:\.\d+)?)\s*(?:g|gram|grams)\b', 'g'),
        (r'(\d+(?:\.\d+)?)\s*(?:t|ton|tons|tonne|tonnes)\b', 't'),
        (r'(\d+(?:\.\d+)?)\s*(?:lb|pound|pounds)\b', 'lb'),
        (r'(\d+(?:\.\d+)?)\s*(?:mm|millimeter|millimeters)\b', 'mm'),  # For thickness
    ]
    
    quantities = []
    thickness_values = []
    
    for pattern, unit in quantity_with_unit_patterns:
        matches = re.findall(pattern, description_lower)
        for match in matches:
            value = float(match)
            # Convert to kg (keep kg as-is, don't divide by 1000!)
            if unit == 'kg':
                quantities.append(value)  # Already in kg
            elif unit == 'g':
                quantities.append(value / 1000)  # grams to kg
            elif unit == 't':
                quantities.append(value * 1000)  # tons to kg
            elif unit == 'lb':
                quantities.append(value * 0.453592)  # pounds to kg
            elif unit == 'mm':
                thickness_values.append(value)  # Store thickness separately
    
    # If no quantity found, default to 1kg
    if not quantities:
        quantities = [1.0]
        result['assumptions'].append({
            'field': 'quantity',
            'value': '1 kg',
            'reason': 'No quantity specified, using default'
        })
    
    result['tokens'].append({'type': 'quantity', 'values': quantities})
    if thickness_values:
        result['tokens'].append({'type': 'thickness', 'values': thickness_values})
    
    # Extract lifespan (e.g., "10 years", "5y", "15 year")
    lifespan_patterns = [
        r'(\d+)\s*(?:years?|y|yr|yrs)',
        r'for\s+(\d+)\s*(?:years?|y)',
        r'lifespan[:\s]+(\d+)',
        r'lifetime[:\s]+(\d+)',
    ]
    
    for pattern in lifespan_patterns:
        match = re.search(pattern, description_lower)
        if match:
            result['project']['target_lifespan'] = int(match.group(1))
            result['tokens'].append({'type': 'lifespan', 'value': int(match.group(1))})
            break
    
    # Extract recycled content (e.g., "30% recycled", "recycled content 25%")
    recycled_patterns = [
        r'(\d+)\s*%\s*recycled',
        r'recycled[:\s]+(\d+)\s*%',
        r'recycled content[:\s]+(\d+)',
    ]
    
    recycled_content = None
    for pattern in recycled_patterns:
        match = re.search(pattern, description_lower)
        if match:
            recycled_content = int(match.group(1))
            result['tokens'].append({'type': 'recycled_content', 'value': recycled_content})
            break
    
    # Check for "recycled" keyword without percentage
    if recycled_content is None and 'recycled' in description_lower:
        recycled_content = 100  # Assume fully recycled
        result['tokens'].append({'type': 'recycled_content', 'value': 100})
    
    # === MATERIAL MAPPING ===
    
    detected_materials = []
    detected_material_keys = set()  # Track already detected materials to avoid duplicates
    
    # Sort materials by keyword length (longest first) to match specific terms first
    sorted_materials = sorted(
        NLP_MATERIAL_PATTERNS.items(),
        key=lambda x: max(len(k) for k in x[1]['keywords']),
        reverse=True
    )
    
    for material_key, material_data in sorted_materials:
        if material_key in detected_material_keys:
            continue
            
        for keyword in sorted(material_data['keywords'], key=len, reverse=True):
            # Use word boundary matching to avoid false positives
            # e.g., 'co' should not match 'coated', 'coating', etc.
            pattern = r'\b' + re.escape(keyword) + r'\b'
            match_obj = re.search(pattern, description_lower)
            if match_obj:
                # === CONTEXT-AWARE FILTERING ===
                # Check if the material appears in a context that indicates it's NOT a component
                # e.g., "copper smelting" means the furnace processes copper, not made OF copper
                
                match_pos = match_obj.start()
                context_window = description_lower[max(0, match_pos-30):min(len(description_lower), match_pos+len(keyword)+30)]
                
                # Skip if material appears in process context (not as a component)
                process_indicators = [
                    f'{keyword} smelting', f'{keyword} processing', f'{keyword} refining',
                    f'{keyword} production', f'{keyword} extraction', f'{keyword} mining',
                    f'{keyword} plants', f'{keyword} plant', f'{keyword} industry',
                    f'smelting {keyword}', f'processing {keyword}', f'refining {keyword}',
                    f'produces {keyword}', f'manufacture {keyword}', f'making {keyword}'
                ]
                
                is_process_context = False
                for indicator in process_indicators:
                    if indicator in description_lower:
                        is_process_context = True
                        break
                
                if is_process_context:
                    # Skip this material - it's what the equipment processes, not made of
                    continue
                
                # Check for forms
                detected_form = None
                for form in material_data['forms']:
                    form_pattern = r'\b' + re.escape(form) + r'\b'
                    if re.search(form_pattern, description_lower):
                        detected_form = form
                        break
                
                # Determine if recycled
                is_recycled = bool(re.search(r'\b(recycled|secondary|scrap)\b', description_lower))
                material_type = material_data['recycled_type'] if is_recycled else material_data['default_type']
                
                # Use detected recycled content or national baseline
                mat_recycled = recycled_content
                if mat_recycled is None:
                    mat_recycled = material_data['national_baseline_recycled']
                    result['assumptions'].append({
                        'field': 'recycled_content',
                        'value': f"{mat_recycled}%",
                        'reason': f"Using India National Baseline for {material_key.title()}"
                    })
                
                detected_materials.append({
                    'material_key': material_key,
                    'name': f"{material_key.title()} {'(' + detected_form.title() + ')' if detected_form else ''}".strip(),
                    'type': material_type,
                    'form': detected_form,
                    'gwp_factor': material_data['gwp_factor'] if not is_recycled else material_data['gwp_factor'] * 0.05,
                    'recycled_content': mat_recycled
                })
                
                result['tokens'].append({
                    'type': 'material',
                    'material': material_key,
                    'form': detected_form,
                    'is_recycled': is_recycled,
                    'matched_keyword': keyword
                })
                
                detected_material_keys.add(material_key)
                break
    
    # If no materials detected, try to infer from context
    if not detected_materials:
        result['assumptions'].append({
            'field': 'material',
            'value': 'Unknown',
            'reason': 'Could not identify material from description. Please specify material type.'
        })
    
    # Create material entries
    for i, mat in enumerate(detected_materials):
        quantity = quantities[i] if i < len(quantities) else quantities[0]
        result['materials'].append({
            'material_name': mat['name'],
            'material_type': mat['type'],
            'quantity': quantity,
            'unit': 'kg',
            'recycled_content': mat['recycled_content'],
            'gwp_factor': mat['gwp_factor'],
            'transport_distance': 100  # Default transport distance
        })
    
    # === PRODUCT CATEGORY DETECTION ===
    
    # Sort categories by keyword length (longest first) for better matching
    for category, keywords in sorted(PRODUCT_CATEGORIES.items(), key=lambda x: max(len(k) for k in x[1]), reverse=True):
        for keyword in sorted(keywords, key=len, reverse=True):
            # Use word boundary matching
            pattern = r'\b' + re.escape(keyword) + r'\b'
            if re.search(pattern, description_lower):
                result['project']['product_category'] = category
                result['tokens'].append({'type': 'category', 'value': category, 'matched_keyword': keyword})
                break
        if result['project']['product_category']:
            break
    
    # Apply default lifespan if not specified
    if result['project']['target_lifespan'] is None:
        category = result['project']['product_category'] or 'other'
        default_lifespan = INDUSTRY_BENCHMARKS.get(category, {}).get('avg_lifespan', 10)
        result['project']['target_lifespan'] = default_lifespan
        result['assumptions'].append({
            'field': 'target_lifespan',
            'value': f"{default_lifespan} years",
            'reason': f"Using industry average for {category.replace('_', ' ').title()}"
        })
    
    # Check for disassembly keywords
    disassembly_keywords = ['disassembly', 'disassemble', 'modular', 'repairable', 'serviceable']
    for keyword in disassembly_keywords:
        if keyword in description_lower:
            result['project']['is_designed_for_disassembly'] = True
            result['tokens'].append({'type': 'disassembly', 'value': True})
            break
    
    # Detect coatings/finishes
    coating_keywords = ['pvc', 'coated', 'anodized', 'galvanized', 'painted', 'plated', 'chrome', 
                       'titanium nitride', 'tin coating', 'nickel plating', 'zinc coating', 
                       'powder coated', 'epoxy', 'enamel']
    detected_coatings = []
    for keyword in coating_keywords:
        pattern = r'\b' + re.escape(keyword) + r'\b'
        if re.search(pattern, description_lower):
            detected_coatings.append(keyword)
            result['tokens'].append({'type': 'coating', 'value': keyword})
    
    # Add coating info to result
    if detected_coatings:
        result['coatings'] = detected_coatings
    
    # === GENERATE SUGGESTED PROJECT NAME ===
    
    # Product name templates based on category and detected keywords
    PRODUCT_NAME_TEMPLATES = {
        'ev_battery': ['Battery Pack', 'EV Battery Module', 'Lithium-Ion Battery Pack', 'Battery Cell Assembly'],
        'mining': ['Mining Equipment', 'Drill Bit Assembly', 'Mining Tool', 'Extraction Equipment'],
        'metallurgy': ['Industrial Furnace', 'Smelting Furnace', 'Foundry Equipment', 'Metal Processing Unit'],
        'power_transmission': ['Power Cable', 'Transformer Unit', 'Transmission Line', 'Electrical Conductor'],
        'construction': ['Construction Component', 'Structural Element', 'Building Material', 'Rebar Assembly'],
        'automotive': ['Automotive Part', 'Vehicle Component', 'Engine Part', 'Automotive Assembly'],
        'electronics': ['Electronic Component', 'Circuit Board', 'Semiconductor Device', 'Electronic Module'],
        'packaging': ['Packaging Material', 'Container', 'Packaging Solution'],
        'appliances': ['Home Appliance', 'Appliance Component', 'Household Equipment'],
        'renewable_energy': ['Solar Panel', 'Wind Turbine Component', 'Renewable Energy System', 'Generator Unit'],
        'magnets': ['Permanent Magnet', 'Magnet Assembly', 'Motor Magnet'],
        'industrial_tools': ['Industrial Tool', 'Cutting Tool', 'Manufacturing Equipment'],
        'refractory': ['Refractory Lining', 'Furnace Lining', 'Kiln Component', 'Heat-Resistant Equipment']
    }
    
    # Try to extract a specific product name from the description
    product_keywords = [
        (r'\b(battery pack|battery module|battery cell)\b', 'Battery Pack'),
        (r'\b(drill bit|drilling tool)\b', 'Drill Bit'),
        (r'\b(solar panel|pv panel|photovoltaic)\b', 'Solar Panel'),
        (r'\b(wind turbine|turbine generator)\b', 'Wind Turbine'),
        (r'\b(transformer)\b', 'Transformer'),
        (r'\b(motor|electric motor)\b', 'Electric Motor'),
        (r'\b(cable|wire|conductor)\b', 'Cable Assembly'),
        (r'\b(circuit board|pcb)\b', 'Circuit Board'),
        (r'\b(catalytic converter)\b', 'Catalytic Converter'),
        (r'\b(frame|mounting)\b', 'Frame Assembly'),
        (r'\b(rebar|reinforcement)\b', 'Rebar'),
        (r'\b(smartphone|phone|mobile)\b', 'Smartphone'),
        (r'\b(laptop|computer)\b', 'Laptop'),
        (r'\b(generator)\b', 'Generator'),
        (r'\b(furnace|smelting furnace|blast furnace|arc furnace)\b', 'Industrial Furnace'),
        (r'\b(kiln|rotary kiln)\b', 'Industrial Kiln'),
        (r'\b(boiler)\b', 'Industrial Boiler'),
        (r'\b(heat exchanger)\b', 'Heat Exchanger'),
    ]
    
    suggested_name = None
    for pattern, name in product_keywords:
        if re.search(pattern, description_lower):
            suggested_name = name
            break
    
    # Fallback to category-based name
    if not suggested_name:
        category = result['project']['product_category']
        if category and category in PRODUCT_NAME_TEMPLATES:
            suggested_name = PRODUCT_NAME_TEMPLATES[category][0]
        else:
            # Generate from primary material
            if detected_materials:
                primary_material = detected_materials[0]['material_key'].title()
                suggested_name = f"{primary_material} Product"
            else:
                suggested_name = "LCA Project"
    
    result['suggested_name'] = suggested_name
    
    return result


@app.route('/api/v1/parse-nlp', methods=['POST', 'OPTIONS'])
def parse_nlp():
    """Parse natural language description into structured BOM data"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"detail": "Not authenticated"}), 401
        
        token = auth_header.split(' ')[1]
        jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        
        data = request.get_json()
        description = data.get('description', '')
        
        if not description:
            return jsonify({"detail": "Description is required"}), 400
        
        result = parse_nlp_input(description)
        
        return jsonify({
            "success": True,
            "parsed": result,
            "original_input": description
        }), 200
        
    except Exception as e:
        print(f"NLP Parse Error: {e}")
        return jsonify({"detail": str(e)}), 500


# =====================================================
# CUSTOM DATASET UPLOAD & MANAGEMENT
# =====================================================

# In-memory storage for custom datasets (per user)
# In production, this would be stored in database
USER_CUSTOM_DATASETS = {}

@app.route('/api/v1/datasets/upload', methods=['POST', 'OPTIONS'])
def upload_dataset():
    """Upload custom material/product dataset"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"detail": "Not authenticated"}), 401
        
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user_id = payload['user_id']
        
        data = request.get_json()
        dataset_name = data.get('name', 'Custom Dataset')
        materials = data.get('materials', [])
        
        if not materials:
            return jsonify({"detail": "No materials provided"}), 400
        
        # Validate and process materials
        processed_materials = []
        for mat in materials:
            processed_mat = {
                'name': mat.get('name', 'Unknown'),
                'type': mat.get('type', 'custom'),
                'emission_factor': float(mat.get('emission_factor', 0)),
                'recycled_content': float(mat.get('recycled_content', 0)) if mat.get('recycled_content') else None,
                'region': mat.get('region', 'Global'),
                'source': 'custom_upload',
                'scarcity_score': float(mat.get('scarcity_score', 0)) if mat.get('scarcity_score') else None
            }
            processed_materials.append(processed_mat)
        
        # Store dataset for user
        dataset_id = str(uuid.uuid4())
        if user_id not in USER_CUSTOM_DATASETS:
            USER_CUSTOM_DATASETS[user_id] = {}
        
        USER_CUSTOM_DATASETS[user_id][dataset_id] = {
            'id': dataset_id,
            'name': dataset_name,
            'materials': processed_materials,
            'created_at': datetime.utcnow().isoformat()
        }
        
        return jsonify({
            "success": True,
            "dataset_id": dataset_id,
            "name": dataset_name,
            "materials_count": len(processed_materials),
            "message": f"Successfully uploaded {len(processed_materials)} materials"
        }), 201
        
    except Exception as e:
        print(f"Dataset Upload Error: {e}")
        return jsonify({"detail": str(e)}), 500


@app.route('/api/v1/datasets', methods=['GET', 'OPTIONS'])
def list_datasets():
    """List all custom datasets for the user"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"detail": "Not authenticated"}), 401
        
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user_id = payload['user_id']
        
        user_datasets = USER_CUSTOM_DATASETS.get(user_id, {})
        datasets = list(user_datasets.values())
        
        return jsonify(datasets), 200
        
    except Exception as e:
        print(f"List Datasets Error: {e}")
        return jsonify({"detail": str(e)}), 500


@app.route('/api/v1/datasets/<dataset_id>', methods=['GET', 'DELETE', 'OPTIONS'])
def manage_dataset(dataset_id):
    """Get or delete a specific dataset"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"detail": "Not authenticated"}), 401
        
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user_id = payload['user_id']
        
        user_datasets = USER_CUSTOM_DATASETS.get(user_id, {})
        
        if dataset_id not in user_datasets:
            return jsonify({"detail": "Dataset not found"}), 404
        
        if request.method == 'GET':
            return jsonify(user_datasets[dataset_id]), 200
        
        elif request.method == 'DELETE':
            del USER_CUSTOM_DATASETS[user_id][dataset_id]
            return jsonify({"message": "Dataset deleted successfully"}), 200
        
    except Exception as e:
        print(f"Manage Dataset Error: {e}")
        return jsonify({"detail": str(e)}), 500


@app.route('/api/v1/materials/combined-library', methods=['GET', 'OPTIONS'])
def combined_material_library():
    """Get combined material library (system + user custom datasets)"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"detail": "Not authenticated"}), 401
        
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user_id = payload['user_id']
        
        # System materials (default library) - Base Metals
        system_materials = [
            {"id": "al_primary", "name": "Primary Aluminium", "type": "aluminium_primary", "unit": "kg", "gwp_factor": 12.5, "source": "system", "region": "Global", "category": "base_metal"},
            {"id": "al_secondary", "name": "Secondary Aluminium (Recycled)", "type": "aluminium_secondary", "unit": "kg", "gwp_factor": 0.6, "source": "system", "region": "Global", "category": "base_metal"},
            {"id": "cu_primary", "name": "Primary Copper", "type": "copper_primary", "unit": "kg", "gwp_factor": 3.5, "source": "system", "region": "Global", "category": "base_metal"},
            {"id": "cu_secondary", "name": "Secondary Copper (Recycled)", "type": "copper_secondary", "unit": "kg", "gwp_factor": 0.5, "source": "system", "region": "Global", "category": "base_metal"},
            {"id": "steel_primary", "name": "Virgin Steel", "type": "steel_primary", "unit": "kg", "gwp_factor": 2.1, "source": "system", "region": "Global", "category": "base_metal"},
            {"id": "steel_secondary", "name": "Recycled Steel", "type": "steel_secondary", "unit": "kg", "gwp_factor": 0.4, "source": "system", "region": "Global", "category": "base_metal"},
        ]
        
        # Critical Minerals - Battery Metals
        battery_minerals = [
            {"id": "li_carbonate", "name": "Lithium Carbonate", "type": "lithium_carbonate", "unit": "kg", "gwp_factor": 15.0, "source": "ecoinvent", "region": "Global", "category": "critical_mineral", "scarcity_score": 85},
            {"id": "li_hydroxide", "name": "Lithium Hydroxide", "type": "lithium_hydroxide", "unit": "kg", "gwp_factor": 18.0, "source": "ecoinvent", "region": "Global", "category": "critical_mineral", "scarcity_score": 85},
            {"id": "cobalt_sulfate", "name": "Cobalt Sulfate", "type": "cobalt_sulfate", "unit": "kg", "gwp_factor": 10.0, "source": "ecoinvent", "region": "Global", "category": "critical_mineral", "scarcity_score": 92},
            {"id": "nickel_class1", "name": "Nickel Class 1", "type": "nickel_class1", "unit": "kg", "gwp_factor": 12.5, "source": "ecoinvent", "region": "Global", "category": "critical_mineral", "scarcity_score": 65},
            {"id": "nickel_ferro", "name": "Ferronickel", "type": "nickel_ferronickel", "unit": "kg", "gwp_factor": 8.5, "source": "ecoinvent", "region": "Global", "category": "critical_mineral", "scarcity_score": 55},
            {"id": "manganese", "name": "Manganese Dioxide", "type": "manganese", "unit": "kg", "gwp_factor": 2.8, "source": "ecoinvent", "region": "Global", "category": "critical_mineral", "scarcity_score": 40},
            {"id": "graphite_nat", "name": "Natural Graphite", "type": "graphite", "unit": "kg", "gwp_factor": 4.2, "source": "ecoinvent", "region": "Global", "category": "critical_mineral", "scarcity_score": 70},
            {"id": "graphite_syn", "name": "Synthetic Graphite", "type": "graphite", "unit": "kg", "gwp_factor": 6.5, "source": "ecoinvent", "region": "Global", "category": "critical_mineral", "scarcity_score": 70},
        ]
        
        # Critical Minerals - Rare Earths
        rare_earth_minerals = [
            {"id": "neodymium", "name": "Neodymium (NdFeB Magnets)", "type": "neodymium", "unit": "kg", "gwp_factor": 35.0, "source": "ecoinvent", "region": "Global", "category": "rare_earth", "scarcity_score": 95},
            {"id": "dysprosium", "name": "Dysprosium", "type": "dysprosium", "unit": "kg", "gwp_factor": 45.0, "source": "ecoinvent", "region": "Global", "category": "rare_earth", "scarcity_score": 98},
            {"id": "praseodymium", "name": "Praseodymium", "type": "praseodymium", "unit": "kg", "gwp_factor": 32.0, "source": "ecoinvent", "region": "Global", "category": "rare_earth", "scarcity_score": 90},
            {"id": "terbium", "name": "Terbium", "type": "terbium", "unit": "kg", "gwp_factor": 50.0, "source": "ecoinvent", "region": "Global", "category": "rare_earth", "scarcity_score": 96},
            {"id": "ree_mixed", "name": "Rare Earth Mixed Oxide", "type": "rare_earth_mixed", "unit": "kg", "gwp_factor": 38.0, "source": "ecoinvent", "region": "Global", "category": "rare_earth", "scarcity_score": 93},
        ]
        
        # Critical Minerals - Other Strategic
        other_critical = [
            {"id": "tungsten", "name": "Tungsten Carbide", "type": "tungsten", "unit": "kg", "gwp_factor": 22.0, "source": "ecoinvent", "region": "Global", "category": "critical_mineral", "scarcity_score": 78},
            {"id": "vanadium", "name": "Vanadium Pentoxide", "type": "vanadium", "unit": "kg", "gwp_factor": 28.0, "source": "ecoinvent", "region": "Global", "category": "critical_mineral", "scarcity_score": 72},
            {"id": "titanium", "name": "Titanium Sponge", "type": "titanium", "unit": "kg", "gwp_factor": 8.1, "source": "ecoinvent", "region": "Global", "category": "critical_mineral", "scarcity_score": 45},
            {"id": "tantalum", "name": "Tantalum Powder", "type": "tantalum", "unit": "kg", "gwp_factor": 48.0, "source": "ecoinvent", "region": "Global", "category": "critical_mineral", "scarcity_score": 88},
            {"id": "indium", "name": "Indium (ITO)", "type": "indium", "unit": "kg", "gwp_factor": 142.0, "source": "ecoinvent", "region": "Global", "category": "critical_mineral", "scarcity_score": 82},
            {"id": "gallium", "name": "Gallium Arsenide", "type": "gallium", "unit": "kg", "gwp_factor": 185.0, "source": "ecoinvent", "region": "Global", "category": "critical_mineral", "scarcity_score": 80},
            {"id": "germanium", "name": "Germanium", "type": "germanium", "unit": "kg", "gwp_factor": 165.0, "source": "ecoinvent", "region": "Global", "category": "critical_mineral", "scarcity_score": 84},
        ]
        
        # Precious Metals (PGMs)
        precious_metals = [
            {"id": "platinum", "name": "Platinum", "type": "platinum", "unit": "kg", "gwp_factor": 12500.0, "source": "ecoinvent", "region": "Global", "category": "precious_metal", "scarcity_score": 88},
            {"id": "palladium", "name": "Palladium", "type": "palladium", "unit": "kg", "gwp_factor": 9800.0, "source": "ecoinvent", "region": "Global", "category": "precious_metal", "scarcity_score": 86},
        ]
        
        # India-specific materials (JNARRDC baseline)
        india_materials = [
            {"id": "al_india_primary", "name": "Primary Aluminium (India)", "type": "aluminium_primary", "unit": "kg", "gwp_factor": 16.5, "source": "jnarrdc", "region": "India", "category": "base_metal"},
            {"id": "al_india_secondary", "name": "Secondary Aluminium (India)", "type": "aluminium_secondary", "unit": "kg", "gwp_factor": 0.8, "source": "jnarrdc", "region": "India", "category": "base_metal"},
            {"id": "cu_india_primary", "name": "Primary Copper (India)", "type": "copper_primary", "unit": "kg", "gwp_factor": 4.2, "source": "jnarrdc", "region": "India", "category": "base_metal"},
            {"id": "cu_india_secondary", "name": "Secondary Copper (India)", "type": "copper_secondary", "unit": "kg", "gwp_factor": 0.6, "source": "jnarrdc", "region": "India", "category": "base_metal"},
            {"id": "steel_india_primary", "name": "Virgin Steel (India)", "type": "steel_primary", "unit": "kg", "gwp_factor": 2.8, "source": "jnarrdc", "region": "India", "category": "base_metal"},
            {"id": "steel_india_secondary", "name": "Recycled Steel (India)", "type": "steel_secondary", "unit": "kg", "gwp_factor": 0.5, "source": "jnarrdc", "region": "India", "category": "base_metal"},
        ]
        
        # User custom materials
        user_datasets = USER_CUSTOM_DATASETS.get(user_id, {})
        custom_materials = []
        for dataset in user_datasets.values():
            for mat in dataset.get('materials', []):
                custom_materials.append({
                    **mat,
                    'id': f"custom_{uuid.uuid4().hex[:8]}",
                    'unit': 'kg',
                    'gwp_factor': mat.get('emission_factor', 0),
                    'dataset_name': dataset.get('name', 'Custom')
                })
        
        # Combine all materials
        all_materials = (system_materials + battery_minerals + rare_earth_minerals + 
                         other_critical + precious_metals + india_materials + custom_materials)
        
        return jsonify({
            "system": system_materials,
            "battery_minerals": battery_minerals,
            "rare_earth": rare_earth_minerals,
            "critical_minerals": other_critical,
            "precious_metals": precious_metals,
            "india": india_materials,
            "custom": custom_materials,
            "all": all_materials
        }), 200
        
    except Exception as e:
        print(f"Combined Library Error: {e}")
        return jsonify({"detail": str(e)}), 500


@app.route('/api/v1/materials/library', methods=['GET', 'OPTIONS'])
def material_library():
    if request.method == 'OPTIONS':
        return '', 200
    
    materials = [
        # Base Metals
        {"id": "al_primary", "name": "Primary Aluminium", "type": "aluminium_primary", "unit": "kg", "gwp_factor": 12.5, "category": "base_metal"},
        {"id": "al_secondary", "name": "Secondary Aluminium (Recycled)", "type": "aluminium_secondary", "unit": "kg", "gwp_factor": 0.6, "category": "base_metal"},
        {"id": "cu_primary", "name": "Primary Copper", "type": "copper_primary", "unit": "kg", "gwp_factor": 3.5, "category": "base_metal"},
        {"id": "cu_secondary", "name": "Secondary Copper (Recycled)", "type": "copper_secondary", "unit": "kg", "gwp_factor": 0.5, "category": "base_metal"},
        {"id": "steel_primary", "name": "Virgin Steel", "type": "steel_primary", "unit": "kg", "gwp_factor": 2.1, "category": "base_metal"},
        {"id": "steel_secondary", "name": "Recycled Steel", "type": "steel_secondary", "unit": "kg", "gwp_factor": 0.4, "category": "base_metal"},
        # Battery Minerals
        {"id": "li_carbonate", "name": "Lithium Carbonate", "type": "lithium_carbonate", "unit": "kg", "gwp_factor": 15.0, "category": "critical_mineral", "scarcity_score": 85},
        {"id": "li_hydroxide", "name": "Lithium Hydroxide", "type": "lithium_hydroxide", "unit": "kg", "gwp_factor": 18.0, "category": "critical_mineral", "scarcity_score": 85},
        {"id": "cobalt_sulfate", "name": "Cobalt Sulfate", "type": "cobalt_sulfate", "unit": "kg", "gwp_factor": 10.0, "category": "critical_mineral", "scarcity_score": 92},
        {"id": "nickel_class1", "name": "Nickel Class 1", "type": "nickel_class1", "unit": "kg", "gwp_factor": 12.5, "category": "critical_mineral", "scarcity_score": 65},
        {"id": "manganese", "name": "Manganese Dioxide", "type": "manganese", "unit": "kg", "gwp_factor": 2.8, "category": "critical_mineral", "scarcity_score": 40},
        {"id": "graphite", "name": "Natural Graphite", "type": "graphite", "unit": "kg", "gwp_factor": 4.2, "category": "critical_mineral", "scarcity_score": 70},
        # Rare Earths
        {"id": "neodymium", "name": "Neodymium", "type": "neodymium", "unit": "kg", "gwp_factor": 35.0, "category": "rare_earth", "scarcity_score": 95},
        {"id": "dysprosium", "name": "Dysprosium", "type": "dysprosium", "unit": "kg", "gwp_factor": 45.0, "category": "rare_earth", "scarcity_score": 98},
        {"id": "praseodymium", "name": "Praseodymium", "type": "praseodymium", "unit": "kg", "gwp_factor": 32.0, "category": "rare_earth", "scarcity_score": 90},
        # Other Critical
        {"id": "tungsten", "name": "Tungsten", "type": "tungsten", "unit": "kg", "gwp_factor": 22.0, "category": "critical_mineral", "scarcity_score": 78},
        {"id": "vanadium", "name": "Vanadium", "type": "vanadium", "unit": "kg", "gwp_factor": 28.0, "category": "critical_mineral", "scarcity_score": 72},
        {"id": "titanium", "name": "Titanium", "type": "titanium", "unit": "kg", "gwp_factor": 8.1, "category": "critical_mineral", "scarcity_score": 45},
        {"id": "tantalum", "name": "Tantalum", "type": "tantalum", "unit": "kg", "gwp_factor": 48.0, "category": "critical_mineral", "scarcity_score": 88},
    ]
    
    return jsonify(materials), 200


@app.route('/api/v1/industry-benchmarks', methods=['GET', 'OPTIONS'])
def get_industry_benchmarks():
    """Get industry average benchmarks for comparison"""
    if request.method == 'OPTIONS':
        return '', 200
    
    benchmarks = []
    for category, data in INDUSTRY_BENCHMARKS.items():
        benchmarks.append({
            "category": category,
            "name": data['name'],
            "avg_lifespan": data['avg_lifespan'],
            "avg_mci": data['avg_mci']
        })
    
    return jsonify(benchmarks), 200


@app.route('/api/v1/projects/<project_id>/calculate-mci', methods=['POST', 'OPTIONS'])
def calculate_project_mci(project_id):
    """Calculate MCI and Circular Design Score for a project"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"detail": "Not authenticated"}), 401
        
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        # Get project
        c.execute("""SELECT id, name, description, status, product_category, 
                     target_lifespan, is_designed_for_disassembly, user_id, 
                     COALESCE(gwp_total, 0) as gwp_total, created_at 
                     FROM projects WHERE id = ? AND user_id = ?""", (project_id, payload['user_id']))
        project = c.fetchone()
        
        if not project:
            conn.close()
            return jsonify({"detail": "Project not found"}), 404
        
        # Get project materials
        c.execute("""SELECT id, material_name, material_type, quantity, unit, 
                     recycled_content, gwp, transport_distance 
                     FROM project_materials WHERE project_id = ?""", (project_id,))
        materials = c.fetchall()
        
        if not materials:
            conn.close()
            return jsonify({"detail": "No materials in project. Add materials first."}), 400
        
        # Calculate averages
        total_mass = sum(m[3] for m in materials)
        avg_recycled_content = sum(m[5] * m[3] for m in materials) / total_mass if total_mass > 0 else 0
        
        # Get project settings
        product_category = project[4] or 'other'
        target_lifespan = project[5] or 10
        is_designed_for_disassembly = bool(project[6])
        
        # Get industry benchmark
        benchmark = INDUSTRY_BENCHMARKS.get(product_category, INDUSTRY_BENCHMARKS['other'])
        industry_avg_lifespan = benchmark['avg_lifespan']
        
        # Assume recycled content output = recycled content input * 0.85 (some loss)
        recycled_content_output = avg_recycled_content * 0.85
        if is_designed_for_disassembly:
            recycled_content_output = min(100, recycled_content_output * 1.15)
        
        # Calculate MCI
        mci_score = calculate_mci(
            recycled_content_input=avg_recycled_content,
            recycled_content_output=recycled_content_output,
            target_lifespan=target_lifespan,
            industry_avg_lifespan=industry_avg_lifespan,
            is_designed_for_disassembly=is_designed_for_disassembly
        )
        
        # Calculate Circular Design Score
        circular_design_score = calculate_circular_design_score(
            mci_score=mci_score,
            target_lifespan=target_lifespan,
            industry_avg_lifespan=industry_avg_lifespan,
            is_designed_for_disassembly=is_designed_for_disassembly,
            avg_recycled_content=avg_recycled_content
        )
        
        # Update project with calculated scores
        c.execute("""UPDATE projects SET mci_score = ?, circular_design_score = ?, 
                     status = 'calculated' WHERE id = ?""", 
                  (mci_score, circular_design_score, project_id))
        conn.commit()
        conn.close()
        
        return jsonify({
            "project_id": project_id,
            "mci_score": mci_score,
            "circular_design_score": circular_design_score,
            "avg_recycled_content": round(avg_recycled_content, 1),
            "recycled_content_output": round(recycled_content_output, 1),
            "target_lifespan": target_lifespan,
            "industry_avg_lifespan": industry_avg_lifespan,
            "product_category": product_category,
            "is_designed_for_disassembly": is_designed_for_disassembly,
            "total_materials": len(materials),
            "total_mass": round(total_mass, 2),
            "benchmark": {
                "name": benchmark['name'],
                "avg_mci": benchmark['avg_mci']
            }
        }), 200
    except Exception as e:
        print(f"Error calculating MCI: {e}")
        return jsonify({"detail": str(e)}), 500


@app.route('/api/v1/projects/<project_id>/scenario', methods=['POST', 'OPTIONS'])
def calculate_scenario(project_id):
    """Calculate 'What-if' scenario with modified parameters"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"detail": "Not authenticated"}), 401
        
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        
        data = request.get_json()
        
        # Scenario parameters (with defaults from original)
        recycled_content_modifier = data.get('recycled_content_modifier', 0)  # % change
        lifespan_modifier = data.get('lifespan_modifier', 0)  # years change
        transport_reduction = data.get('transport_reduction', 0)  # % reduction
        design_for_disassembly = data.get('design_for_disassembly', None)  # Override
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        # Get project
        c.execute("""SELECT id, name, product_category, target_lifespan, 
                     is_designed_for_disassembly, COALESCE(gwp_total, 0) as gwp_total
                     FROM projects WHERE id = ? AND user_id = ?""", (project_id, payload['user_id']))
        project = c.fetchone()
        
        if not project:
            conn.close()
            return jsonify({"detail": "Project not found"}), 404
        
        # Get materials
        c.execute("""SELECT material_type, quantity, recycled_content, transport_distance, gwp 
                     FROM project_materials WHERE project_id = ?""", (project_id,))
        materials = c.fetchall()
        conn.close()
        
        if not materials:
            return jsonify({"detail": "No materials in project"}), 400
        
        # Original values
        original_gwp = project[5]
        original_lifespan = project[3] or 10
        original_disassembly = bool(project[4])
        
        # Scenario values
        scenario_lifespan = original_lifespan + lifespan_modifier
        scenario_disassembly = design_for_disassembly if design_for_disassembly is not None else original_disassembly
        
        # Recalculate GWP with scenario
        scenario_gwp = 0
        total_mass = 0
        avg_recycled_scenario = 0
        
        for mat in materials:
            mat_type, quantity, recycled_content, transport, original_mat_gwp = mat
            
            # Apply modifiers
            new_recycled = min(100, max(0, recycled_content + recycled_content_modifier))
            new_transport = transport * (1 - transport_reduction / 100)
            
            # Recalculate GWP
            mat_gwp = calculate_gwp(mat_type, quantity, new_recycled, new_transport)
            scenario_gwp += mat_gwp
            total_mass += quantity
            avg_recycled_scenario += new_recycled * quantity
        
        avg_recycled_scenario = avg_recycled_scenario / total_mass if total_mass > 0 else 0
        
        # Get benchmark
        product_category = project[2] or 'other'
        benchmark = INDUSTRY_BENCHMARKS.get(product_category, INDUSTRY_BENCHMARKS['other'])
        
        # Calculate scenario MCI
        recycled_output_scenario = avg_recycled_scenario * 0.85
        if scenario_disassembly:
            recycled_output_scenario = min(100, recycled_output_scenario * 1.15)
        
        scenario_mci = calculate_mci(
            recycled_content_input=avg_recycled_scenario,
            recycled_content_output=recycled_output_scenario,
            target_lifespan=scenario_lifespan,
            industry_avg_lifespan=benchmark['avg_lifespan'],
            is_designed_for_disassembly=scenario_disassembly
        )
        
        scenario_circular_score = calculate_circular_design_score(
            mci_score=scenario_mci,
            target_lifespan=scenario_lifespan,
            industry_avg_lifespan=benchmark['avg_lifespan'],
            is_designed_for_disassembly=scenario_disassembly,
            avg_recycled_content=avg_recycled_scenario
        )
        
        # Calculate improvements
        gwp_improvement = ((original_gwp - scenario_gwp) / original_gwp * 100) if original_gwp > 0 else 0
        
        return jsonify({
            "original": {
                "gwp_total": original_gwp,
                "lifespan": original_lifespan,
                "is_designed_for_disassembly": original_disassembly
            },
            "scenario": {
                "gwp_total": round(scenario_gwp, 2),
                "lifespan": scenario_lifespan,
                "is_designed_for_disassembly": scenario_disassembly,
                "avg_recycled_content": round(avg_recycled_scenario, 1),
                "mci_score": scenario_mci,
                "circular_design_score": scenario_circular_score
            },
            "improvements": {
                "gwp_reduction_percent": round(gwp_improvement, 1),
                "gwp_reduction_kg": round(original_gwp - scenario_gwp, 2)
            },
            "modifiers_applied": {
                "recycled_content_modifier": recycled_content_modifier,
                "lifespan_modifier": lifespan_modifier,
                "transport_reduction": transport_reduction,
                "design_for_disassembly": design_for_disassembly
            }
        }), 200
    except Exception as e:
        print(f"Error calculating scenario: {e}")
        return jsonify({"detail": str(e)}), 500


# =====================================================
# ENGINE 4: DESIGN OPTIMIZATION & AI ADVISOR
# =====================================================

# Alloy specifications and max recycled content limits
ALLOY_SPECIFICATIONS = {
    'aluminium_primary': {
        'name': 'Primary Aluminium',
        'alloys': {
            'Al-1100': {'max_recycled': 0, 'impurity_limit': 0.05},
            'Al-6061': {'max_recycled': 85, 'impurity_limit': 1.0},
            'Al-6063': {'max_recycled': 80, 'impurity_limit': 0.7},
            'Al-7075': {'max_recycled': 40, 'impurity_limit': 0.5},
        },
        'general_max_recycled': 60,
        'alternative': 'aluminium_secondary',
        'gwp_reduction_with_recycled': 95
    },
    'aluminium_secondary': {
        'name': 'Secondary Aluminium',
        'general_max_recycled': 100,
        'already_recycled': True
    },
    'copper_primary': {
        'name': 'Primary Copper',
        'alloys': {
            'C11000': {'max_recycled': 30, 'impurity_limit': 0.01},  # ETP copper, very pure
            'C26000': {'max_recycled': 70, 'impurity_limit': 0.5},   # Brass
            'C28000': {'max_recycled': 75, 'impurity_limit': 0.6},
            'Berry': {'max_recycled': 90, 'impurity_limit': 1.0},    # Scrap grade
        },
        'general_max_recycled': 50,
        'alternative': 'copper_secondary',
        'gwp_reduction_with_recycled': 85
    },
    'copper_secondary': {
        'name': 'Secondary Copper',
        'general_max_recycled': 100,
        'already_recycled': True
    },
    'steel_primary': {
        'name': 'Virgin Steel',
        'alloys': {
            'Mild Steel': {'max_recycled': 95, 'impurity_limit': 0.3},
            'Stainless 304': {'max_recycled': 80, 'impurity_limit': 0.2},
            'Stainless 316': {'max_recycled': 75, 'impurity_limit': 0.15},
            'High Carbon': {'max_recycled': 60, 'impurity_limit': 0.1},
        },
        'general_max_recycled': 80,
        'alternative': 'steel_secondary',
        'gwp_reduction_with_recycled': 80
    },
    'steel_secondary': {
        'name': 'Recycled Steel',
        'general_max_recycled': 100,
        'already_recycled': True
    },
    'lithium': {
        'name': 'Lithium Carbonate',
        'general_max_recycled': 25,
        'recycling_nascent': True,
        'scarcity_warning': True
    },
    'cobalt': {
        'name': 'Cobalt Sulfate',
        'general_max_recycled': 40,
        'scarcity_warning': True
    },
    'nickel': {
        'name': 'Primary Nickel',
        'alloys': {
            'Class 1': {'max_recycled': 60, 'impurity_limit': 0.01},
            'Ferronickel': {'max_recycled': 80, 'impurity_limit': 0.3},
        },
        'general_max_recycled': 60
    }
}

# Material alternatives for lifespan extension
LIFESPAN_ALTERNATIVES = {
    'aluminium_primary': {
        'corrosion_resistant': ['Al-6061', 'Al-6063'],
        'surface_treatments': ['Anodizing', 'Powder Coating', 'Chromate Conversion'],
        'lifespan_increase': 5
    },
    'steel_primary': {
        'corrosion_resistant': ['Stainless 304', 'Stainless 316'],
        'surface_treatments': ['Galvanizing', 'Zinc Plating', 'E-coating'],
        'lifespan_increase': 10
    },
    'copper_primary': {
        'corrosion_resistant': ['Brass', 'Bronze'],
        'surface_treatments': ['Tin Plating', 'Nickel Plating'],
        'lifespan_increase': 3
    }
}


def generate_design_recommendations(project_data, materials_data):
    """
    Engine 4: AI Design Advisor
    Generates recommendations for improving circularity and reducing environmental impact
    """
    recommendations = []
    priority_score = 0
    
    total_mass = sum(m[4] for m in materials_data) if materials_data else 0
    total_gwp = sum(m[7] for m in materials_data) if materials_data else 0
    
    for mat in materials_data:
        mat_id, proj_id, mat_name, mat_type, quantity, unit, recycled_content, gwp, transport_dist, created = mat
        
        # Check for recycled content optimization
        spec = ALLOY_SPECIFICATIONS.get(mat_type, {})
        max_recycled = spec.get('general_max_recycled', 50)
        current_recycled = recycled_content or 0
        
        if current_recycled < max_recycled and not spec.get('already_recycled'):
            potential_increase = max_recycled - current_recycled
            gwp_factor = EMISSION_FACTORS.get(mat_type, {}).get('virgin', 1)
            recycled_factor = EMISSION_FACTORS.get(mat_type, {}).get('recycled', gwp_factor * 0.1)
            
            # Calculate potential GWP savings
            current_gwp = quantity * (
                (current_recycled / 100) * recycled_factor +
                ((100 - current_recycled) / 100) * gwp_factor
            )
            optimized_gwp = quantity * (
                (max_recycled / 100) * recycled_factor +
                ((100 - max_recycled) / 100) * gwp_factor
            )
            gwp_savings = current_gwp - optimized_gwp
            gwp_savings_percent = (gwp_savings / current_gwp * 100) if current_gwp > 0 else 0
            
            if potential_increase >= 10:  # Only recommend if significant increase possible
                recommendations.append({
                    'type': 'recycled_content',
                    'priority': 'high' if gwp_savings_percent > 20 else 'medium',
                    'material': mat_name,
                    'material_type': mat_type,
                    'title': f'Increase Recycled Content in {mat_name}',
                    'description': f'Based on impurity limits for {mat_type}, you can increase recycled content from {current_recycled:.0f}% to {max_recycled:.0f}% without affecting material properties.',
                    'current_value': current_recycled,
                    'recommended_value': max_recycled,
                    'impact': {
                        'gwp_savings_kg': round(gwp_savings, 2),
                        'gwp_savings_percent': round(gwp_savings_percent, 1),
                        'cost_impact': 'neutral_to_positive'  # Recycled typically cheaper
                    },
                    'confidence': 0.85
                })
                priority_score += gwp_savings_percent
        
        # Check for material substitution opportunities
        alternative = spec.get('alternative')
        if alternative and current_recycled < 30:
            recommendations.append({
                'type': 'material_substitution',
                'priority': 'medium',
                'material': mat_name,
                'material_type': mat_type,
                'title': f'Consider {ALLOY_SPECIFICATIONS.get(alternative, {}).get("name", alternative)} instead',
                'description': f'Switching to secondary/recycled material could reduce GWP by up to {spec.get("gwp_reduction_with_recycled", 80)}%.',
                'alternative_type': alternative,
                'impact': {
                    'gwp_savings_percent': spec.get('gwp_reduction_with_recycled', 80),
                    'cost_impact': 'positive'
                },
                'confidence': 0.75
            })
        
        # Transport optimization
        if transport_dist and transport_dist > 300:
            transport_gwp = transport_dist * 0.0001 * quantity  # Simplified transport emission
            recommendations.append({
                'type': 'transport_optimization',
                'priority': 'low' if transport_dist < 500 else 'medium',
                'material': mat_name,
                'title': 'Optimize Supply Chain',
                'description': f'{mat_name} is transported {transport_dist}km. Consider local sourcing to reduce transport emissions.',
                'current_distance': transport_dist,
                'recommended_distance': 100,
                'impact': {
                    'gwp_savings_kg': round(transport_gwp * 0.7, 2),
                    'gwp_savings_percent': round(transport_gwp / (gwp or 1) * 70, 1)
                },
                'confidence': 0.6
            })
        
        # Scarcity warnings for critical minerals
        if spec.get('scarcity_warning'):
            recommendations.append({
                'type': 'scarcity_alert',
                'priority': 'high',
                'material': mat_name,
                'material_type': mat_type,
                'title': f'Critical Mineral: {mat_name}',
                'description': f'{mat_name} is a critical mineral with supply constraints. Consider reduction strategies or alternative chemistries.',
                'impact': {
                    'abiotic_depletion': 'high',
                    'supply_risk': 'elevated'
                },
                'confidence': 0.9
            })
    
    # Project-level recommendations
    project_id, name, desc, status, category, lifespan, disassembly, user_id, gwp_total, mci, cds, created = project_data
    
    # Lifespan extension
    if lifespan:
        benchmark = INDUSTRY_BENCHMARKS.get(category or 'other', {})
        avg_lifespan = benchmark.get('avg_lifespan', 10)
        
        if lifespan < avg_lifespan:
            recommendations.append({
                'type': 'lifespan_extension',
                'priority': 'high',
                'title': 'Extend Product Lifespan',
                'description': f'Current target lifespan ({lifespan}y) is below industry average ({avg_lifespan}y). Consider material upgrades or surface treatments.',
                'current_lifespan': lifespan,
                'recommended_lifespan': avg_lifespan + 5,
                'impact': {
                    'mci_improvement': 15,
                    'lifetime_gwp_reduction_percent': round((1 - lifespan / (avg_lifespan + 5)) * 100, 1)
                },
                'suggestions': [
                    'Use corrosion-resistant alloys',
                    'Apply protective coatings',
                    'Design for repairability'
                ],
                'confidence': 0.8
            })
    
    # Design for disassembly
    if not disassembly:
        recommendations.append({
            'type': 'design_for_disassembly',
            'priority': 'medium',
            'title': 'Enable Design for Disassembly',
            'description': 'Designing for easy disassembly improves end-of-life material recovery and MCI score.',
            'impact': {
                'mci_improvement': 10,
                'recycled_output_improvement': 20
            },
            'suggestions': [
                'Use mechanical fasteners instead of adhesives',
                'Mark materials with recycling codes',
                'Create disassembly instructions',
                'Use modular component design'
            ],
            'confidence': 0.85
        })
    
    # Sort by priority
    priority_order = {'high': 0, 'medium': 1, 'low': 2}
    recommendations.sort(key=lambda x: priority_order.get(x.get('priority', 'low'), 3))
    
    return {
        'recommendations': recommendations[:10],  # Top 10 recommendations
        'total_recommendations': len(recommendations),
        'priority_score': round(priority_score, 1),
        'summary': {
            'high_priority': len([r for r in recommendations if r.get('priority') == 'high']),
            'medium_priority': len([r for r in recommendations if r.get('priority') == 'medium']),
            'low_priority': len([r for r in recommendations if r.get('priority') == 'low'])
        }
    }


@app.route('/api/v1/projects/<project_id>/recommendations', methods=['GET', 'OPTIONS'])
def get_design_recommendations(project_id):
    """Get AI-powered design optimization recommendations for a project"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"detail": "Not authenticated"}), 401
        
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        # Get project
        c.execute("""SELECT id, name, description, status, product_category, 
                     target_lifespan, is_designed_for_disassembly, user_id, 
                     COALESCE(gwp_total, 0), COALESCE(mci_score, 0), 
                     COALESCE(circular_design_score, 0), created_at 
                     FROM projects WHERE id = ? AND user_id = ?""", (project_id, payload['user_id']))
        project = c.fetchone()
        
        if not project:
            conn.close()
            return jsonify({"detail": "Project not found"}), 404
        
        # Get materials
        c.execute("""SELECT id, project_id, material_name, material_type, quantity, 
                     unit, recycled_content, gwp, transport_distance, created_at 
                     FROM project_materials WHERE project_id = ?""", (project_id,))
        materials = c.fetchall()
        conn.close()
        
        if not materials:
            return jsonify({
                "recommendations": [],
                "total_recommendations": 0,
                "message": "Add materials to get AI recommendations"
            }), 200
        
        # Generate recommendations
        result = generate_design_recommendations(project, materials)
        result['project_id'] = project_id
        result['project_name'] = project[1]
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Recommendations Error: {e}")
        return jsonify({"detail": str(e)}), 500


# =====================================================
# ENGINE 5: ANALYTICS & CHARTS DATA
# =====================================================

@app.route('/api/v1/projects/<project_id>/analytics', methods=['GET', 'OPTIONS'])
def get_project_analytics(project_id):
    """Get comprehensive analytics data for charts and visualizations"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        # Get project
        c.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        project = c.fetchone()
        if not project:
            conn.close()
            return jsonify({"detail": "Project not found"}), 404
        
        # Get materials with all details
        c.execute("""SELECT id, material_name, material_type, quantity, unit, 
                     recycled_content, gwp, transport_distance 
                     FROM project_materials WHERE project_id = ?""", (project_id,))
        materials = c.fetchall()
        conn.close()
        
        # Calculate analytics
        total_gwp = sum(m[6] or 0 for m in materials)
        total_mass = sum(m[3] or 0 for m in materials)
        avg_recycled = sum(m[5] or 0 for m in materials) / len(materials) if materials else 0
        
        # GWP breakdown by material
        gwp_by_material = []
        for m in materials:
            gwp_by_material.append({
                'name': m[1],
                'type': m[2],
                'gwp': round(m[6] or 0, 2),
                'percentage': round((m[6] or 0) / total_gwp * 100, 1) if total_gwp > 0 else 0
            })
        gwp_by_material.sort(key=lambda x: x['gwp'], reverse=True)
        
        # GWP by material type
        gwp_by_type = {}
        for m in materials:
            mat_type = m[2] or 'Unknown'
            gwp_by_type[mat_type] = gwp_by_type.get(mat_type, 0) + (m[6] or 0)
        
        type_breakdown = [{'name': k, 'value': round(v, 2)} for k, v in gwp_by_type.items()]
        type_breakdown.sort(key=lambda x: x['value'], reverse=True)
        
        # Recycled content analysis
        recycled_analysis = []
        for m in materials:
            recycled_analysis.append({
                'name': m[1],
                'recycled_content': m[5] or 0,
                'quantity': m[3] or 0,
                'gwp': m[6] or 0
            })
        
        # Calculate MCI (Material Circularity Indicator)
        # MCI = 1 - LFI × (1 - Rc × Ru) where LFI = Linear Flow Index
        # Simplified calculation based on recycled content and recyclability
        recyclability_scores = {
            'aluminium_primary': 0.95, 'aluminium_secondary': 0.95,
            'copper_primary': 0.90, 'copper_secondary': 0.90,
            'steel_primary': 0.85, 'steel_secondary': 0.85,
            'plastic_primary': 0.30, 'plastic_recycled': 0.40,
            'glass': 0.80, 'concrete': 0.60, 'wood': 0.50
        }
        
        total_mci_weight = 0
        weighted_mci = 0
        for m in materials:
            mat_type = m[2] or 'unknown'
            recyclability = recyclability_scores.get(mat_type, 0.5)
            recycled_input = (m[5] or 0) / 100  # Convert to fraction
            
            # Ellen MacArthur Foundation MCI formula (simplified)
            linear_flow = (1 - recycled_input) * (1 - recyclability)
            utility_factor = 1.0  # Assume standard utility
            material_mci = 1 - linear_flow * utility_factor
            
            quantity = m[3] or 0
            weighted_mci += material_mci * quantity
            total_mci_weight += quantity
        
        mci_score = round(weighted_mci / total_mci_weight, 3) if total_mci_weight > 0 else 0
        
        # MCI breakdown by material
        mci_breakdown = []
        for m in materials:
            mat_type = m[2] or 'unknown'
            recyclability = recyclability_scores.get(mat_type, 0.5)
            recycled_input = (m[5] or 0) / 100
            linear_flow = (1 - recycled_input) * (1 - recyclability)
            material_mci = 1 - linear_flow
            
            mci_breakdown.append({
                'name': m[1],
                'mci': round(material_mci, 3),
                'recycled_input': m[5] or 0,
                'recyclability': round(recyclability * 100, 0)
            })
        
        # Lifecycle stage breakdown (estimated distribution)
        lifecycle_stages = [
            {'stage': 'Raw Material Extraction', 'gwp': round(total_gwp * 0.35, 2), 'percentage': 35},
            {'stage': 'Processing & Manufacturing', 'gwp': round(total_gwp * 0.30, 2), 'percentage': 30},
            {'stage': 'Transport', 'gwp': round(total_gwp * 0.10, 2), 'percentage': 10},
            {'stage': 'Use Phase', 'gwp': round(total_gwp * 0.15, 2), 'percentage': 15},
            {'stage': 'End of Life', 'gwp': round(total_gwp * 0.10, 2), 'percentage': 10}
        ]
        
        # Process flow data for Sankey diagram
        process_flow = {
            'nodes': [
                {'id': 'raw_materials', 'name': 'Raw Materials'},
                {'id': 'recycled_input', 'name': 'Recycled Input'},
                {'id': 'manufacturing', 'name': 'Manufacturing'},
                {'id': 'product', 'name': 'Product'},
                {'id': 'use_phase', 'name': 'Use Phase'},
                {'id': 'end_of_life', 'name': 'End of Life'},
                {'id': 'recycling', 'name': 'Recycling'},
                {'id': 'landfill', 'name': 'Landfill/Incineration'}
            ],
            'links': [
                {'source': 'raw_materials', 'target': 'manufacturing', 'value': round(total_mass * (1 - avg_recycled/100), 2)},
                {'source': 'recycled_input', 'target': 'manufacturing', 'value': round(total_mass * (avg_recycled/100), 2)},
                {'source': 'manufacturing', 'target': 'product', 'value': round(total_mass * 0.95, 2)},
                {'source': 'product', 'target': 'use_phase', 'value': round(total_mass * 0.95, 2)},
                {'source': 'use_phase', 'target': 'end_of_life', 'value': round(total_mass * 0.90, 2)},
                {'source': 'end_of_life', 'target': 'recycling', 'value': round(total_mass * 0.90 * 0.7, 2)},
                {'source': 'end_of_life', 'target': 'landfill', 'value': round(total_mass * 0.90 * 0.3, 2)}
            ]
        }
        
        # Circular design score calculation
        disassembly_bonus = 15 if project[6] else 0  # is_designed_for_disassembly
        lifespan_bonus = min((project[5] or 0) / 2, 10)  # target_lifespan bonus
        circular_score = min(100, round(mci_score * 70 + disassembly_bonus + lifespan_bonus, 1))
        
        # Calculate scarcity metrics for critical minerals
        scarcity_analysis = []
        total_scarcity_weight = 0
        weighted_scarcity = 0
        for m in materials:
            mat_type = m[2] or 'unknown'
            scarcity = get_scarcity_score(mat_type)
            quantity = m[3] or 0
            if scarcity > 0:
                scarcity_analysis.append({
                    'name': m[1],
                    'type': mat_type,
                    'scarcity_score': scarcity,
                    'quantity': quantity,
                    'risk_level': 'Critical' if scarcity >= 85 else ('High' if scarcity >= 70 else ('Medium' if scarcity >= 50 else 'Low'))
                })
                weighted_scarcity += scarcity * quantity
                total_scarcity_weight += quantity
        
        avg_scarcity = round(weighted_scarcity / total_scarcity_weight, 1) if total_scarcity_weight > 0 else 0
        critical_mineral_count = len([s for s in scarcity_analysis if s['scarcity_score'] >= 70])
        
        return jsonify({
            'summary': {
                'total_gwp': round(total_gwp, 2),
                'total_mass': round(total_mass, 2),
                'material_count': len(materials),
                'avg_recycled_content': round(avg_recycled, 1),
                'mci_score': mci_score,
                'circular_design_score': circular_score,
                'avg_scarcity_score': avg_scarcity,
                'critical_mineral_count': critical_mineral_count
            },
            'gwp_by_material': gwp_by_material,
            'gwp_by_type': type_breakdown,
            'recycled_analysis': recycled_analysis,
            'mci_breakdown': mci_breakdown,
            'lifecycle_stages': lifecycle_stages,
            'process_flow': process_flow,
            'scarcity_analysis': scarcity_analysis
        }), 200
        
    except Exception as e:
        print(f"Analytics Error: {e}")
        return jsonify({"detail": str(e)}), 500


@app.route('/api/v1/dashboard/analytics', methods=['GET', 'OPTIONS'])
def get_dashboard_analytics():
    """Get aggregate analytics across all user projects"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        # Get user from token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"detail": "Authorization required"}), 401
        
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
        except:
            return jsonify({"detail": "Invalid token"}), 401
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        # First, recalculate MCI for any projects that have materials but no MCI score
        c.execute("""SELECT id, target_lifespan, is_designed_for_disassembly, product_category 
                     FROM projects WHERE user_id = ? AND (mci_score IS NULL OR mci_score = 0)""", (user_id,))
        projects_to_update = c.fetchall()
        
        for proj in projects_to_update:
            proj_id, target_lifespan, is_disassembly, category = proj
            target_lifespan = target_lifespan or 10
            is_disassembly = bool(is_disassembly)
            category = category or 'other'
            
            # Get materials for this project
            c.execute("""SELECT material_type, quantity, recycled_content 
                         FROM project_materials WHERE project_id = ?""", (proj_id,))
            materials = c.fetchall()
            
            if materials:
                total_mass = sum(m[1] or 0 for m in materials)
                if total_mass > 0:
                    weighted_recycled = sum((m[1] or 0) * (m[2] or 0) for m in materials) / total_mass
                    benchmark = INDUSTRY_BENCHMARKS.get(category, INDUSTRY_BENCHMARKS['other'])
                    industry_avg_lifespan = benchmark['avg_lifespan']
                    
                    mci_score = calculate_mci(
                        weighted_recycled,
                        weighted_recycled * 0.8,
                        target_lifespan,
                        industry_avg_lifespan,
                        is_disassembly
                    )
                    
                    c.execute("UPDATE projects SET mci_score = ? WHERE id = ?", (mci_score, proj_id))
        
        conn.commit()
        
        # Get all user projects (after potential updates)
        c.execute("""SELECT id, name, status, gwp_total, mci_score, circular_design_score, created_at 
                     FROM projects WHERE user_id = ? ORDER BY created_at DESC""", (user_id,))
        projects = c.fetchall()
        
        # Get all materials for user's projects
        project_ids = [p[0] for p in projects]
        if project_ids:
            placeholders = ','.join('?' * len(project_ids))
            c.execute(f"""SELECT project_id, material_type, SUM(quantity), SUM(gwp), AVG(recycled_content)
                         FROM project_materials WHERE project_id IN ({placeholders})
                         GROUP BY project_id, material_type""", project_ids)
            material_stats = c.fetchall()
        else:
            material_stats = []
        
        conn.close()
        
        # Calculate totals
        total_gwp = sum(p[3] or 0 for p in projects)
        avg_mci = sum(p[4] or 0 for p in projects) / len(projects) if projects else 0
        avg_circular = sum(p[5] or 0 for p in projects) / len(projects) if projects else 0
        
        # Projects over time (for trend chart)
        projects_timeline = []
        for p in projects:
            projects_timeline.append({
                'id': p[0],
                'name': p[1],
                'status': p[2],
                'gwp': p[3] or 0,
                'mci': p[4] or 0,
                'created_at': p[6]
            })
        
        # Material type distribution across all projects
        type_totals = {}
        for stat in material_stats:
            mat_type = stat[1] or 'Unknown'
            type_totals[mat_type] = type_totals.get(mat_type, 0) + (stat[3] or 0)
        
        material_distribution = [{'name': k, 'value': round(v, 2)} for k, v in type_totals.items()]
        material_distribution.sort(key=lambda x: x['value'], reverse=True)
        
        return jsonify({
            'summary': {
                'total_projects': len(projects),
                'calculated_projects': len([p for p in projects if p[2] in ['calculated', 'verified']]),
                'total_gwp': round(total_gwp, 2),
                'avg_mci': round(avg_mci, 3),
                'avg_circular_score': round(avg_circular, 1)
            },
            'projects_timeline': projects_timeline,
            'material_distribution': material_distribution
        }), 200
        
    except Exception as e:
        print(f"Dashboard Analytics Error: {e}")
        return jsonify({"detail": str(e)}), 500


# =====================================================
# ENGINE 6: GROQ AI CHAT ASSISTANT
# =====================================================

def get_ai_response(prompt, context=""):
    """Get AI response using Groq or fallback to rule-based"""
    
    if groq_client:
        try:
            system_prompt = """You are JNARRDC LCA Portal AI Assistant, an expert in Life Cycle Assessment (LCA) 
for metals and materials. You help users understand:
- Environmental impacts (GWP, carbon footprint)
- Material Circularity Indicator (MCI) and circular economy principles
- Recommendations for reducing environmental impact
- CBAM (Carbon Border Adjustment Mechanism) compliance
- Best practices for sustainable material selection

Keep responses concise, factual, and actionable. Use specific numbers when available.
Focus on practical recommendations for the Indian metals industry."""

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Context: {context}\n\nQuestion: {prompt}"}
            ]
            
            response = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=1024
            )
            
            return {
                'response': response.choices[0].message.content,
                'model': GROQ_MODEL,
                'source': 'groq_ai'
            }
        except Exception as e:
            print(f"Groq API error: {e}")
    
    # Fallback to rule-based responses
    prompt_lower = prompt.lower()
    
    if 'mci' in prompt_lower or 'circularity' in prompt_lower:
        response = """The Material Circularity Indicator (MCI) measures how circular a product is on a scale of 0 to 1:
- MCI = 0: Completely linear (virgin materials, no recycling)
- MCI = 1: Fully circular (100% recycled input and recyclable output)

To improve MCI:
1. Increase recycled content in materials
2. Design for disassembly and recyclability
3. Extend product lifespan
4. Choose highly recyclable materials (metals are excellent - aluminum: 95%, steel: 85%)"""
    
    elif 'gwp' in prompt_lower or 'carbon' in prompt_lower or 'emission' in prompt_lower:
        response = """Global Warming Potential (GWP) measures greenhouse gas emissions in kg CO₂-equivalent.

Key GWP reduction strategies:
1. Use secondary (recycled) metals - reduces GWP by 85-95%
2. Optimize transport distances
3. Increase process efficiency
4. Switch to renewable energy in manufacturing
5. Design for longer product lifespan

Primary vs Secondary metals GWP:
- Primary Aluminum: 16.5 kg CO₂-eq/kg
- Secondary Aluminum: 0.7 kg CO₂-eq/kg (95% reduction!)
- Primary Steel: 2.3 kg CO₂-eq/kg
- Secondary Steel: 0.7 kg CO₂-eq/kg"""
    
    elif 'cbam' in prompt_lower:
        response = """CBAM (Carbon Border Adjustment Mechanism) is the EU's carbon pricing system for imports.

Key points for Indian exporters:
1. Applies to: Iron, steel, aluminum, cement, fertilizers, electricity, hydrogen
2. Effective: October 2023 (reporting), January 2026 (full charges)
3. Requires: Accurate GWP data per product
4. JNARRDC LCA Portal helps: Generate CBAM-compliant reports with verified emission data

To prepare:
- Track emissions at product level
- Document recycled content percentages
- Maintain supply chain transparency"""
    
    else:
        response = """I'm the JNARRDC LCA Portal AI Assistant. I can help you with:

🌱 **Environmental Impact** - Understanding GWP and carbon footprint
📊 **Circularity Metrics** - MCI calculations and improvement strategies  
🔄 **Material Selection** - Comparing primary vs secondary metals
📋 **Compliance** - CBAM reporting requirements
💡 **Recommendations** - Actionable steps to reduce environmental impact

What would you like to know more about?"""
    
    return {
        'response': response,
        'model': 'rule-based',
        'source': 'fallback'
    }


@app.route('/api/v1/ai/chat', methods=['POST', 'OPTIONS'])
def ai_chat():
    """AI Chat endpoint using Groq or fallback"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        prompt = data.get('prompt', '')
        context = data.get('context', '')
        project_id = data.get('project_id')
        
        if not prompt:
            return jsonify({"detail": "Prompt is required"}), 400
        
        # Build context from project if provided
        if project_id:
            conn = sqlite3.connect(DATABASE)
            c = conn.cursor()
            c.execute("SELECT name, gwp_total, mci_score FROM projects WHERE id = ?", (project_id,))
            project = c.fetchone()
            if project:
                context += f"\nProject: {project[0]}, GWP: {project[1]} kg CO₂-eq, MCI: {project[2]}"
            
            c.execute("""SELECT material_name, material_type, quantity, gwp, recycled_content 
                        FROM project_materials WHERE project_id = ?""", (project_id,))
            materials = c.fetchall()
            if materials:
                mat_context = "\nMaterials: " + ", ".join([f"{m[0]} ({m[1]}): {m[3]}kg CO₂" for m in materials])
                context += mat_context
            conn.close()
        
        result = get_ai_response(prompt, context)
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"AI Chat Error: {e}")
        return jsonify({"detail": str(e)}), 500


@app.route('/api/v1/ai/analyze', methods=['POST', 'OPTIONS'])
def ai_analyze_project():
    """Deep AI analysis of a project"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        project_id = data.get('project_id')
        
        if not project_id:
            return jsonify({"detail": "Project ID is required"}), 400
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        # Get project
        c.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        project = c.fetchone()
        if not project:
            conn.close()
            return jsonify({"detail": "Project not found"}), 404
        
        # Get materials
        c.execute("""SELECT material_name, material_type, quantity, gwp, recycled_content, transport_distance
                    FROM project_materials WHERE project_id = ?""", (project_id,))
        materials = c.fetchall()
        conn.close()
        
        # Build analysis context
        context = f"""
Project: {project[1]}
Category: {project[4]}
Target Lifespan: {project[5]} years
Designed for Disassembly: {'Yes' if project[6] else 'No'}
Total GWP: {project[8]} kg CO₂-eq
MCI Score: {project[9]}
Circular Design Score: {project[10]}

Materials:
"""
        for m in materials:
            context += f"- {m[0]} ({m[1]}): {m[2]}kg, GWP={m[3]}, Recycled={m[4]}%, Transport={m[5]}km\n"
        
        prompt = """Analyze this project and provide:
1. Key environmental hotspots
2. Top 3 improvement recommendations with estimated impact
3. Comparison to industry benchmarks
4. CBAM readiness assessment"""
        
        result = get_ai_response(prompt, context)
        result['project_id'] = project_id
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"AI Analyze Error: {e}")
        return jsonify({"detail": str(e)}), 500


# =====================================================
# ENGINE 7: CBAM EXPORT & COMPLIANCE
# =====================================================

# CBAM covered goods categories
CBAM_CATEGORIES = {
    'iron_steel': {
        'name': 'Iron and Steel',
        'cn_codes': ['7201', '7202', '7203', '7204', '7205', '7206', '7207', '7208', '7209', '7210', '7211', '7212', '7213', '7214', '7215', '7216', '7217', '7218', '7219', '7220', '7221', '7222', '7223', '7224', '7225', '7226', '7227', '7228', '7229'],
        'default_cn': '7208',
        'benchmark_ef': 1.85  # tCO2/t product
    },
    'aluminium': {
        'name': 'Aluminium',
        'cn_codes': ['7601', '7602', '7603', '7604', '7605', '7606', '7607', '7608', '7609'],
        'default_cn': '7601',
        'benchmark_ef': 1.47  # tCO2/t unwrought aluminium
    },
    'copper': {
        'name': 'Copper (not CBAM-covered but included for completeness)',
        'cn_codes': ['7401', '7402', '7403', '7404', '7405', '7406', '7407', '7408', '7409'],
        'default_cn': '7403',
        'benchmark_ef': 2.5  # tCO2/t
    }
}

def get_cbam_category(material_type):
    """Determine CBAM category from material type"""
    mat_lower = material_type.lower()
    if 'aluminium' in mat_lower or 'aluminum' in mat_lower:
        return 'aluminium'
    elif 'steel' in mat_lower or 'iron' in mat_lower:
        return 'iron_steel'
    elif 'copper' in mat_lower:
        return 'copper'
    return None


@app.route('/api/v1/projects/<project_id>/cbam-export', methods=['GET', 'OPTIONS'])
def export_cbam_report(project_id):
    """Generate CBAM-compliant export report for EU compliance"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        # Get project
        c.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        project = c.fetchone()
        if not project:
            conn.close()
            return jsonify({"detail": "Project not found"}), 404
        
        # Get user info
        c.execute("SELECT full_name, organization_name, email FROM users WHERE id = ?", (project[7],))
        user = c.fetchone()
        
        # Get materials
        c.execute("""SELECT material_name, material_type, quantity, gwp, recycled_content, transport_distance
                    FROM project_materials WHERE project_id = ?""", (project_id,))
        materials = c.fetchall()
        conn.close()
        
        if not materials:
            return jsonify({"detail": "No materials to export"}), 400
        
        # Build CBAM report
        report_date = datetime.now().isoformat()
        quarter = (datetime.now().month - 1) // 3 + 1
        reporting_period = f"{datetime.now().year}-Q{quarter}"
        
        # Categorize materials by CBAM category
        cbam_goods = []
        total_embedded_emissions = 0
        
        for m in materials:
            material_name, material_type, quantity, gwp, recycled_content, transport_distance = m
            cbam_cat = get_cbam_category(material_type)
            
            if cbam_cat:
                cat_info = CBAM_CATEGORIES[cbam_cat]
                # Embedded emissions in tonnes CO2
                embedded = (gwp or 0) / 1000  # Convert kg to tonnes
                total_embedded_emissions += embedded
                
                cbam_goods.append({
                    'product_description': material_name,
                    'cn_code': cat_info['default_cn'],
                    'cbam_category': cat_info['name'],
                    'quantity_kg': quantity,
                    'quantity_tonnes': quantity / 1000,
                    'embedded_emissions_tco2': round(embedded, 4),
                    'specific_embedded_emissions': round(embedded / (quantity / 1000), 4) if quantity > 0 else 0,
                    'recycled_content_percent': recycled_content or 0,
                    'benchmark_ef': cat_info['benchmark_ef'],
                    'production_country': 'IN',  # India
                    'installation_name': user[1] if user else 'Unknown',
                    'verification_status': 'pending'
                })
        
        # Calculate summary
        total_quantity_tonnes = sum(g['quantity_tonnes'] for g in cbam_goods)
        avg_specific_emissions = total_embedded_emissions / total_quantity_tonnes if total_quantity_tonnes > 0 else 0
        
        # CBAM certificate calculation (estimated)
        # Price is based on EU ETS price (approx €80-100/tCO2)
        estimated_ets_price = 90  # EUR/tCO2
        estimated_cbam_liability = total_embedded_emissions * estimated_ets_price
        
        report = {
            'report_metadata': {
                'report_id': f"CBAM-{project_id[:8].upper()}-{datetime.now().strftime('%Y%m%d')}",
                'generation_date': report_date,
                'reporting_period': reporting_period,
                'regulation_reference': 'EU Regulation 2023/956 (CBAM)',
                'report_type': 'Quarterly CBAM Declaration',
                'software_version': 'JNARRDC LCA Portal v1.0'
            },
            'declarant_information': {
                'company_name': user[1] if user else 'Not specified',
                'contact_person': user[0] if user else 'Not specified',
                'email': user[2] if user else 'Not specified',
                'country_of_origin': 'India',
                'eori_number': 'To be provided'
            },
            'project_information': {
                'project_id': project_id,
                'project_name': project[1],
                'product_category': project[4],
                'description': project[2] or 'Not specified'
            },
            'goods_declaration': cbam_goods,
            'summary': {
                'total_goods_categories': len(set(g['cbam_category'] for g in cbam_goods)),
                'total_quantity_tonnes': round(total_quantity_tonnes, 3),
                'total_embedded_emissions_tco2': round(total_embedded_emissions, 4),
                'average_specific_emissions': round(avg_specific_emissions, 4),
                'estimated_ets_price_eur': estimated_ets_price,
                'estimated_cbam_liability_eur': round(estimated_cbam_liability, 2)
            },
            'verification_requirements': {
                'accredited_verifier_required': total_embedded_emissions > 500,
                'verification_deadline': f"{datetime.now().year + 1}-05-31",
                'documentation_required': [
                    'Production process documentation',
                    'Energy consumption records',
                    'Emission factor calculations',
                    'Recycled content certificates',
                    'Transport documentation'
                ]
            },
            'compliance_notes': [
                'This report is generated for CBAM compliance purposes.',
                'Actual embedded emissions may vary based on production methods.',
                'Verification by accredited body required before final submission.',
                'Default values used where actual data not available.',
                f"India currently has no carbon price applicable for CBAM deduction."
            ]
        }
        
        return jsonify(report), 200
        
    except Exception as e:
        print(f"CBAM Export Error: {e}")
        return jsonify({"detail": str(e)}), 500


@app.route('/api/v1/projects/<project_id>/cbam-export/csv', methods=['GET', 'OPTIONS'])
def export_cbam_csv(project_id):
    """Export CBAM data in CSV format"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        # Get the JSON report first
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        c.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        project = c.fetchone()
        if not project:
            conn.close()
            return jsonify({"detail": "Project not found"}), 404
        
        c.execute("""SELECT material_name, material_type, quantity, gwp, recycled_content
                    FROM project_materials WHERE project_id = ?""", (project_id,))
        materials = c.fetchall()
        conn.close()
        
        # Build CSV content
        csv_lines = [
            "CBAM Quarterly Report - JNARRDC LCA Portal Export",
            f"Project: {project[1]}",
            f"Report Date: {datetime.now().isoformat()}",
            "",
            "CN Code,Product Description,CBAM Category,Quantity (tonnes),Embedded Emissions (tCO2),Specific Emissions (tCO2/t),Recycled Content (%),Country of Origin",
        ]
        
        for m in materials:
            material_name, material_type, quantity, gwp, recycled_content = m
            cbam_cat = get_cbam_category(material_type)
            if cbam_cat:
                cat_info = CBAM_CATEGORIES[cbam_cat]
                quantity_t = quantity / 1000
                embedded = (gwp or 0) / 1000
                specific = embedded / quantity_t if quantity_t > 0 else 0
                csv_lines.append(
                    f"{cat_info['default_cn']},{material_name},{cat_info['name']},{quantity_t:.4f},{embedded:.4f},{specific:.4f},{recycled_content or 0},IN"
                )
        
        csv_content = "\n".join(csv_lines)
        
        return csv_content, 200, {
            'Content-Type': 'text/csv',
            'Content-Disposition': f'attachment; filename="cbam_report_{project_id[:8]}.csv"'
        }
        
    except Exception as e:
        print(f"CBAM CSV Export Error: {e}")
        return jsonify({"detail": str(e)}), 500


@app.route('/api/v1/projects/<project_id>/cbam-export/excel', methods=['GET', 'OPTIONS'])
def export_cbam_excel(project_id):
    """Export CBAM report as professional Excel letterhead document"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        # Get project
        c.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        project = c.fetchone()
        if not project:
            conn.close()
            return jsonify({"detail": "Project not found"}), 404
        
        # Get user info
        c.execute("SELECT full_name, organization_name, email FROM users WHERE id = ?", (project[7],))
        user = c.fetchone()
        
        # Get materials
        c.execute("""SELECT material_name, material_type, quantity, gwp, recycled_content, transport_distance
                    FROM project_materials WHERE project_id = ?""", (project_id,))
        materials = c.fetchall()
        conn.close()
        
        if not materials:
            return jsonify({"detail": "No materials to export"}), 400
        
        # Create workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "CBAM Report"
        
        # Define styles
        header_font = Font(name='Arial', size=18, bold=True, color='1F4E79')
        subheader_font = Font(name='Arial', size=12, bold=True, color='2E75B6')
        title_font = Font(name='Arial', size=14, bold=True, color='FFFFFF')
        normal_font = Font(name='Arial', size=10)
        bold_font = Font(name='Arial', size=10, bold=True)
        small_font = Font(name='Arial', size=9, color='666666')
        
        header_fill = PatternFill(start_color='1F4E79', end_color='1F4E79', fill_type='solid')
        alt_row_fill = PatternFill(start_color='F2F2F2', end_color='F2F2F2', fill_type='solid')
        light_blue_fill = PatternFill(start_color='DEEAF6', end_color='DEEAF6', fill_type='solid')
        
        thin_border = Border(
            left=Side(style='thin', color='CCCCCC'),
            right=Side(style='thin', color='CCCCCC'),
            top=Side(style='thin', color='CCCCCC'),
            bottom=Side(style='thin', color='CCCCCC')
        )
        
        # Set column widths
        ws.column_dimensions['A'].width = 5
        ws.column_dimensions['B'].width = 25
        ws.column_dimensions['C'].width = 20
        ws.column_dimensions['D'].width = 15
        ws.column_dimensions['E'].width = 15
        ws.column_dimensions['F'].width = 18
        ws.column_dimensions['G'].width = 15
        ws.column_dimensions['H'].width = 12
        
        row = 1
        
        # ===== LETTERHEAD =====
        ws.merge_cells('B1:G1')
        ws['B1'] = 'JNARRDC LCA PORTAL'
        ws['B1'].font = header_font
        ws['B1'].alignment = Alignment(horizontal='center', vertical='center')
        ws.row_dimensions[1].height = 30
        
        row = 2
        ws.merge_cells('B2:G2')
        ws['B2'] = 'Jawaharlal Nehru Aluminium Research Development and Design Centre'
        ws['B2'].font = Font(name='Arial', size=10, italic=True, color='666666')
        ws['B2'].alignment = Alignment(horizontal='center')
        
        row = 3
        ws.merge_cells('B3:G3')
        ws['B3'] = '━' * 60
        ws['B3'].font = Font(color='1F4E79')
        ws['B3'].alignment = Alignment(horizontal='center')
        
        # ===== REPORT TITLE =====
        row = 5
        ws.merge_cells('B5:G5')
        ws['B5'] = 'CBAM QUARTERLY DECLARATION REPORT'
        ws['B5'].font = Font(name='Arial', size=14, bold=True, color='1F4E79')
        ws['B5'].alignment = Alignment(horizontal='center')
        
        row = 6
        ws.merge_cells('B6:G6')
        ws['B6'] = 'Carbon Border Adjustment Mechanism - EU Regulation 2023/956'
        ws['B6'].font = small_font
        ws['B6'].alignment = Alignment(horizontal='center')
        
        # ===== REPORT METADATA =====
        row = 8
        quarter = (datetime.now().month - 1) // 3 + 1
        report_id = f"CBAM-{project_id[:8].upper()}-{datetime.now().strftime('%Y%m%d')}"
        
        ws['B8'] = 'Report ID:'
        ws['B8'].font = bold_font
        ws['C8'] = report_id
        ws['C8'].font = normal_font
        
        ws['E8'] = 'Report Date:'
        ws['E8'].font = bold_font
        ws['F8'] = datetime.now().strftime('%d %B %Y')
        ws['F8'].font = normal_font
        
        row = 9
        ws['B9'] = 'Reporting Period:'
        ws['B9'].font = bold_font
        ws['C9'] = f"{datetime.now().year}-Q{quarter}"
        ws['C9'].font = normal_font
        
        ws['E9'] = 'Status:'
        ws['E9'].font = bold_font
        ws['F9'] = 'Draft - Pending Verification'
        ws['F9'].font = Font(name='Arial', size=10, color='FF6600')
        
        # ===== DECLARANT INFORMATION =====
        row = 11
        ws.merge_cells('B11:G11')
        ws['B11'] = 'DECLARANT INFORMATION'
        ws['B11'].font = subheader_font
        ws['B11'].fill = light_blue_fill
        ws.row_dimensions[11].height = 22
        
        row = 12
        ws['B12'] = 'Organization:'
        ws['B12'].font = bold_font
        ws['C12'] = user[1] if user else 'Not specified'
        ws['C12'].font = normal_font
        
        ws['E12'] = 'Contact Person:'
        ws['E12'].font = bold_font
        ws['F12'] = user[0] if user else 'Not specified'
        ws['F12'].font = normal_font
        
        row = 13
        ws['B13'] = 'Email:'
        ws['B13'].font = bold_font
        ws['C13'] = user[2] if user else 'Not specified'
        ws['C13'].font = normal_font
        
        ws['E13'] = 'Country of Origin:'
        ws['E13'].font = bold_font
        ws['F13'] = 'India (IN)'
        ws['F13'].font = normal_font
        
        # ===== PROJECT INFORMATION =====
        row = 15
        ws.merge_cells('B15:G15')
        ws['B15'] = 'PROJECT INFORMATION'
        ws['B15'].font = subheader_font
        ws['B15'].fill = light_blue_fill
        ws.row_dimensions[15].height = 22
        
        row = 16
        ws['B16'] = 'Project Name:'
        ws['B16'].font = bold_font
        ws['C16'] = project[1]
        ws['C16'].font = normal_font
        
        ws['E16'] = 'Product Category:'
        ws['E16'].font = bold_font
        ws['F16'] = project[4] or 'Not specified'
        ws['F16'].font = normal_font
        
        row = 17
        ws['B17'] = 'Description:'
        ws['B17'].font = bold_font
        ws.merge_cells('C17:G17')
        ws['C17'] = project[2] or 'Not specified'
        ws['C17'].font = normal_font
        
        # ===== GOODS DECLARATION TABLE =====
        row = 19
        ws.merge_cells('B19:G19')
        ws['B19'] = 'GOODS DECLARATION'
        ws['B19'].font = subheader_font
        ws['B19'].fill = light_blue_fill
        ws.row_dimensions[19].height = 22
        
        # Table headers
        row = 21
        headers = ['#', 'Product Description', 'CN Code', 'CBAM Category', 'Qty (tonnes)', 'Emissions (tCO₂)', 'Recycled %']
        for col, header in enumerate(headers, start=2):
            cell = ws.cell(row=row, column=col, value=header)
            cell.font = title_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border
        ws.row_dimensions[21].height = 25
        
        # Table data
        row = 22
        total_quantity = 0
        total_emissions = 0
        
        for idx, m in enumerate(materials, 1):
            material_name, material_type, quantity, gwp, recycled_content, transport_distance = m
            cbam_cat = get_cbam_category(material_type)
            
            if cbam_cat:
                cat_info = CBAM_CATEGORIES[cbam_cat]
                quantity_t = quantity / 1000
                embedded = (gwp or 0) / 1000
                total_quantity += quantity_t
                total_emissions += embedded
                
                row_data = [
                    idx,
                    material_name,
                    cat_info['default_cn'],
                    cat_info['name'],
                    round(quantity_t, 4),
                    round(embedded, 4),
                    f"{recycled_content or 0}%"
                ]
                
                for col, value in enumerate(row_data, start=2):
                    cell = ws.cell(row=row, column=col, value=value)
                    cell.font = normal_font
                    cell.border = thin_border
                    cell.alignment = Alignment(horizontal='center' if col > 2 else 'left', vertical='center')
                    if idx % 2 == 0:
                        cell.fill = alt_row_fill
                
                row += 1
        
        # Total row
        ws.cell(row=row, column=2, value='TOTAL').font = bold_font
        ws.cell(row=row, column=2).border = thin_border
        ws.cell(row=row, column=3).border = thin_border
        ws.cell(row=row, column=4).border = thin_border
        ws.cell(row=row, column=5, value=round(total_quantity, 4)).font = bold_font
        ws.cell(row=row, column=5).border = thin_border
        ws.cell(row=row, column=5).alignment = Alignment(horizontal='center')
        ws.cell(row=row, column=6, value=round(total_emissions, 4)).font = bold_font
        ws.cell(row=row, column=6).border = thin_border
        ws.cell(row=row, column=6).alignment = Alignment(horizontal='center')
        ws.cell(row=row, column=7).border = thin_border
        ws.cell(row=row, column=8).border = thin_border
        
        # ===== SUMMARY =====
        row += 2
        ws.merge_cells(f'B{row}:G{row}')
        ws[f'B{row}'] = 'EMISSIONS SUMMARY & CBAM LIABILITY'
        ws[f'B{row}'].font = subheader_font
        ws[f'B{row}'].fill = light_blue_fill
        ws.row_dimensions[row].height = 22
        
        row += 1
        estimated_price = 90
        estimated_liability = total_emissions * estimated_price
        
        ws[f'B{row}'] = 'Total Embedded Emissions:'
        ws[f'B{row}'].font = bold_font
        ws[f'D{row}'] = f'{round(total_emissions, 4)} tCO₂'
        ws[f'D{row}'].font = normal_font
        
        row += 1
        ws[f'B{row}'] = 'EU ETS Reference Price:'
        ws[f'B{row}'].font = bold_font
        ws[f'D{row}'] = f'€{estimated_price}/tCO₂'
        ws[f'D{row}'].font = normal_font
        
        row += 1
        ws[f'B{row}'] = 'Estimated CBAM Liability:'
        ws[f'B{row}'].font = bold_font
        ws[f'D{row}'] = f'€{round(estimated_liability, 2)}'
        ws[f'D{row}'].font = Font(name='Arial', size=12, bold=True, color='C00000')
        
        row += 1
        ws[f'B{row}'] = 'Carbon Price Deduction (India):'
        ws[f'B{row}'].font = bold_font
        ws[f'D{row}'] = '€0.00 (No applicable carbon price)'
        ws[f'D{row}'].font = small_font
        
        # ===== FOOTER =====
        row += 3
        ws.merge_cells(f'B{row}:G{row}')
        ws[f'B{row}'] = '━' * 60
        ws[f'B{row}'].font = Font(color='CCCCCC')
        ws[f'B{row}'].alignment = Alignment(horizontal='center')
        
        row += 1
        ws.merge_cells(f'B{row}:G{row}')
        ws[f'B{row}'] = 'This report is generated for CBAM compliance purposes. Verification by accredited body required.'
        ws[f'B{row}'].font = small_font
        ws[f'B{row}'].alignment = Alignment(horizontal='center')
        
        row += 1
        ws.merge_cells(f'B{row}:G{row}')
        ws[f'B{row}'] = f'Generated by JNARRDC LCA Portal v1.0 | Data Sources: IPCC AR6, Ecoinvent 3.9 | {datetime.now().strftime("%d/%m/%Y %H:%M")}'
        ws[f'B{row}'].font = Font(name='Arial', size=8, italic=True, color='999999')
        ws[f'B{row}'].alignment = Alignment(horizontal='center')
        
        # Save to BytesIO
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        filename = f"CBAM_Report_{project[1].replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.xlsx"
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        print(f"CBAM Excel Export Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"detail": str(e)}), 500


# =====================================================
# BRSR EXPORT - SEBI Business Responsibility Report
# =====================================================

@app.route('/api/v1/projects/<project_id>/brsr-export', methods=['GET', 'OPTIONS'])
def brsr_export(project_id):
    """Generate BRSR (SEBI) Principle 6 Environmental Report"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        # Get project
        c.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        project = c.fetchone()
        if not project:
            conn.close()
            return jsonify({"detail": "Project not found"}), 404
        
        # Get materials
        c.execute("""SELECT material_name, material_type, quantity, gwp, 
                     recycled_content, transport_distance 
                     FROM project_materials WHERE project_id = ?""", (project_id,))
        materials = c.fetchall()
        
        # Get user info
        c.execute("SELECT full_name, organization_name, email FROM users WHERE id = ?", (project[3],))
        user = c.fetchone()
        conn.close()
        
        # Calculate metrics
        total_mass = sum(m[2] or 0 for m in materials)
        total_gwp = sum(m[3] or 0 for m in materials)
        avg_recycled = sum(m[4] or 0 for m in materials) / len(materials) if materials else 0
        
        # Calculate virgin and recycled inputs
        recycled_input = sum((m[2] or 0) * (m[4] or 0) / 100 for m in materials)
        virgin_input = total_mass - recycled_input
        
        # BRSR Principle 6 Format
        report = {
            'report_metadata': {
                'report_id': f"BRSR-{project_id[:8].upper()}-{datetime.now().strftime('%Y%m%d')}",
                'report_type': 'BRSR Principle 6 - Environment',
                'regulation_reference': 'SEBI Circular SEBI/HO/CFD/CMD-2/P/CIR/2021/562',
                'financial_year': f"FY {datetime.now().year}-{(datetime.now().year + 1) % 100:02d}",
                'generation_date': datetime.now().isoformat(),
                'software': 'JNARRDC LCA Portal v1.0'
            },
            'entity_details': {
                'name_of_listed_entity': user[1] if user else 'Not specified',
                'cin': 'To be provided',
                'year_of_incorporation': 'To be provided',
                'registered_office_address': 'To be provided',
                'reporting_boundary': 'Standalone'
            },
            'principle_6_essential_indicators': {
                'section_a_energy_consumption': {
                    'disclosure': 'Details of total energy consumption and energy intensity',
                    'total_energy_consumption_gj': round(total_gwp * 0.0036, 2),  # Estimate
                    'energy_intensity_per_unit': round((total_gwp * 0.0036) / total_mass, 4) if total_mass > 0 else 0,
                    'renewable_energy_percent': 0,  # To be provided
                    'note': 'Energy values estimated from GWP calculations'
                },
                'section_b_water': {
                    'disclosure': 'Water withdrawal and consumption',
                    'total_water_withdrawal_kl': 'To be provided',
                    'water_intensity': 'To be provided',
                    'note': 'Water data not available from LCA module'
                },
                'section_c_emissions': {
                    'disclosure': 'Details of air emissions and GHG emissions',
                    'scope_1_emissions_mtco2e': 0,  # Direct emissions - not calculated in this LCA
                    'scope_2_emissions_mtco2e': round(total_gwp / 1000, 4),  # Indirect from materials
                    'scope_3_emissions_mtco2e': round(total_gwp / 1000 * 0.1, 4),  # Estimate for transport
                    'total_ghg_emissions_mtco2e': round(total_gwp / 1000, 4),
                    'ghg_intensity_per_rupee_turnover': 'To be calculated',
                    'methodology': 'IPCC AR6 emission factors via JNARRDC LCA Portal',
                    'breakdown_by_material': [
                        {
                            'material': m[0],
                            'gwp_kgco2eq': round(m[3] or 0, 2),
                            'percentage': round((m[3] or 0) / total_gwp * 100, 1) if total_gwp > 0 else 0
                        } for m in materials
                    ]
                },
                'section_d_waste': {
                    'disclosure': 'Details of waste generated and recycled',
                    'total_waste_generated_mt': round(total_mass * 0.05 / 1000, 4),  # Estimate 5% waste
                    'waste_recycled_mt': round(total_mass * 0.05 * (avg_recycled / 100) / 1000, 4),
                    'waste_to_landfill_mt': round(total_mass * 0.05 * (1 - avg_recycled / 100) / 1000, 4),
                    'waste_intensity': round(total_mass * 0.05 / total_mass, 4) if total_mass > 0 else 0,
                    'note': 'Waste estimated at 5% of material input'
                },
                'section_e_circularity': {
                    'disclosure': 'Details related to circularity',
                    'total_raw_material_consumed_mt': round(total_mass / 1000, 4),
                    'recycled_input_material_mt': round(recycled_input / 1000, 4),
                    'virgin_input_material_mt': round(virgin_input / 1000, 4),
                    'recycled_content_percentage': round(avg_recycled, 1),
                    'products_reclaimed_at_eol_percent': round(avg_recycled * 0.8, 1),  # Estimate
                    'mci_score': project[10] if len(project) > 10 else 0,
                    'circular_design_score': project[11] if len(project) > 11 else 0,
                    'designed_for_disassembly': bool(project[6]) if len(project) > 6 else False
                }
            },
            'principle_6_leadership_indicators': {
                'water_discharge_quality': 'Not applicable to LCA scope',
                'biodiversity_impact': 'Not assessed',
                'emission_management': {
                    'nox_sox_control': 'To be provided',
                    'pm_control': 'To be provided'
                },
                'environmental_compliance': {
                    'show_cause_notices': 0,
                    'penalties_paid': 0
                }
            },
            'material_breakdown': [
                {
                    'material_name': m[0],
                    'material_type': m[1],
                    'quantity_kg': m[2] or 0,
                    'recycled_content_percent': m[4] or 0,
                    'gwp_kgco2eq': round(m[3] or 0, 2),
                    'virgin_fraction_kg': round((m[2] or 0) * (100 - (m[4] or 0)) / 100, 2),
                    'recycled_fraction_kg': round((m[2] or 0) * (m[4] or 0) / 100, 2)
                } for m in materials
            ],
            'summary_metrics': {
                'total_materials_kg': round(total_mass, 2),
                'total_gwp_kgco2eq': round(total_gwp, 2),
                'average_recycled_content': round(avg_recycled, 1),
                'circular_readiness': 'High' if avg_recycled >= 50 else ('Medium' if avg_recycled >= 25 else 'Low')
            },
            'compliance_notes': [
                'This report follows SEBI BRSR format for Principle 6 (Environment)',
                'GWP calculations use IPCC AR6 and Ecoinvent 3.9 emission factors',
                'MCI calculated using Ellen MacArthur Foundation methodology',
                'Some indicators require additional data from facility operations',
                'Report generated for disclosure purposes - verify with auditor'
            ]
        }
        
        return jsonify(report), 200
        
    except Exception as e:
        print(f"BRSR Export Error: {e}")
        return jsonify({"detail": str(e)}), 500


@app.route('/api/v1/projects/<project_id>/brsr-export/excel', methods=['GET', 'OPTIONS'])
def brsr_export_excel(project_id):
    """Generate BRSR Excel Report with SEBI Format"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        c.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        project = c.fetchone()
        if not project:
            conn.close()
            return jsonify({"detail": "Project not found"}), 404
        
        c.execute("""SELECT material_name, material_type, quantity, gwp, 
                     recycled_content, transport_distance 
                     FROM project_materials WHERE project_id = ?""", (project_id,))
        materials = c.fetchall()
        
        c.execute("SELECT full_name, organization_name, email FROM users WHERE id = ?", (project[3],))
        user = c.fetchone()
        conn.close()
        
        # Calculate metrics
        total_mass = sum(m[2] or 0 for m in materials)
        total_gwp = sum(m[3] or 0 for m in materials)
        avg_recycled = sum(m[4] or 0 for m in materials) / len(materials) if materials else 0
        recycled_input = sum((m[2] or 0) * (m[4] or 0) / 100 for m in materials)
        virgin_input = total_mass - recycled_input
        
        # Create Excel workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "BRSR Principle 6"
        
        # Styles
        header_font = Font(name='Arial', size=16, bold=True, color='1F4E79')
        subheader_font = Font(name='Arial', size=12, bold=True, color='FFFFFF')
        bold_font = Font(name='Arial', size=10, bold=True)
        normal_font = Font(name='Arial', size=10)
        small_font = Font(name='Arial', size=9, italic=True, color='666666')
        green_fill = PatternFill(start_color='2E7D32', end_color='2E7D32', fill_type='solid')
        light_green_fill = PatternFill(start_color='E8F5E9', end_color='E8F5E9', fill_type='solid')
        
        # Column widths
        ws.column_dimensions['A'].width = 5
        ws.column_dimensions['B'].width = 40
        ws.column_dimensions['C'].width = 25
        ws.column_dimensions['D'].width = 20
        ws.column_dimensions['E'].width = 20
        
        row = 1
        
        # Header
        ws.merge_cells('B1:E1')
        ws['B1'] = 'BUSINESS RESPONSIBILITY AND SUSTAINABILITY REPORT'
        ws['B1'].font = header_font
        ws['B1'].alignment = Alignment(horizontal='center')
        ws.row_dimensions[1].height = 30
        
        row = 2
        ws.merge_cells('B2:E2')
        ws['B2'] = 'PRINCIPLE 6: ENVIRONMENT - JNARRDC LCA Portal'
        ws['B2'].font = Font(name='Arial', size=12, italic=True, color='666666')
        ws['B2'].alignment = Alignment(horizontal='center')
        
        row = 4
        ws.merge_cells('B4:E4')
        ws['B4'] = 'SECTION A: ENERGY CONSUMPTION'
        ws['B4'].font = subheader_font
        ws['B4'].fill = green_fill
        ws.row_dimensions[4].height = 22
        
        row = 5
        ws['B5'] = 'Parameter'
        ws['C5'] = 'Unit'
        ws['D5'] = 'Current FY'
        ws['E5'] = 'Previous FY'
        for cell in ['B5', 'C5', 'D5', 'E5']:
            ws[cell].font = bold_font
            ws[cell].fill = light_green_fill
        
        row = 6
        ws['B6'] = 'Total energy consumption'
        ws['C6'] = 'GJ'
        ws['D6'] = round(total_gwp * 0.0036, 2)
        ws['E6'] = '-'
        
        row = 7
        ws['B7'] = 'Energy intensity per unit output'
        ws['C7'] = 'GJ/MT'
        ws['D7'] = round((total_gwp * 0.0036) / (total_mass/1000), 4) if total_mass > 0 else 0
        ws['E7'] = '-'
        
        # Section C: Emissions
        row = 9
        ws.merge_cells('B9:E9')
        ws['B9'] = 'SECTION C: GHG EMISSIONS'
        ws['B9'].font = subheader_font
        ws['B9'].fill = green_fill
        ws.row_dimensions[9].height = 22
        
        row = 10
        ws['B10'] = 'Parameter'
        ws['C10'] = 'Unit'
        ws['D10'] = 'Current FY'
        ws['E10'] = 'Previous FY'
        for cell in ['B10', 'C10', 'D10', 'E10']:
            ws[cell].font = bold_font
            ws[cell].fill = light_green_fill
        
        row = 11
        ws['B11'] = 'Scope 1 (Direct emissions)'
        ws['C11'] = 'MTCO2e'
        ws['D11'] = 0
        ws['E11'] = '-'
        
        row = 12
        ws['B12'] = 'Scope 2 (Indirect - Materials)'
        ws['C12'] = 'MTCO2e'
        ws['D12'] = round(total_gwp / 1000, 4)
        ws['E12'] = '-'
        
        row = 13
        ws['B13'] = 'Scope 3 (Transport)'
        ws['C13'] = 'MTCO2e'
        ws['D13'] = round(total_gwp / 1000 * 0.1, 4)
        ws['E13'] = '-'
        
        row = 14
        ws['B14'] = 'Total GHG Emissions'
        ws['C14'] = 'MTCO2e'
        ws['D14'] = round(total_gwp / 1000, 4)
        ws['D14'].font = bold_font
        ws['E14'] = '-'
        
        # Section E: Circularity
        row = 16
        ws.merge_cells('B16:E16')
        ws['B16'] = 'SECTION E: CIRCULARITY'
        ws['B16'].font = subheader_font
        ws['B16'].fill = green_fill
        ws.row_dimensions[16].height = 22
        
        row = 17
        ws['B17'] = 'Parameter'
        ws['C17'] = 'Unit'
        ws['D17'] = 'Current FY'
        ws['E17'] = 'Previous FY'
        for cell in ['B17', 'C17', 'D17', 'E17']:
            ws[cell].font = bold_font
            ws[cell].fill = light_green_fill
        
        row = 18
        ws['B18'] = 'Total raw material consumed'
        ws['C18'] = 'MT'
        ws['D18'] = round(total_mass / 1000, 4)
        ws['E18'] = '-'
        
        row = 19
        ws['B19'] = 'Recycled input material'
        ws['C19'] = 'MT'
        ws['D19'] = round(recycled_input / 1000, 4)
        ws['E19'] = '-'
        
        row = 20
        ws['B20'] = 'Virgin input material'
        ws['C20'] = 'MT'
        ws['D20'] = round(virgin_input / 1000, 4)
        ws['E20'] = '-'
        
        row = 21
        ws['B21'] = 'Recycled content percentage'
        ws['C21'] = '%'
        ws['D21'] = round(avg_recycled, 1)
        ws['E21'] = '-'
        
        row = 22
        ws['B22'] = 'Material Circularity Index (MCI)'
        ws['C22'] = 'Score (0-1)'
        ws['D22'] = project[10] if len(project) > 10 else 0
        ws['E22'] = '-'
        
        # Material breakdown
        row = 24
        ws.merge_cells('B24:E24')
        ws['B24'] = 'MATERIAL BREAKDOWN'
        ws['B24'].font = subheader_font
        ws['B24'].fill = green_fill
        ws.row_dimensions[24].height = 22
        
        row = 25
        ws['B25'] = 'Material'
        ws['C25'] = 'Quantity (kg)'
        ws['D25'] = 'Recycled %'
        ws['E25'] = 'GWP (kgCO2eq)'
        for cell in ['B25', 'C25', 'D25', 'E25']:
            ws[cell].font = bold_font
            ws[cell].fill = light_green_fill
        
        row = 26
        for m in materials:
            ws[f'B{row}'] = m[0]
            ws[f'C{row}'] = m[2] or 0
            ws[f'D{row}'] = f"{m[4] or 0}%"
            ws[f'E{row}'] = round(m[3] or 0, 2)
            row += 1
        
        # Footer
        row += 2
        ws.merge_cells(f'B{row}:E{row}')
        ws[f'B{row}'] = f'Report generated by JNARRDC LCA Portal | {datetime.now().strftime("%d/%m/%Y")} | SEBI BRSR Format'
        ws[f'B{row}'].font = small_font
        ws[f'B{row}'].alignment = Alignment(horizontal='center')
        
        # Save
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        filename = f"BRSR_Report_{project[1].replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.xlsx"
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        print(f"BRSR Excel Export Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"detail": str(e)}), 500


if __name__ == '__main__':
    # Initialize databases
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id TEXT PRIMARY KEY, 
                  email TEXT UNIQUE NOT NULL,
                  password TEXT NOT NULL,
                  full_name TEXT,
                  organization_name TEXT,
                  created_at TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS projects
                 (id TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  description TEXT,
                  status TEXT,
                  product_category TEXT,
                  target_lifespan INTEGER,
                  is_designed_for_disassembly INTEGER,
                  user_id TEXT NOT NULL,
                  gwp_total REAL DEFAULT 0,
                  mci_score REAL DEFAULT 0,
                  circular_design_score REAL DEFAULT 0,
                  created_at TEXT,
                  FOREIGN KEY(user_id) REFERENCES users(id))''')
    
    # Migration: Add new columns if they don't exist
    try:
        c.execute("SELECT gwp_total FROM projects LIMIT 1")
    except sqlite3.OperationalError:
        print("⚠️  Migrating projects table: adding gwp_total column")
        c.execute("ALTER TABLE projects ADD COLUMN gwp_total REAL DEFAULT 0")
        conn.commit()
    
    try:
        c.execute("SELECT mci_score FROM projects LIMIT 1")
    except sqlite3.OperationalError:
        print("⚠️  Migrating projects table: adding mci_score column")
        c.execute("ALTER TABLE projects ADD COLUMN mci_score REAL DEFAULT 0")
        conn.commit()
    
    try:
        c.execute("SELECT circular_design_score FROM projects LIMIT 1")
    except sqlite3.OperationalError:
        print("⚠️  Migrating projects table: adding circular_design_score column")
        c.execute("ALTER TABLE projects ADD COLUMN circular_design_score REAL DEFAULT 0")
        conn.commit()
        
    c.execute('''CREATE TABLE IF NOT EXISTS project_materials
                 (id TEXT PRIMARY KEY,
                  project_id TEXT NOT NULL,
                  material_name TEXT NOT NULL,
                  material_type TEXT NOT NULL,
                  quantity REAL NOT NULL,
                  unit TEXT,
                  recycled_content REAL DEFAULT 0,
                  gwp REAL,
                  transport_distance REAL DEFAULT 0,
                  created_at TEXT,
                  FOREIGN KEY(project_id) REFERENCES projects(id))''')
    conn.commit()
    conn.close()
    
    print("✅ Database initialized")
    print("🚀 Starting backend on http://127.0.0.1:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
