# 🚀 Production Deployment Guide

Complete step-by-step guide to deploy Modular Terrain Creator to production.

---

## ✅ Prerequisites

- [ ] Supabase account with project **zgvteidzhuysujeuampp**
- [ ] Vercel account
- [ ] Google Cloud Project with OAuth credentials
- [ ] Docker Desktop running (for local Supabase)

---

## 📝 Step 1: Deploy Database Migrations to Production Supabase

### Option A: Using SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/zgvteidzhuysujeuampp
   - Navigate to **SQL Editor**

2. **Copy SQL Script**
   - Open `PRODUCTION_MIGRATIONS.sql` in this repo
   - Copy the entire contents

3. **Execute Migration**
   - Paste the SQL into Supabase SQL Editor
   - Click **Run** to execute all migrations
   - ✅ Verify no errors appear

4. **Verify Tables Created**
   - Go to **Table Editor** in Supabase Dashboard
   - Confirm these tables exist:
     - ✅ `profiles`
     - ✅ `maps`
     - ✅ `piece_shapes`
     - ✅ `terrain_types`
     - ✅ `terrain_pieces`
     - ✅ `custom_pieces`
     - ✅ `piece_variants`
     - ✅ `piece_templates`
     - ✅ `piece_template_items`
     - ✅ `terrain_objects`

### Option B: Using Supabase CLI (Alternative)

```bash
# Login to Supabase
supabase login

# Link to production project
supabase link --project-ref zgvteidzhuysujeuampp

# Push migrations
supabase db push
```

---

## 🔐 Step 2: Configure Google OAuth in Production Supabase

1. **Enable Google Provider**
   - Go to: Supabase Dashboard → **Authentication** → **Providers**
   - Click on **Google**
   - Toggle **Enable Sign in with Google**

2. **Add Google Credentials**
   - Enter your `GOOGLE_CLIENT_ID`
   - Enter your `GOOGLE_CLIENT_SECRET`
   - Click **Save**

3. **Verify Redirect URI**
   - Confirm the redirect URI is:
     ```
     https://zgvteidzhuysujeuampp.supabase.co/auth/v1/callback
     ```
   - This should match the authorized redirect URI in Google Cloud Console

---

## ☁️ Step 3: Deploy to Vercel

### 3.1 Get Production Supabase Keys

1. Go to: Supabase Dashboard → **Settings** → **API**
2. Copy the following values:
   - **Project URL**: `https://zgvteidzhuysujeuampp.supabase.co`
   - **anon public key** (starts with `eyJ...`)

### 3.2 Deploy to Vercel

1. **Connect GitHub Repo to Vercel**
   - Go to: https://vercel.com
   - Click **Add New** → **Project**
   - Import your GitHub repository

2. **Configure Environment Variables**

   Add these environment variables in Vercel:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://zgvteidzhuysujeuampp.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-production-anon-key>
   GOOGLE_CLIENT_ID=<your-google-client-id>
   GOOGLE_CLIENT_SECRET=<your-google-client-secret>
   ```

3. **Deploy**
   - Click **Deploy**
   - Wait for deployment to complete
   - Note your production URL (e.g., `https://modular-terrain-creator.vercel.app`)

### 3.3 Update Google OAuth Authorized URLs

1. **Go to Google Cloud Console**
   - Navigate to: **APIs & Services** → **Credentials**
   - Select your OAuth 2.0 Client ID

2. **Add Production URLs**

   **Authorized JavaScript Origins:**
   ```
   https://modular-terrain-creator.vercel.app
   https://zgvteidzhuysujeuampp.supabase.co
   ```

   **Authorized Redirect URIs:**
   ```
   https://zgvteidzhuysujeuampp.supabase.co/auth/v1/callback
   ```

3. **Save Changes**

---

## 📱 Step 4: Publish Google OAuth App (Optional)

**⚠️ Important:** Only do this if you want to allow ANY Google user to sign up.

If you keep the app in "Testing" mode:
- Only test users you manually add can sign in
- Good for private/invite-only apps

