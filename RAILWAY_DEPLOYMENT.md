# Railway Deployment Guide - AEWRS Backend

## Prerequisites
- GitHub account
- Railway account (login with GitHub at railway.app)
- Code committed to Git

---

## Step-by-Step Deployment

### 1. Create Railway Project

1. Go to https://railway.app/dashboard
2. Click **"+ New Project"**
3. Select **"Provision PostgreSQL"** first
4. Wait for PostgreSQL to deploy (~30 seconds)
5. Click **"+ New"** again → **"GitHub Repo"**
6. Select `aewrs-project` repository
7. Railway will start deploying automatically

### 2. Configure Backend Service

1. Click on your backend service
2. Go to **"Settings"** tab
3. Set **Root Directory**: `aewrs-backend`
4. Set **Start Command**: `npm start`
5. Click **"Deploy"**

### 3. Add PostgreSQL Database

1. Click **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Wait for database to provision
3. Click on PostgreSQL service → **"Connect"** tab
4. Copy the connection string (starts with `postgresql://`)

### 4. Set Environment Variables

Click on backend service → **"Variables"** tab:

```
PORT=3000
NODE_ENV=production
JWT_SECRET=aewrs-production-secret-2024-change-this-value
DATABASE_URL=(paste PostgreSQL connection string)
```

Alternative (individual variables):
```
PORT=3000
NODE_ENV=production
JWT_SECRET=aewrs-production-secret-2024
DB_HOST=(from Railway PostgreSQL)
DB_PORT=5432
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=(from Railway PostgreSQL)
```

### 5. Initialize Database

**Option A: Using Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Connect to database
railway connect postgres

# Run init script
\i /path/to/init.sql
```

**Option B: Using Provided Credentials**
```bash
# Connect using psql
psql "postgresql://user:pass@host:port/railway"

# Copy and paste init.sql contents
```

### 6. Get Your Deployment URL

1. Go to backend service → **"Settings"** → **"Domains"**
2. Click **"Generate Domain"**
3. You'll get a URL like: `https://aewrs-backend-production.up.railway.app`
4. Copy this URL

### 7. Update Mobile App

Edit `aewrs-mobile/.env`:
```
EXPO_PUBLIC_API_URL=https://your-railway-url.railway.app/api
```

Restart mobile app to pick up new URL.

### 8. Test Deployment

```bash
# Test API is live
curl https://your-url.railway.app/

# Test registration
curl -X POST https://your-url.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@sit.edu.sg","password":"test123","sit_id":"2400999","name":"Test User"}'
```

---

## Troubleshooting

### Build Failed
- Check logs in Railway dashboard
- Ensure package.json has correct dependencies
- Verify start script: `"start": "node server.js"`

### Database Connection Failed
- Verify DATABASE_URL is set
- Check if PostgreSQL service is running
- Ensure database is initialized with init.sql

### App Crashes on Start
- Check environment variables are set
- Look at deployment logs
- Ensure JWT_SECRET is set

### Mobile App Can't Connect
- Verify API URL in mobile .env
- Check if backend is deployed successfully
- Test backend URL in browser first

---

## Railway Tips

### Free Tier Limits
- $5 free credit per month
- PostgreSQL: 1GB storage, 100GB data transfer
- Backend: 512MB RAM, shared CPU
- Enough for development/testing

### Auto-Deploy on Git Push
Once connected, Railway auto-deploys when you push to GitHub.

### View Logs
- Click service → "Deployments" tab
- Click latest deployment → "View Logs"
- Real-time logs for debugging

### Database Backups
- Railway automatically backs up PostgreSQL
- Can restore from "Data" tab
- Consider exporting important data

---

## Post-Deployment Checklist

- [ ] Backend deployed and accessible
- [ ] PostgreSQL database running
- [ ] Database initialized with tables
- [ ] Environment variables configured
- [ ] Mobile app updated with production URL
- [ ] Test registration/login works
- [ ] Test equipment list loads
- [ ] Verify API endpoints respond

---

## Next Steps After Deployment

1. **Test All Features**
   - Registration
   - Login
   - Equipment browsing
   - API endpoints

2. **Share URL with Team**
   - Works on any network
   - No more IP address changes

3. **Continue Development**
   - Week 2: Build borrow/return UI
   - Railway auto-deploys on git push

---

## Production Considerations (Later)

### Security
- Change JWT_SECRET to strong random value
- Enable HTTPS only (Railway does this by default)
- Set up rate limiting
- Add request logging

### Performance
- Add connection pooling (already configured)
- Enable compression middleware
- Set up caching for equipment list

### Monitoring
- Set up alerts in Railway dashboard
- Monitor database usage
- Track API response times

---

## Cost Estimate

**Development (Current Setup):**
- Railway Free Tier: $5/month credit
- Expected usage: ~$2-3/month
- **Cost: FREE** (within credit limit)

**Production (Future):**
- Upgrade to Hobby plan: $5/month
- PostgreSQL: $5-10/month
- Total: ~$10-15/month

---

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- GitHub Issues: Your repository issues page

---

**Deployment Date:** February 24, 2026
**Deployed By:** AEWRS Development Team
**Status:** Ready for deployment
