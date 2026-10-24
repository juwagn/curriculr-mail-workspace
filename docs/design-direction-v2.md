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
6. **Typografie trägt die Hierarchie.** Absender 14 px, Betreff gleich groß, Datum 12 px gedämpft, Nachrichtenbetreff 20–22 px / 600. Gewichte siehe „macOS-Anpassungen“.

## Entscheidungen

| Bereich | Alt | Neu |
|---|---|---|
| Neutrale | feste warme Grautöne | Papier (`#fdfdfb`) plus Modus-Akzent: Liste 1,5 %, Toolbar 8 %, Seitenleiste 14 % (Dunkel 12 %) |
| Schule | Marine `#00467d` | unverändert (Marke) |
| Privat | Salbei `#4f7560` | `#2b7550`, klarer, gleiche Ruhe |
| Alle | Graphit `#4a4744` | Bernstein `#8a5a0b`. Grund: Graphit machte „Alle“ zur grauen Fläche. Eine Zeile in `tokens.css`, `logic.mjs` und den Icons |
| Karte (Ruhe) | Fläche, Schatten, Balken | transparent, durchgehende Liste, eingerückte Trennlinie (`--ws-divider`) unter jeder Mail |
| Karte (Hover/Auswahl) | Rand/Outline 2 px | Hover getönt, Auswahl getönt plus 1-px-Ring |
| Ungelesen | Balken links | Thunderbirds Punkt im Akzent, Absender 600, Betreff 400 |
| Toolbar | Linie 2 px im Akzent | getönte Fläche, leise Pille mit Akzentpunkt |
| Seitenleiste | gleiche Tönung wie Auswahl | Auswahl als hellere Pille (Dunkel: getönte Aufhellung), Zähler ohne Pille |
| Dunkel | helle Akzent-Leiste | Leiste wie Seitenleiste, Akzent nur auf aktivem Button |
| Abstände | Karte 8/12 px, Lücke 4 px | Ordnerzeilen 32 px (zunächst 36), Kontoabstand 24 px. Die Kartenhöhe bleibt bei Thunderbird (siehe Lehre) |
| Tags, Schnell-Tabs | Streifen (`inset 3px`) | Punkt im Verlauf, keine Seitenstreifen |

Kontrast (WCAG AA) per Skript für alle drei Modi in Hell und Dunkel geprüft: Text 4,5:1 oder besser. Knappste Paare: Privat Akzent auf Seitenleiste 4,53, Dunkel Schule Akzent auf Auswahl 3,81 (nur Icon, kein Text).

## Ordner-Symbole

Symbole aus Phosphor Icons (phosphoricons.com, MIT; Gewicht „Light“, Flächentönung aus „Duotone“). Gewählt, weil die dünne, runde Linie zur leichten Inter-nahen Marke von Curricu:lr passt (Lucide war zu kräftig) im Ordnerbaum: Posteingang, Entwürfe, Gesendet, Archiv, Spam, Papierkorb, Postausgang, Vorlagen, Suchordner, Ordner, Konto. Größe mit der Textgröße skalierend (siehe „macOS-Anpassungen“). Technik: Thunderbirds `context-fill` greift bei `data:`-Bildern nicht (alles wurde schwarz). Darum `content` auf ein transparentes Pixel, das Symbol als `mask-image`, Farbe über `background-color: var(--icon-color)`, die Flächentönung über Alpha im SVG. Dadurch folgen Symbole weiter Auswahl- und Ordnerfarbe. Ausgenommen sind Busy-, Fehler- und Pause-Zustände, Tag-Ordner und RSS-Favicons. Die globalen `--icon-*` bleiben unberührt (sonst änderte sich z. B. jedes Papierkorb-Symbol in Menüs).

## Lehre: Kartenhöhe nicht anfassen

Thunderbird setzt die Zeilenhöhe der Karten per JavaScript fest (`about3Pane.js`, `ROW_HEIGHT` aus Schriftgröße, Dichte und Zeilenzahl) und kapselt die Zeile mit `contain: strict`. Ein eigenes `padding` auf `.card-container` ließ die Absenderzeile samt Datum verschwinden (nur noch der Betreff sichtbar). Abstand also nur über Thunderbirds Variablen oder Hintergrundbild (Trennlinie), nie über Padding oder Rahmen auf der Karte. Mehr Luft gibt die Dichte „Touch“ (Menü, Dichte). Ein Test in `check-theme-css.ps1` sperrt das Padding.

