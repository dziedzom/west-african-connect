

## Problem Summary

Two issues with the current authentication flow:

1. **No Google sign-in option** — The Auth page only has email/password fields. There's no "Sign in with Google" button, so users who want to use their Gmail account must still create a password. The user attempted to sign up without a password and got stuck.

2. **No post-signup redirect** — After email/password signup, the user stays on the auth page with a toast saying "Check your email" but no clear next step. Email confirmation is required, which is correct, but the experience is confusing.

## Plan

### Step 1: Add Google OAuth sign-in to the Auth page

- Add a "Continue with Google" button to `src/pages/Auth.tsx`
- Use `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/dashboard' } })`
- Place the Google button above the email/password form with a visual divider ("or")
- Style it consistently with the existing design (rounded-full, proper colors)

### Step 2: Configure Google auth provider

- Use the `configure_auth` tool to enable Google OAuth if not already enabled
- This allows users to sign in/up with their Google account without needing a password

### Step 3: Improve signup UX

- After successful email/password signup, show a clear "Check your email" state inline (not just a toast) so the user knows what to do next
- Keep the user on the auth page but swap the form for a confirmation message

### Technical Details

- Google OAuth uses Lovable Cloud's built-in Google provider support
- Users who sign up with Google are automatically confirmed (no email verification needed)
- The `AuthProvider` already handles `onAuthStateChange` and will pick up Google OAuth sessions automatically
- No database changes needed — the `handle_new_user` trigger already creates profiles for new users

