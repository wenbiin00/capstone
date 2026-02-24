# ✅ TODAY'S CHECKLIST - START HERE

## Do These 5 Things Right Now (30 minutes total)

### ✅ Task 1: Clean Up Git (5 minutes)

```bash
cd /Users/binfinity/aewrs-project

# Remove node_modules from git
git rm -r --cached aewrs-backend/node_modules

# Commit the fix
git add .gitignore aewrs-backend/.gitignore aewrs-mobile/.gitignore
git commit -m "Fix: Remove node_modules from git tracking"
```

---

### ✅ Task 2: Initialize Database (5 minutes)

```bash
cd /Users/binfinity/aewrs-project/aewrs-backend

# Create database if it doesn't exist
psql -U binfinity -c "CREATE DATABASE aewrs_db;"

# Run initialization script
psql -U binfinity -d aewrs_db -f src/database/init.sql

# Verify it worked
psql -U binfinity -d aewrs_db -c "SELECT name FROM equipment;"
```

**Expected output:** Should show 8 equipment items (Arduino, Raspberry Pi, etc.)

---

### ✅ Task 3: Set Up Environment Files (5 minutes)

```bash
# Backend
cd /Users/binfinity/aewrs-project/aewrs-backend
cp .env.example .env

# Edit .env - just verify DB_USER is correct
# Your .env should have:
# DB_USER=binfinity
# DB_NAME=aewrs_db

# Mobile
cd /Users/binfinity/aewrs-project/aewrs-mobile
echo "EXPO_PUBLIC_API_URL=http://192.168.68.60:3000/api" > .env
```

---

### ✅ Task 4: Test Current System (10 minutes)

Open 2 terminal windows:

**Terminal 1:**
```bash
cd /Users/binfinity/aewrs-project/aewrs-backend
npm start
```

**Terminal 2:**
```bash
cd /Users/binfinity/aewrs-project/aewrs-mobile
npm start
# Then press 'i' for iOS simulator or 'a' for Android
```

**Test:**
1. Login with: `john.student@sit.edu.sg` / `password123` (or register new account)
2. You should see equipment list
3. Equipment should show correct quantities from database

---

### ✅ Task 5: Sign Up for Railway.app (5 minutes)

1. Go to https://railway.app
2. Sign up with GitHub
3. Don't deploy yet - just create account
4. We'll deploy tomorrow

---

## 🎯 What's Next?

After completing these 5 tasks:

1. **Read** `SETUP_GUIDE.md` - Your complete 4-week plan
2. **Tomorrow**: Deploy backend to Railway (Day 1 of Week 1)
3. **This Week**: Focus on Week 1 tasks (Foundation & Security)

---

## ❓ Did Something Fail?

### Database initialization failed?
```bash
# Check if PostgreSQL is running
pg_isready

# Check if you can connect
psql -U binfinity -l
```

### Backend won't start?
```bash
# Check for port conflicts
lsof -i :3000

# Install dependencies
cd aewrs-backend
npm install
```

### Mobile app won't start?
```bash
# Clear cache
cd aewrs-mobile
npm start -- --clear

# Or reset
rm -rf node_modules
npm install
```

---

## 📊 Progress Tracking

Mark these off as you complete them:

- [ ] Git cleanup done
- [ ] Database initialized successfully
- [ ] .env files created
- [ ] Backend starts without errors
- [ ] Mobile app connects to backend
- [ ] Can see equipment list with correct data
- [ ] Railway account created

**Once all checked:** You're ready for Week 1! 🚀

---

## 💡 Pro Tip

Commit your changes frequently:
```bash
git add .
git commit -m "Setup: Initialize database and environment configuration"
git push
```

This way you can always roll back if something breaks.
