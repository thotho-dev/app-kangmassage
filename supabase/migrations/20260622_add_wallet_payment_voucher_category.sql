-- Add wallet_payment to voucher_category enum
-- Run in Supabase SQL Editor

ALTER TYPE voucher_category ADD VALUE 'wallet_payment';
