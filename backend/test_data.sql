-- =========================
-- TEST DATA FOR PESULA DB
-- =========================

-- --------------------------------
-- TEST ASIAKKAAT
-- --------------------------------
INSERT INTO asiakkaat (nimi, puhelin, osoite) VALUES
('Testiravintola Oy', '0401234567', 'Testikatu 1, Tampere'),
('Juhlatalo Aurora', '0509876543', 'Aurorantie 5, Helsinki'),
('Hotel Polaris', '0305551234', 'Satamakatu 12, Turku'),
('Konferenssikeskus Nova', '0207778899', 'Kokouskuja 8, Espoo');


-- --------------------------------
-- TEST VARASTO
-- --------------------------------
INSERT INTO varasto (koko_id, kategoria_id, maara) VALUES
(1,2,20),
(2,2,50),
(3,2,40),
(4,2,35),
(5,2,30),
(6,2,25),
(7,1,40),
(8,1,30),
(9,1,20),
(10,1,10);


-- --------------------------------
-- TEST TILAUKSET
-- --------------------------------
INSERT INTO tilaukset (asiakas_id, vuokra_alku, vuokra_loppu) VALUES
(1,'2026-04-01','2026-04-03'),
(2,'2026-04-05','2026-04-06'),
(3,'2026-04-10','2026-04-12'),
(4,'2026-04-15','2026-04-18');


-- --------------------------------
-- TEST TILAUSRIVIT
-- --------------------------------
INSERT INTO tilausrivit (tilaus_id, koko_id, kategoria_id, maara) VALUES
-- Ravintola
(1,2,2,15),
(1,3,2,10),

-- Häät
(2,4,2,20),
(2,5,2,15),

-- Hotelli
(3,3,1,10),
(3,6,2,12),

-- Konferenssi
(4,2,2,25),
(4,4,2,15),
(4,5,1,10);


-- --------------------------------
-- TEST PESUT
-- --------------------------------
INSERT INTO pesut (tilaus_id, pesu_alku, pesu_loppu) VALUES
(1,'2026-04-04','2026-04-05'),
(2,'2026-04-07','2026-04-08');