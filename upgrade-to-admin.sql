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
