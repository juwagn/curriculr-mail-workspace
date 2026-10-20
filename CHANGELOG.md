# Changelog

## Unreleased

### Neu
- Moderne, größere Ordner-Symbole (Phosphor Light, MIT) im Ordnerbaum.

### Behoben
- Absender und Datum fehlten in der Kartenansicht (eigenes Padding auf `.card-container`). Jede Mail hat jetzt eine feine Trennlinie.

### Geändert
- Design v2 (`docs/design-direction-v2.md`): Flächen tragen die Modusfarbe statt Grau, mehr Luft in Liste, Ordnerbaum und Nachrichtenkopf.
- Karten: durchgehende Liste ohne Schatten, kein Balken mehr; Ungelesen als Punkt im Akzent. Toolbar ohne Linie, leises Badge.
- Einstellungen: Seitenleiste mit vier Gruppen statt einer langen Seite, Schalter, keine Karten, Anleitung in leeren Zuständen.
- Sende-Dialog und Baustein-Popup mit den neuen Tokens; Warnungen als Liste mit Symbol statt Balken.
- Farben: Privat `#2b7550`, Alle Bernstein `#8a5a0b` (vorher Graphit). Icons und `MODE_COLORS` angepasst.

## 0.2.0 – 2026-10-19

Erste öffentliche Version als **Curricu:lr Mail-Workspace**.

### Geändert
- Umbenennung von „School Workspace Suite“ in „Curricu:lr Mail-Workspace“.
- Neue Add-on-ID `mail-workspace@curriculr`. Die alte Version (`school-workspace-suite@local`) vorher deinstallieren. Einstellungen werden nicht übernommen.
- Curricu:lr-Marke: Logo, Marine als Schul-Akzent (`#00467d`, dunkel `#80a3be`), Kronengold nur am Doppelpunkt.
- Neue Palette mit warmen Neutralen, Kontraste nach WCAG AA geprüft (`docs/design-system.md`).
- Spaces-Leiste in der Akzentfarbe des Modus.
- Karten: Auswahl mit Akzent-Umrandung, Menü-Knopf und leerer Stern nur bei Hover.
- Ruhigerer Nachrichtenkopf, deutlichere Kontoköpfe, größeres Modus-Badge.
- Sende-Wächter startet ohne vorbelegte Schuldomains.

### Neu
- Sende-Wächter, Später senden, Textbausteine, Schnell-Tabs, Auto-Tags, Kalender-Kopplung, Klassenzimmer-Modus.
