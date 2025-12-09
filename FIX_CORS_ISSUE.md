# Fix CORS Issue - Frontend Using Wrong URLs

## Problem

The frontend is trying to access **old Railway URLs** that don't exist:
- ❌ `mcs1-production.up.railway.app` (404 - doesn't exist)
- ❌ `data1-production.up.railway.app` (404 - doesn't exist)

## Solution

The frontend code has been updated, but **Vercel needs to be redeployed** with the new code OR you need to set environment variables.

## Quick Fix: Set Vercel Environment Variables

Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**

### Add/Update These Variables:

**Production:**
```
VITE_DATA_API_URL=https://data1-api-production.up.railway.app
VITE_MCS_API_URL=https://ml1mcs-production.up.railway.app
```

**Preview (optional):**
```
VITE_DATA_API_URL=https://data1-api-production.up.railway.app
VITE_MCS_API_URL=https://ml1mcs-production.up.railway.app
```

### After Setting Variables:

1. **Redeploy** your Vercel project:
   - Go to **Deployments** tab
   - Click **"Redeploy"** on the latest deployment
   - OR wait for auto-deploy (if GitHub is connected)

2. **Clear browser cache** and refresh

## Verify

After redeploying, check browser console:
- ✅ Should see requests to `data1-api-production.up.railway.app`
- ✅ Should see requests to `ml1mcs-production.up.railway.app`
- ✅ No CORS errors

## Why This Happened

The frontend code was updated in GitHub, but:
1. Vercel hasn't redeployed yet, OR
2. Environment variables are overriding the defaults with old URLs

Setting the environment variables ensures the correct URLs are used! 🚀

