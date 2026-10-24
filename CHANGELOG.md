# Changelog

## Unreleased

### Neu
- Moderne, größere Ordner-Symbole (Phosphor Light, MIT) im Ordnerbaum.

### Verbessert (macOS, nach Skill „apple-design“)
- Spaces-Leiste in Hell und Dunkel als ruhige Seitenleiste statt Akzentblock; Modus zeigt der aktive Button.
- Druck-Feedback (`:active`) für Zeilen, Ordner und Knöpfe; Hover setzt sofort ein, nur das Ausblenden animiert.
- Trennlinie verschwindet bei Hover, Auswahl und der Zeile darüber.
- Schriftgröße mind. 12 px, Ordner-Symbole in `em` (skalieren mit der Textgröße), Ordnerzeilen 32 px, ruhigere Gewichte in der Karte, leichtes Tracking bei Betreff und Datum.
- „Kontrast erhöhen“ schaltet das Theme nicht mehr ab: eigener Block mit kräftigeren Rändern und Tönungen. Nur Windows-Forced-Colors bleibt unangetastet.
- Moduswechsel überblendet auch Ordnerliste, Spaces-Leiste, Liste, Badge und Schnell-Tabs.

### Verbessert (Runde 2: Apple-näher, runder)
- „Alle“ ist jetzt Graphit statt Bernstein (hell `#55575c`, dunkel `#b4b7bd`), Tönungen und Trennlinien deutlich leiser. Icon und `MODE_COLORS` angepasst.
- Radienskala: Knöpfe und Felder 8 px, Suche und Badges als Kapsel; gestaltete Tab-Leiste (oben gerundet, runder Schließen-Knopf, kein Akzentbalken).
- Plugin-Seiten: einheitliche Radien, leises Badge wie im Theme, Druck-Feedback, federnder Schalter, Kontrast-Modus (`prefers-contrast`, `forced-colors`), Überblendung beim Bereichswechsel, Schrift folgt dem System.

### Verbessert (Runde 3)
- Seitenleiste hebt sich deutlicher von der Liste ab (Tinte statt nur Akzent), Spaces-Leiste einen Schritt tiefer, helle Auswahl-Pille.
- Toolbar läuft durchgehend: Fläche liegt auf dem Container, keine weiße Insel hinter den Ampel-Knöpfen mehr.

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
