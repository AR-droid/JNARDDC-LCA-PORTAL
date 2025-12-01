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
    
    # Emission factors (kg CO2-eq per kg material)
    emission_factors = {
        'aluminium_primary': 12.5,      # Primary aluminium smelting
        'aluminium_secondary': 0.6,      # Recycled aluminium
        'copper_primary': 3.5,           # Primary copper extraction
        'copper_secondary': 0.5,         # Recycled copper
        'steel_primary': 2.1,            # Virgin steel
        'steel_secondary': 0.4,          # Recycled steel
        'lithium': 15.0,                 # Lithium carbonate
        'cobalt': 10.0,                  # Cobalt sulfate
        'nickel': 8.5,                   # Primary nickel
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


# Industry benchmark lifespans (in years)
INDUSTRY_BENCHMARKS = {
    'batteries': {'avg_lifespan': 8, 'avg_mci': 0.35, 'name': 'Battery Pack'},
    'electronics': {'avg_lifespan': 5, 'avg_mci': 0.28, 'name': 'Electronics'},
    'automotive': {'avg_lifespan': 15, 'avg_mci': 0.45, 'name': 'Automotive Component'},
    'industrial': {'avg_lifespan': 20, 'avg_mci': 0.40, 'name': 'Industrial Equipment'},
    'construction': {'avg_lifespan': 50, 'avg_mci': 0.52, 'name': 'Construction Material'},
    'packaging': {'avg_lifespan': 1, 'avg_mci': 0.65, 'name': 'Packaging'},
    'other': {'avg_lifespan': 10, 'avg_mci': 0.35, 'name': 'General Product'}
}

# Emission factors for virgin and recycled materials (kg CO2-eq per kg)
EMISSION_FACTORS = {
    'aluminium_primary': {'virgin': 12.5, 'recycled': 0.6},
    'aluminium_secondary': {'virgin': 0.6, 'recycled': 0.6},
    'copper_primary': {'virgin': 3.5, 'recycled': 0.5},
    'copper_secondary': {'virgin': 0.5, 'recycled': 0.5},
    'steel_primary': {'virgin': 2.1, 'recycled': 0.4},
    'steel_secondary': {'virgin': 0.4, 'recycled': 0.4},
    'lithium': {'virgin': 15.0, 'recycled': 1.5},
    'cobalt': {'virgin': 10.0, 'recycled': 1.0},
    'nickel': {'virgin': 8.5, 'recycled': 0.85},
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
        'keywords': ['aluminium', 'aluminum', 'al', 'alu'],
        'forms': ['sheet', 'wire', 'rod', 'bar', 'plate', 'tube', 'foil', 'ingot', 'casting'],
        'default_type': 'aluminium_primary',
        'recycled_type': 'aluminium_secondary',
        'national_baseline_recycled': 25,  # India avg recycled content %
        'gwp_factor': 12.5
    },
    'copper': {
        'keywords': ['copper', 'cu', 'etp', 'brass'],
        'forms': ['wire', 'cable', 'sheet', 'rod', 'tube', 'pipe', 'coil'],
        'default_type': 'copper_primary',
        'recycled_type': 'copper_secondary',
        'national_baseline_recycled': 35,  # India avg recycled content %
        'gwp_factor': 3.5
    },
    'steel': {
        'keywords': ['steel', 'iron', 'fe', 'stainless'],
        'forms': ['sheet', 'rod', 'bar', 'beam', 'wire', 'plate', 'tube', 'coil'],
        'default_type': 'steel_primary',
        'recycled_type': 'steel_secondary',
        'national_baseline_recycled': 40,  # India avg recycled content %
        'gwp_factor': 2.1
    },
    'lithium': {
        'keywords': ['lithium', 'li', 'lithium-ion', 'lion', 'lifepo4'],
        'forms': ['carbonate', 'hydroxide', 'oxide', 'battery', 'cell'],
        'default_type': 'lithium',
        'recycled_type': 'lithium',
        'national_baseline_recycled': 5,
        'gwp_factor': 15.0
    },
    'cobalt': {
        'keywords': ['cobalt', 'co'],
        'forms': ['sulfate', 'oxide', 'powder'],
        'default_type': 'cobalt',
        'recycled_type': 'cobalt',
        'national_baseline_recycled': 10,
        'gwp_factor': 10.0
    },
    'nickel': {
        'keywords': ['nickel', 'ni'],
        'forms': ['class1', 'ferronickel', 'sulfate', 'plating'],
        'default_type': 'nickel',
        'recycled_type': 'nickel',
        'national_baseline_recycled': 15,
        'gwp_factor': 8.5
    }
}

