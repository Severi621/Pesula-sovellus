const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
// Uusi import
const fs = require('fs');

const app = express();
const port = 3000;

// Palvele staattisia tiedostoja frontend-kansiosta
app.use(express.static(path.join(__dirname, '../frontend')));

// Middleware JSON
app.use(express.json());

// Yhdistä tietokantaan (UUSITTU)
const dbPath = path.join(__dirname, '../database/database.db');
const sqlPath = path.join(__dirname, '../database/init_database.sql');

// Tarkista onko tietokanta jo olemassa
const dbExists = fs.existsSync(dbPath);

// Yhdistä (tai luo uusi)
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Tietokantavirhe:", err.message);
  } else {
    console.log("Connected to SQLite database.");

    // Jos tietokantaa ei ollut → luodaan taulut
    if (!dbExists) {
      console.log("Luodaan uusi tietokanta...");

      const initSql = fs.readFileSync(sqlPath, 'utf-8');

      db.exec(initSql, (err) => {
        if (err) {
          console.error("SQL init virhe:", err.message);
        } else {
          console.log("Tietokanta alustettu onnistuneesti.");
        }
      });
    }
  }
});
// (UUTUUS LOPPUU)

// Palauta kaikki tapahtumat (testidataa varten)
app.get('/api/events', (req, res) => {
  db.all('SELECT * FROM tilaukset', [], (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
      return;
    }

    // Muodosta kalenterille sopiva JSON
    const events = rows.map(r => ({
      id: r.tilaus_id,
      title: `Asiakas ${r.asiakas_id}`,
      start: r.vuokra_alku,
      end: r.vuokra_loppu || r.vuokra_alku,
      allDay: true,
      color: '#3788d8'
    }));

    res.json(events);
  });
});

// Lisää testinappia varten API POST
app.post('/api/add-test', (req, res) => {
  const { asiakas_id, vuokra_alku, vuokra_loppu } = req.body;
  db.run(
    'INSERT INTO tilaukset (asiakas_id, vuokra_alku, vuokra_loppu) VALUES (?, ?, ?)',
    [asiakas_id, vuokra_alku, vuokra_loppu],
    function(err) {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Database insert error' });
      } else {
        res.json({ success: true, tilaus_id: this.lastID });
      }
    }
  );
});

// Testi-endpoint
app.get("/", (req, res) => {
    res.send("Backend toimii!")
})

app.listen(port, () => {
    console.log(`Server käynnissä portissa ${port}`);
});
