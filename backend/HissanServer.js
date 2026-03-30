const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// -----------------------------
// STAATTISTEN TIEDOSTOJEN PALVELU
// -----------------------------
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/node_modules', express.static(path.join(__dirname, '../node_modules')));
app.use(express.json());

// -----------------------------
// TIETOKANTA
// -----------------------------
const dbPath = path.join(__dirname, '../database/database.db');
const sqlPath = path.join(__dirname, '../database/init_database.sql');

const dbExists = fs.existsSync(dbPath);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Tietokantavirhe:", err.message);
  } else {
    console.log("Connected to SQLite database.");
    db.run("PRAGMA foreign_keys = ON;");

    if (!dbExists) {
      console.log("Luodaan uusi tietokanta...");
      const initSql = fs.readFileSync(sqlPath, 'utf-8');
      db.exec(initSql, (err) => {
        if (err) console.error("SQL init virhe:", err.message);
        else console.log("Tietokanta alustettu onnistuneesti.");
      });
    }
  }
});

// ============================================================
// APUFUNKTIO: SAATAVUUDEN LASKENTA (PESUAIKA + PESUPROSENTTI)
// ============================================================
function checkAvailability(koko_id, kategoria_id, vuokra_alku, vuokra_loppu, callback) {
  const sql = `
    WITH jarj_aset AS (
      SELECT 
        MAX(CASE WHEN avain = 'ylimaarainen_pesupaiva' THEN arvo END) AS ylim_paiva
      FROM jarjestelma_asetukset
    ),
    tilaukset_vapautus AS (
      SELECT 
        tr.maara,
        t.pesupaivat,
        t.pesuprosentti,
        DATE(t.vuokra_loppu, '+' || t.pesupaivat || ' days') AS vapautus_norm,
        DATE(t.vuokra_loppu, '+' || (t.pesupaivat + ja.ylim_paiva) || ' days') AS vapautus_extra
      FROM tilaukset t
      JOIN tilausrivit tr ON t.tilaus_id = tr.tilaus_id
      CROSS JOIN jarj_aset ja
      WHERE tr.koko_id = ? AND tr.kategoria_id = ?
        AND t.vuokra_alku < ?
        AND DATE(t.vuokra_loppu, '+' || t.pesupaivat || ' days') > ?
    ),
    varattu AS (
      SELECT 
        SUM(
          CASE WHEN ? < vapautus_norm THEN maara
               WHEN ? < vapautus_extra AND pesuprosentti < 100 THEN 
                  ROUND(maara * (100 - pesuprosentti) / 100.0)
               ELSE 0
          END
        ) AS varattu_maara
      FROM tilaukset_vapautus
    )
    SELECT 
      (SELECT maara FROM varasto WHERE koko_id = ? AND kategoria_id = ?) -
      COALESCE((SELECT varattu_maara FROM varattu), 0) AS saatavissa
  `;
  db.get(sql, [koko_id, kategoria_id, vuokra_loppu, vuokra_alku, vuokra_alku, vuokra_alku, koko_id, kategoria_id], (err, row) => {
    if (err) callback(err);
    else callback(null, row ? row.saatavissa : 0);
  });
}

// ============================================================
// API: ASIAKKAAT
// ============================================================
app.get('/api/asiakkaat', (req, res) => {
  db.all('SELECT asiakas_id, nimi, puhelin, osoite FROM asiakkaat ORDER BY nimi', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/asiakkaat', (req, res) => {
  const { nimi, puhelin, osoite } = req.body;
  if (!nimi) return res.status(400).json({ error: 'Nimi puuttuu' });
  db.run('INSERT INTO asiakkaat (nimi, puhelin, osoite) VALUES (?, ?, ?)',
    [nimi, puhelin, osoite], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ asiakas_id: this.lastID, nimi, puhelin, osoite });
    });
});

app.put('/api/asiakkaat/:id', (req, res) => {
  const { nimi, puhelin, osoite } = req.body;
  db.run('UPDATE asiakkaat SET nimi=?, puhelin=?, osoite=? WHERE asiakas_id=?',
    [nimi, puhelin, osoite, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Asiakasta ei löydy' });
      res.json({ success: true });
    });
});

app.delete('/api/asiakkaat/:id', (req, res) => {
  db.run('DELETE FROM asiakkaat WHERE asiakas_id=?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Asiakasta ei löydy' });
    res.json({ success: true });
  });
});

// ============================================================
// API: LIINAKOOT
// ============================================================
app.get('/api/liinakoot', (req, res) => {
  db.all('SELECT koko_id, koko_nimi FROM liinakoot ORDER BY koko_nimi', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/liinakoot', (req, res) => {
  const { koko_nimi } = req.body;
  if (!koko_nimi) return res.status(400).json({ error: 'Koko puuttuu' });
  db.run('INSERT INTO liinakoot (koko_nimi) VALUES (?)', [koko_nimi], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ koko_id: this.lastID, koko_nimi });
  });
});

