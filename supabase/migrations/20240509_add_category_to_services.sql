-- Add category_slug to services for therapist matching
ALTER TABLE services ADD COLUMN IF NOT EXISTS category_slug VARCHAR(50);

-- Create index for faster matching
CREATE INDEX IF NOT EXISTS idx_services_category_slug ON services(category_slug);

-- Update existing services with some default categories
UPDATE services SET category_slug = 'massage' WHERE name ILIKE '%massage%' OR name ILIKE '%pijat%';
UPDATE services SET category_slug = 'reflexology' WHERE name ILIKE '%reflexology%' OR name ILIKE '%refleksi%';
UPDATE services SET category_slug = 'shiatsu' WHERE name ILIKE '%shiatsu%';
UPDATE services SET category_slug = 'beauty' WHERE name ILIKE '%facial%' OR name ILIKE '%lulur%';
