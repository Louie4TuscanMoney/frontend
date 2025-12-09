# Vercel Environment Variables Setup

## ⚠️ CRITICAL: Set These Environment Variables

Your frontend is using **old Railway URLs** that don't exist. You MUST set these environment variables in Vercel.

## Steps

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard
   - Select your project

2. **Go to Settings → Environment Variables**

3. **Add/Update These Variables:**

### Production Environment:
```
VITE_DATA_API_URL=https://data1-api-production.up.railway.app
VITE_MCS_API_URL=https://ml1mcs-production.up.railway.app
```

### Preview Environment (optional):
```
VITE_DATA_API_URL=https://data1-api-production.up.railway.app
VITE_MCS_API_URL=https://ml1mcs-production.up.railway.app
```

### Development Environment (optional):
```
VITE_DATA_API_URL=http://localhost:8001
VITE_MCS_API_URL=http://localhost:8003
```

4. **Save** the variables

5. **Redeploy**:
   - Go to **Deployments** tab
   - Click **"Redeploy"** on latest deployment
   - Select **"Use existing Build Cache"** = No (to rebuild with new env vars)
   - Click **"Redeploy"**

## Why This Is Needed

The frontend code defaults to:
- `data1-production.up.railway.app` ❌ (doesn't exist - 404)
- `mcs1-production.up.railway.app` ❌ (doesn't exist - 404)

But your actual services are:
- `data1-api-production.up.railway.app` ✅
- `ml1mcs-production.up.railway.app` ✅

Setting environment variables will override the defaults and use the correct URLs.

## Verify After Deployment

1. Open your site: https://tuscanmoney.com/mcs
2. Open browser console (F12)
3. Check Network tab:
   - Should see requests to `data1-api-production.up.railway.app` ✅
   - Should see requests to `ml1mcs-production.up.railway.app` ✅
   - No CORS errors ✅

## Current Status

- ✅ Frontend code updated (committed to GitHub)
- ✅ APIs have CORS configured correctly
- ⚠️ **Vercel needs environment variables set**
- ⚠️ **Vercel needs to be redeployed**

Set the variables and redeploy - that's it! 🚀

