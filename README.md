# FreshMart Smart Supermarket Billing Verification & Automated Complaint Resolution System

A modern, production-grade web application built with **ReactJS**, **Python Flask**, and **MySQL**, designed to verify supermarket bills, detect item discrepancies (wrong product, quantity variance, missing goods), automatically route grievances to responsible counter cashiers, and handle manager-approved resolution workflows.

---

## 🌐 Application URLs

| Service | Local URL | Description |
| :--- | :--- | :--- |
| **Frontend Application** | [http://localhost:5173](http://localhost:5173) | Modern Supermarket Web Portal (Landing, Customer, Cashier, Admin) |
| **Backend API** | [http://localhost:5000](http://localhost:5000) | Python Flask REST APIs & WebSocket Service |
| **Health Check** | [http://localhost:5000/api/health](http://localhost:5000/api/health) | API Status Verification |

---

## 👥 Demo Logins & Role Credentials

All demo accounts are pre-seeded in the database with secure **Werkzeug Scrypt** password hashes:

| Role | Email Address | Password | Details |
| :--- | :--- | :--- | :--- |
| **Store Administrator** | `admin@freshmart.com` | `Admin@123` | Full administrative control, resolution approvals, staff management |
| **Cashier (Counter 2)** | `priya@freshmart.com` | `Cashier@123` | Priya Sharma (Billing Counter #2), complaint investigation workbench |
| **Cashier (Counter 1)** | `rahul@freshmart.com` | `Cashier@123` | Rahul Verma (Billing Counter #1), evening shift |
| **Customer 01** | `customer01@gmail.com` | `Customer@123` | Customer with sample bills and filed grievances |
| **Customer 02** | `arun@gmail.com` | `Customer@123` | Arun Kumar |

*(Tip: On the Login Page, you can also click the quick-fill buttons to autofill these credentials with a single click!)*

---

## 🛒 Demo Scenario: Bill B1025 (Wrong Product Detection)

1. **Bill Number**: `B1025`
2. **Processed At**: Counter #2 by **Cashier Priya**
3. **Official Billed Items**: `Dove Soap` × 2 (₹110.00), `Kellogg's Corn Flakes` × 1 (₹185.00)
4. **Physical Items in Shopping Bag**: `Lux Soap` × 2 (Wrong Item Packed!), `Kellogg's Corn Flakes` × 1
5. **Detection Result**: System flags the discrepancy:
   - Expected: `Dove Soap` (2 units)
   - Received: `Lux Soap` (2 units)
   - Discrepancy: `Wrong Product: Expected 'Dove Soap', got 'Lux Soap'`
6. **Automated Redressal**: One-click filing pre-populates the complaint and **automatically routes it directly to Cashier Priya at Counter 2**.

---

## 🔄 The 8-Stage Complaint Resolution Lifecycle

The application implements a real-time, 8-step resolution workflow:

```
1. Submitted ──► 2. Under Review ──► 3. Assigned to Cashier ──► 4. Investigation in Progress
                                                                              │
8. Closed ◄── 7. Resolved ◄── 6. Resolution Offered ◄── 5. Awaiting Manager Approval
```

1. **Customer scans bill QR code**: Live webcam scanner or manual bill entry.
2. **System retrieves bill**: Cross-references MySQL database records.
3. **Verification**: Detects wrong products, quantity mismatches, and missing items.
4. **Complaint Submission**: Generates a unique complaint ticket (e.g., `CMP-B1025-XXXX`).
5. **Automatic Routing**: System identifies the cashier from the POS bill record and assigns the ticket.
6. **Cashier Investigation**: Cashier verifies counter scan logs and recommends `Product Replacement` or `Refund`.
7. **Manager Authorization**: Store Admin approves the resolution (Replacement, Refund, Home Delivery, Store Pickup).
8. **Customer Acceptance**: Customer reviews the approved remedy, provides feedback, and closes the ticket.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, React Router 7, Axios, Lucide React Icons, Recharts (Charts & Analytics), Html5-Qrcode (Camera QR Scanner), Socket.IO Client.
- **Backend**: Python Flask 3.1, Flask-CORS, Flask-SocketIO (Real-time WebSockets), PyMySQL, PyJWT, Werkzeug (Scrypt Password Hashing), QRCode Generator.
- **Database**: MySQL 8.0+ / MariaDB with proper relational foreign keys, indexes, and transactional cascades.

---

## 🗄️ MySQL Database Setup

1. Open **MySQL Workbench** or command line client.
2. Execute the schema file located at:
   ```
   database/schema.sql
   ```
   This will create the `smart_supermarket` database and all 14 required tables:
   - `users`, `customers`, `cashiers`, `admins`, `products`, `bills`, `bill_items`, `received_items`, `complaints`, `complaint_assignments`, `investigation_notes`, `resolutions`, `notifications`, `complaint_updates`.
   - Pre-seeds sample inventory, bills (B1025, B1026, B1027), staff, and demo users.

---

## 🚀 Running the Project

### 1. Start the Flask Backend (Terminal 1)
```bash
cd backend
# Activate Python Virtual Environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

# Install dependencies if not already installed
pip install -r requirements.txt

# Run the backend server
python app.py
```
Backend will start on: **http://localhost:5000**

### 2. Start the React Frontend (Terminal 2)
```bash
cd frontend
# Install node packages if needed
npm install

# Start Vite development server
npm run dev
```
Frontend will be available at: **http://localhost:5173**

---

## 🧪 Testing the Complete Workflow Step-by-Step

1. Open **http://localhost:5173** in your browser.
2. Click **Sign In** and click **🛒 Customer 01** to autofill credentials, then sign in.
3. Navigate to **Verify Bill** tab:
   - Click the shortcut **B1025 (Wrong Product Demo)** or enter `B1025` and click **Retrieve & Verify Bill**.
   - Review the comparison table: Notice that **Dove Soap x2** was expected, but **Lux Soap x2** was received!
   - Click the red button: **Raise Automated Complaint For This Bill**.
4. In the **Raise Complaint** form:
   - Review the pre-filled mismatch details.
   - Click **Submit Grievance & Generate Ticket**.
   - Note the generated Ticket ID (e.g., `CMP-B1025-XXXX`) and see that it is auto-assigned to **Cashier Priya (Counter #2)**.
5. Log out and log in as **👩‍💼 Cashier Priya** (`priya@freshmart.com` / `Cashier@123`):
   - In the Cashier Dashboard, locate the newly assigned complaint.
   - Click **Investigate**.
   - Add your findings (e.g., *"Verified counter barcode logs. Wrong item was placed into bag."*).
   - Select recommended resolution: **Product Replacement**.
   - Click **Send Recommendation to Manager**.
6. Log out and log in as **👨‍💼 Store Admin** (`admin@freshmart.com` / `Admin@123`):
   - In the Admin Dashboard, click **All Complaints** and click **Review & Authorize** on the ticket.
   - Click **Authorize & Offer Resolution to Customer**.
7. Log out and log back in as **🛒 Customer 01**:
   - Go to **Track Complaint** and search the Ticket ID.
   - Notice the approved status: **Resolution Offered**.
   - Enter your feedback and click **Confirm Resolution & Close Complaint**.
   - The ticket is now officially marked **Closed**!

---

## 📦 Pushing to Git

To push this repository to your GitHub account:

```bash
# 1. Stage all changes and commit
git add .
git commit -m "Upgrade Smart Supermarket Billing Verification and Automated Complaint Resolution System"

# 2. Add your GitHub repository remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/smart-supermarket-system.git

# 3. Rename branch to main (if desired) and push
git branch -M main
git push -u origin main
```