To publish:

1. **Go to Google Cloud Console**
   - Navigate to: **APIs & Services** → **OAuth consent screen**

2. **Click "Publish App"**
   - Review the app information
   - Click **Confirm** to publish

3. **Verification (if required)**
   - Google may require verification for public apps
   - Follow their instructions if prompted

---

## ✅ Step 5: Verification Checklist

Test the following on your production URL:

### Authentication Tests

- [ ] **Unauthenticated Access**
  - Visit root URL → Should redirect to `/login`

- [ ] **Email/Password Signup**
  - Go to `/signup`
  - Create new account with email/password
  - Should auto-login and redirect to dashboard

- [ ] **Email/Password Login**
  - Sign out
  - Go to `/login`
  - Login with email/password
  - Should redirect to dashboard

- [ ] **Google OAuth Login** (if published)
  - Sign out
  - Go to `/login`
  - Click "Sign in with Google"
  - Should redirect to Google → back to dashboard

- [ ] **Profile Creation**
  - Login with new account
  - Check Supabase Dashboard → Table Editor → `profiles`
  - Confirm profile was auto-created

### Authorization Tests

- [ ] **User Can See Only Their Maps**
  - Create a map while logged in
  - Check that only your maps appear

- [ ] **Sign Out**
  - Click user avatar in top nav
  - Click "Sign out"
  - Should redirect to `/login`
  - Verify session is cleared

### Edge Cases

- [ ] **Banned Users** (Optional - requires admin action)
  - In Supabase Dashboard, set a user's `is_active = false`
  - That user should see `/suspended` page when trying to access the app

---

## 🎉 Success Criteria

✅ All migrations applied to production database
✅ Google OAuth configured in Supabase
✅ App deployed to Vercel with correct environment variables
✅ Users can sign up with email/password
✅ Users can login with email/password
✅ Users can login with Google (if published)
✅ User profiles auto-created on signup
✅ Users can only see their own maps
✅ Sign out works correctly

---

## 🔧 Troubleshooting

### "Error: Invalid login credentials"
- Check that Google OAuth is enabled in Supabase Dashboard
- Verify Google Client ID/Secret are correct in Vercel env vars
- Confirm authorized redirect URI matches in Google Cloud Console

### "Database error saving new user"
- Check that `handle_new_user()` function exists in Supabase
- Verify `profiles` table has correct permissions
- Check Supabase logs: Dashboard → Logs → Postgres Logs

### "User redirected to /login after signing up"
- Check browser console for errors
- Verify middleware allows `/signup` route
- Check that auto-login is working after signup

### "Google OAuth redirect loop"
- Verify `site_url` in Supabase Dashboard → Authentication → URL Configuration
- Should be: `https://modular-terrain-creator.vercel.app`
- Check authorized redirect URIs in Google Cloud Console

---

## 📊 Post-Deployment Monitoring

### Supabase Dashboard

- **Database**: Monitor table sizes, query performance
- **Authentication**: View user signups, active sessions
- **Logs**: Check for errors in Auth, PostgREST, Postgres logs

### Vercel Dashboard

- **Deployments**: Monitor build times, deployment status
- **Analytics**: Track page views, user sessions (if enabled)
- **Logs**: Check runtime logs for errors

---

## 🔄 Future Deployments

For code changes:

```bash
# Commit changes
git add .
git commit -m "Your change description"

# Push to GitHub
git push origin main

# Vercel auto-deploys from main branch
```

For database changes:

```bash
# Create new migration locally
supabase migration new your_migration_name

# Edit the SQL file in supabase/migrations/

# Test locally
supabase db reset

# Push to production
supabase db push
```

---

## 📝 Notes

- **Test User**: The test user (`test@local.dev`) is safe for production - it only creates if it doesn't exist
- **RLS Policies**: All tables have Row Level Security enabled
- **Backups**: Supabase automatically backs up your database daily
- **Scaling**: Both Vercel and Supabase scale automatically

---

**Last Updated**: 2026-02-23
**Status**: Ready for deployment ✅