app.delete('/api/liinakoot/:id', (req, res) => {
  db.run('DELETE FROM liinakoot WHERE koko_id=?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Kokoa ei löydy' });
    res.json({ success: true });
  });
});

// ============================================================
// API: LIINAKATEGORIAT
// ============================================================
app.get('/api/liinakategoriat', (req, res) => {
  db.all('SELECT kategoria_id, nimi FROM liinakategoriat ORDER BY nimi', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/liinakategoriat', (req, res) => {
  const { nimi } = req.body;
  if (!nimi) return res.status(400).json({ error: 'Nimi puuttuu' });
  db.run('INSERT INTO liinakategoriat (nimi) VALUES (?)', [nimi], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ kategoria_id: this.lastID, nimi });
  });
});

// ============================================================
// API: VARASTO
// ============================================================
app.get('/api/varasto', (req, res) => {
  db.all(`
    SELECT vs.koko_id, k.koko_nimi, vs.kategoria_id, kat.nimi AS kategoria_nimi,
           vs.varasto_maara, vs.varattu_maara, vs.saldo
    FROM varasto_saldo vs
    JOIN liinakoot k ON vs.koko_id = k.koko_id
    JOIN liinakategoriat kat ON vs.kategoria_id = kat.kategoria_id
    ORDER BY k.koko_nimi, kat.nimi
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.put('/api/varasto', (req, res) => {
  const { koko_id, kategoria_id, maara } = req.body;
  if (!koko_id || !kategoria_id || maara === undefined) {
    return res.status(400).json({ error: 'Puutteelliset tiedot' });
  }
  db.run('UPDATE varasto SET maara = ? WHERE koko_id = ? AND kategoria_id = ?',
    [maara, koko_id, kategoria_id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Varastoriviä ei löydy' });
      res.json({ success: true });
    });
});

// ============================================================
// API: JÄRJESTELMÄASETUKSET
// ============================================================
app.get('/api/asetukset', (req, res) => {
  db.all('SELECT avain, arvo FROM jarjestelma_asetukset', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const settings = {};
    rows.forEach(row => { settings[row.avain] = row.arvo; });
    res.json(settings);
  });
});

app.put('/api/asetukset', (req, res) => {
  const updates = req.body;
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    const promises = Object.entries(updates).map(([avain, arvo]) => {
      return new Promise((resolve, reject) => {
        db.run('UPDATE jarjestelma_asetukset SET arvo = ? WHERE avain = ?', [arvo, avain], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    });
    Promise.all(promises)
      .then(() => {
        db.run('COMMIT');
        res.json({ success: true });
      })
      .catch(err => {
        db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
      });
  });
});

// ============================================================
// API: TILAUKSET (CRUD)
// ============================================================

// Hae kaikki tilaukset (kalenterinäkymä)
app.get('/api/events', (req, res) => {
  const sql = `
    SELECT tilaus_id, asiakas_nimi, vuokra_alku, vuokra_loppu, pesu_loppu
    FROM kalenteri_tapahtumat
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const events = rows.map(r => ({
      id: r.tilaus_id,
      title: r.asiakas_nimi,
      start: r.vuokra_alku,
      end: r.vuokra_loppu,
      allDay: true,
      color: '#3788d8',
      extendedProps: { pesu_loppu: r.pesu_loppu }
    }));
    res.json(events);
  });
});

// Hae yksittäinen tilaus
app.get('/api/tilaukset/:id', (req, res) => {
  const sql = `
    SELECT t.*, a.nimi as asiakas_nimi, a.puhelin, a.osoite
    FROM tilaukset t
    JOIN asiakkaat a ON t.asiakas_id = a.asiakas_id
    WHERE t.tilaus_id = ?
  `;
  db.get(sql, [req.params.id], (err, tilaus) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!tilaus) return res.status(404).json({ error: 'Tilausta ei löydy' });
    db.all('SELECT * FROM tilausrivit WHERE tilaus_id = ?', [req.params.id], (err, rivit) => {
      if (err) return res.status(500).json({ error: err.message });
      tilaus.tilausrivit = rivit;
      res.json(tilaus);
    });
  });
});

