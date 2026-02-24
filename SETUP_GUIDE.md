# AEWRS Project - Complete Setup Guide

## 🚀 Quick Start (1-Month Development Plan)

This guide will help you complete the AEWRS project in **4 weeks** with a working, secure system that operates on any network.

---

## ⚡ IMMEDIATE FIRST STEPS (Do This Now - 30 Minutes)

### Step 1: Clean Up Git Repository

Your `node_modules` folders are currently tracked in git. Let's fix this:

```bash
# Navigate to project root
cd /Users/binfinity/aewrs-project

# Remove node_modules from git tracking
git rm -r --cached aewrs-backend/node_modules
git rm -r --cached aewrs-mobile/node_modules

# Commit the cleanup
git add .gitignore aewrs-backend/.gitignore
git commit -m "Clean up git: remove node_modules from tracking"
```

### Step 2: Set Up Local Database

```bash
# Make sure PostgreSQL is running
# Then initialize the database:

cd aewrs-backend

# Create the database if it doesn't exist
psql -U binfinity -c "CREATE DATABASE aewrs_db;"

# Run the initialization script
psql -U binfinity -d aewrs_db -f src/database/init.sql

# Verify the setup
psql -U binfinity -d aewrs_db -c "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM equipment; SELECT COUNT(*) FROM lockers;"
```

### Step 3: Configure Environment Variables

```bash
# Backend
cd aewrs-backend
cp .env.example .env
# Edit .env with your actual database credentials

# Mobile
cd ../aewrs-mobile
cp .env.example .env
# Edit .env with your API URL
```

### Step 4: Install Dependencies (if needed)

```bash
# Backend
cd aewrs-backend
npm install

# Mobile
cd ../aewrs-mobile
npm install
```

### Step 5: Test Current Setup

```bash
# Terminal 1: Start backend
cd aewrs-backend
npm start

# Terminal 2: Start mobile app
cd aewrs-mobile
npm start
# Then press 'i' for iOS or 'a' for Android
```

---

## 📅 WEEK 1: Foundation & Security (Days 1-7)

### Day 1-2: Deploy Backend to Cloud ☁️

**Choose a deployment platform:**
- **Railway.app** (Recommended - easiest)
- Render.com
- Heroku (paid)

**Railway Setup Steps:**

1. Sign up at https://railway.app
2. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

3. Login and deploy:
   ```bash
   cd aewrs-backend
   railway login
   railway init
   railway add  # Add PostgreSQL database
   ```

4. Set environment variables in Railway dashboard:
   - All variables from `.env.example`
   - Upload `firebase-admin-key.json` content as `FIREBASE_ADMIN_KEY`

5. Deploy:
   ```bash
   railway up
   ```

6. Get your deployment URL (e.g., `https://your-app.railway.app`)

### Day 3: Update Mobile App with Production URL

Edit `aewrs-mobile/.env`:
```bash
EXPO_PUBLIC_API_URL=https://your-app.railway.app/api
```

Test that mobile app can connect to deployed backend.

### Day 4-5: Update Transaction Schema & Logic

**New Transaction States:**
- `pending_pickup` - Student requested borrow, waiting to pick up from locker
- `active` - Student has picked up equipment
- `pending_return` - Student indicated return, waiting to place in locker
- `completed` - Equipment returned successfully
- `expired` - Transaction expired (not picked up within time limit)
- `cancelled` - User cancelled the request

**Update Backend Endpoints:**
See files:
- `aewrs-backend/src/routes/transactionRoutes.js` - needs status transition logic
- `aewrs-backend/src/routes/lockerRoutes.js` - needs RFID authorization logic

### Day 6-7: Test & Fix Issues

- Test all existing features
- Fix any bugs
- Ensure database is working properly

**Week 1 Deliverables:**
✅ Backend deployed and accessible from any network
✅ Database with proper schema
✅ Mobile app connects to cloud backend
✅ Existing features still work

---

## 📅 WEEK 2: Core Mobile Flows (Days 8-14)

### Day 8-9: Borrow Equipment Screen

Create `aewrs-mobile/src/screens/BorrowEquipmentScreen.js`:

**Features needed:**
- Equipment details display
- Date picker for due date
- Quantity selector (if applicable)
- Confirm button
- Show assigned locker compartment after success

