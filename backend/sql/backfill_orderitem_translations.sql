-- Copy English names to historical order items
UPDATE order_item oi
LEFT JOIN menu_item mi ON mi.id = oi.menu_item_id
SET oi.name_en = COALESCE(NULLIF(oi.name_en, ''), NULLIF(mi.name_en, ''), oi.name)
WHERE oi.name_en IS NULL OR oi.name_en = '';
