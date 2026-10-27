# Design-Brief: Theme und Add-on-UI „Curricu:lr Mail-Workspace“

Stand 2026-10-19. Ergebnis des Design-Interviews. Grundlage für Design-System, Tokens und Umsetzung. Technischer Ist-Zustand: `docs/ist-zustand.md`.

## 1. Ziel

Thunderbird 158 soll sich für eine Lehrkraft mit Schul- und Privatkonto **edel, reduziert und hochwertig** anfühlen, nahe an Apple Mail und Spark. Der aktive Workspace (Schule, Privat, Alle) ist jederzeit auf einen Blick erkennbar, ohne dass Farbe laut wird. Die Einstellungsseite wird von einer langen Formularseite zu einer gegliederten Seite mit Seitenleiste, auf der die häufigen Dinge zuerst kommen.

Betroffen sind:

- `theme-css/userChrome.css` (Hauptfenster, 3-Pane, Nachrichtenkopf, Verfassen-Fenster)
- `extension-workspace-switcher/options/` (Einstellungen, öffnet als Tab)
- `extension-workspace-switcher/popup/` (Bausteine, Nachrichtenaktionen) und `confirm/` (Sende-Dialog)
- `extension-workspace-switcher/shared/ui.css` (heute zweite, getrennte Token-Quelle)

## 2. Nutzerin/Nutzer und Kontext

- Lehrkraft, wechselt mehrmals täglich zwischen Schul- und Privatmodus (Button, `Ctrl+Shift+Y`).
- Liest überwiegend in der **Kartenansicht**.
- Öffnet die Einstellungen selten. Regelmäßig genutzt werden nur **Klassenzimmer** (Sichtschutz, Fokus) sowie **Schnell-Tabs/Ordnerfarben** und **Auto-Tags**.
- Arbeitet in Hell und Dunkel (folgt dem System), teils im Klassenraum am Beamer.

## 3. Primäre Aufgabe

**Im Theme:** Mails schnell erfassen und dabei nie im Zweifel sein, in welchem Workspace man gerade ist.
**In den Einstellungen:** Die zwei, drei Alltagsoptionen sofort finden. Einrichtungsoptionen sind da, stören aber nicht.

## 4. Was heute stört

| Bereich | Problem |
|---|---|
| Farben | Akzente sind generische Webfarben (Blau `#3b82f6`, Grün `#10b981`). Das Lila für „Alle“ stört. |
| Dichte | Es gibt nur eine Dichte. Gewünscht: kompakt **und** luftig, mit modernen Abständen. |
| Struktur | Akzentlinie unter der Toolbar. Karten mit Schatten und Ungelesen-Balken links. Compose-Kopf mit Balken, Umrandung und Badge. |
| Einstellungen | Zu lang (9 Abschnitte untereinander). Optik roh: viele gleiche Karten, unpolierte Formularfelder. |

## 5. Gestaltungsrichtung

**Drei Worte:** edel, reduziert, hochwertig.
**Vorbilder:** Apple Mail (ruhige Seitenleiste, feine Linien, Systemgefühl), Spark (lesbare Liste, freundlicher, ruhiger Akzent).
**Nicht gewollt:** Outlook-/Office-Look, Buntes und Verspieltes, Dark Mode mit Neon-Akzenten.

**Farbwelt:**

- **Schule:** tiefes Tintenblau.
- **Privat:** gedämpftes Salbeigrün.
- **Alle:** neutrales, warmes Graphit, ohne eigene Buntfarbe.
- Neutrale Töne sind leicht zur Modusfarbe getönt (sehr geringe Chroma). Der Modus ist spürbar, aber nicht als Farbfläche sichtbar.
- Eigene Farben aus den Optionen (`--ws-custom-*`) überschreiben weiterhin die Akzente.

**Typografie:** nur Systemschriften (`message-box` bzw. Segoe UI Variable / SF Pro über das System). Hierarchie entsteht über Gewicht und wenige, klar abgestufte Größen, nicht über Farbe.

## 6. Prinzipien

1. **Farbe heißt Bedeutung.** Akzent nur für Modus, Auswahl, Ungelesen und primäre Aktion. Alles andere ist neutral.
2. **Fläche statt Linie.** Hierarchie über Tönung und Abstand. Keine farbigen Balken, keine dicken Rahmen.
3. **Ruhe im Ruhezustand.** Elemente zeigen sich erst bei Hover, Auswahl oder Fokus (hybride Karten).
4. **Thunderbird bleibt Thunderbird.** Das Theme setzt auf TBs eigene Variablen und Dichte (`uidensity`) auf und ersetzt sie nicht.
5. **Eine Quelle.** Theme und Add-on-UI nutzen dieselben Tokens.

## 7. Do und Don't

**Do**

