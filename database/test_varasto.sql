-- lisää liinoja
UPDATE varasto
SET maara = maara + 20
WHERE koko_id = 3 AND kategoria_id = 2;

-- poista liinoja
UPDATE varasto
SET maara = maara - 5
WHERE koko_id = 3 AND kategoria_id = 2;

-- tarkista varasto
SELECT * FROM varasto;