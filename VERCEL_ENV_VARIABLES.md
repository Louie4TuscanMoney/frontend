# Vercel Environment Variables Required

## Required Variables

Add these to your Vercel project settings:

### 1. Go to Vercel Dashboard
- Navigate to your frontend project
- Go to **Settings** → **Environment Variables**

### 2. Add These Variables

```
VITE_DATA_API_URL=https://data1-production.up.railway.app
VITE_MCS_API_URL=https://mcs1-production.up.railway.app
```

### 3. Existing Variables (if you have them)

You may already have these:
```
VITE_NBA_API_URL=https://your-nba-api.railway.app
VITE_SHAP_API_URL=https://liveshap1-production.up.railway.app
VITE_BETINPUT_API_URL=https://betinput-production.up.railway.app
```

## How to Add

1. **Vercel Dashboard** → Your Project → **Settings**
2. Click **Environment Variables**
3. Click **Add New**
4. Add each variable:
   - **Key**: `VITE_DATA_API_URL`
   - **Value**: `https://data1-production.up.railway.app`
   - **Environment**: Production (and Preview if needed)
5. Repeat for `VITE_MCS_API_URL`
6. Click **Save**
7. **Redeploy** your application

## After Adding Variables

Vercel will automatically redeploy, or you can manually trigger a redeploy:
- Go to **Deployments** tab
- Click **Redeploy** on the latest deployment

## Verify

After deployment, test:
1. Navigate to `/mcs` page
2. Check that predictions load
3. Test "Run Master.py" button
4. Verify date selector works

## Default Values

If variables are not set, the code uses these defaults:
- `VITE_DATA_API_URL`: `https://data1-production.up.railway.app`
- `VITE_MCS_API_URL`: `https://mcs1-production.up.railway.app`

But it's better to set them explicitly in Vercel!

