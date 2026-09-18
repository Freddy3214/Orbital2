# Orbital Foundry

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
- Galaxie-Ansicht mit Mehrspieler-Signaturen und serverseitig berechneten Schnellraubzügen inklusive Beute, Verlusten und Ereignisprotokoll
- Lokales Mehrprofil-Ranking über die Server-API
- Responsives Sci-Fi-Interface ohne externe Assets oder Tracker

## Balancing

Die Produktionskurven folgen der Orientierung im bereitgestellten GDD: exponentielles Minenwachstum, Energieengpässe als proportionaler Effizienz-Malus und logarithmisch beschleunigte Bauzeiten durch Infrastruktur. Für einen direkt testbaren Prototypen sind Aufträge auf mindestens fünf Sekunden begrenzt und es gibt bewusst keine Echtgeld- oder Wartezeit-Abkürzungen.

Für den frühen Spielverlauf ist die empfohlene Route direkt im Kommando sichtbar: Roboterfabrik Stufe 2, Forschungslabor Stufe 1, Energietechnik, Verbrennungsantrieb, Orbitalwerft Stufe 2 und anschließend eine Frachtdrohne. Ein Kolonieschiff wird erst später freigeschaltet und verbraucht sich beim Gründen einer neuen Welt.

## Render-Deployment

Das Repository enthält eine `render.yaml`. In Render: **New +** → **Blueprint** → dieses Repository wählen → **Apply**. Render legt den Webdienst sowie eine PostgreSQL-Datenbank an und setzt die Verbindungsvariable selbst. Der Dienst ist danach über die von Render angezeigte HTTPS-Adresse erreichbar.

Wichtig: Der kostenlose Render-Postgres-Tarif ist nur zum Testen gedacht und läuft nach 30 Tagen ab. Für einen dauerhaften Start mit Freunden braucht die Datenbank anschließend einen bezahlten Tarif oder einen anderen Datenbankanbieter.

Der Launch enthält echte Accounts, sichere Sitzungs-Cookies und Datenbank-Speicherung. Bau, Forschung und neutrale Missionen sind weiterhin ein schneller Prototypen-Ablauf; Mehrspieler-Raids werden hingegen bereits in einer Datenbank-Transaktion auf dem Server aufgelöst. Vor einer größeren öffentlichen Veröffentlichung sollten zusätzlich E-Mail-Verifikation bzw. Passwort-Reset, umfassende serverseitige Spielregel-Prüfung, Rate Limits, Backups, Monitoring sowie Datenschutz/Impressum ergänzt werden.