**API endpoint to use:**
```
POST /api/transactions/borrow
Body: { sit_id, equipment_id, due_date }
Response: { transaction_id, locker_id, compartment_number }
```

### Day 10-11: Active Transactions & Return Screen

Create `aewrs-mobile/src/screens/ActiveTransactionsScreen.js`:

**Features needed:**
- List of user's active borrows (status: `active`)
- Show equipment name, borrow date, due date
- "Return" button for each item
- Show overdue status in red

**API endpoint to use:**
```
GET /api/transactions/user/:sitId
POST /api/transactions/return
Body: { transaction_id }
```

### Day 12: Transaction History Screen

Create `aewrs-mobile/src/screens/TransactionHistoryScreen.js`:

**Features needed:**
- Show all past transactions (status: `completed`)
- Filter by date range
- Show equipment name, borrow date, return date

### Day 13: Update Equipment List Screen

Add "Borrow" button to equipment cards that navigates to BorrowEquipmentScreen.

### Day 14: Navigation & Polish

Update `AppNavigator.js` to include all new screens:
- BorrowEquipmentScreen
- ActiveTransactionsScreen
- TransactionHistoryScreen

Add bottom tab navigator for easy access.

**Week 2 Deliverables:**
✅ Students can request to borrow equipment via app
✅ Students can see their active borrows
✅ Students can indicate they want to return equipment
✅ Transaction history visible

---

## 📅 WEEK 3: RFID Authorization & Lab Tech Dashboard (Days 15-21)

### Day 15-16: Update RFID Access Endpoint Logic

**Critical Update Needed in `/api/locker/access`:**

Current logic: Check if RFID exists in database
**New logic:**

```javascript
// When RFID card is tapped:
1. Find user by rfid_uid
2. Check if user has ANY of these:
   a) pending_pickup transaction → Grant access to assigned locker
   b) pending_return transaction → Grant access to assigned locker
   c) User is lab tech AND equipment in locker is low stock → Grant access
3. If access granted:
   - Send unlock command to Arduino for specific locker
   - Update transaction status (pending_pickup → active, or pending_return → completed)
   - Update equipment quantity
   - Update locker status
4. Log all access attempts
```

**Files to modify:**
- `aewrs-backend/src/routes/lockerRoutes.js`
- May need to update `serial-bridge.js` to send locker-specific unlock commands

### Day 17-18: Lab Tech Dashboard (Mobile Screen)

Create `aewrs-mobile/src/screens/LabTechDashboardScreen.js`:

**Features needed:**
- Only accessible by users with role='staff'
- Show low-stock equipment alerts (use database view: `low_stock_equipment`)
- "Replenish" button for each low-stock item
- Unlock locker temporarily for restocking

**New API endpoints needed:**
```
GET /api/equipment/low-stock  (staff only)
POST /api/locker/unlock-for-replenish (staff only)
Body: { locker_id, staff_sit_id }
POST /api/equipment/update-quantity (staff only)
Body: { equipment_id, quantity_to_add }
```

### Day 19-20: Implement Lab Tech Backend Logic

Add new routes:
- `GET /api/equipment/low-stock`
- `POST /api/locker/unlock-for-replenish`
- `POST /api/equipment/update-quantity`

**Replenishment Flow:**
1. Lab tech sees low-stock alert
2. Taps "Replenish" on equipment
3. System finds locker containing that equipment
4. System temporarily authorizes lab tech's RFID for that locker (30 min timeout)
5. Lab tech taps RFID → locker unlocks
6. Lab tech refills equipment
7. Lab tech updates quantity in app
8. System clears authorization

### Day 21: Testing RFID Integration

**Test scenarios:**
- Student with pending_pickup → Should unlock assigned locker
- Student with active borrow → Should NOT unlock any locker
- Student with pending_return → Should unlock assigned locker
- Lab tech with low-stock alert → Should unlock equipment locker
- Random person → Should deny access

**Week 3 Deliverables:**
✅ RFID only works for authorized transactions
✅ Lab techs can see low-stock alerts
✅ Lab techs can unlock lockers for replenishment
✅ Complete borrow/return flow works end-to-end

---

## 📅 WEEK 4: Testing, Polish & Demo Prep (Days 22-30)

