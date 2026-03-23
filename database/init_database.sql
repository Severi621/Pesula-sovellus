CREATE TABLE IF NOT EXISTS asiakkaat (
    asiakas_id INTEGER PRIMARY KEY AUTOINCREMENT,
    nimi VARCHAR(100) NOT NULL,
    puhelin VARCHAR(30),
    osoite VARCHAR(200),
    luotu TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS liinakategoriat (
    kategoria_id INTEGER PRIMARY KEY AUTOINCREMENT,
    nimi VARCHAR(50) NOT NULL UNIQUE
);

INSERT OR IGNORE INTO liinakategoriat (nimi) VALUES
('vanha'),
('uusi');

CREATE TABLE IF NOT EXISTS liinakoot (
    koko_id INTEGER PRIMARY KEY AUTOINCREMENT,
    koko_nimi VARCHAR(50) NOT NULL UNIQUE
);

INSERT OR IGNORE INTO liinakoot (koko_nimi) VALUES
('140 cm (pyöreä)'),
('140 cm'),
('160 cm'),
('180 cm'),
('240 cm'),
('260 cm'),
('300 cm'),
('360 cm'),
('400 cm'),
('500 cm');

CREATE TABLE IF NOT EXISTS varasto (
    varasto_id INTEGER PRIMARY KEY AUTOINCREMENT,
    koko_id INTEGER REFERENCES liinakoot(koko_id),
    kategoria_id INTEGER REFERENCES liinakategoriat(kategoria_id),
    maara INTEGER NOT NULL,
    UNIQUE(koko_id, kategoria_id)
);

CREATE TABLE IF NOT EXISTS tilaukset (
    tilaus_id INTEGER PRIMARY KEY AUTOINCREMENT, -- puuttuva pilkku lisätty
    asiakas_id INTEGER REFERENCES asiakkaat(asiakas_id),
    pesupaivat INTEGER DEFAULT 2,
    pesuprosentti INTEGER DEFAULT 80,
    luotu TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    vuokra_alku DATE NOT NULL,
    vuokra_loppu DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS tilausrivit (
    tilausrivi_id INTEGER PRIMARY KEY AUTOINCREMENT,
    tilaus_id INTEGER REFERENCES tilaukset(tilaus_id),
    koko_id INTEGER REFERENCES liinakoot(koko_id),
    kategoria_id INTEGER REFERENCES liinakategoriat(kategoria_id),
    maara INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pesut (
    pesu_id INTEGER PRIMARY KEY AUTOINCREMENT,
    tilaus_id INTEGER REFERENCES tilaukset(tilaus_id),
    pesu_alku DATE,
    pesu_loppu DATE
);

CREATE TABLE IF NOT EXISTS jarjestelma_asetukset (
    avain VARCHAR(50) PRIMARY KEY,
    arvo VARCHAR(200)
);

INSERT OR IGNORE INTO jarjestelma_asetukset (avain, arvo) VALUES 
    ('ylimaarainen_pesupaiva', '1'),
    ('normaali_pesupaiva_oletus', '2');

CREATE TRIGGER trg_liinakoot_insert
AFTER INSERT ON liinakoot
BEGIN
    INSERT OR IGNORE INTO varasto (koko_id, kategoria_id, maara)
    SELECT NEW.koko_id, kategoria_id, 0
    FROM liinakategoriat;
END;

CREATE TRIGGER trg_liinakoot_delete
AFTER DELETE ON liinakoot
BEGIN
    DELETE FROM varasto WHERE koko_id = OLD.koko_id;
END;

INSERT OR IGNORE INTO varasto (koko_id, kategoria_id, maara)
SELECT k.koko_id, kat.kategoria_id, 0
FROM liinakoot k
CROSS JOIN liinakategoriat kat
WHERE NOT EXISTS (
    SELECT 1 FROM varasto v WHERE v.koko_id = k.koko_id AND v.kategoria_id = kat.kategoria_id
);
