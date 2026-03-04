CREATE TABLE asiakkaat (
    asiakas_id SERIAL PRIMARY KEY,
    nimi VARCHAR(100) NOT NULL,
    puhelin VARCHAR(30),
    osoite VARCHAR(200),
    luotu TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE liinakategoriat (
    kategoria_id SERIAL PRIMARY KEY,
    nimi VARCHAR(50) NOT NULL
);

INSERT INTO liinakategoriat (nimi) VALUES
('vanha'),
('uusi');

CREATE TABLE liinakoot (
    koko_id SERIAL PRIMARY KEY,
    koko_nimi VARCHAR(50) NOT NULL
);

INSERT INTO liinakoot (koko_nimi) VALUES
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

CREATE TABLE varasto (
    varasto_id SERIAL PRIMARY KEY,
    koko_id INTEGER REFERENCES liinakoot(koko_id),
    kategoria_id INTEGER REFERENCES liinakategoriat(kategoria_id),
    maara INTEGER NOT NULL
);

CREATE TABLE tilaukset (
    tilaus_id SERIAL PRIMARY KEY,
    asiakas_id INTEGER REFERENCES asiakkaat(asiakas_id),
    pesupaivat INTEGER DEFAULT 2,
    pesuprosentti INTEGER DEFAULT 80,
    luotu TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    vuokra_alku DATE NOT NULL,
    vuokra_loppu DATE NOT NULL
);

CREATE TABLE tilausrivit (
    tilausrivi_id SERIAL PRIMARY KEY,
    tilaus_id INTEGER REFERENCES tilaukset(tilaus_id),
    koko_id INTEGER REFERENCES liinakoot(koko_id),
    kategoria_id INTEGER REFERENCES liinakategoriat(kategoria_id),
    maara INTEGER NOT NULL
);

CREATE TABLE pesut (
    pesu_id SERIAL PRIMARY KEY,
    tilaus_id INTEGER REFERENCES tilaukset(tilaus_id),
    pesu_alku DATE,
    pesu_loppu DATE
);
