# Design-System „Curricu:lr Mail-Workspace“

Stand 2026-10-19. Abgeleitet aus `docs/design-brief.md`. Token-Quelle: `extension-workspace-switcher/shared/tokens.css`. Eingebunden in Add-on-Seiten und Theme (Schritte 1–3).

## Herkunft der Entscheidungen

- **ui-ux-pro-max** (`--design-system`, Mail-Client, minimal): Übernommen wurde der Stil „Flat“, also keine Schatten, keine Verläufe und Hover nur über Farbe, mit Übergängen von 150 bis 200 ms. Übernommen wurde auch die Prüfliste (AA-Kontrast, sichtbarer Fokus, reduzierte Bewegung).
- **Verworfen aus der Datenbank:** Inter über Google Fonts (Brief verbietet externe Fonts) und die Palette Blau `#2563EB` / Rot. Die Palette ist genau das Generische, das gestört hat.
- **Palette, Skala und Dichte:** selbst gebaut nach Brief. Kontraste sind per Skript berechnet (WCAG-2-Formel, `color-mix` in sRGB nachgebildet).

## Marke (Curricu:lr)

Das Add-on gehört zur Curricu:lr-Familie. Quelle der Markenwerte: `curriculr-terminplan/plugin/assets/css/design-tokens.css`.

- **Name:** „Curricu:lr Mail-Workspace“, immer mit Doppelpunkt.
- **Logo:** `icons/curriculr-icon.svg` (Marine-Quadrat, goldener Doppelpunkt), unverändert aus der Familie.
- **Farben:** `--brand-marine-900` `#00345c`, `--brand-marine-700` `#00467d`, `--brand-gold` `#ffc857`. Marine ist der Schul-Akzent. Gold erscheint nur als Signatur am Doppelpunkt, nie als Fläche oder Statusfarbe.
- **Schrift:** Die Familie nutzt Inter. Hier bleibt es bei der Systemschrift, weil der Brief externe Schriften ausschließt und Thunderbird selbst die Systemschrift nutzt.
- **Modusfarben** (Privat, Alle) sind Funktion, nicht Marke, und bleiben eigenständig.

Kontrast Marine: 9.4:1 auf `--ws-surface`, gedämpfter Text auf Auswahl 4.8:1, Dunkel-Variante 6.6:1 auf `--ws-bg`.

## Palette

### Modus-Akzente

| Modus | Hell | Dunkel | Charakter |
|---|---|---|---|
| Schule | `#00467d` | `#80a3be` | Curricu:lr-Marine (Marken-Interaktionsblau) |
| Privat | `#4f7560` | `#93b8a0` | gedämpftes Salbeigrün |
| Alle | `#55575c` | `#b4b7bd` | kühles, neutrales Graphit (Farbe v3, ersetzt Bernstein) |

Eigene Farben aus den Optionen überschreiben die Akzente wie bisher über `--ws-custom-*`. Die dunkle Variante entsteht in `darkVariant()`.

### Neutrale (warm, kein reines Weiß/Schwarz)

| Token | Hell | Dunkel | Einsatz |
|---|---|---|---|
| `--ws-bg` | `#f6f5f3` | `#19191a` | Fensterhintergrund, Liste |
| `--ws-surface` | `#fdfcfb` | `#212122` | Felder, Karten bei Hover |
| `--ws-surface-2` | `#efeeeb` | `#2a2a2b` | Zähler, Code, sekundäre Flächen |
| `--ws-sidebar` | `#eeedea` | `#151516` | Ordnerbaum, Spaces, Einstellungs-Nav |
| `--ws-border` | `#e2e0dc` | `#343436` | Haarlinien (dekorativ) |
| `--ws-text` | `#1f1e1c` | `#ecebe8` | Text |
| `--ws-text-dim` | `#64615c` | `#aeaba5` | Datum, Adressen, Hilfetext |
| `--ws-danger` | `#b42318` | `#f2867a` | Löschen, Warnung |

### Abgeleitete Flächen