- Modus über drei leise Signale zeigen: Akzent, dezentes Badge in der Toolbar, leichte Tönung von Toolbar, Sidebar und Hintergrund.
- Ungelesen: **Punkt im Akzent** vor dem Absender, zusätzlich fetter Absender. So ist Ungelesen nicht nur über Farbe erkennbar.
- Karten hybrid: Im Ruhezustand eine durchgehende Fläche ohne Schatten. Hover und Auswahl erscheinen als weiche, getönte Karte mit Radius.
- Zwei Dichten, gekoppelt an `:root[uidensity="compact"]` und den Normalzustand (TB-Menü Ansicht → Dichte). Abstände folgen einem 4-px-Raster.
- Nachrichtenkopf reduziert: Absender, Betreff und Datum stehen vorn. Empfänger und Aktionsknöpfe sind gedämpft.
- Verfassen-Fenster: kleines Modus-Badge am Absender und leicht getönter Kopfbereich.
- Einstellungen: Seitenleiste mit Gruppen, höchstens ein Satz Erklärung pro Bereich, Details als Hilfetext an der Option.
- Fokus: 2px-Ring im Akzent, 2px Abstand, nur bei `:focus-visible`.

**Don't**

- Keine Akzentlinie unter der Toolbar, kein farbiger Balken links (Karten, Compose-Kopf, Schnell-Tabs, Tabellen-Tags).
- Keine Schlagschatten auf Karten.
- Keine Umrandung um das Absenderfeld.
- Kein Lila, keine Tailwind-Standardfarben, kein reines Schwarz oder Weiß.
- Keine Karte pro Abschnitt in den Einstellungen, keine verschachtelten Karten.
- Keine externen Fonts, kein CDN.
- Nichts im Hochkontrastmodus verändern (außer Konto-Ausblendung, wie heute).

## 8. Layout-Strategie

**Hauptfenster**

- Toolbar: leicht in Modusfarbe getönt. Links das Badge (Schule / Privat / Alle), kleiner und leiser als heute.
- Ordnerbaum: bleibt wie heute (ruhige Sidebar, gedämpfte Konto-Zeilen). Er bekommt nur die neuen Tokens und die Tönung.
- Mail-Liste: durchgehende Fläche. Ein Eintrag ist zweizeilig (Absender und Datum, darunter Betreff). Der Ungelesen-Punkt steht in einer eigenen schmalen Spalte links, damit die Texte bündig bleiben.
- Schnell-Tab-Leiste: neue Pill-Optik, Farbe als kleiner Punkt in der Pill statt Streifen.
- Tag-Pills: bleiben, übernehmen nur die Tokens.

**Einstellungen** (Wireframe siehe Abschnitt 13)

- Kopf: Titel und Umschalter für den aktiven Modus (Schule | Privat | Alle).
- Links eine Seitenleiste mit vier Gruppen, rechts der gewählte Bereich.
- Bei schmalem Fenster wird die Seitenleiste zu einer Auswahlliste oben.

## 9. Zustände

| Element | Zustände |
|---|---|
| Karte | Ruhe · Hover (weiche Karte) · Auswahl fokussiert (Akzent-Tönung) · Auswahl unfokussiert (schwächere Tönung) · aktuell · ungelesen · neu · getaggt |
| Modus | Schule · Privat · Alle · eigene Farbe · Hell/Dunkel · Hochkontrast (Theme aus) |
| Dichte | kompakt · normal (luftig) · touch (wie normal, TB vergrößert selbst) |
| Einstellungen | Bereich gewählt · gespeichert (Status-Meldung) · Fehler (z. B. Kalender nicht lesbar) · leer (keine Schnell-Tabs, nichts geplant, keine Ordnerfarben) |
| Sende-Dialog | eine oder mehrere Warnungen · Senden · Abbrechen · Fenster geschlossen = nicht senden |

Leere Zustände in den Einstellungen sagen kurz, **wie** man etwas anlegt (z. B. „Rechtsklick auf einen Ordner → Als Schnell-Tab anheften“).

## 10. Interaktion

- Moduswechsel: Akzent, Badge und Tönung wechseln mit kurzer Farbüberblendung (bis 150 ms, ease-out). Bei `prefers-reduced-motion` gibt es keine Überblendung.
- Einstellungen speichern sofort (wie heute). Rückmeldung über die bestehende Status-Zeile (`role="status"`).
- Klick auf einen Eintrag in der Seitenleiste wechselt den Bereich ohne Neuladen. Der gewählte Bereich steht im URL-Hash (`#alltag`), damit Links und Zurück funktionieren.
- Der Modus-Umschalter im Kopf schreibt in den Storage, wie alle anderen Quellen. Erst `storage.onChanged` wendet den Modus an.

## 11. Barrierefreiheit

- WCAG AA: Text 4,5:1, auch gedämpfter Text. UI-Elemente und Ränder mit Bedeutung 3:1.
- Schrift folgt System und Thunderbird. Skala in `em`/`rem`, Zoom wirkt.
- Fokus sichtbar (siehe Do). Die Seitenleiste ist per Tastatur bedienbar (Pfeiltasten oder Tab, `aria-current`).
- Modus und Ungelesen sind nie nur über Farbe erkennbar.
- Hochkontrast und reduzierte Bewegung werden respektiert.

