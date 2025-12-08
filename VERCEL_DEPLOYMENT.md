# Vercel Deployment Guide - Complete Setup

## ✅ Frontend Ready for Vercel?

**Yes!** The frontend is ready for Vercel deployment. Here's what you need:

## 🚀 Step 1: Vercel Environment Variables

### Required Environment Variables for Vercel

Add these in **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**:

```
VITE_NBA_API_URL=https://web-production-8ddddc.up.railway.app
VITE_SHAP_API_URL=https://liveshap1-production.up.railway.app
VITE_BETINPUT_API_URL=https://betinput-production.up.railway.app
```

**Important:** 
- All variables must start with `VITE_` (Vite requirement)
- Use your actual Railway URLs (check Railway dashboard for exact URLs)
- Add for **Production**, **Preview**, and **Development** environments

### How to Add in Vercel:

1. Go to [vercel.com](https://vercel.com)
2. Select your project (or create new)
3. **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Add each variable:
   - **Key**: `VITE_NBA_API_URL`
   - **Value**: `https://web-production-8ddddc.up.railway.app`
   - **Environment**: Select all (Production, Preview, Development)
6. Repeat for all 3 variables
7. **Redeploy** after adding variables

## 🔧 Step 2: Railway Environment Variables

### BetInput Service

Add this environment variable:

```
PORTFOLIO_DIR=/app/portfolio
```

**How to Add:**
1. Railway Dashboard → **BetInput** service
2. **Variables** tab
3. Click **"+ New Variable"**
4. **Name**: `PORTFOLIO_DIR`
5. **Value**: `/app/portfolio`
6. Click **"Add"**

### SHAP Service

**No environment variables needed** (uses relative paths)

### NBA Service

**No environment variables needed** (fetches live data)

## 📋 Complete Environment Variable Checklist

### Vercel (Frontend)

- [ ] `VITE_NBA_API_URL` = Your NBA Railway URL
- [ ] `VITE_SHAP_API_URL` = Your SHAP Railway URL
- [ ] `VITE_BETINPUT_API_URL` = Your BetInput Railway URL

### Railway - BetInput Service

- [ ] `PORTFOLIO_DIR=/app/portfolio`

### Railway - SHAP Service

- [ ] None needed ✅

### Railway - NBA Service

- [ ] None needed ✅

## 🎯 Step 3: Deploy to Vercel

### Option A: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Import your GitHub repository (frontend folder)
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` (if repo has multiple folders)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variables (see above)
6. Click **"Deploy"**

### Option B: Vercel CLI

```bash
cd /Users/embrace/Desktop/frontend
npm install -g vercel
vercel login
vercel
```

Follow prompts, add environment variables when asked.

## ✅ Step 4: Verify Deployment

After deployment:

1. **Check Vercel URL** (e.g., `your-app.vercel.app`)
2. **Open in browser**
3. **Check browser console** (F12) for:
   - API connection errors
   - Environment variable values (should show Railway URLs)
4. **Test features**:
   - Games load from NBA API ✅
   - SHAP predictions display ✅
   - BetInput form works ✅
   - Portfolio page loads ✅

## 🔍 Finding Your Railway URLs

### Method 1: Railway Dashboard

1. Railway Dashboard → Your Project
2. Click on each service
3. **Settings** → **Networking**
4. Copy the **Public Domain** URL

### Method 2: Railway Service URLs

Your URLs should look like:
- **NBA**: `https://web-production-8ddddc.up.railway.app`
- **SHAP**: `https://liveshap1-production.up.railway.app`
- **BetInput**: `https://betinput-production.up.railway.app`

## 🚨 Common Issues

### Issue: Environment Variables Not Working

**Fix:**
- Make sure variables start with `VITE_`
- Redeploy after adding variables
- Check browser console for actual values

### Issue: CORS Errors

**Fix:**
- Railway services already have CORS enabled
- If issues, check Railway service logs

### Issue: API Not Connecting

**Fix:**
- Verify Railway URLs are correct
- Check Railway services are running
- Test URLs directly in browser

## 📝 Pre-Deployment Checklist

### Frontend (Vercel)

- [ ] Code committed to GitHub
- [ ] Environment variables added to Vercel
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Framework: Vite

### Backend (Railway)

- [ ] All services deployed and running
- [ ] Volumes created (BetInput, SHAP)
- [ ] Environment variables set (BetInput: `PORTFOLIO_DIR`)
- [ ] Services have public domains
- [ ] CORS enabled (already done)

## 🎉 You're Ready!

Once you:
1. ✅ Add environment variables to Vercel
2. ✅ Add `PORTFOLIO_DIR` to Railway BetInput
3. ✅ Deploy to Vercel

Everything will work! 🚀

