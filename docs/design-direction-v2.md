# Design-Richtung v2: farbiger, luftiger, aufgeräumter

Stand 2026-10-20. Ersetzt im Brief (`design-brief.md`) die Abschnitte Farbwelt und Dichte. Anlass: Die erste Palette (warme Neutrale, Graphit für „Alle“) wirkte zu grau und zu eng.

## Befund

- Alle Flächen lagen im selben Helligkeitsbereich (`#f6f5f3` bis `#e2e0dc`), Chroma fast null. Ergebnis: ein grauer Block.
- Karten hatten eigene Fläche, Rand und Schatten. Das erzeugt Unruhe statt Ordnung.
- Zeilenabstände waren eng (8 px Innenabstand, 4 px Lücke).

## Recherche: was moderne Mail-Clients gemeinsam tun

Quellen: Superhuman, Spark, HEY, Apple Mail (macOS 26), Gmail (Material 3 Expressive), Proton, Fastmail, Outlook, Mimestream.

1. **Eine ruhige Liste, keine Kartenreihe.** Rahmen und Schatten pro Zeile gibt es kaum. Hierarchie entsteht über Gewicht, Abstand und eine getönte Auswahl.
2. **Drei Flächenstufen.** Seitenleiste getönt, Liste und Lesebereich hell. Farbe sitzt in der Navigation und im Zustand, nicht in jedem Text.
3. **Ein Akzent, wenige Stellen.** Auswahl, Ungelesen, Zähler, aktive Aktion.
4. **Dichte ist wählbar.** Outlook (Roomy/Cozy/Compact) und Mimestream (vier Listenstile) trennen Luft von Inhalt. Bei uns: `uidensity` von Thunderbird.
5. **Ungelesen = Gewicht plus Punkt.** Nie nur Farbe.
6. **Typografie trägt die Hierarchie.** Absender 14 px / 600–700, Betreff gleich groß, Datum 12 px gedämpft, Nachrichtenbetreff 20–22 px / 600.

## Entscheidungen

| Bereich | Alt | Neu |
|---|---|---|
| Neutrale | feste warme Grautöne | Papier (`#fdfdfb`) plus Modus-Akzent: Liste 1,5 %, Toolbar 8 %, Seitenleiste 14 % (Dunkel 12 %) |
| Schule | Marine `#00467d` | unverändert (Marke) |
| Privat | Salbei `#4f7560` | `#2b7550`, klarer, gleiche Ruhe |
| Alle | Graphit `#4a4744` | Bernstein `#8a5a0b`. Grund: Graphit machte „Alle“ zur grauen Fläche. Eine Zeile in `tokens.css`, `logic.mjs` und den Icons |
| Karte (Ruhe) | Fläche, Schatten, Balken | transparent, durchgehende Liste, eingerückte Trennlinie (`--ws-divider`) unter jeder Mail |
| Karte (Hover/Auswahl) | Rand/Outline 2 px | Hover getönt, Auswahl getönt plus 1-px-Ring |
| Ungelesen | Balken links | Thunderbirds Punkt im Akzent, Absender 700, Betreff 600 |
| Toolbar | Linie 2 px im Akzent | getönte Fläche, leise Pille mit Akzentpunkt |
| Seitenleiste | gleiche Tönung wie Auswahl | Auswahl als hellere Pille (Dunkel: getönte Aufhellung), Zähler ohne Pille |
| Dunkel | helle Akzent-Leiste | Leiste wie Seitenleiste, Akzent nur auf aktivem Button |
| Abstände | Karte 8/12 px, Lücke 4 px | Ordnerzeilen 36 px, Kontoabstand 24 px. Die Kartenhöhe bleibt bei Thunderbird (siehe Lehre) |
| Tags, Schnell-Tabs | Streifen (`inset 3px`) | Punkt im Verlauf, keine Seitenstreifen |

Kontrast (WCAG AA) per Skript für alle drei Modi in Hell und Dunkel geprüft: Text 4,5:1 oder besser. Knappste Paare: Privat Akzent auf Seitenleiste 4,53, Dunkel Schule Akzent auf Auswahl 3,81 (nur Icon, kein Text).

## Ordner-Symbole

Eigener Satz Linien-Symbole (Lucide, ISC-Lizenz) im Ordnerbaum: Posteingang, Entwürfe, Gesendet, Archiv, Spam, Papierkorb, Postausgang, Vorlagen, Suchordner, Ordner, Konto. 20 px statt 16 px (kompakt 18, Touch 22). Technik: Thunderbirds `context-fill` greift bei `data:`-Bildern nicht (alles wurde schwarz). Darum `content` auf ein transparentes Pixel, das Symbol als `mask-image`, Farbe über `background-color: var(--icon-color)`, die Flächentönung über Alpha im SVG. Dadurch folgen Symbole weiter Auswahl- und Ordnerfarbe. Ausgenommen sind Busy-, Fehler- und Pause-Zustände, Tag-Ordner und RSS-Favicons. Die globalen `--icon-*` bleiben unberührt (sonst änderte sich z. B. jedes Papierkorb-Symbol in Menüs).

## Lehre: Kartenhöhe nicht anfassen

Thunderbird setzt die Zeilenhöhe der Karten per JavaScript fest (`about3Pane.js`, `ROW_HEIGHT` aus Schriftgröße, Dichte und Zeilenzahl) und kapselt die Zeile mit `contain: strict`. Ein eigenes `padding` auf `.card-container` ließ die Absenderzeile samt Datum verschwinden (nur noch der Betreff sichtbar). Abstand also nur über Thunderbirds Variablen oder Hintergrundbild (Trennlinie), nie über Padding oder Rahmen auf der Karte. Mehr Luft gibt die Dichte „Touch“ (Menü, Dichte). Ein Test in `check-theme-css.ps1` sperrt das Padding.

## Einstellungsseite und Popups (umgesetzt)

- **Seitenleiste** mit vier Gruppen (Alltag, Schreiben, Sicherheit, Einrichtung), ein Bereich je Ansicht, Auswahl über URL-Hash (`#guard`). `options/nav.js`, alle IDs für `options.js` unverändert. Schmal: Leiste oben, horizontal scrollbar.
- **Keine Karten pro Bereich.** Gliederung über Abstand, Haarlinien und Überschriften. Textbausteine ohne Rahmen.
- **Schalter** (`input.switch`) für Sende-Wächter und Sichtschutz, mit Kurzhilfe darunter.
- **Leere Zustände** sagen, wie man etwas anlegt (Schnell-Tabs, Ordnerfarben, Später senden).
- **Felder** haben einen eigenen Rand mit 3:1 (`--ws-field-border`), die Haarlinie bleibt dekorativ. Knöpfe: sekundär mit Rand, primär im Akzent.
- **Sende-Dialog:** Liste mit Symbol (`!` Warnung, `i` Hinweis) statt Karte mit Balken. „Jetzt senden“ ist primär.
- **Textbaustein-Popup:** Tokens, Hover getönt.

## Offen

- **Im echten Thunderbird sichten.** Mock und statische Seiten ersetzen die Browser-Toolbox nicht. Zu prüfen: Zeilenhöhe der Karten, Punkt-Position, `#messageHeader`, Popup-Größe.
- **Modus-Umschalter im Kopf der Einstellungen** (Brief 10) fehlt: Der Kopf zeigt nur den aktiven Modus.
- **Ungelesen-Punkt in eigener Spalte** (Brief) geht per CSS nicht: Thunderbird setzt ihn in die Betreffzeile.
- Eigene Farben aus den Optionen: Kontrast prüft niemand.
