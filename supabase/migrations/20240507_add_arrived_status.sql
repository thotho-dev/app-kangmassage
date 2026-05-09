-- Add 'arrived' to order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'arrived' AFTER 'on_the_way';
