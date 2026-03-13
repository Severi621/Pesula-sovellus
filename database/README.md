Miten luoda tietokanta:

1. Käynnistä DB browser for SQLite tai joku muu vastaava sovellus.
2. Valitse New Database.
3. Paina cancel kun sovellus avaa "Edit table definition" -ikkunan.
4. Kopioi init_database.sql:n koodi Execute SQL -kohtaan SQLitessä.
5. Execute all.
6. Tietokanta on luotu.

Lisää testidata tietokantaan:
1. Kopioi test_data.sql:n koodi SQLiteen samoin kun tietokannan luonnissa.
2. Execute all.
3. Tietokantaan on lisääty testidataa.

Muokkaa varastoa:
1. Kopioi test_varasto.sql:n koodi SQLiteen samoin kun tietokannan luonnissa.
2. Execute all.
3. Tietokannan varaston sisätöä on muutettu.


Tietokannan voi luoda myös näin:
1. sqlite3 database.db
2. .read init_database.sql
