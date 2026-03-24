

## Admin Dashboard

### Overview
Add a protected `/admin` route with a dedicated admin dashboard page. Since there's no role system yet, we need to create one using the `user_roles` table pattern, then build the admin UI.

### Steps

**Step 1: Database migration — admin role system**
- Create `app_role` enum and `user_roles` table
- Create `has_role()` security definer function
- Add RLS policies on `user_roles` (admins can view all, users see own)
- Add SELECT policies on `profiles`, `proposals`, `contact_messages`, `newsletter_subscribers` for admins to read all rows
- Manually insert yourself as admin (you'll need to provide your user ID after signing up)

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
```

Add admin-only SELECT policies on `profiles`, `proposals`, `contact_messages` so the admin dashboard can read all records.

**Step 2: Create `src/pages/AdminDashboard.tsx`**
A tabbed interface with three sections:
- **Users tab**: Fetches all `profiles` rows — shows company name, email, location, join date
- **Proposals tab**: Fetches all `proposals` with status badges — shows title, status, user, created date
- **Activity tab**: Shows counts from `rfps`, `scraped_rfps`, `rfp_opportunities`, `contact_messages`, `newsletter_subscribers` plus recent contact messages

Each tab uses existing UI components (Table, Badge, Card). Stats cards at the top show total users, proposals, RFPs, and contact messages.

**Step 3: Create admin route guard**
A new `<AdminRoute>` component in `App.tsx` that checks `has_role(auth.uid(), 'admin')` via a Supabase RPC call. Redirects non-admins to `/dashboard`.

**Step 4: Register route and add nav link**
- Add `/admin` route in `App.tsx` wrapped in `<AdminRoute>`
- Conditionally show "Admin" link in the navbar when the user has the admin role

### Files affected
- Database: 1 migration (role system + admin policies)
- **New**: `src/pages/AdminDashboard.tsx`
- **Edit**: `src/App.tsx` (add AdminRoute + route)
- **Edit**: `src/components/Layout.tsx` (conditional admin nav link)
- **Edit**: `src/contexts/AuthContext.tsx` (expose `isAdmin` flag)

### Security note
After migration, you'll need to insert your own user ID into `user_roles` with `role = 'admin'`. I'll provide an insert statement once you confirm your user ID, or you can do it via the backend UI.