// Luo uusi tilaus (saatavuustarkistuksella)
app.post('/api/tilaukset', (req, res) => {
  const {
    asiakas_id,
    vuokra_alku,
    vuokra_loppu,
    pesupaivat = 2,
    pesuprosentti = 80,
    tilausrivit,
    override = false
  } = req.body;

  if (!asiakas_id || !vuokra_alku || !vuokra_loppu || !tilausrivit || tilausrivit.length === 0) {
    return res.status(400).json({ error: 'Puutteelliset tiedot' });
  }

  // Tarkistetaan saatavuus jokaiselle riville
  const checks = tilausrivit.map(rivi => {
    return new Promise((resolve, reject) => {
      checkAvailability(rivi.koko_id, rivi.kategoria_id, vuokra_alku, vuokra_loppu, (err, saatavissa) => {
        if (err) reject(err);
        else if (saatavissa < rivi.maara && !override) {
          reject(new Error(`Liian vähän: koko ${rivi.koko_id}, kategoria ${rivi.kategoria_id}. Saatavilla ${saatavissa}, tarvitaan ${rivi.maara}`));
        } else {
          resolve();
        }
      });
    });
  });

  Promise.all(checks)
    .then(() => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run(
          `INSERT INTO tilaukset (asiakas_id, vuokra_alku, vuokra_loppu, pesupaivat, pesuprosentti)
           VALUES (?, ?, ?, ?, ?)`,
          [asiakas_id, vuokra_alku, vuokra_loppu, pesupaivat, pesuprosentti],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }
            const tilaus_id = this.lastID;
            const riviInsertit = tilausrivit.map(rivi => {
              return new Promise((resolve, reject) => {
                db.run(
                  `INSERT INTO tilausrivit (tilaus_id, koko_id, kategoria_id, maara)
                   VALUES (?, ?, ?, ?)`,
                  [tilaus_id, rivi.koko_id, rivi.kategoria_id, rivi.maara],
                  (err) => {
                    if (err) reject(err);
                    else resolve();
                  }
                );
              });
            });
            Promise.all(riviInsertit)
              .then(() => {
                db.run('COMMIT');
                res.json({ tilaus_id, success: true });
              })
              .catch(err => {
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
              });
          }
        );
      });
    })
    .catch(err => {
      res.status(409).json({ error: err.message, overridable: true });
    });
});

// Muokkaa tilausta
app.put('/api/tilaukset/:id', (req, res) => {
  const tilaus_id = req.params.id;
  const {
    asiakas_id,
    vuokra_alku,
    vuokra_loppu,
    pesupaivat,
    pesuprosentti,
    tilausrivit,
    override = false
  } = req.body;

  if (!asiakas_id || !vuokra_alku || !vuokra_loppu || !tilausrivit || tilausrivit.length === 0) {
    return res.status(400).json({ error: 'Puutteelliset tiedot' });
  }

  // Tarkistetaan saatavuus (yksinkertaistettu: ei huomioi nykyistä tilausta)
  const checks = tilausrivit.map(rivi => {
    return new Promise((resolve, reject) => {
      checkAvailability(rivi.koko_id, rivi.kategoria_id, vuokra_alku, vuokra_loppu, (err, saatavissa) => {
        if (err) reject(err);
        else if (saatavissa < rivi.maara && !override) {
          reject(new Error(`Liian vähän: koko ${rivi.koko_id}, kategoria ${rivi.kategoria_id}. Saatavilla ${saatavissa}, tarvitaan ${rivi.maara}`));
        } else {
          resolve();
        }
      });
    });
  });

  Promise.all(checks)
    .then(() => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run(
          `UPDATE tilaukset SET asiakas_id=?, vuokra_alku=?, vuokra_loppu=?, pesupaivat=?, pesuprosentti=?
           WHERE tilaus_id=?`,
          [asiakas_id, vuokra_alku, vuokra_loppu, pesupaivat, pesuprosentti, tilaus_id],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
              db.run('ROLLBACK');
              return res.status(404).json({ error: 'Tilausta ei löydy' });
            }
            db.run('DELETE FROM tilausrivit WHERE tilaus_id = ?', [tilaus_id], function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
              }
              const riviInsertit = tilausrivit.map(rivi => {
                return new Promise((resolve, reject) => {
                  db.run(
                    `INSERT INTO tilausrivit (tilaus_id, koko_id, kategoria_id, maara)
                     VALUES (?, ?, ?, ?)`,
                    [tilaus_id, rivi.koko_id, rivi.kategoria_id, rivi.maara],
                    (err) => {
                      if (err) reject(err);
                      else resolve();
                    }
                  );
                });
              });
              Promise.all(riviInsertit)
                .then(() => {
                  db.run('COMMIT');
                  res.json({ success: true });
                })
                .catch(err => {
                  db.run('ROLLBACK');
                  res.status(500).json({ error: err.message });
                });
            });
          }
        );
      });
    })
    .catch(err => {
      res.status(409).json({ error: err.message, overridable: true });
    });
});

// Poista tilaus
app.delete('/api/tilaukset/:id', (req, res) => {
  db.run('DELETE FROM tilaukset WHERE tilaus_id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Tilausta ei löydy' });
    res.json({ success: true });
  });
});

// -----------------------------
// FRONTENDIN LATAUS
// -----------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/app.html'));
});

// -----------------------------
// PALVELIN KÄYNTIIN
// -----------------------------
app.listen(port, () => {
  console.log(`Server käynnissä portissa ${port}`);
});
