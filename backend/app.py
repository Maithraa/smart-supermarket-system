import os
import uuid
import datetime
from io import BytesIO
from functools import wraps
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import jwt
import qrcode

from config import Config
from db import query, execute, execute_count

app = Flask(__name__)
app.config.from_object(Config)

# Ensure upload directory exists
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

CORS(app, origins=[Config.FRONTEND_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"])
socketio = SocketIO(app, cors_allowed_origins="*")

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def error(msg, code=400):
    return jsonify({"error": msg}), code

def notify(event, data):
    socketio.emit(event, data)

# ----------------------------------------------------
# JWT AUTHENTICATION HELPERS & DECORATOR
# ----------------------------------------------------
def create_token(user):
    payload = {
        "user_id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "full_name": user["full_name"],
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm="HS256")

def get_current_user():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1].strip()
    try:
        decoded = jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
        return decoded
    except Exception:
        return None

def auth_required(roles=None):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user:
                return error("Unauthorized: Invalid or expired token", 401)
            if roles and user.get("role") not in roles:
                return error("Forbidden: Insufficient privileges", 403)
            request.current_user = user
            return fn(*args, **kwargs)
        return wrapper
    return decorator

# ----------------------------------------------------
# HEALTH & STATIC FILE SERVING
# ----------------------------------------------------
@app.get("/api/health")
def health():
    return jsonify({
        "status": "online",
        "service": "Smart Supermarket Billing & Complaint Resolution Backend",
        "timestamp": datetime.datetime.now().isoformat()
    })

@app.get("/uploads/<filename>")
def serve_upload(filename):
    return send_from_directory(Config.UPLOAD_FOLDER, filename)

@app.post("/api/upload")
def upload_file():
    if "file" not in request.files:
        return error("No file uploaded", 400)
    file = request.files["file"]
    if file.filename == "":
        return error("Empty file name", 400)
    if file and allowed_file(file.filename):
        ext = file.filename.rsplit(".", 1)[1].lower()
        unique_name = f"{uuid.uuid4().hex[:12]}.{ext}"
        filepath = os.path.join(Config.UPLOAD_FOLDER, unique_name)
        file.save(filepath)
        url = f"http://localhost:5000/uploads/{unique_name}"
        return jsonify({"url": url, "filename": unique_name}), 201
    return error("Invalid file format. Allowed: png, jpg, jpeg, gif, webp", 400)

# ----------------------------------------------------
# 1. AUTHENTICATION APIS (SIGNUP, LOGIN, PROFILE)
# ----------------------------------------------------
@app.post("/api/auth/signup")
def signup():
    data = request.get_json(silent=True) or {}
    full_name = data.get("full_name", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")

    if not full_name or not email or not password:
        return error("Full name, email, and password are required")
    if password != confirm_password:
        return error("Passwords do not match")
    if len(password) < 6:
        return error("Password must be at least 6 characters long")

    # Check for existing email
    existing = query("SELECT id FROM users WHERE email = %s", (email,), one=True)
    if existing:
        return error("An account with this email already exists. Please log in.", 409)

    # Security requirement: Never allow users to select Admin or Cashier role through public signup
    role = "Customer"
    password_hash = generate_password_hash(password)

    user_id = execute(
        "INSERT INTO users (full_name, email, password_hash, role, phone, status) VALUES (%s, %s, %s, %s, %s, 'Active')",
        (full_name, email, password_hash, role, phone)
    )

    customer_code = f"CUST-{user_id:04d}"
    execute(
        "INSERT INTO customers (user_id, customer_code, phone, membership_tier) VALUES (%s, %s, %s, 'Standard')",
        (user_id, customer_code, phone)
    )

    user_data = {
        "id": user_id,
        "email": email,
        "full_name": full_name,
        "role": role,
        "phone": phone,
        "customer_code": customer_code
    }
    token = create_token(user_data)

    return jsonify({
        "message": "Account created successfully",
        "token": token,
        "user": user_data,
        "redirect": "/customer/dashboard"
    }), 201

@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return error("Email and password are required")

    user = query("SELECT * FROM users WHERE email = %s", (email,), one=True)
    if not user:
        return error("Invalid email or password", 401)

    if not check_password_hash(user["password_hash"], password):
        return error("Invalid email or password", 401)

    if user["status"] != "Active":
        return error("Account has been deactivated. Please contact administration.", 403)

    user_data = {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "phone": user.get("phone", "")
    }

    # Enrich based on role
    redirect = "/customer/dashboard"
    if user["role"] == "Cashier":
        c = query("SELECT * FROM cashiers WHERE user_id = %s", (user["id"],), one=True)
        if c:
            user_data["cashier_id"] = c["id"]
            user_data["cashier_name"] = c["cashier_name"]
            user_data["counter_no"] = c["counter_no"]
            user_data["cashier_code"] = c["cashier_code"]
        redirect = "/cashier/dashboard"
    elif user["role"] == "Admin":
        a = query("SELECT * FROM admins WHERE user_id = %s", (user["id"],), one=True)
        if a:
            user_data["department"] = a["department"]
        redirect = "/admin/dashboard"
    else:
        cust = query("SELECT * FROM customers WHERE user_id = %s", (user["id"],), one=True)
        if cust:
            user_data["customer_id"] = cust["id"]
            user_data["customer_code"] = cust["customer_code"]
            user_data["membership_tier"] = cust["membership_tier"]

    token = create_token(user_data)
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": user_data,
        "redirect": redirect
    })

