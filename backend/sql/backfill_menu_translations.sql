-- Standard menu translations
UPDATE menu_item SET name_en = 'Lemonade', description_en = 'Refreshing lemon drink.' WHERE name = 'Lemoniada';
UPDATE menu_item SET name_en = 'Cola', description_en = 'Classic cola drink.' WHERE name = 'Cola';
UPDATE menu_item SET name_en = 'Fries', description_en = 'Salted fries.' WHERE name = 'Frytki';
UPDATE menu_item SET name_en = 'Beef Burger', description_en = 'Juicy beef burger.' WHERE name = 'Burger Wolowy';
UPDATE menu_item SET name_en = 'Beef Burger + Cola + Fries', description_en = 'Combo meal.' WHERE name = 'Burger Wolowy + Cola + Frytki';
UPDATE menu_item SET name_en = 'Chicken Wrap', description_en = 'Wrap filled with chicken.' WHERE name = 'Wrap Kurczak';
UPDATE menu_item SET name_en = 'Fries Dip', description_en = 'Dip served with fries.' WHERE name = 'Sos do frytek';
UPDATE menu_item SET name_en = 'BBQ Burger', description_en = 'Burger with BBQ sauce.' WHERE name = 'Burger BBQ';
UPDATE menu_item SET name_en = 'Veggie Burger', description_en = 'Plant-based burger.' WHERE name = 'Burger Vege';
UPDATE menu_item SET name_en = 'Veggie Wrap', description_en = 'Wrap with veggie filling.' WHERE name = 'Wrap Vege';
UPDATE menu_item SET name_en = 'Wrap + Lemon Drink + Fries', description_en = 'Wrap combo with drink and fries.' WHERE name = 'Wrap + Lemon Drink + Frytki';
UPDATE menu_item SET name_en = 'Lemon Drink', description_en = 'Lemon-flavoured soda.' WHERE name = 'Lemon Drink';
UPDATE menu_item SET name_en = 'Water', description_en = 'Still water.' WHERE name = 'Woda';

-- Fallback: copy Polish text when English column is empty
UPDATE menu_item
SET name_en = COALESCE(NULLIF(name_en, ''), name),
    description_en = COALESCE(NULLIF(description_en, ''), description)
WHERE (name_en IS NULL OR name_en = '')
   OR (description_en IS NULL OR description_en = '');
