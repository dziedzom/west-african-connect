# Repair admin route access

## Diagnosis
- The navbar and the route guard both ultimately read `isAdmin` from the shared authentication context.
- The role lookup correctly finds the account's `admin` row. The stored plan is separately read by the subscription badge, which uses the admin role to display `Pro · admin`.
- The disagreement is a timing bug: the authentication context marks itself finished immediately after loading the session, before the asynchronous admin-role lookup finishes. On a direct visit, `AdminRoute` briefly sees `user = present`, `loading = false`, and `isAdmin = false`, so it redirects to `/dashboard`. A moment later the role lookup completes, making the navbar badge and Admin button correct—but the redirect has already happened.
- The Pro-access change exposed this race through the badge; it did not remove the role or weaken the server-side admin check.

## Changes
1. Keep authentication in its loading state until both the session and admin-role lookup are complete, including direct loads and auth-state changes.
2. Keep all admin pages protected by the same database-backed role value; do not use subscription state as an admin substitute.
3. Add direct admin-dashboard navigation for Scraper, Indexing, Managed Bids, and Verification Queue.
4. Verify `/admin`, `/indexing`, `/scrape`, and `/admin/managed` with the admin session, and confirm a non-admin still cannot pass the guard.