@app.get("/api/auth/me")
@auth_required()
def get_me():
    user = query("SELECT id, email, full_name, role, phone, status, created_at FROM users WHERE id = %s", (request.current_user["user_id"],), one=True)
    if not user:
        return error("User not found", 404)

    if user["role"] == "Cashier":
        c = query("SELECT * FROM cashiers WHERE user_id = %s", (user["id"],), one=True)
        if c:
            user.update({"cashier_id": c["id"], "cashier_name": c["cashier_name"], "counter_no": c["counter_no"], "cashier_code": c["cashier_code"], "shift": c["shift"]})
    elif user["role"] == "Customer":
        cust = query("SELECT * FROM customers WHERE user_id = %s", (user["id"],), one=True)
        if cust:
            user.update({"customer_id": cust["id"], "customer_code": cust["customer_code"], "membership_tier": cust["membership_tier"]})
    return jsonify(user)

@app.put("/api/auth/profile")
@auth_required()
def update_profile():
    data = request.get_json(silent=True) or {}
    full_name = data.get("full_name", "").strip()
    phone = data.get("phone", "").strip()
    user_id = request.current_user["user_id"]

    if not full_name:
        return error("Full name is required")

    execute("UPDATE users SET full_name = %s, phone = %s WHERE id = %s", (full_name, phone, user_id))
    # Update linked table if customer
    if request.current_user["role"] == "Customer":
        execute("UPDATE customers SET phone = %s WHERE user_id = %s", (phone, user_id))
    elif request.current_user["role"] == "Cashier":
        execute("UPDATE cashiers SET cashier_name = %s, phone = %s WHERE user_id = %s", (full_name, phone, user_id))

    return jsonify({"message": "Profile updated successfully", "full_name": full_name, "phone": phone})

