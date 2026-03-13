CREATE TABLE IF NOT EXISTS asiakkaat (
    asiakas_id INTEGER PRIMARY KEY AUTOINCREMENT,
    nimi VARCHAR(100) NOT NULL,
    puhelin VARCHAR(30),
    osoite VARCHAR(200),
    luotu TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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
    luotu TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
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
