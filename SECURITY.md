# Sicherheit

Curricu:lr Mail-Workspace arbeitet ausschließlich lokal in Thunderbird. Es sendet keine Daten an Server. Einstellungen liegen in `browser.storage.local` des Profils.

Das Add-on nutzt eine Experiment-API und hat damit vollen Zugriff auf Thunderbird. Die Rechte im `manifest.json` werden nur für die beschriebenen Funktionen genutzt.

## Lücke melden

Bitte keine öffentlichen Issues für Sicherheitslücken. Stattdessen über GitHub: **Security → Report a vulnerability** in diesem Repository. Eine Rückmeldung kommt in der Regel innerhalb einer Woche.