## macOS-Anpassungen

Anlass: Das Theme läuft jetzt auch unter macOS. Die Systemschrift ist dort ca. 13 px groß (Windows 14 px), und rein relative Werte ergaben zu kleine Schrift und zu feine Gewichtsabstufungen. Grundlage: Skill `apple-design`, Abschnitt 15 (Typografie, nach WWDC 2020 „The Details of UI Typography“).

| Bereich | Vorher | Jetzt | Begründung |
|---|---|---|---|
| `--ws-text-sm` (Datum, Zähler, Hilfetext) | 0.857em (macOS ca. 11 px) | `max(0.857em, 12px)` | Kleine Schrift braucht eine Untergrenze. Windows bleibt bei 12 px, Add-on-Seiten (14 px Basis) ändern sich nicht |
| Ordner-Symbole | fest 22 px (kompakt 20, Touch 24) | `clamp(16px, 1.35em, 32px)`, kompakt 1.25em, Touch 1.5em | Layout skaliert mit der Textgröße (Dynamic Type), nie unter 16 px. Bei 13 px Basis ca. 17,5 px, bei 14 px ca. 19 px, also näher an macOS-Seitenleisten |
| Ordnerzeile `--list-item-min-height` | 36 px | 32 px | macOS-Seitenleisten sind dichter. Mehr Luft bleibt Thunderbirds Dichte „Touch“ überlassen |
| Karte gelesen | Absender 500, Betreff 400 gedämpft | Absender 400, Betreff 400 gedämpft | Ruhe: gelesen darf zurücktreten |
| Karte ungelesen | Absender 700, Betreff 600 | Absender 600, Betreff 400, beide in voller Tinte | Hierarchie aus Gewicht: Absender trägt, Betreff folgt. 700/600 war zu flach und zu laut. Ungelesen bleibt Gewicht plus Punkt, nie nur Farbe |
| Laufweite Nachrichtenbetreff | 0 | `--ws-tracking-display: -0.01em` | Große Schrift wirkt mit Standardlaufweite zu weit. Leicht enger |
| Laufweite Datum (Karte, Nachrichtenkopf) | 0 | `--ws-tracking-small: 0.01em` | Kleine Schrift wird mit etwas mehr Laufweite lesbarer |

Laufweite ist größenabhängig und nie ein fester Wert für alles: groß enger, klein weiter, Fließtext bei 0. Die Kartenhöhe bleibt unberührt (siehe Lehre unten): Geändert sind nur Gewicht, Laufweite und Schriftgröße des Datums, die Absenderzeile bestimmt die Zeilenhöhe.

## Einstellungsseite und Popups (umgesetzt)

- **Seitenleiste** mit vier Gruppen (Alltag, Schreiben, Sicherheit, Einrichtung), ein Bereich je Ansicht, Auswahl über URL-Hash (`#guard`). `options/nav.js`, alle IDs für `options.js` unverändert. Schmal: Leiste oben, horizontal scrollbar.
- **Keine Karten pro Bereich.** Gliederung über Abstand, Haarlinien und Überschriften. Textbausteine ohne Rahmen.
- **Schalter** (`input.switch`) für Sende-Wächter und Sichtschutz, mit Kurzhilfe darunter.
- **Leere Zustände** sagen, wie man etwas anlegt (Schnell-Tabs, Ordnerfarben, Später senden).
- **Felder** haben einen eigenen Rand mit 3:1 (`--ws-field-border`), die Haarlinie bleibt dekorativ. Knöpfe: sekundär mit Rand, primär im Akzent.
- **Sende-Dialog:** Liste mit Symbol (`!` Warnung, `i` Hinweis) statt Karte mit Balken. „Jetzt senden“ ist primär.
- **Textbaustein-Popup:** Tokens, Hover getönt.

## Offen

- **Im echten Thunderbird sichten.** Mock und statische Seiten ersetzen die Browser-Toolbox nicht. Zu prüfen: Zeilenhöhe der Karten (Datum jetzt mind. 12 px), Ordner-Symbole in em unter macOS, Punkt-Position, `#messageHeader`, Popup-Größe.
- **Modus-Umschalter im Kopf der Einstellungen** (Brief 10) fehlt: Der Kopf zeigt nur den aktiven Modus.
- **Ungelesen-Punkt in eigener Spalte** (Brief) geht per CSS nicht: Thunderbird setzt ihn in die Betreffzeile.
- Eigene Farben aus den Optionen: Kontrast prüft niemand.