# Product category detection
PRODUCT_CATEGORIES = {
    'ev_battery': ['battery', 'cell', 'ev', 'electric vehicle', 'lithium-ion', 'bms'],
    'power_transmission': ['transformer', 'cable', 'wire', 'conductor', 'transmission', 'power line'],
    'construction': ['building', 'structure', 'beam', 'rebar', 'construction', 'roof'],
    'automotive': ['car', 'vehicle', 'motor', 'engine', 'chassis', 'body'],
    'electronics': ['pcb', 'circuit', 'electronic', 'component', 'chip'],
    'packaging': ['can', 'container', 'foil', 'packaging', 'wrap'],
    'appliances': ['appliance', 'refrigerator', 'ac', 'washing', 'machine']
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
    
    # Extract quantity patterns (e.g., "10kg", "5 kg", "100 grams")
    quantity_patterns = [
        r'(\d+(?:\.\d+)?)\s*(?:kg|kilogram|kilograms)',
        r'(\d+(?:\.\d+)?)\s*(?:g|gram|grams)',
        r'(\d+(?:\.\d+)?)\s*(?:t|ton|tons|tonne|tonnes)',
        r'(\d+(?:\.\d+)?)\s*(?:lb|pound|pounds)',
    ]
    
    quantities = []
    for pattern in quantity_patterns:
        matches = re.findall(pattern, description_lower)
        for match in matches:
            # Convert to kg
            value = float(match)
            if 'gram' in pattern or r'\bg\b' in pattern:
                value = value / 1000
            elif 'ton' in pattern:
                value = value * 1000
            elif 'pound' in pattern:
                value = value * 0.453592
            quantities.append(value)
    
    # If no quantity found, default to 1kg
    if not quantities:
        quantities = [1.0]
        result['assumptions'].append({
            'field': 'quantity',
            'value': '1 kg',
            'reason': 'No quantity specified, using default'
        })
    
    result['tokens'].append({'type': 'quantity', 'values': quantities})
    
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
    for material_key, material_data in NLP_MATERIAL_PATTERNS.items():
        for keyword in material_data['keywords']:
            if keyword in description_lower:
                # Check for forms
                detected_form = None
                for form in material_data['forms']:
                    if form in description_lower:
                        detected_form = form
                        break
                
                # Determine if recycled
                is_recycled = 'recycled' in description_lower or 'secondary' in description_lower or 'scrap' in description_lower
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
                    'is_recycled': is_recycled
                })
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
    
    for category, keywords in PRODUCT_CATEGORIES.items():
        for keyword in keywords:
            if keyword in description_lower:
                result['project']['product_category'] = category
                result['tokens'].append({'type': 'category', 'value': category})
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
    coating_keywords = ['pvc', 'coated', 'anodized', 'galvanized', 'painted', 'plated', 'chrome']
    for keyword in coating_keywords:
        if keyword in description_lower:
            result['tokens'].append({'type': 'coating', 'value': keyword})
    
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
        
        # System materials (default library)
        system_materials = [
            {"id": "al_primary", "name": "Primary Aluminium", "type": "aluminium_primary", "unit": "kg", "gwp_factor": 12.5, "source": "system", "region": "Global"},
            {"id": "al_secondary", "name": "Secondary Aluminium (Recycled)", "type": "aluminium_secondary", "unit": "kg", "gwp_factor": 0.6, "source": "system", "region": "Global"},
            {"id": "cu_primary", "name": "Primary Copper", "type": "copper_primary", "unit": "kg", "gwp_factor": 3.5, "source": "system", "region": "Global"},
            {"id": "cu_secondary", "name": "Secondary Copper (Recycled)", "type": "copper_secondary", "unit": "kg", "gwp_factor": 0.5, "source": "system", "region": "Global"},
            {"id": "steel_primary", "name": "Virgin Steel", "type": "steel_primary", "unit": "kg", "gwp_factor": 2.1, "source": "system", "region": "Global"},
            {"id": "steel_secondary", "name": "Recycled Steel", "type": "steel_secondary", "unit": "kg", "gwp_factor": 0.4, "source": "system", "region": "Global"},
            {"id": "lithium", "name": "Lithium Carbonate", "type": "lithium", "unit": "kg", "gwp_factor": 15.0, "source": "system", "region": "Global"},
            {"id": "cobalt", "name": "Cobalt Sulfate", "type": "cobalt", "unit": "kg", "gwp_factor": 10.0, "source": "system", "region": "Global"},
            {"id": "nickel", "name": "Primary Nickel", "type": "nickel", "unit": "kg", "gwp_factor": 8.5, "source": "system", "region": "Global"},
        ]
        
        # India-specific materials (JNARRDC baseline)
        india_materials = [
            {"id": "al_india_primary", "name": "Primary Aluminium (India)", "type": "aluminium_primary", "unit": "kg", "gwp_factor": 16.5, "source": "jnarrdc", "region": "India"},
            {"id": "al_india_secondary", "name": "Secondary Aluminium (India)", "type": "aluminium_secondary", "unit": "kg", "gwp_factor": 0.8, "source": "jnarrdc", "region": "India"},
            {"id": "cu_india_primary", "name": "Primary Copper (India)", "type": "copper_primary", "unit": "kg", "gwp_factor": 4.2, "source": "jnarrdc", "region": "India"},
            {"id": "cu_india_secondary", "name": "Secondary Copper (India)", "type": "copper_secondary", "unit": "kg", "gwp_factor": 0.6, "source": "jnarrdc", "region": "India"},
            {"id": "steel_india_primary", "name": "Virgin Steel (India)", "type": "steel_primary", "unit": "kg", "gwp_factor": 2.8, "source": "jnarrdc", "region": "India"},
            {"id": "steel_india_secondary", "name": "Recycled Steel (India)", "type": "steel_secondary", "unit": "kg", "gwp_factor": 0.5, "source": "jnarrdc", "region": "India"},
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
        
        return jsonify({
            "system": system_materials,
            "india": india_materials,
            "custom": custom_materials,
            "all": system_materials + india_materials + custom_materials
        }), 200
        
    except Exception as e:
        print(f"Combined Library Error: {e}")
        return jsonify({"detail": str(e)}), 500


@app.route('/api/v1/materials/library', methods=['GET', 'OPTIONS'])
def material_library():
    if request.method == 'OPTIONS':
        return '', 200
    
    materials = [
        {"id": "al_primary", "name": "Primary Aluminium", "type": "aluminium_primary", "unit": "kg", "gwp_factor": 12.5},
        {"id": "al_secondary", "name": "Secondary Aluminium (Recycled)", "type": "aluminium_secondary", "unit": "kg", "gwp_factor": 0.6},
        {"id": "cu_primary", "name": "Primary Copper", "type": "copper_primary", "unit": "kg", "gwp_factor": 3.5},
        {"id": "cu_secondary", "name": "Secondary Copper (Recycled)", "type": "copper_secondary", "unit": "kg", "gwp_factor": 0.5},
        {"id": "steel_primary", "name": "Virgin Steel", "type": "steel_primary", "unit": "kg", "gwp_factor": 2.1},
        {"id": "steel_secondary", "name": "Recycled Steel", "type": "steel_secondary", "unit": "kg", "gwp_factor": 0.4},
        {"id": "lithium", "name": "Lithium Carbonate", "type": "lithium", "unit": "kg", "gwp_factor": 15.0},
        {"id": "cobalt", "name": "Cobalt Sulfate", "type": "cobalt", "unit": "kg", "gwp_factor": 10.0},
        {"id": "nickel", "name": "Primary Nickel", "type": "nickel", "unit": "kg", "gwp_factor": 8.5},
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
        
        return jsonify({
            'summary': {
                'total_gwp': round(total_gwp, 2),
                'total_mass': round(total_mass, 2),
                'material_count': len(materials),
                'avg_recycled_content': round(avg_recycled, 1),
                'mci_score': mci_score,
                'circular_design_score': circular_score
            },
            'gwp_by_material': gwp_by_material,
            'gwp_by_type': type_breakdown,
            'recycled_analysis': recycled_analysis,
            'mci_breakdown': mci_breakdown,
            'lifecycle_stages': lifecycle_stages,
            'process_flow': process_flow
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
