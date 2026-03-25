const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
// Uusi import
const fs = require('fs');

const app = express();
const port = 3000;

// Palvelee staattisia tiedostoja koko projektista.
app.use(express.static(path.join(__dirname, '../')));

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

    // Ottaa käyttöön foreign keys SQLitessä
    db.run("PRAGMA foreign_keys = ON;", (err) => {
      if (err) console.warn("Vierasavaintukea ei saatu päälle:", err.message);
    });

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

// Lataa kaikki tilaukset

app.get('/api/tilaukset', (req, res) => {
  const query = `
  select
  t.tilaus_id,
  t.vuokra_alku,
  t.vuokra_loppu,
  a.nimi as asiakas_nimi,
  a.asiakas_id
  from tilaukset t
  left join asiakkaat a on t.asiakas_id = a.asiakas_id
  order by t.vuokra_alku desc`;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Virhe haettaessa tapahtumia:', err);
      return res.status(500).json({ error: 'Database error'});
    }
    const events = rows.map(row => ({
      id: row.tilaus_id,
      title: row.asiakas_nimi ? `${row.asiakas_nimi}` : `Asiakas ${row.asiakas_id}`,
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
    console.log(`Lähetetään ${events.length} tapahtumaa kalenteriin`);
    res.json(events);
  });
});

// endpoint tilaukset haulle.
app.get('/api/tilaukset/:id', (req, res) => {
  const query = `
  select
  t.*,
  a.nimi as asiakas_nimi
  from tilaukset t
  left join asiakkaat a on t.asiakas_id = a.asiakas_id
  where t.tilaus_id = ?`;
  db.get(query, [req.params.id], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error'});
    }
    if (!row) {
      return res.status(404).json({ error: 'Tilausta ei löytynyt'});
    }
    res.json(row);
  });
});

// ­­­­¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯
// Tilausten API POST
// _______________________
app.post('/api/tilaukset', (req, res) => {
  const { asiakas_nimi, vuokra_alku, vuokra_loppu } = req.body;
  console.log(`Uusi api-POST ${asiakas_nimi}, ${vuokra_alku}, ${vuokra_loppu}`)

  if (!asiakas_nimi | !vuokra_alku | !vuokra_loppu) {
    return res.status(400).json({ error: 'Puuttuvia tietoja'});
  }

  // Tarkistus jos asiakas on olemassa, koska table referoi asiakas id.
  db.get(`select asiakas_id from asiakkaat where nimi = ?`, [asiakas_nimi], (err, rivi) => {
    if (err) {
      console.error('virhe asiakasta etsiessä', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (rivi) {
      //Asiakas on jo olemassa
      console.log(`Vanha asiakas olemassa: ${asiakas_nimi}, (id: ${rivi.asiakas_id})`);
      insertTilaus(rivi.asiakas_id);
    } else {
      db.run(`insert into asiakkaat (nimi) values (?)`, [asiakas_nimi], function (err) {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Database error' });
        }
        const newAsiakasId = this.lastID;
        console.log(`${asiakas_nimi} luotu (id: ${newAsiakasId})`);
        insertTilaus(newAsiakasId);
      });
    }
  });
  function insertTilaus(asiakas_id) {
    db.run(
      `insert into tilaukset (asiakas_id, vuokra_alku, vuokra_loppu) values (?,?,?)`,
      [asiakas_id, vuokra_alku, vuokra_loppu],
      function (err) {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'insertTilaus epäonnistui' });
        }
        
        res.json({
          success: true,
          tilaus_id: this.lastID,
          asiakas_id: asiakas_id
        })
      });
  };
});

// Lataa sovelluksen suoraan localhost:3000 URLista
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/app.html'))
})

app.get('/api/asiakkaat', (req, res) => {
  db.all('SELECT asiakas_id, nimi, puhelin, osoite FROM asiakkaat ORDER BY nimi', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/liinakategoriat', (req, res) => {
  db.all('SELECT kategoria_id, nimi FROM liinakategoriat ORDER BY nimi', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/liinakoot', (req, res) => {
  db.all('SELECT koko_id, koko_nimi FROM liinakoot ORDER BY koko_nimi', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.listen(port, () => {
    console.log(`Server käynnissä portissa ${port}`);
});

// -----------------------------
// LISÄÄ ASIAKAS
// -----------------------------
app.post('/api/asiakkaat', (req, res) => {
  const { nimi, puhelin, osoite } = req.body;

  db.run(
    'INSERT INTO asiakkaat (nimi, puhelin, osoite) VALUES (?, ?, ?)',
    [nimi, puhelin, osoite],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, asiakas_id: this.lastID });
    }
  );
});

// -----------------------------
// LISÄÄ LIINAKATEGORIA
// -----------------------------
app.post('/api/liinakategoriat', (req, res) => {
  const { nimi } = req.body;

  db.run(
    'INSERT INTO liinakategoriat (nimi) VALUES (?)',
    [nimi],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, kategoria_id: this.lastID });
    }
  );
});

// -----------------------------
// LISÄÄ LIINAKOKO
// -----------------------------
app.post('/api/liinakoot', (req, res) => {
  const { koko_nimi } = req.body;

  db.run(
    'INSERT INTO liinakoot (koko_nimi) VALUES (?)',
    [koko_nimi],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, koko_id: this.lastID });
    }
  );
});

// -----------------------------
// POISTA VARAUS
// -----------------------------
app.delete('/api/delete-event/:id', (req, res) => {
  db.run(
    'DELETE FROM tilaukset WHERE tilaus_id = ?',
    [req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// -----------------------------
// MUOKKAA VARAUSTA
// -----------------------------
app.put('/api/update-event/:id', (req, res) => {
  const { vuokra_alku, vuokra_loppu } = req.body;

  db.run(
    'UPDATE tilaukset SET vuokra_alku = ?, vuokra_loppu = ? WHERE tilaus_id = ?',
    [vuokra_alku, vuokra_loppu, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