## 12. Was bleibt

- Optik: Ordnerbaum und Tag-Pills.
- Technik: Modi `school/private/all`, `data-workspace`, `.workspace-hidden`, `--ws-custom-*`, `Ctrl+Shift+Y`, Storage-Schlüssel `settings`, alle Funktionen und das Speicherverhalten.

## 13. Wireframe Einstellungen (Text)

```
┌──────────────────────────────────────────────────────────────┐
│ Workspace Suite                  [ Schule | Privat | Alle ]  │
│ Gespeichert.                                    (Status)     │
├───────────────┬──────────────────────────────────────────────┤
│ ALLTAG        │ Klassenzimmer                                │
│ ▸ Klassenzim. │ Sichtschutz und Fokus für den Unterricht.    │
│   Schnell-Tabs│                                              │
│   Auto-Tags   │ Sichtschutz                          [ ○ ]   │
│               │   Liste und Nachricht unscharf bis Hover     │
│ SCHREIBEN     │ ──────────────────────────────────────────── │
│   Bausteine   │ Fokus-Modus             [ 60 Min. starten ]  │
│   Später send.│   Blendet Zähler aus. Läuft noch 42 Min.     │
│               │                                              │
│ SICHERHEIT    │                                              │
│   Sende-Wächt.│                                              │
│               │                                              │
│ EINRICHTUNG   │                                              │
│   Konten      │                                              │
│   Absender    │                                              │
│   Kalender    │                                              │
│   Farben      │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

Reihenfolge und Inhalt der Bereiche:

1. **Alltag**
   - *Klassenzimmer:* Sichtschutz (Schalter), Fokus-Modus (Knopf und Restzeit).
   - *Schnell-Tabs & Ordnerfarben:* Liste der Tabs (Beschriftung, Workspace, Farbe, Lösen), darunter die Ordnerfarben. Leerzustand mit Anleitung.
   - *Auto-Tags:* Regeln (Schlagwort, Farbe, Wörter, Löschen) und „Regel hinzufügen“.
2. **Schreiben**
   - *Textbausteine:* Liste, Platzhalter als Hilfe, „Hinzufügen“ und „Standard wiederherstellen“ (sekundär).
   - *Später senden:* geplante Entwürfe als Tabelle. Leerzustand.
3. **Sicherheit**
   - *Sende-Wächter:* Hauptschalter oben. Darunter die Prüfungen: interne Domains, BCC-Schwelle, sensible Schlagwörter, Feierabend und Später-senden-Zeit, Erreichbarkeits-Footer.
4. **Einrichtung**
   - *Konten:* Tabelle Konto, Adressen, Workspace.
   - *Standard-Absender:* je Modus eine Auswahl.
   - *Kalender & Sprechzeiten:* Kalendertabelle, „Abonnieren …“, Tage, Von, Bis, Dauer.
   - *Farben:* drei Farbwähler mit Zurücksetzen und Live-Vorschau des Badges.

Formulare: Label links und Feld rechts, bei schmalem Fenster untereinander. Schalter statt Checkbox für An/Aus-Optionen. Pro Bereich höchstens eine primäre Aktion.

## 14. Prioritäten

1. **Gemeinsame Token-Datei** und neue Palette (Tinte, Salbei, Graphit), Hell und Dunkel, AA-geprüft.
2. **Theme Struktur:** Toolbar-Linie, Schatten und Balken entfernen. Hybride Karten, Ungelesen-Punkt, getönte Toolbar und Sidebar.
3. **Dichte** kompakt/normal über `uidensity`.
4. **Einstellungsseite** mit Seitenleiste und neuer Reihenfolge.
5. **Nachrichtenkopf** reduziert, **Verfassen-Kopf** mit Badge und Tönung.
6. **Popups und Sende-Dialog** auf die neuen Tokens und Bausteine bringen.

## 15. Offene Fragen

- **Token-Import im Theme:** `userChrome.css` kann keine Datei aus dem Add-on laden, denn die `moz-extension://`-UUID ist pro Profil zufällig. Vorschlag: Die Quelle liegt in `extension-workspace-switcher/shared/tokens.css`. `install-dev` verknüpft oder kopiert sie nach `chrome/`, und `userChrome.css` bindet sie per `@import` ein. Das Muster mit der Stub-Datei gibt es schon.
- **Selektoren:** Nachrichtenkopf (`about:message`) und Ungelesen-Punkt in der Karte müssen in TB 158 per Browser-Toolbox geprüft werden.
- **Screenshots:** Für den Abgleich vor und nach der Umsetzung fehlen noch Bilder vom Ist-Zustand (Hell/Dunkel, Schule/Privat, Einstellungen).

## 16. Referenzen für die Umsetzung

impeccable: `color-and-contrast.md` (Palette, OKLCH, Tönung), `spatial-design.md` (Dichte, Raster), `interaction-design.md` (Formulare, Fokus), `typography.md` (Skala), `ux-writing.md` (Kurztexte, leere Zustände).
