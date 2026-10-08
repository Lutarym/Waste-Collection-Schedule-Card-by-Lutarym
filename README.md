# Waste Collection Schedule Card by Lutarym

Lovelace-Karte für die Integration **Waste Collection Schedule**. Jede Tonne wird mit ihrer Farbe angezeigt. Einen Tag vor der Abholung hüpft sie, am Abholtag hüpft und leuchtet sie stärker.

**Version: 0.5.0**

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
    color: "#222222"
  - entity: sensor.waste_collection_schedule_papiertonne
    name: Papier
    color: "#1e6fd9"
  - entity: sensor.waste_collection_schedule_gelbe_tonne
    name: Gelbe Tonne
    color: "#ff8c1a"
  - entity: sensor.waste_collection_schedule_biotonne
    name: Biotonne
    color: "#8b5a2b"
```

| Option | Pflicht | Standard | Beschreibung |
|---|---|---|---|
| `title` | nein | Müllabfuhr | Überschrift der Karte |
| `show_dates` | nein | true | Zeigt das Abholdatum unter jeder Tonne |
| `show_badges` | nein | true | Zeigt „Heute“ und „Morgen“ bei anstehenden Terminen |
| `animate` | nein | true | Schaltet Hüpfen und Leuchten ein oder aus |
| `demo` | nein | false | Zeigt Beispieldaten statt echter Sensoren |
| `bins` | ja, außer im Demo-Modus | | Liste der Tonnen |
| `bins[].entity` | ja, außer im Demo-Modus | | Sensor der Integration |
| `bins[].name` | nein | Name des Sensors | Anzeigename der Tonne |
| `bins[].color` | nein | #888888 | Farbe der Tonne als Hex-Wert |

## Versionen

| Version | Änderungen |
|---|---|
| 0.5.0 | Comic-Stil mit Gesicht, lustigere Quetsch-und-Streck-Animation, Sprechblasen für „Heute“ und „Morgen“ |
| 0.4.0 | Versionsnummer angeglichen, keine Funktionsänderung |
| 0.3.1 | Animation läuft auch bei aktiver Einstellung „Bewegung reduzieren“ |
| 0.3.0 | Demo-Modus mit Beispieldaten |
| 0.2.0 | Visueller Editor, neue Optionen `show_dates`, `show_badges` und `animate` |
| 0.1.0 | Erste Version mit Animation und Tonnenfarben |

## Hinweis

Die Karte liest das Datum aus dem Zustand des Sensors im Format `TT.MM.JJJJ`. Ohne erkennbares Datum wird „kein Termin“ angezeigt.
