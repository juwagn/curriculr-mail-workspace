# Design-System „Curricu:lr Mail-Workspace“

Stand 2026-10-19. Abgeleitet aus `docs/design-brief.md`. Token-Quelle: `extension-workspace-switcher/shared/tokens.css`. Eingebunden in Add-on-Seiten und Theme (Schritte 1–3).

## Herkunft der Entscheidungen

- **ui-ux-pro-max** (`--design-system`, Mail-Client, minimal): Übernommen wurde der Stil „Flat“, also keine Schatten, keine Verläufe und Hover nur über Farbe, mit Übergängen von 150 bis 200 ms. Übernommen wurde auch die Prüfliste (AA-Kontrast, sichtbarer Fokus, reduzierte Bewegung).
- **Verworfen aus der Datenbank:** Inter über Google Fonts (Brief verbietet externe Fonts) und die Palette Blau `#2563EB` / Rot. Die Palette ist genau das Generische, das gestört hat.
- **Palette, Skala und Dichte:** selbst gebaut nach Brief. Kontraste sind per Skript berechnet (WCAG-2-Formel, `color-mix` in sRGB nachgebildet).

## Marke (Curricu:lr)

Das Add-on gehört zur Curricu:lr-Familie. Quelle der Markenwerte: `curriculr-terminplan/plugin/assets/css/design-tokens.css`.

- **Name:** „Curricu:lr Mail-Workspace“, immer mit Doppelpunkt.
- **Logo:** `icons/curriculr.svg` (Marine-Quadrat, goldener Doppelpunkt), unverändert aus der Familie.
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
| Alle | `#4a4744` | `#bdb8b1` | warmes Graphit, ohne eigene Buntfarbe |

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
| `--ws-bg-tinted` / `--ws-sidebar-tinted` | Akzent 4 % | Akzent 6 % | Modus-Tönung: Toolbar, Sidebar, Compose-Kopf |
| `--ws-accent-softer` | Akzent 7 % | Akzent 9 % | aktuelle Zeile, Hover-Karte |
| `--ws-accent-soft` | Akzent 13 % | Akzent 16 % | Auswahl |

## Kontrastprüfung (WCAG AA)

Gerechnet für alle drei Modi in Hell und Dunkel, insgesamt 58 Paare, **0 Fehler**. Die jeweils knappsten Werte:

| Paar | Hell (knappster Modus) | Dunkel (knappster Modus) | Ziel |
|---|---|---|---|
| Akzent als Text auf Fläche | 5.07 (Privat) | 7.02 (Schule) | 4.5 |
| Akzent als Text auf getönter Toolbar | 4.54 (Privat) | 6.96 (Schule) | 4.5 |
| Schrift auf Akzentfläche (Badge, Primärknopf) | 5.07 (Privat) | 7.27 (Schule) | 4.5 |
| Text auf Auswahl | 13.14 (Alle) | 8.41 (Alle) | 4.5 |
| Gedämpft auf Auswahl | 4.86 (Alle) | 5.03 (Alle) | 4.5 |
| Gedämpft auf getönter Sidebar | 4.94 (Alle) | 6.32 (Alle) | 4.5 |
| Gedämpft auf Hintergrund | 5.66 | 6.74 | 4.5 |
| Fokus-Ring gegen Fläche | 5.07 | 7.02 | 3.0 |
| Danger auf Fläche | 6.42 | 6.49 | 4.5 |

Korrektur während der Prüfung: Dunkle Auswahl 22 % → 16 % und Dim-Text `#a3a09a` → `#aeaba5`. Vorher lag „gedämpft auf Auswahl“ bei 3.84.

**Grenzen:** Privat hell auf getönter Fläche liegt knapp über der Grenze (4.54). `--ws-tint-amount` darf darum nicht ohne neue Prüfung steigen. Eigene Farben prüft niemand. Ein Hinweis in den Optionen bei zu wenig Kontrast wäre ein späterer Schritt. Ränder sind dekorativ (1.3:1). Bedeutung tragen sie nie allein.

## Typografie

Nur Systemschrift (`font: message-box`, also Segoe UI Variable unter Windows). Die Größen sind relativ zur Systembasis, Zoom wirkt.

| Token | Wert | Bei 14px | Einsatz |
|---|---|---|---|
| `--ws-text-sm` | 0.857em | 12px | Datum, Zähler, Hilfetext, Badge |
| `--ws-text-md` | 1em | 14px | Text, Labels, Betreff |
| `--ws-text-lg` | 1.25em | 17.5px | Bereichstitel (Einstellungen) |
| `--ws-text-xl` | 1.75em | 24.5px | Seitentitel |

Gewichte 400 / 500 / 600 / 700. Ungelesener Absender in 700, gelesener in 500. Versalien nur für Badge und Gruppen-Überschriften, mit Laufweite `0.06em`. Zeilenhöhe 1.45, im Dunkeln 1.5.

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
| Toolbar | Fläche `--ws-bg-tinted`, keine Linie. Badge links: `--ws-text-sm`, 600, Versalien, Pill in Akzent. Im Modus Alle Graphit. |
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
