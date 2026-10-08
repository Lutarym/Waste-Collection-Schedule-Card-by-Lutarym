# Waste Collection Schedule Card by Lutarym

Lovelace-Karte für die Integration **Waste Collection Schedule**. Die Darstellung wird im Editor unter „Darstellung“ gewählt:

- **Glaskarte** (Standard): Jede Tonne ist eine Glaskarte. Ohne Termin schwebt sie ruhig. Einen Tag vorher schwebt sie etwas stärker. Am Abholtag hebt sie sich in 3D nach vorn ab und leuchtet.
- **Mann mit Tonnen**: Ein Mann bringt die Tonnen nach vorn. Einen Tag vorher angelt er mit einem Köder, und die Tonne hüpft zu ihm. Der Köder ist je nach Tonne anders: Fisch (Restmüll), Zeitungsknäuel (Papier), Joghurtbecher (Gelbe Tonne), Apfelgriebs (Biotonne). Am Abholtag rollt er die Tonne auf ihren Rädern an den Rand. Die Tonne wird am Namen erkannt.

**Version: 2.3.0**

## Installation über HACS

1. HACS öffnen, Benutzerdefinierte Repositories, dieses Repository als Typ **Dashboard** hinzufügen.
2. Die Karte installieren und Home Assistant neu laden.
3. Die Ressource wird von HACS automatisch eingetragen.

## Konfiguration über den Editor

Die Karte lässt sich im Dashboard über den visuellen Editor einrichten. Tonnen können dort hinzugefügt, entfernt und bearbeitet werden.

## Demo-Modus

Mit `demo: true` zeigt die Karte Beispieldaten an, ohne dass echte Sensoren nötig sind. Die vier Tonnen haben Termine heute, morgen, in 5 Tagen und in 12 Tagen. So lässt sich das Aussehen und die Animation prüfen, bevor die Integration eingerichtet ist.

```yaml
type: custom:lutarym-waste-collection-card
demo: true
```

## Konfiguration in YAML

```yaml
type: custom:lutarym-waste-collection-card
title: Müllabfuhr
show_dates: true
show_badges: true
animate: true
demo: false
bins:
  - entity: sensor.waste_collection_schedule_restmulltonne
    name: Restmüll
    color: "#3b3b3b"
  - entity: sensor.waste_collection_schedule_papiertonne
    name: Papier
    color: "#2f6fbf"
  - entity: sensor.waste_collection_schedule_gelbe_tonne
    name: Gelbe Tonne
    color: "#e8a317"
  - entity: sensor.waste_collection_schedule_biotonne
    name: Biotonne
    color: "#7a5230"
```

| Option | Pflicht | Standard | Beschreibung |
|---|---|---|---|
| `title` | nein | Müllabfuhr | Überschrift der Karte |
| `show_dates` | nein | true | Zeigt das Abholdatum unter jeder Tonne |
| `show_badges` | nein | true | Zeigt „Heute“ und „Morgen“ bei anstehenden Terminen |
| `style` | nein | glas | Darstellung der Karte: „glas“ (Glaskarte) oder „mann“ (Mann mit Tonnen) |
| `animate` | nein | true | Schaltet die Animationen ein oder aus |
| `demo` | nein | false | Zeigt Beispieldaten statt echter Sensoren |
| `bins` | ja, außer im Demo-Modus | | Liste der Tonnen |
| `bins[].entity` | ja, außer im Demo-Modus | | Sensor der Integration |
| `bins[].name` | nein | Name des Sensors | Anzeigename der Tonne |
| `bins[].color` | nein | #888888 | Farbe der Tonne als Hex-Wert |

## Versionen

| Version | Änderungen |
|---|---|
| 2.3.0 | Mann mit Tonnen mit realistischen Größenverhältnissen, Tonne auf Rädern, Abholung durch Rollen zum Rand |
| 2.2.0 | Neue Darstellung „Mann mit Tonnen“: Köder und Schubkarre, die Tonnen werden nach vorn geholt. Ersetzt die Comic-Tonnen |
| 2.1.0 | Neue Darstellung „Comic-Tonnen“ mit Figuren für Restmüll, Papier, Gelbe Tonne und Biotonne (ersetzt durch 2.2.0) |
| 2.0.0 | Neue Darstellung Glaskarte mit 3D-Animation am Abholtag, Auswahl der Darstellung im Editor (Option `style`) |
| 1.0.0 | Erste große Version: Abreißkalender-Konzept, Versionssprung auf 1.0.0 |
| 0.12.0 | Komplett neues Konzept: Abreißkalender statt Tonnenfiguren, Blatt reißt am Abholtag ab |
| 0.11.0 | Versionsnummer erhöht, keine Funktionsänderung |
| 0.10.0 | Komplett neues Design und neue Animation: schlafende Tonnen, Aufwachen, Party mit Hut und Konfetti |
| 0.9.0 | Comic-Stil zurück, ohne Müllwagen. Am Abholtag hüpft die Tonne, der Deckel fliegt auf, Funken springen heraus, das Gesicht zwinkert |
| 0.8.0 | Ruhigeres Kachel-Design (ersetzt durch 0.9.0) |
| 0.7.0 | Müllwagen fährt vorbei und holt die Tonnen ab, neue Option `show_truck` |
| 0.6.5 | Versionsnummer angeglichen, keine Funktionsänderung |
| 0.5.0 | Comic-Stil mit Gesicht, Quetsch-und-Streck-Animation, Sprechblasen für „Heute“ und „Morgen“ |
| 0.4.0 | Versionsnummer angeglichen, keine Funktionsänderung |
| 0.3.1 | Animation läuft auch bei aktiver Einstellung „Bewegung reduzieren“ |
| 0.3.0 | Demo-Modus mit Beispieldaten |
| 0.2.0 | Visueller Editor, neue Optionen `show_dates`, `show_badges` und `animate` |
| 0.1.0 | Erste Version mit Animation und Tonnenfarben |

## Hinweis

Die Karte liest das Datum aus dem Zustand des Sensors im Format `TT.MM.JJJJ`. Ohne erkennbares Datum wird „kein Termin“ angezeigt.
