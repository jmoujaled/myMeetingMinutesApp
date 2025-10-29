# Admin Panel Setup Guide

## Current Status

Your application already has a comprehensive admin panel with the following features:

### Existing Admin Features

1. **System Overview** (`/admin`)
   - Total users count
   - Active users (last 30 days)
   - Total transcriptions
   - Today's transcriptions
   - Users by tier distribution
   - Recent activity feed

2. **User Management**
   - View all users with search and filter
   - User details (email, name, tier, usage stats)
   - Change user tier (free/pro/admin)
   - Reset monthly usage for users
   - View user activity and transcription history

3. **Analytics** (Placeholder)
   - Ready for implementation

4. **Settings**
   - System initializer
   - Ready for additional settings

## Upgrading Your Account to Admin

Your account `jmoujaled@gmail.com` needs to be upgraded to admin tier. Due to RLS (Row Level Security) policies that prevent non-admins from changing tiers, you need to run this SQL directly in Supabase:

### Steps to Upgrade:

1. Go to your Supabase Dashboard: https://dttqvwcwuywspiflqcjq.supabase.co
2. Navigate to **SQL Editor**
3. Run the SQL from `upgrade-to-admin.sql`:

```sql
-- Temporarily disable the trigger that prevents tier changes
ALTER TABLE user_profiles DISABLE TRIGGER prevent_user_tier_change;

-- Update the user to admin tier
UPDATE user_profiles 
SET tier = 'admin', updated_at = NOW() 
WHERE email = 'jmoujaled@gmail.com';

-- Re-enable the trigger
ALTER TABLE user_profiles ENABLE TRIGGER prevent_user_tier_change;

-- Verify the change
SELECT email, tier, full_name, created_at, updated_at 
FROM user_profiles 
WHERE email = 'jmoujaled@gmail.com';
```

4. After running this, log out and log back in to your application
5. Navigate to `/admin` to access the admin panel

## Admin Panel Structure

```
/admin
├── System Overview (default view)
│   ├── Key metrics cards
│   ├── User distribution by tier
│   └── Recent activity feed
├── User Management
│   ├── User list with search/filter
│   ├── User details modal
│   ├── Tier management
│   └── Usage reset
├── Analytics (coming soon)
└── Settings
    └── System initializer
```

## Next Steps - Admin Features to Add

Based on your requirements, here are suggested admin features to implement:

### 1. Enhanced Analytics Dashboard
- Usage trends over time
- Revenue projections by tier
- User growth charts
- Transcription volume by day/week/month
- Most active users

### 2. Usage Monitoring
- Real-time usage tracking
- Usage alerts and limits
- Detailed transcription logs
- Cost analysis per user

### 3. User Profile Management
- Bulk user operations
- Export user data
- User activity logs
- Account suspension/activation

### 4. System Configuration
- Tier limit management (already in DB)
- Feature flags
- System maintenance mode
- Email templates

### 5. Billing & Subscriptions (if needed)
- Subscription management
- Payment history
- Invoice generation
- Upgrade/downgrade flows

## Current Admin Components

All admin components are located in `src/components/admin/`:
- `AdminDashboard.tsx` - Main dashboard container
- `AdminSidebar.tsx` - Navigation sidebar
- `SystemOverview.tsx` - System metrics and stats
- `UserManagement.tsx` - User CRUD operations
- `SystemInitializer.tsx` - System setup utilities

## Access Control

The admin panel is protected by:
1. `ProtectedRoute` component with `requiredTier="admin"`
2. RLS policies in Supabase
3. Middleware checks for admin routes

Only users with `tier = 'admin'` can access `/admin` routes.
