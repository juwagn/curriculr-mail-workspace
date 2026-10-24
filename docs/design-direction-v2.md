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
| Neutrale | feste warme Grautöne | Papier (`#fdfdfb`) plus Modus-Akzent: Liste 1,5 %, Toolbar 5 %, Seitenleiste 7 % (Dunkel 8 %). Ursprünglich 8 % / 14 % (12 %), mit Farbe v3 gesenkt |
| Schule | Marine `#00467d` | unverändert (Marke) |
| Privat | Salbei `#4f7560` | `#2b7550`, klarer, gleiche Ruhe |
| Alle | Graphit `#4a4744` | v2: Bernstein `#8a5a0b`. Grund: Das warme Graphit machte „Alle“ zur grauen Fläche. Farbe v3: kühles Graphit `#55575c` (Dunkel `#b4b7bd`), siehe unten. Eine Zeile in `tokens.css`, `logic.mjs` und den Icons |
| Karte (Ruhe) | Fläche, Schatten, Balken | transparent, durchgehende Liste, eingerückte Trennlinie (`--ws-divider`) unter jeder Mail |
| Karte (Hover/Auswahl) | Rand/Outline 2 px | Hover getönt, Auswahl getönt plus 1-px-Ring |
| Ungelesen | Balken links | Thunderbirds Punkt im Akzent, Absender 600, Betreff 400 |
| Toolbar | Linie 2 px im Akzent | getönte Fläche, leise Pille mit Akzentpunkt |
| Seitenleiste | gleiche Tönung wie Auswahl | Auswahl als hellere Pille (Dunkel: getönte Aufhellung), Zähler ohne Pille |
| Dunkel | helle Akzent-Leiste | Leiste wie Seitenleiste, Akzent nur auf aktivem Button |
| Abstände | Karte 8/12 px, Lücke 4 px | Ordnerzeilen 32 px (zunächst 36), Kontoabstand 24 px. Die Kartenhöhe bleibt bei Thunderbird (siehe Lehre) |
| Tags, Schnell-Tabs | Streifen (`inset 3px`) | Punkt im Verlauf, keine Seitenstreifen |

Kontrast (WCAG AA) per Skript für alle drei Modi in Hell und Dunkel geprüft: Text 4,5:1 oder besser. Werte nach Farbe v3 stehen in `design-system.md`. Knappste Paare: Privat hell Akzent auf Seitenleiste 4,97 und auf Auswahl-Pille 4,53, Privat hell Akzent auf Listenauswahl 4,39 (nur Symbol, kein Text).

## Farbe v3 (Apple-näher)

Anlass: Der Skill „apple-design“ (§12, §16) beschreibt Apples Farbhaltung: neutrales Grau plus ein Akzent, Tiefe durch Staffelung (Seitenleiste hellgrau, Liste weiß) statt durch eingefärbte Flächen. Bernstein für „Alle“ wirkte braun/beige und beißt sich mit den kühlen Modi Schule (Marine) und Privat (Salbei).

- **Alle ist Graphit:** hell `#55575c`, dunkel `#b4b7bd` (leicht bläulich, damit es zu den kühlen Modi passt). Alle darf neutral wirken, die Modi Schule und Privat bleiben die farbigen. Als Text hell mindestens 5,57 (auf der Listenauswahl), Schrift auf der Akzentfläche 7,23; dunkel mindestens 5,51 (auf der Pille) und 10,45. Dieselben Werte in `tokens.css`, `logic.mjs`, `icons/all.svg` und im Test von `check-theme-css.ps1`.
- **Tönungen leiser (Apple etwa 4 bis 6 %):** Seitenleiste 14 % → 7 % (Dunkel 12 % → 8 %), Toolbar 8 % → 5 % (Dunkel 8 % → 5 %), `--ws-surface-2` 6 % → 4 % (Dunkel 8 % → 6 %). Schule und Privat zeigen ihren Modus weiter über Akzent, Auswahl und Toolbar-Pille. Die Fläche selbst ist nur noch ein Hauch.
- **Auswahl bleibt:** `--ws-selected-amount` (15 % / 18 %) und `--ws-current-amount` (9 % / 11 %) sind unverändert, die Abhebung gegen die Liste ebenfalls (Alle hell 1,25). Nur die Pille im Ordnerbaum ist jetzt Akzent 7 % auf der Seitenleiste (vorher fast weiß), sonst wäre sie auf der helleren Leiste unsichtbar gewesen (1,06 statt 1,10 bis 1,12).
- **Linien leiser:** `--ws-divider` 24 % → 11 % (Dunkel 28 % → 16 %), `--ws-border` 14 % → 10 % (Dunkel 18 % → 14 %). Beide sind dekorativ. Rechenwerte liegen zwischen 1,13 und 1,29.
- **Nicht angefasst:** Radien, Dichte, Symbole, Selektoren.