### Day 22-23: End-to-End Testing

**Test complete flows:**

**Student Borrow Flow:**
1. Login to mobile app
2. Browse equipment
3. Select equipment and request borrow
4. Note assigned locker compartment
5. Go to physical locker
6. Tap RFID card → locker should unlock
7. Take equipment, close locker
8. Verify transaction status changed to "active"

**Student Return Flow:**
1. Open app, go to "Active Transactions"
2. Tap "Return" on borrowed item
3. Note locker compartment number
4. Go to locker
5. Tap RFID card → locker should unlock
6. Place equipment, close locker
7. Verify transaction completed and equipment quantity restored

**Lab Tech Replenish Flow:**
1. Lab tech login
2. See low-stock alert
3. Request unlock for replenishment
4. Tap RFID → locker unlocks
5. Refill equipment
6. Update quantity in app

### Day 24-25: Edge Cases & Error Handling

**Handle these scenarios:**
- User tries to borrow unavailable equipment
- User tries to return without having borrowed
- Transaction expires (not picked up within 24 hours)
- RFID card not registered
- Network connection lost during transaction
- Locker fails to unlock (hardware issue)
- Student taps wrong locker

### Day 26-27: UI Polish & User Experience

- Add loading indicators
- Add success/error toast messages
- Improve visual design
- Add confirmation dialogs for critical actions
- Add pull-to-refresh everywhere
- Add empty states with helpful messages

### Day 28: Documentation

**Create these docs:**
- `README.md` - Project overview
- `API_DOCUMENTATION.md` - All endpoints with examples
- `USER_GUIDE.md` - How to use the app (with screenshots)
- `DEPLOYMENT.md` - How to deploy
- `ARDUINO_SETUP.md` - Hardware setup instructions

### Day 29: Demo Preparation

**Prepare for demo:**
- Create test accounts (student, lab tech)
- Seed realistic test data
- Practice the demo flow
- Create a slide deck or video walkthrough
- Test on multiple devices

### Day 30: Buffer & Final Fixes

- Fix any remaining bugs
- Final testing
- Code cleanup
- Git commit everything
- Create GitHub/GitLab repository (if presenting)

**Week 4 Deliverables:**
✅ Fully tested system
✅ All edge cases handled
✅ Complete documentation
✅ Demo-ready

---

## 🎯 Core Features Summary

### What Makes AEWRS Unique:

1. **Self-Service Convenience**: Students borrow/return equipment 24/7 without lab staff present
2. **Smart Access Control**: RFID only unlocks when student has authorized transaction
3. **Inventory Management**: Real-time tracking of equipment availability
4. **Automated Restocking**: Lab techs alerted when stock is low
5. **Audit Trail**: Complete access logs and transaction history

### Security Features:

✅ Firebase authentication
✅ Role-based access control (student/staff/admin)
✅ RFID authorization based on active transactions
✅ Access logging for audit trail
✅ Encrypted communication (HTTPS)
✅ Token-based API authentication

---

## 🔧 Troubleshooting

### Common Issues:

**1. Mobile app can't connect to backend**
- Check API URL in `.env`
- Ensure backend is running and accessible
- Check firewall settings

**2. Database connection fails**
- Verify PostgreSQL is running
- Check credentials in `.env`
- Ensure database `aewrs_db` exists

**3. RFID not working**
- Check serial port configuration
- Ensure Arduino is connected
- Verify RFID UIDs are registered in database

**4. Firebase authentication fails**
- Check `firebase-admin-key.json` is present
- Verify Firebase project configuration
- Ensure Firebase project is active

---

## 📞 Need Help?

If you get stuck on any step:
1. Check error messages in terminal/console
2. Review the API documentation
3. Test endpoints with Postman
4. Check database logs: `psql -U binfinity -d aewrs_db -c "SELECT * FROM access_logs ORDER BY timestamp DESC LIMIT 10;"`

---

## 🎉 Success Criteria

By end of Week 4, you should have:
- ✅ Deployed backend accessible from anywhere
- ✅ Mobile app that works on any network
- ✅ Complete borrow/return workflow
- ✅ RFID access control working
- ✅ Lab tech dashboard functional
- ✅ Comprehensive documentation
- ✅ Demo-ready presentation

Good luck! You got this! 💪