| Token | Hell | Dunkel | Einsatz |
|---|---|---|---|
| `--ws-bg-tinted` | Akzent 5 % | Akzent 5 % | Modus-Tönung: Toolbar, Compose-Kopf |
| `--ws-sidebar` / `--ws-sidebar-tinted` | Akzent 7 % | Akzent 8 % | Seitenleiste |
| `--ws-surface-2` | Akzent 4 % | Akzent 6 % | Zähler, Code, sekundäre Flächen |
| `--ws-accent-softer` | Akzent 9 % auf Liste | Akzent 11 % | aktuelle Zeile, Hover-Karte |
| `--ws-accent-soft` | Akzent 15 % auf Liste | Akzent 18 % | Auswahl |
| `--ws-sidebar-selected` | Akzent 7 % auf Seitenleiste | Akzent 16 % auf Seitenleiste | Auswahl-Pille im Ordnerbaum |
| `--ws-border` / `--ws-divider` | Akzent 10 % / 11 % | Akzent 14 % / 16 % | Haarlinie, Trennlinie unter Mails |

## Kontrastprüfung (WCAG AA)

Stand Farbe v3 (2026-10-24). Neu gerechnet mit Python (WCAG-2-Formel, `color-mix` in sRGB nachgebildet, Schrift-auf-Akzent über LCH-Helligkeit mit Schwelle 70 hell / 55 dunkel) für Schule, Privat und Alle, je Hell und Dunkel, je 18 Paare. Alle Textpaare liegen bei 4.5 oder darüber. Die jeweils knappsten Werte (Modus in Klammern):

| Paar | Hell | Dunkel | Ziel |
|---|---|---|---|
| Akzent als Text auf Seitenleiste | 4.97 (Privat) | 6.02 (Schule) | 4.5 |
| Akzent als Text auf Hintergrund / Fläche | 5.37 (Privat) | 6.13 (Schule) | 4.5 |
| Akzent als Text auf getönter Toolbar | 5.11 (Privat) | 6.29 (Schule) | 4.5 |
| Akzent auf Auswahl-Pille der Seitenleiste | 4.53 (Privat) | 4.55 (Schule) | 4.5 |
| Schrift auf Akzentfläche (Badge, Primärknopf) | 5.58 (Privat) | 7.90 (Schule) | 4.5 |
| Text auf Auswahl | 12.32 (Schule) | 9.84 (Privat) | 4.5 |
| Gedämpft auf Auswahl | 5.20 (Schule) | 5.12 (Privat) | 4.5 |
| Gedämpft auf Auswahl-Pille der Seitenleiste | 5.47 (Schule) | 4.91 (Alle) | 4.5 |
| Gedämpft auf Seitenleiste | 6.14 (Schule) | 6.88 (Alle) | 4.5 |
| Gedämpft auf Hintergrund | 6.74 (Schule) | 7.44 (Privat) | 4.5 |
| Fokus-Ring gegen Fläche | 5.58 (Privat) | 6.13 (Schule) | 3.0 |
| Danger auf Fläche | 6.42 | 6.49 | 4.5 |

Neuer Modus Alle (Graphit) für sich: hell `#55575c` als Text 6.97 auf Hintergrund, 6.40 auf Seitenleiste, 7.23 auf Fläche; Schrift auf Akzentfläche (weiß) 7.23. Dunkel `#b4b7bd` als Text 8.38 auf Hintergrund, 7.72 auf Seitenleiste; Schrift auf Akzentfläche (schwarz) 10.45.

Abhebung der Flächen (Kontrastverhältnis zweier Flächen, dekorativ, kein Grenzwert):

| Paar | Hell (Schule / Privat / Alle) | Dunkel (Schule / Privat / Alle) |
|---|---|---|
| Auswahl gegen Liste | 1.30 / 1.22 / 1.25 | 1.36 / 1.45 / 1.46 |
| Auswahl-Pille gegen Seitenleiste | 1.12 / 1.10 / 1.10 | 1.32 / 1.39 / 1.40 |
| Seitenleiste gegen Liste | 1.10 / 1.08 / 1.09 | 1.06 / 1.08 / 1.09 |
| Trennlinie gegen Liste | 1.18 / 1.14 / 1.15 | 1.22 / 1.28 / 1.29 |

