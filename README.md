# Orbital Foundry

**Free browser space-strategy alpha · English / Deutsch · No download**

[Play free](https://orbital-foundry-game.onrender.com/?lang=en&utm_source=github&utm_medium=readme) · [Explore the account-free demo](https://orbital-foundry-game.onrender.com/demo?lang=en) · [Game overview & press information](https://orbital-foundry-game.onrender.com/discover.html)

Build colonies, research technologies and command fleets. Try cargo missions, scouting, timed attacks and six clearly identified NPC factions. This small indie alpha is looking for early players and constructive feedback — it is not a finished, large-scale competitive MMO. A free account is required for saved gameplay; the demo is a read-only tour. Free hosting can mean a slow first load.

![Orbital Foundry space battle](public/assets/login-battle-v1.webp)

Found a problem or an idea? [Tell us in the project issues](https://github.com/Freddy3214/Orbital2/issues). Share the game only where community rules permit it; no fake player counts, unsolicited mass messages or paid promotion.

Ein eigenständiger Browser-MMO-Prototyp im Stil klassischer Weltraum-Aufbaustrategie. Er übernimmt nur das Genre-Prinzip - nicht Namen, Texte, Grafiken oder Code von *Space Pioneers*.

## Starten

Voraussetzung: Node.js 18 oder neuer.

```powershell
npm start
```

Danach `http://localhost:4173` im Browser öffnen. Beim ersten Start einmal `npm install` ausführen.

Beim ersten Besuch wird ein Kommandantenaccount mit Passwort angelegt; bestehende Accounts melden sich über den zweiten Reiter an. Die Sitzung bleibt im Browser aktiv. Lokal liegen Spielstände in `data/accounts.json`; auf Render werden sie automatisch in PostgreSQL gespeichert. Passwörter werden dabei nur als gesalzene `scrypt`-Prüfwerte abgelegt, nie im Klartext.

## Enthaltenes MVP

- Echtzeit- und Offline-Ressourcenproduktion mit Energieeffizienz
- Sichere Registrierung, Anmeldung, Abmeldung und automatische Sitzungswiederherstellung
- Bau-, Forschungs- und Werftaufträge mit sichtbarem Echtzeit-Countdown
- Bau-Reihe für mehrere Gebäudestufen; Kosten werden beim Einreihen reserviert
- Feste Maximalstufe 100 für jedes Gebäude und jede Forschung
- Techtree mit Voraussetzungen
- PvE-Missionen, Rückflug, Beute und Kampfbericht
- Lokale Sci-Fi-Illustrationen für Gebäude, Schiffe und sechs planetare Biome (gemäßigt, arid, Ozean, Eis, vulkanisch, Gas)
- Baufeld-System pro Planet: 96 bis 390 Felder bei neu besiedelten Welten, erst nach der Landung bekannt; ein Gebäudetyp belegt seine Felder nur beim Erstbau
- Kolonieschiff und unkartierte Kolonisierungsmission als Risikomechanik
- Direkt auswählbare Planeten-Registrierung
- Schwarze Galaxiekarte mit weißen, benannten Planetenpunkten, Zielauswahl, Zoom und Verschieben; keine Spielernamen auf der Karte
- Tiefraumsensorik: Sichtweite von 14 bis 92 Sektoren, serverseitig gefiltert; eigene aktive Welt ist der Sensorursprung
- Aufklärsonden mit 1- oder 5-Sonden-Aufträgen, Abfangrisiko, 15 Sekunden Abklingzeit und gespeicherten Berichten mit vier Informationsstufen
- Spionageberichte als Momentaufnahme: Rohstoffe, dann Besitzer/Flotte/Planet, danach Gebäude und Forschung je nach Forschungsunterschied; Berichte gelten zwei Stunden
- Schnellraubzüge benötigen ein sichtbares Ziel und einen gültigen Spionagebericht
- Farbige Infrastruktur- und Forschungskarten, Stufenbalken und eigene Illustrationen für Lager, Robotik und Sensorik
- Lokales Mehrprofil-Ranking über die Server-API
- Responsives Sci-Fi-Interface ohne externe Assets oder Tracker

## Balancing

Diese Version bildet die ausdrücklich gewünschten Karten- und Spionagemechaniken ab, nicht den vollständigen Funktionsumfang von Space Pioneers. Spionage und Raids werden derzeit sofort aufgelöst; reale Flugzeiten für PvP, Allianzen, Handel, Verteidigungsbauten und Rückruf fehlen noch. Wirtschaft und Flottenbestand sind weiterhin accountweit; Kolonien sind auswählbare Kartenpositionen, aber noch keine eigenständigen Wirtschaftskreisläufe. Spionageberichte zeigen daher die gemeinsame Wirtschaft des Besitzers. Die Karte filtert Zielinformationen serverseitig, jedoch bleibt das freie Speichern eigener Wirtschaftswerte ein Prototypenmodell und kein vollständiger Manipulationsschutz.

Prüfung: `node work/verify-galaxy.mjs` startet einen isolierten lokalen Testserver und prüft Reichweite, Spionage, Sperrzeit, Berichte, Raid-Voraussetzungen und Schutz gegen veraltete Spielstände. Die produktive Datenbank wird dabei nicht benutzt.

Die Produktionskurven folgen der Orientierung im bereitgestellten GDD: exponentielles Minenwachstum, Energieengpässe als proportionaler Effizienz-Malus und logarithmisch beschleunigte Bauzeiten durch Infrastruktur. Für einen direkt testbaren Prototypen sind Aufträge auf mindestens fünf Sekunden begrenzt und es gibt bewusst keine Echtgeld- oder Wartezeit-Abkürzungen.

Für den frühen Spielverlauf ist die empfohlene Route direkt im Kommando sichtbar: Roboterfabrik Stufe 2, Forschungslabor Stufe 1, Energietechnik, Verbrennungsantrieb, Orbitalwerft Stufe 2 und anschließend eine Frachtdrohne. Ein Kolonieschiff wird erst später freigeschaltet und verbraucht sich beim Gründen einer neuen Welt.

## Render-Deployment

Das Repository enthält eine `render.yaml`. In Render: **New +** → **Blueprint** → dieses Repository wählen → **Apply**. Render legt den Webdienst sowie eine PostgreSQL-Datenbank an und setzt die Verbindungsvariable selbst. Der Dienst ist danach über die von Render angezeigte HTTPS-Adresse erreichbar.

Wichtig: Der kostenlose Render-Postgres-Tarif ist nur zum Testen gedacht und läuft nach 30 Tagen ab. Für einen dauerhaften Start mit Freunden braucht die Datenbank anschließend einen bezahlten Tarif oder einen anderen Datenbankanbieter.

Der Launch enthält echte Accounts, sichere Sitzungs-Cookies und Datenbank-Speicherung. Bau, Forschung und neutrale Missionen sind weiterhin ein schneller Prototypen-Ablauf; Mehrspieler-Raids werden hingegen bereits in einer Datenbank-Transaktion auf dem Server aufgelöst. Vor einer größeren öffentlichen Veröffentlichung sollten zusätzlich E-Mail-Verifikation bzw. Passwort-Reset, umfassende serverseitige Spielregel-Prüfung, Rate Limits, Backups, Monitoring sowie Datenschutz/Impressum ergänzt werden.