## Ordner-Symbole

Symbole aus Phosphor Icons (phosphoricons.com, MIT; Gewicht „Light“, Flächentönung aus „Duotone“). Gewählt, weil die dünne, runde Linie zur leichten Inter-nahen Marke von Curricu:lr passt (Lucide war zu kräftig) im Ordnerbaum: Posteingang, Entwürfe, Gesendet, Archiv, Spam, Papierkorb, Postausgang, Vorlagen, Suchordner, Ordner, Konto. Größe mit der Textgröße skalierend (siehe „macOS-Anpassungen“). Technik: Thunderbirds `context-fill` greift bei `data:`-Bildern nicht (alles wurde schwarz). Darum `content` auf ein transparentes Pixel, das Symbol als `mask-image`, Farbe über `background-color: var(--icon-color)`, die Flächentönung über Alpha im SVG. Dadurch folgen Symbole weiter Auswahl- und Ordnerfarbe. Ausgenommen sind Busy-, Fehler- und Pause-Zustände, Tag-Ordner und RSS-Favicons. Die globalen `--icon-*` bleiben unberührt (sonst änderte sich z. B. jedes Papierkorb-Symbol in Menüs).

## Rundungen (Radienskala)

Drei Stufen und die Kapsel, alle aus den Tokens (`--ws-radius-*`). Konzentrik: Ein Element in einem gerundeten Container hat Radius = Außenradius − Abstand, nie mehr.

| Element | Radius | Token |
|---|---|---|
| Knöpfe, Eingabefelder (`--button-border-radius`, `--input-text-border-radius`), Toolbar- und Spaces-Knöpfe | 8 px | `--ws-radius` |
| Nachrichtenzeilen, Ordnerzeilen, Auswahl | 8 px | `--ws-radius` |
| Tabs (oben, unten eckig) | 8 px | `--ws-radius` |
| Container und Popups (Einstellungen, Dialoge) | 12 px | `--ws-radius-lg` |
| Suche, Workspace-Badge, Schlagwort-Pillen, Schnell-Tabs, Tab-Schließen-Knopf | Kapsel | `--ws-radius-pill` |

`--ws-radius-sm` (6 px) bleibt für Kleinteile in der Add-on-UI. Popup-Menüs in Thunderbird bleiben beim Systemradius (macOS-Menüs müssen zum Rahmen des Systems passen). Bereichsränder (Splitter, Kopfleisten) sind leiser über `--sidebar-border-color`, die Trennlinien der Nachrichtenliste beginnen an der Textkante (`--ws-row-pad-inline`) und entfallen an Auswahl und Hover. Eingerückte, gerundete Bereiche sind bewusst nicht gebaut (ohne Live-Test zu riskant).

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

## Staffelung links und Titelleiste (Runde 3)

- **Seitenleiste hebt sich ab:** Grundton aus Tinte (Hell 5 %, Dunkel 4 %) plus leiser Modus-Akzent (5 % / 8 %), `--ws-sidebar`. Abstand zur Liste (`--ws-bg`) jetzt 1,15–1,21:1 statt 1,05–1,08:1, in allen Modi etwa gleich. Die Spaces-Leiste ist einen Schritt tiefer (`--ws-rail`, +3 % / +2 % Tinte): Leiste < Ordner < Liste.
- **Auswahl-Pille:** Hell die helle Fläche (`--ws-surface`, Akzent darauf 5,6–9,7:1), Dunkel 11 % Akzent auf der Leiste.
- **Kontrast (gerechnet, WCAG):** Akzent auf Seitenleiste 4,68 (Privat hell) bis 7,92; gedämpfter Text auf Leiste mindestens 5,78; Akzent auf Pille mindestens 4,52. Nur das Privat-Symbol direkt auf der Spaces-Leiste liegt bei 4,42 (Symbol, kein Text).
- **Titelleiste:** Unter macOS zeichnet Thunderbird hinter den Ampel-Knöpfen die native Titelleiste (weiß), die Toolbar-Tönung lag nur auf `#unifiedToolbar`. Die Fläche liegt jetzt auf `#unifiedToolbarContainer`, die Leiste läuft durch. Die Haarlinie unter der Toolbar (`unified-toolbar`) ist leise (`--ws-border`).