Die Auswahl in der Liste hat sich gegenüber v2 nicht verändert (Alle hell 1.25 statt 1.23), darum bleiben `--ws-selected-amount` und `--ws-current-amount` stehen. Die Pille der Seitenleiste war fast weiß (Akzent 4 %) auf einer Leiste mit 14 % (Abhebung 1.17 bei Alle). Auf einer Leiste mit 7 % läge sie bei 1.06 und wäre fast unsichtbar. Sie ist jetzt Akzent 7 % auf der Seitenleiste.

**Grenzen:** Privat hell ist knapp (Akzent auf Seitenleiste 4.97, auf Auswahl-Pille 4.53). Die Pille darf darum nicht über 7 % steigen, Seitenleiste und `--ws-tint-amount` nicht ohne neue Prüfung. Privat hell als Akzent auf der Listenauswahl (15 %) liegt bei 4.39: erlaubt nur für Symbole und Ring (3:1), Text dort bleibt `--ws-text`. Eigene Farben prüft niemand. Ein Hinweis in den Optionen bei zu wenig Kontrast wäre ein späterer Schritt. Ränder und Trennlinien sind dekorativ (1.13 bis 1.29). Bedeutung tragen sie nie allein. Alle Werte sind gerechnet, nicht im echten Thunderbird gesichtet.

## Typografie

Nur Systemschrift (`font: message-box`, also Segoe UI Variable unter Windows). Die Größen sind relativ zur Systembasis, Zoom wirkt.

| Token | Wert | Bei 14px | Einsatz |
|---|---|---|---|
| `--ws-text-sm` | max(0.857em, 12px) | 12px (macOS: 12px statt ~11px) | Datum, Zähler, Hilfetext, Badge |
| `--ws-text-md` | 1em | 14px | Text, Labels, Betreff |
| `--ws-text-lg` | 1.25em | 17.5px | Bereichstitel (Einstellungen) |
| `--ws-text-xl` | 1.75em | 24.5px | Seitentitel |

Gewichte 400 / 500 / 600 / 700. Ungelesener Absender in 700, gelesener in 500. Keine Versalien und keine gesperrte Schrift (Curricu:lr-Regel 10-design), auch nicht in Badge und Gruppen-Überschriften. Zeilenhöhe 1.45, im Dunkeln 1.5.

## Abstände und Dichte

4-px-Raster: `2xs 2 · xs 4 · sm 8 · md 12 · lg 16 · xl 24 · 2xl 32 · 3xl 48`.

| Token | Normal (luftig) | Kompakt (`uidensity="compact"`) |
|---|---|---|
| `--ws-row-gap` (zwischen Karten) | 4px | 2px |
| `--ws-row-pad-inline` | 12px | 8px |
| `--ws-row-pad-block` | 8px | 4px |
| `--ws-control-pad-block / -inline` | 6 / 12px | 4 / 8px |
| `--ws-section-gap` (Einstellungen) | 32px | 24px |

Die Dichte „Touch“ nutzt die Normalwerte. Thunderbird vergrößert dort selbst.

## Radien, Fokus, Bewegung

- Radien: `sm 6` (Felder, Knöpfe, Ordnerzeile) · `md 8` (Karte) · `lg 12` (Suchfeld, Dialog) · `pill 999` (Badge, Schnell-Tabs, Tags).
- Fokus: `outline: 2px solid var(--ws-focus-color); outline-offset: 2px`, nur `:focus-visible`.
- Bewegung: 120 ms (Hover) und 160 ms (Moduswechsel), `cubic-bezier(0.22, 1, 0.36, 1)`, nur Farbe und Deckkraft. Bei `prefers-reduced-motion: reduce` gibt es keine Übergänge.

## Komponenten-Regeln (Kurzform)

