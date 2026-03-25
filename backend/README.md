# 1. Riippuvuudet

Asenna Node.js (vähintään 18.x suositeltu).

Sitten asenna tarvittavat paketit backend-kansiossa:

```bash
npm install
```

# 2. Tietokannan ja tiedostojen sijainnit

Backend luo tietokannan automaattisesti.
SQL-init löytyy database hakemistosta.

# Tietokanta

- Tietokanta luodaan automaattisesti, jos `database/database.db` ei vielä ole olemassa.
- Alustustiedosto: `database/init_database.sql`


# 3. Palvelimen käynnistäminen

Siirry backend-kansioon:

```bash
cd backend
node server.js
```

Palvelin kuuntelee porttia 3000:
    Avaa selaimessa http://localhost:3000/ → testi-endpoint
    Staattiset frontend-tiedostot löytyvät /frontend-kansiosta


# 4. Frontendin käynnistäminen

Kirjoita selaimeesi "http://localhost:3000/test(1).html".
Oletettavasti "test(1).html" pitää vaihtaa jos käytät eri versiota frontendistä.
