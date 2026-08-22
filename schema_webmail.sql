-- ====================================================================
-- COSMOCNERGY SMART 1-TAP PROCUREMENT OS — SUPABASE WEBMAIL ACCOUNTS SCHEMA
-- Description: Per-user encrypted/isolated IMAP/SMTP configurations table
-- Repository: https://github.com/canopycorppune-sys/CosmoCnergy.git
-- ====================================================================

CREATE TABLE IF NOT EXISTS webmail_accounts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    sender_name TEXT,
    imap_host TEXT NOT NULL DEFAULT 'mail.cosmocnergy.com',
    imap_port INTEGER DEFAULT 993,
    smtp_host TEXT NOT NULL DEFAULT 'mail.cosmocnergy.com',
    smtp_port INTEGER DEFAULT 465,
    auth_username TEXT NOT NULL,
    auth_password TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS & set public access policy
ALTER TABLE webmail_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access webmail_accounts" ON webmail_accounts;
CREATE POLICY "Allow all access webmail_accounts" 
    ON webmail_accounts FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Insert Default Webmail Accounts
INSERT INTO webmail_accounts (id, username, email, sender_name, imap_host, imap_port, smtp_host, smtp_port, auth_username, auth_password, is_default)
VALUES 
('acc-procurement', 'ANUJ (PROCUREMENT HEAD)', 'procurement@cosmocnergy.com', 'CosmoCnergy Procurement Head', 'mail.cosmocnergy.com', 993, 'mail.cosmocnergy.com', 465, 'procurement@cosmocnergy.com', '', true),
('acc-sales', 'ANUJ (PROCUREMENT HEAD)', 'sales@cosmocnergy.com', 'CosmoCnergy Sales & Supply', 'mail.cosmocnergy.com', 993, 'mail.cosmocnergy.com', 465, 'sales@cosmocnergy.com', '', false)
ON CONFLICT (id) DO NOTHING;