@app.put("/api/auth/change-password")
@auth_required()
def change_password():
    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")
    user_id = request.current_user["user_id"]

    if not current_password or not new_password:
        return error("Current and new passwords are required")
    if len(new_password) < 6:
        return error("New password must be at least 6 characters")

    user = query("SELECT password_hash FROM users WHERE id = %s", (user_id,), one=True)
    if not user or not check_password_hash(user["password_hash"], current_password):
        return error("Current password does not match", 400)

    new_hash = generate_password_hash(new_password)
    execute("UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, user_id))
    return jsonify({"message": "Password changed successfully"})

# ----------------------------------------------------
# 2. BILL MANAGEMENT & VERIFICATION APIS
# ----------------------------------------------------
@app.get("/api/bills/<bill_no>")
def bill_detail(bill_no):
    b = query("SELECT * FROM bills WHERE bill_no = %s", (bill_no,), one=True)
    if not b:
        return error("Bill not found", 404)
    b["items"] = query("SELECT * FROM bill_items WHERE bill_id = %s", (b["id"],))
    b["received_items"] = query("SELECT * FROM received_items WHERE bill_id = %s", (b["id"],))
    return jsonify(b)

@app.get("/api/bills/<bill_no>/qr")
def bill_qr(bill_no):
    b = query("SELECT id FROM bills WHERE bill_no = %s", (bill_no,), one=True)
    if not b:
        return error("Bill not found", 404)
    img = qrcode.make(bill_no)
    out = BytesIO()
    img.save(out, format="PNG")
    out.seek(0)
    return send_file(out, mimetype="image/png")

@app.post("/api/bills/<bill_no>/verify")
def verify_bill(bill_no):
    b = query("SELECT * FROM bills WHERE bill_no = %s", (bill_no,), one=True)
    if not b:
        return error("Bill not found", 404)

    expected = query("SELECT product_name, quantity, unit_price, total_price FROM bill_items WHERE bill_id = %s", (b["id"],))
    received = query("SELECT product_name, quantity FROM received_items WHERE bill_id = %s", (b["id"],))

    exp_map = {x["product_name"].strip().lower(): {"name": x["product_name"], "quantity": int(x["quantity"]), "unit_price": x["unit_price"]} for x in expected}
    rec_map = {x["product_name"].strip().lower(): {"name": x["product_name"], "quantity": int(x["quantity"])} for x in received}

    all_keys = set(exp_map.keys()) | set(rec_map.keys())
    mismatches = []

    for k in sorted(all_keys):
        exp_qty = exp_map[k]["quantity"] if k in exp_map else 0
        rec_qty = rec_map[k]["quantity"] if k in rec_map else 0
        prod_name = exp_map[k]["name"] if k in exp_map else rec_map[k]["name"]

        if exp_qty != rec_qty:
            discrepancy_type = "Quantity Mismatch"
            if exp_qty > 0 and rec_qty == 0:
                discrepancy_type = "Missing Product"
            elif exp_qty == 0 and rec_qty > 0:
                discrepancy_type = "Extra / Wrong Product"
            elif exp_qty > 0 and rec_qty > 0 and exp_qty != rec_qty:
                discrepancy_type = "Quantity Mismatch"

            mismatches.append({
                "product": prod_name,
                "expected": exp_qty,
                "received": rec_qty,
                "discrepancy_type": discrepancy_type,
                "unit_price": exp_map.get(k, {}).get("unit_price", 0.0)
            })

    # Identify wrong product pairings (e.g. expected Dove Soap x2, received Lux Soap x2)
    missing = [m for m in mismatches if m["discrepancy_type"] == "Missing Product"]
    extra = [m for m in mismatches if m["discrepancy_type"] == "Extra / Wrong Product"]
    if len(missing) == 1 and len(extra) == 1 and missing[0]["expected"] == extra[0]["received"]:
        for m in mismatches:
            if m["discrepancy_type"] in ["Missing Product", "Extra / Wrong Product"]:
                m["discrepancy_type"] = f"Wrong Product: Expected '{missing[0]['product']}', got '{extra[0]['product']}'"

    matched = len(mismatches) == 0
    verification_status = "Verified Successfully" if matched else "Mismatch Detected"

    execute("UPDATE bills SET is_verified = %s, verification_status = %s WHERE id = %s", (matched, verification_status, b["id"]))

    return jsonify({
        "bill_no": bill_no,
        "matched": matched,
        "mismatches": mismatches,
        "cashier": b["cashier_name"],
        "counter": b["counter_no"],
        "total_amount": b["total_amount"],
        "customer_name": b["customer_name"],
        "verification_status": verification_status,
        "bill_items": expected,
        "received_items": received
    })

@app.get("/api/bills/customer/<customer_name>")
def customer_bills(customer_name):
    bills = query("SELECT * FROM bills WHERE customer_name = %s ORDER BY created_at DESC", (customer_name,))
    for b in bills:
        b["items"] = query("SELECT * FROM bill_items WHERE bill_id = %s", (b["id"],))
    return jsonify(bills)

# ----------------------------------------------------
# 3. COMPLAINT WORKFLOW APIS (RAISE, TRACK, RESOLVE)
# ----------------------------------------------------
@app.post("/api/complaints")
def create_complaint():
    d = request.get_json(silent=True) or {}
    bill_no = d.get("bill_no", "").strip()
    customer_name = d.get("customer_name", "").strip()
    issue_type = d.get("issue_type", "Wrong Product Received").strip()
    description = d.get("description", "").strip()
    product_name = d.get("product_name", "").strip()
    expected_product = d.get("expected_product", "").strip()
    received_product = d.get("received_product", "").strip()
    expected_quantity = int(d.get("expected_quantity", 1))
    received_quantity = int(d.get("received_quantity", 1))
    image_url = d.get("image_url", "")
    customer_email = d.get("customer_email", "")
    customer_phone = d.get("customer_phone", "")

    if not bill_no or not customer_name or not description:
        return error("Bill number, customer name, and description are required")

    b = query("SELECT * FROM bills WHERE bill_no = %s", (bill_no,), one=True)
    if not b:
        return error(f"Bill '{bill_no}' not found in supermarket records", 404)

    # Unique complaint identifier
    complaint_no = f"CMP-{bill_no}-{uuid.uuid4().hex[:4].upper()}"

    # AUTOMATIC CASHIER ASSIGNMENT: Identify cashier who billed it
    cashier_name = b["cashier_name"]
    cashier_id = b.get("cashier_id")
    if not cashier_id:
        c_record = query("SELECT id FROM cashiers WHERE cashier_name = %s", (cashier_name,), one=True)
        if c_record:
            cashier_id = c_record["id"]

    initial_status = "Assigned to Cashier"

    cid = execute(
        """INSERT INTO complaints (
            complaint_no, bill_id, bill_no, customer_id, customer_name, customer_email, customer_phone,
            issue_type, product_name, expected_product, received_product, expected_quantity, received_quantity,
            description, image_url, status, assigned_cashier_id, assigned_cashier_name
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (
            complaint_no, b["id"], bill_no, b.get("customer_id"), customer_name, customer_email, customer_phone,
            issue_type, product_name or expected_product, expected_product, received_product,
            expected_quantity, received_quantity, description, image_url, initial_status,
            cashier_id, cashier_name
        )
    )

    # Record assignment audit trail
    if cashier_id:
        execute(
            """INSERT INTO complaint_assignments (complaint_id, cashier_id, cashier_name, assigned_by, notes)
               VALUES (%s, %s, %s, 'System (Automatic Cashier Assignment)', %s)""",
            (cid, cashier_id, cashier_name, f"Auto-assigned based on bill {bill_no} processed at Counter {b['counter_no']}")
        )

    # Initial history log
    execute(
        "INSERT INTO complaint_updates (complaint_id, status, note, updated_by) VALUES (%s, %s, %s, %s)",
        (cid, "Submitted", f"Complaint submitted by customer {customer_name}", customer_name)
    )
    execute(
        "INSERT INTO complaint_updates (complaint_id, status, note, updated_by) VALUES (%s, %s, %s, %s)",
        (cid, "Assigned to Cashier", f"System auto-assigned complaint to Cashier {cashier_name} (Counter {b['counter_no']})", "System")
    )

    # Notifications
    execute(
        """INSERT INTO notifications (recipient_role, title, message, complaint_no)
           VALUES ('Cashier', 'New Complaint Auto-Assigned', %s, %s)""",
        (f"Complaint {complaint_no} for Bill {bill_no} auto-assigned to you.", complaint_no)
    )
    execute(
        """INSERT INTO notifications (recipient_role, title, message, complaint_no)
           VALUES ('Admin', 'New Complaint Submitted', %s, %s)""",
        (f"Customer {customer_name} raised complaint {complaint_no} on bill {bill_no}.", complaint_no)
    )

    res = {
        "id": cid,
        "complaint_no": complaint_no,
        "bill_no": bill_no,
        "customer_name": customer_name,
        "issue_type": issue_type,
        "assigned_cashier": cashier_name,
        "counter_no": b["counter_no"],
        "status": initial_status,
        "message": f"Complaint {complaint_no} generated and automatically assigned to Cashier {cashier_name} (Counter {b['counter_no']})."
    }

    notify("new_complaint", res)
    return jsonify(res), 201

@app.get("/api/complaints")
def list_complaints():
    role = request.args.get("role", "")
    cashier = request.args.get("cashier", "")
    customer = request.args.get("customer", "")
    status = request.args.get("status", "")
    search = request.args.get("search", "").strip()

    sql = """
        SELECT c.*, b.total_amount, b.counter_no, b.created_at as bill_date
        FROM complaints c
        JOIN bills b ON b.id = c.bill_id
        WHERE 1=1
    """
    params = []

    if cashier:
        sql += " AND (c.assigned_cashier_name = %s OR b.cashier_name = %s)"
        params.extend([cashier, cashier])
    if customer:
        sql += " AND (c.customer_name = %s OR c.customer_email = %s)"
        params.extend([customer, customer])
    if status and status != "All":
        sql += " AND c.status = %s"
        params.append(status)
    if search:
        sql += " AND (c.complaint_no LIKE %s OR c.bill_no LIKE %s OR c.customer_name LIKE %s OR c.product_name LIKE %s)"
        like = f"%{search}%"
        params.extend([like, like, like, like])

    sql += " ORDER BY c.created_at DESC"
    complaints = query(sql, params)
    return jsonify(complaints)

@app.get("/api/complaints/<no>")
def get_complaint(no):
    c = query(
        """SELECT c.*, b.total_amount, b.counter_no, b.cashier_name as bill_cashier, b.created_at as bill_date
           FROM complaints c
           JOIN bills b ON b.id = c.bill_id
           WHERE c.complaint_no = %s OR c.id = %s""",
        (no, no), one=True
    )
    if not c:
        return error("Complaint not found", 404)

    c["history"] = query("SELECT * FROM complaint_updates WHERE complaint_id = %s ORDER BY created_at ASC", (c["id"],))
    c["notes"] = query("SELECT * FROM investigation_notes WHERE complaint_id = %s ORDER BY created_at ASC", (c["id"],))
    c["resolution_record"] = query("SELECT * FROM resolutions WHERE complaint_id = %s", (c["id"],), one=True)
    c["bill_items"] = query("SELECT * FROM bill_items WHERE bill_id = %s", (c["bill_id"],))
    c["received_items"] = query("SELECT * FROM received_items WHERE bill_id = %s", (c["bill_id"],))
    return jsonify(c)

# ----------------------------------------------------
# 4. CASHIER WORKFLOW: INVESTIGATE & RECOMMEND
# ----------------------------------------------------
@app.post("/api/cashier/investigate/<no>")
def cashier_investigate(no):
    data = request.get_json(silent=True) or {}
    note = data.get("note", "").strip()
    recommendation = data.get("recommended_resolution", "Product Replacement").strip()
    cashier_name = data.get("cashier_name", "Cashier")

    if not note:
        return error("Investigation note is required")

    c = query("SELECT * FROM complaints WHERE complaint_no = %s", (no,), one=True)
    if not c:
        return error("Complaint not found", 404)

    new_status = "Awaiting Manager Approval"

    # Insert note
    execute(
        """INSERT INTO investigation_notes (complaint_id, author_name, author_role, note, recommended_action)
           VALUES (%s, %s, 'Cashier', %s, %s)""",
        (c["id"], cashier_name, note, recommendation)
    )

    # Update complaint
    execute(
        """UPDATE complaints
           SET status = %s, recommended_resolution = %s
           WHERE id = %s""",
        (new_status, recommendation, c["id"])
    )

    # Insert update history
    execute(
        "INSERT INTO complaint_updates (complaint_id, status, note, updated_by) VALUES (%s, %s, %s, %s)",
        (c["id"], new_status, f"Cashier {cashier_name} completed investigation. Recommendation: {recommendation}. Note: {note}", cashier_name)
    )

    # Notify admin
    execute(
        """INSERT INTO notifications (recipient_role, title, message, complaint_no)
           VALUES ('Admin', 'Resolution Approval Required', %s, %s)""",
        (f"Cashier {cashier_name} recommended '{recommendation}' for complaint {no}.", no)
    )

    result = {"complaint_no": no, "status": new_status, "recommended_resolution": recommendation}
    notify("complaint_updated", result)
    return jsonify(result)

# ----------------------------------------------------
# 5. ADMIN WORKFLOW: APPROVE / RESOLVE / REASSIGN
# ----------------------------------------------------
@app.post("/api/admin/complaints/<no>/resolve")
def admin_resolve(no):
    data = request.get_json(silent=True) or {}
    resolution_type = data.get("resolution_type", "Product Replacement")
    details = data.get("details", f"Approved {resolution_type} for customer.")
    admin_name = data.get("admin_name", "Supermarket Admin")
    action = data.get("action", "approve")  # approve or reject

    c = query("SELECT * FROM complaints WHERE complaint_no = %s", (no,), one=True)
    if not c:
        return error("Complaint not found", 404)

    if action == "approve":
        new_status = "Resolution Offered"
        # Upsert resolutions table
        existing_res = query("SELECT id FROM resolutions WHERE complaint_id = %s", (c["id"],), one=True)
        if existing_res:
            execute(
                """UPDATE resolutions SET resolution_type = %s, status = 'Approved', approved_by = %s, resolution_details = %s
                   WHERE id = %s""",
                (resolution_type, admin_name, details, existing_res["id"])
            )
        else:
            execute(
                """INSERT INTO resolutions (complaint_id, resolution_type, status, approved_by, resolution_details)
                   VALUES (%s, %s, 'Approved', %s, %s)""",
                (c["id"], resolution_type, admin_name, details)
            )

        execute(
            "UPDATE complaints SET status = %s, approved_resolution = %s WHERE id = %s",
            (new_status, resolution_type, c["id"])
        )

        execute(
            "INSERT INTO complaint_updates (complaint_id, status, note, updated_by) VALUES (%s, %s, %s, %s)",
            (c["id"], new_status, f"Admin {admin_name} approved resolution: {resolution_type}. Details: {details}", admin_name)
        )

        # Notify Customer and Cashier
        execute(
            """INSERT INTO notifications (recipient_role, title, message, complaint_no)
               VALUES ('Customer', 'Resolution Approved For Your Complaint', %s, %s)""",
            (f"Your complaint {no} has been resolved with: {resolution_type}.", no)
        )
    else:
        new_status = "Under Review"
        execute("UPDATE complaints SET status = %s WHERE id = %s", (new_status, c["id"]))
        execute(
            "INSERT INTO complaint_updates (complaint_id, status, note, updated_by) VALUES (%s, %s, %s, %s)",
            (c["id"], new_status, f"Admin {admin_name} returned complaint for further review. Details: {details}", admin_name)
        )

    res = {"complaint_no": no, "status": new_status, "approved_resolution": resolution_type}
    notify("complaint_updated", res)
    return jsonify(res)

@app.post("/api/admin/complaints/<no>/reassign")
def admin_reassign(no):
    data = request.get_json(silent=True) or {}
    cashier_id = data.get("cashier_id")
    admin_name = data.get("admin_name", "Admin")

    if not cashier_id:
        return error("Target cashier_id is required")

    cashier = query("SELECT * FROM cashiers WHERE id = %s", (cashier_id,), one=True)
    if not cashier:
        return error("Cashier not found", 404)

    c = query("SELECT * FROM complaints WHERE complaint_no = %s", (no,), one=True)
    if not c:
        return error("Complaint not found", 404)

    execute(
        "UPDATE complaints SET assigned_cashier_id = %s, assigned_cashier_name = %s, status = 'Assigned to Cashier' WHERE id = %s",
        (cashier["id"], cashier["cashier_name"], c["id"])
    )

    execute(
        """INSERT INTO complaint_assignments (complaint_id, cashier_id, cashier_name, assigned_by, notes)
           VALUES (%s, %s, %s, %s, %s)""",
        (c["id"], cashier["id"], cashier["cashier_name"], admin_name, f"Manually reassigned to Cashier {cashier['cashier_name']} by Admin {admin_name}")
    )

    execute(
        "INSERT INTO complaint_updates (complaint_id, status, note, updated_by) VALUES (%s, 'Assigned to Cashier', %s, %s)",
        (c["id"], f"Reassigned to Cashier {cashier['cashier_name']}", admin_name)
    )

    res = {"complaint_no": no, "assigned_cashier": cashier["cashier_name"], "status": "Assigned to Cashier"}
    notify("complaint_updated", res)
    return jsonify(res)

@app.post("/api/complaints/<no>/confirm")
def customer_confirm_resolution(no):
    data = request.get_json(silent=True) or {}
    feedback = data.get("feedback", "Customer satisfied with resolution.")
    customer_name = data.get("customer_name", "Customer")

    c = query("SELECT * FROM complaints WHERE complaint_no = %s", (no,), one=True)
    if not c:
        return error("Complaint not found", 404)

    new_status = "Closed"
    execute("UPDATE complaints SET status = %s WHERE id = %s", (new_status, c["id"]))

    res_rec = query("SELECT id FROM resolutions WHERE complaint_id = %s", (c["id"],), one=True)
    if res_rec:
        execute("UPDATE resolutions SET status = 'Customer Confirmed', customer_feedback = %s WHERE id = %s", (feedback, res_rec["id"]))

    execute(
        "INSERT INTO complaint_updates (complaint_id, status, note, updated_by) VALUES (%s, %s, %s, %s)",
        (c["id"], new_status, f"Customer confirmed resolution and closed the ticket. Feedback: {feedback}", customer_name)
    )

    execute(
        """INSERT INTO notifications (recipient_role, title, message, complaint_no)
           VALUES ('Admin', 'Complaint Closed by Customer', %s, %s)""",
        (f"Customer {customer_name} accepted the resolution and closed complaint {no}.", no)
    )

    res = {"complaint_no": no, "status": new_status, "message": "Thank you! Your complaint is now closed."}
    notify("complaint_updated", res)
    return jsonify(res)

@app.patch("/api/complaints/<no>")
def patch_complaint(no):
    d = request.get_json(silent=True) or {}
    c = query("SELECT * FROM complaints WHERE complaint_no = %s", (no,), one=True)
    if not c:
        return error("Complaint not found", 404)

    allowed = [
        "Submitted", "Under Review", "Assigned to Cashier", "Investigation in Progress",
        "Awaiting Manager Approval", "Resolution Offered", "Resolved", "Closed"
    ]
    status = d.get("status", c["status"])
    if status not in allowed:
        return error(f"Invalid status '{status}'")

    assigned_name = d.get("assigned_to", c.get("assigned_cashier_name"))
    resolution = d.get("resolution", c.get("approved_resolution"))

    execute(
        "UPDATE complaints SET status = %s, assigned_cashier_name = %s, approved_resolution = %s WHERE id = %s",
        (status, assigned_name, resolution, c["id"])
    )
    execute(
        "INSERT INTO complaint_updates (complaint_id, status, note, updated_by) VALUES (%s, %s, %s, %s)",
        (c["id"], status, d.get("note", f"Status changed to {status}"), d.get("updated_by", "Staff"))
    )

    res = {"complaint_no": no, "status": status, "assigned_to": assigned_name, "resolution": resolution}
    notify("complaint_updated", res)
    return jsonify(res)

# ----------------------------------------------------
# 6. ADMIN DASHBOARD METRICS & ENTITY MANAGEMENT
# ----------------------------------------------------
@app.get("/api/admin/stats")
def admin_stats():
    total_customers = query("SELECT COUNT(*) as count FROM customers", one=True)["count"]
    total_cashiers = query("SELECT COUNT(*) as count FROM cashiers", one=True)["count"]
    total_bills = query("SELECT COUNT(*) as count FROM bills", one=True)["count"]
    total_complaints = query("SELECT COUNT(*) as count FROM complaints", one=True)["count"]
    pending_complaints = query(
        "SELECT COUNT(*) as count FROM complaints WHERE status NOT IN ('Resolved', 'Closed')", one=True
    )["count"]
    resolved_complaints = query(
        "SELECT COUNT(*) as count FROM complaints WHERE status IN ('Resolved', 'Closed')", one=True
    )["count"]

    # Categories breakdown
    categories = query(
        "SELECT issue_type, COUNT(*) as count FROM complaints GROUP BY issue_type"
    )

    # Status breakdown
    statuses = query(
        "SELECT status, COUNT(*) as count FROM complaints GROUP BY status"
    )

    # Cashier performance
    cashier_perf = query(
        """SELECT c.cashier_name, c.counter_no,
                  COUNT(cmp.id) as total_assigned,
                  SUM(CASE WHEN cmp.status IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) as resolved
           FROM cashiers c
           LEFT JOIN complaints cmp ON cmp.assigned_cashier_id = c.id
           GROUP BY c.id, c.cashier_name, c.counter_no"""
    )

    # Recent complaints
    recent = query(
        "SELECT complaint_no, customer_name, bill_no, issue_type, status, created_at FROM complaints ORDER BY created_at DESC LIMIT 5"
    )

    return jsonify({
        "total_customers": total_customers,
        "total_cashiers": total_cashiers,
        "total_bills": total_bills,
        "total_complaints": total_complaints,
        "pending_complaints": pending_complaints,
        "resolved_complaints": resolved_complaints,
        "categories": categories,
        "statuses": statuses,
        "cashier_performance": cashier_perf,
        "recent_complaints": recent
    })

# Customer Management
@app.get("/api/admin/customers")
def admin_list_customers():
    customers = query(
        """SELECT c.*, u.email, u.full_name, u.status as account_status,
                  COUNT(DISTINCT b.id) as total_bills,
                  COUNT(DISTINCT cmp.id) as total_complaints
           FROM customers c
           JOIN users u ON u.id = c.user_id
           LEFT JOIN bills b ON b.customer_id = c.id
           LEFT JOIN complaints cmp ON cmp.customer_id = c.id
           GROUP BY c.id, u.id
           ORDER BY c.created_at DESC"""
    )
    return jsonify(customers)

@app.patch("/api/admin/customers/<int:user_id>/toggle-status")
def admin_toggle_customer(user_id):
    u = query("SELECT id, status FROM users WHERE id = %s", (user_id,), one=True)
    if not u:
        return error("Customer user not found", 404)
    new_status = "Inactive" if u["status"] == "Active" else "Active"
    execute("UPDATE users SET status = %s WHERE id = %s", (new_status, user_id))
    return jsonify({"message": f"Customer status updated to {new_status}", "status": new_status})

# Cashier Management
@app.get("/api/admin/cashiers")
def admin_list_cashiers():
    cashiers = query(
        """SELECT c.*, u.email, u.status as account_status,
                  COUNT(DISTINCT b.id) as total_bills_processed,
                  COUNT(DISTINCT cmp.id) as complaints_handled
           FROM cashiers c
           JOIN users u ON u.id = c.user_id
           LEFT JOIN bills b ON b.cashier_id = c.id
           LEFT JOIN complaints cmp ON cmp.assigned_cashier_id = c.id
           GROUP BY c.id, u.id
           ORDER BY c.counter_no ASC"""
    )
    return jsonify(cashiers)

@app.post("/api/admin/cashiers")
def admin_create_cashier():
    d = request.get_json(silent=True) or {}
    cashier_name = d.get("cashier_name", "").strip()
    email = d.get("email", "").strip().lower()
    phone = d.get("phone", "").strip()
    counter_no = int(d.get("counter_no", 1))
    shift = d.get("shift", "Morning")
    password = d.get("password", "Cashier@123")

    if not cashier_name or not email:
        return error("Cashier name and email are required")

    existing = query("SELECT id FROM users WHERE email = %s", (email,), one=True)
    if existing:
        return error("A user with this email already exists", 409)

    password_hash = generate_password_hash(password)
    uid = execute(
        "INSERT INTO users (full_name, email, password_hash, role, phone, status) VALUES (%s, %s, %s, 'Cashier', %s, 'Active')",
        (cashier_name, email, password_hash, phone)
    )

    code = f"CSH-{100 + uid}"
    cid = execute(
        "INSERT INTO cashiers (user_id, cashier_name, cashier_code, counter_no, phone, shift, status) VALUES (%s, %s, %s, %s, %s, %s, 'Active')",
        (uid, cashier_name, code, counter_no, phone, shift)
    )

    return jsonify({"message": "Cashier created successfully", "cashier_id": cid, "cashier_code": code}), 201

@app.put("/api/admin/cashiers/<int:cashier_id>")
def admin_update_cashier(cashier_id):
    d = request.get_json(silent=True) or {}
    cashier_name = d.get("cashier_name", "").strip()
    counter_no = int(d.get("counter_no", 1))
    shift = d.get("shift", "Morning")
    phone = d.get("phone", "").strip()

    c = query("SELECT * FROM cashiers WHERE id = %s", (cashier_id,), one=True)
    if not c:
        return error("Cashier not found", 404)

    execute(
        "UPDATE cashiers SET cashier_name = %s, counter_no = %s, shift = %s, phone = %s WHERE id = %s",
        (cashier_name or c["cashier_name"], counter_no, shift, phone, cashier_id)
    )
    execute("UPDATE users SET full_name = %s, phone = %s WHERE id = %s", (cashier_name, phone, c["user_id"]))
    return jsonify({"message": "Cashier updated successfully"})

@app.patch("/api/admin/cashiers/<int:cashier_id>/toggle-status")
def admin_toggle_cashier(cashier_id):
    c = query("SELECT * FROM cashiers WHERE id = %s", (cashier_id,), one=True)
    if not c:
        return error("Cashier not found", 404)
    new_status = "Inactive" if c["status"] == "Active" else "Active"
    execute("UPDATE cashiers SET status = %s WHERE id = %s", (new_status, cashier_id))
    execute("UPDATE users SET status = %s WHERE id = %s", (new_status, c["user_id"]))
    return jsonify({"message": f"Cashier status updated to {new_status}", "status": new_status})

# Product Management
@app.get("/api/admin/products")
def admin_list_products():
    products = query("SELECT * FROM products ORDER BY category, product_name")
    return jsonify(products)

@app.post("/api/admin/products")
def admin_add_product():
    d = request.get_json(silent=True) or {}
    product_name = d.get("product_name", "").strip()
    category = d.get("category", "General").strip()
    barcode = d.get("barcode", f"BAR-{uuid.uuid4().hex[:7].upper()}")
    price = float(d.get("price", 0.0))
    stock = int(d.get("stock_quantity", 50))
    desc = d.get("description", "")
    img = d.get("image_url", "")

    if not product_name or price <= 0:
        return error("Valid product name and price are required")

    code = f"PRD-{uuid.uuid4().hex[:5].upper()}"
    pid = execute(
        "INSERT INTO products (product_code, product_name, category, barcode, price, stock_quantity, image_url, description) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
        (code, product_name, category, barcode, price, stock, img, desc)
    )
    return jsonify({"message": "Product created successfully", "product_id": pid, "product_code": code}), 201

@app.put("/api/admin/products/<int:pid>")
def admin_update_product(pid):
    d = request.get_json(silent=True) or {}
    execute(
        """UPDATE products
           SET product_name = %s, category = %s, price = %s, stock_quantity = %s, description = %s, image_url = %s
           WHERE id = %s""",
        (d.get("product_name"), d.get("category"), d.get("price"), d.get("stock_quantity"), d.get("description"), d.get("image_url"), pid)
    )
    return jsonify({"message": "Product updated successfully"})

@app.delete("/api/admin/products/<int:pid>")
def admin_delete_product(pid):
    execute("DELETE FROM products WHERE id = %s", (pid,))
    return jsonify({"message": "Product removed from catalog"})

# Bill Management
@app.get("/api/admin/bills")
def admin_list_bills():
    bills = query("SELECT * FROM bills ORDER BY created_at DESC")
    for b in bills:
        b["items"] = query("SELECT * FROM bill_items WHERE bill_id = %s", (b["id"],))
        b["received_items"] = query("SELECT * FROM received_items WHERE bill_id = %s", (b["id"],))
    return jsonify(bills)

@app.post("/api/admin/bills")
def admin_create_bill():
    d = request.get_json(silent=True) or {}
    bill_no = d.get("bill_no", f"B{uuid.uuid4().hex[:4].upper()}")
    customer_name = d.get("customer_name", "Customer Walk-in").strip()
    cashier_name = d.get("cashier_name", "Priya").strip()
    counter_no = int(d.get("counter_no", 2))
    items = d.get("items", [])  # [{"name": "Dove Soap", "quantity": 2, "unit_price": 55.00}]
    received_items = d.get("received_items", [])  # [{"name": "Lux Soap", "quantity": 2}]

    if not items:
        return error("Bill must contain at least one product")

    total_amount = sum(float(x.get("quantity", 1)) * float(x.get("unit_price", 0)) for x in items)

    bid = execute(
        """INSERT INTO bills (bill_no, customer_name, cashier_name, counter_no, total_amount, qr_data, verification_status)
           VALUES (%s, %s, %s, %s, %s, %s, 'Pending Verification')""",
        (bill_no, customer_name, cashier_name, counter_no, total_amount, bill_no)
    )

    for item in items:
        qty = int(item.get("quantity", 1))
        price = float(item.get("unit_price", 0))
        execute(
            """INSERT INTO bill_items (bill_id, product_name, quantity, unit_price, total_price)
               VALUES (%s, %s, %s, %s, %s)""",
            (bid, item["name"], qty, price, qty * price)
        )

    for rec in (received_items or items):
        execute(
            "INSERT INTO received_items (bill_id, product_name, quantity) VALUES (%s, %s, %s)",
            (bid, rec["name"], int(rec.get("quantity", 1)))
        )

    return jsonify({"message": "Bill created successfully", "bill_no": bill_no, "id": bid}), 201

# Notifications
@app.get("/api/notifications")
def get_notifications():
    role = request.args.get("role", "All")
    if role and role != "All":
        notes = query(
            "SELECT * FROM notifications WHERE recipient_role IN ('All', %s) ORDER BY created_at DESC LIMIT 20",
            (role,)
        )
    else:
        notes = query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20")
    return jsonify(notes)

@app.post("/api/notifications/<int:nid>/read")
def mark_read(nid):
    execute("UPDATE notifications SET is_read = TRUE WHERE id = %s", (nid,))
    return jsonify({"message": "Marked as read"})

@app.post("/api/notifications/mark-all-read")
def mark_all_read():
    execute("UPDATE notifications SET is_read = TRUE")
    return jsonify({"message": "All notifications marked as read"})

# Demo placeholder endpoint
@app.post("/api/recognition/demo")
def recognition_demo():
    return jsonify({
        "mode": "smart_barcode_rfid_vision",
        "message": "Integrated Smart Vision & Barcode Scanning Module online. Discrepancy comparison active for verified bills.",
        "detected_products": []
    })

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True, allow_unsafe_werkzeug=True)
