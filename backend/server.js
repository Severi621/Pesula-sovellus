const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const port = 3000;

// Avaa tietokantayhteys
const db = new sqlite3.Database('./database.db');

// Middleware
app.use(express.json()); // JSON-datan käsittelyyn
app.use(express.static(path.join(__dirname, '../'))); // Palvele HTML-tiedostoja

// Luo tapahtumataulu jos ei ole olemassa
db.run(`
    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        start TEXT NOT NULL,
        end TEXT,
        color TEXT,
        allDay INTEGER DEFAULT 0
    )
`);

// API: Hae kaikki tapahtumat
app.get('/api/events', (req, res) => {
    db.all('SELECT * FROM events ORDER BY start', [], (err, rows) => {
        if (err) {
            console.error('Virhe haettaessa tapahtumia:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        // Muunna allDay takaisin booleaniksi SQLitestä
        const events = rows.map(row => ({
            ...row,
            allDay: row.allDay === 1
        }));
        res.json(events);
    });
});

// API: Lisää uusi tapahtuma
app.post('/api/events', (req, res) => {
    const { title, start, end, color, allDay } = req.body;
    
    // Muunna boolean INTEGERiksi SQLiteä varten
    const allDayInt = allDay ? 1 : 0;
    
    db.run(
        'INSERT INTO events (title, start, end, color, allDay) VALUES (?, ?, ?, ?, ?)',
        [title, start, end || null, color || '#3788d8', allDayInt],
        function(err) {
            if (err) {
                console.error('Virhe lisättäessä tapahtumaa:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ 
                id: this.lastID,
                title,
                start,
                end,
                color,
                allDay
            });
        }
    );
});

// API: Päivitä tapahtuma
app.put('/api/events/:id', (req, res) => {
    const { id } = req.params;
    const { title, start, end, color, allDay } = req.body;
    const allDayInt = allDay ? 1 : 0;
    
    db.run(
        'UPDATE events SET title = ?, start = ?, end = ?, color = ?, allDay = ? WHERE id = ?',
        [title, start, end, color, allDayInt, id],
        function(err) {
            if (err) {
                console.error('Virhe päivitettäessä tapahtumaa:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ changes: this.changes });
        }
    );
});

// API: Poista tapahtuma
app.delete('/api/events/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM events WHERE id = ?', id, function(err) {
        if (err) {
            console.error('Virhe poistettaessa tapahtumaa:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ deleted: this.changes > 0 });
    });
});

app.listen(port, () => {
    console.log(`✅ Palvelin käynnissä osoitteessa http://localhost:${port}`);
    console.log(`📅 API: http://localhost:${port}/api/events`);
});
