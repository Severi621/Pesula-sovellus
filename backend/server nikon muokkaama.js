const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// -----------------------------
// STAATTISTEN TIEDOSTOJEN PALVELU
// -----------------------------

// Palvelee frontend-kansion tiedostot (app.html, app.js, app.css)
app.use(express.static(path.join(__dirname, '../frontend')));

// Palvelee node_modules-kansion (SimpleCalendarJS)
app.use('/node_modules', express.static(path.join(__dirname, '../node_modules')));

// JSON middleware
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

// -----------------------------
// API: HAE KAIKKI TILAUKSET
// -----------------------------
app.get('/api/tilaukset', (req, res) => {
  const query = `
    SELECT
      t.tilaus_id,
      t.vuokra_alku,
      t.vuokra_loppu,
      a.nimi AS asiakas_nimi,
      a.asiakas_id
    FROM tilaukset t
    LEFT JOIN asiakkaat a ON t.asiakas_id = a.asiakas_id
    ORDER BY t.vuokra_alku DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    const events = rows.map(row => ({
      id: row.tilaus_id,
      title: row.asiakas_nimi || `Asiakas ${row.asiakas_id}`,
      start: row.vuokra_alku,
      end: row.vuokra_loppu,
      allDay: true,
      color: '#3788d8',
      extendedProps: {
        asiakas_id: row.asiakas_id,
        asiakas_nimi: row.asiakas_nimi,
        vuokra_alku: row.vuokra_alku,
        vuokra_loppu: row.vuokra_loppu
      }
    }));

    res.json(events);
  });
});

// -----------------------------
// API: HAE YKSI TILAUS
// -----------------------------
app.get('/api/tilaukset/:id', (req, res) => {
  const query = `
    SELECT t.*, a.nimi AS asiakas_nimi
    FROM tilaukset t
    LEFT JOIN asiakkaat a ON t.asiakas_id = a.asiakas_id
    WHERE t.tilaus_id = ?
  `;

  db.get(query, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Tilausta ei löytynyt' });

    res.json(row);
  });
});

// -----------------------------
// API: LISÄÄ TILAUS
// -----------------------------
app.post('/api/tilaukset', (req, res) => {
  const { asiakas_nimi, vuokra_alku, vuokra_loppu } = req.body;

  if (!asiakas_nimi || !vuokra_alku || !vuokra_loppu) {
    return res.status(400).json({ error: 'Puuttuvia tietoja' });
  }

  db.get(
    `SELECT asiakas_id FROM asiakkaat WHERE nimi = ?`,
    [asiakas_nimi],
    (err, rivi) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      if (rivi) {
        insertTilaus(rivi.asiakas_id);
      } else {
        db.run(
          `INSERT INTO asiakkaat (nimi) VALUES (?)`,
          [asiakas_nimi],
          function (err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            insertTilaus(this.lastID);
          }
        );
      }
    }
  );

  function insertTilaus(asiakas_id) {
    db.run(
      `INSERT INTO tilaukset (asiakas_id, vuokra_alku, vuokra_loppu) VALUES (?,?,?)`,
      [asiakas_id, vuokra_alku, vuokra_loppu],
      function (err) {
        if (err) return res.status(500).json({ error: 'insertTilaus epäonnistui' });

        res.json({
          success: true,
          tilaus_id: this.lastID,
          asiakas_id
        });
      }
    );
  }
});

// -----------------------------
// API: MUOKKAA TILAUSTA
// -----------------------------
app.put('/api/update-event/:id', (req, res) => {
  const { vuokra_alku, vuokra_loppu } = req.body;

  db.run(
    `UPDATE tilaukset SET vuokra_alku = ?, vuokra_loppu = ? WHERE tilaus_id = ?`,
    [vuokra_alku, vuokra_loppu, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// -----------------------------
// API: POISTA TILAUS
// -----------------------------
app.delete('/api/delete-event/:id', (req, res) => {
  db.run(
    `DELETE FROM tilaukset WHERE tilaus_id = ?`,
    [req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
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