| Komponente | Regel |
|---|---|
| Toolbar | Fläche `--ws-bg-tinted`, keine Linie. Badge links: `--ws-text-sm`, 600, Satzschreibung, Pill in Akzent. Im Modus Alle Graphit. |
| Karte | Ruhe: transparent auf `--ws-bg`, kein Schatten. Hover: `--ws-accent-softer`, Radius 8. Auswahl: `--ws-accent-soft`. |
| Ungelesen | 8px-Punkt im Akzent in eigener Spalte links, Absender 700. |
| Ordnerbaum | unverändert, nur Tokens und `--ws-sidebar-tinted`. |
| Schnell-Tab | Pill auf `--ws-surface`, Ordnerfarbe als 8px-Punkt vor dem Text. Aktiv: `--ws-accent-soft`. |
| Compose-Kopf | Fläche `--ws-bg-tinted`, Badge am Von-Feld, kein Balken, keine Umrandung. |
| Nachrichtenkopf | Absender 600, Betreff `--ws-text-lg`, Empfänger und Knöpfe `--ws-text-dim`. |
| Einstellungen | Nav auf `--ws-sidebar`, aktiver Eintrag `--ws-accent-soft`. Bereiche ohne Karten, Trennung über `--ws-section-gap` und Haarlinie. Schalter statt Checkbox. |
| Sende-Dialog | Warnungen als Liste mit Symbol, der Balken links fällt weg. „Abbrechen“ sekundär, „Trotzdem senden“ primär im Akzent des Absenders. |

## Umsetzungsplan

Jeder Schritt ist einzeln testbar und umkehrbar. Nach jedem Schritt laufen die Checks unter `tests/` und eine Sichtprüfung in TB 158 (Hell/Dunkel × Schule/Privat/Alle × kompakt/normal).

1. **Tokens einbinden, ohne die Optik zu ändern.** `tokens.css` kommt in die Add-on-Seiten vor `ui.css`. `ui.css` verliert die doppelten Tokens und nutzt `--ws-accent-school`/`-private`/`-all` und `--ws-on-accent-threshold`. Dabei werden `confirm.js` und die `.pill`-Regeln umbenannt.
2. **Theme an dieselbe Quelle hängen.** `install-dev.ps1/.sh` legt `tokens.css` nach `chrome/`, als Hardlink oder als Stub mit `@import file:///…` wie heute. `userChrome.css` beginnt mit `@import url("tokens.css");` und verliert den eigenen Token-Block. Dazu kommt ein Test in `tests/`, dass beide Dateien installiert sind.
3. **Neue Palette aktivieren.** `MODE_COLORS` in `shared/logic.mjs` bekommt die neuen Hellwerte, damit Icon und Farbwähler passen. `tests/extension/logic.test.mjs:131` wird angepasst. Prüfen, ob `darkVariant()` für die neuen Werte nahe an den Dunkel-Tokens landet.
4. **Theme-Struktur.** Die Toolbar-Linie fällt weg, dafür kommt die getönte Toolbar und ein leiseres Badge. Die Karten werden hybrid, ohne Schatten. Statt des Balkens gibt es den Ungelesen-Punkt. Der Selektor wird vorher in der Browser-Toolbox geprüft.
5. **Dichte** über `--ws-row-*` an `#threadTree` und `#folderTree` hängen. Beide Stufen werden geprüft.
6. **Verfassen und Nachrichtenkopf.** Balken und Umrandung im Compose-Kopf fallen weg, dafür kommen Tönung und Badge. Der Nachrichtenkopf in `about:message` wird reduziert, die Selektoren werden vorher geprüft.
7. **Schnell-Tabs und Tabellen-Tags.** Der Farbstreifen (`inset 3px`) wird durch einen Punkt ersetzt.
8. **Einstellungen, Markup.** Seitenleiste mit vier Gruppen, Bereiche als `<section>` mit `hidden`, Hash-Navigation, Modus-Umschalter im Kopf. Alle IDs bleiben, damit `options.js` weiterläuft.
9. **Einstellungen, Optik.** Karten fallen weg, Schalter, Formular-Raster, kurze Texte, leere Zustände mit Anleitung, schmale Ansicht mit Auswahlliste.
10. **Popups und Sende-Dialog** auf die Tokens. Der Balken links in `confirm.css` fällt weg.
11. **Abschluss:** Kontrast-Stichprobe im echten TB (Browser-Toolbox), Hochkontrast-Test, reduzierte Bewegung, `docs/ist-zustand.md` aktualisieren, XPI bauen.
