# 0009. Map of screens with Leaflet and OpenStreetMap

| Status | Date | Decided by | Supersedes | Superseded by |
| --- | --- | --- | --- | --- |
| Accepted | 2026-10-28 | architect agent (draft), machine gate (auto) | - | - |

## Context

D-7: map with Leaflet + OpenStreetMap; the list works without the map (F-3 AC4). ТЗ §7 allows the map only if it does not complicate the demo much. K-03: the OSM tile policy limits heavy or commercial use. The tile policy (operations.osmfoundation.org/policies/tiles, verified 2026-10-28) asks for visible attribution, a valid Referer from browsers, no bulk or offline download, and says access may be withdrawn without notice, especially for commercial services. The choice inside D-7 is only how the map is wired.

## Options

1. **`react-leaflet` over Leaflet 1.x, standard OSM tile URL, map loaded lazily in its own error boundary**: Pros: least code; a failed tile or script load leaves the list working. Cons: depends on the public OSM tile servers.
2. **Plain Leaflet without the React wrapper**: Pros: one dependency less. Cons: manual lifecycle code in React.
3. **Other tile provider now**: Pros: commercial terms. Cons: account and key; D-7 already chose OSM for the demo.

## Decision

Option 1. The map is a lazily loaded component on «Билборды» (list and map side by side or as tabs), wrapped in an error boundary; markers come from `screens.lat` / `lng` of the filtered list, and a marker click opens the billboard card. Attribution «© OpenStreetMap contributors» stays visible. No marker clustering library: 100 markers are fine without it. Leaflet 1.9.x is the current stable line; 2.0 was in alpha on leafletjs.com (verified 2026-10-28); the scaffold pins 1.9.x and a matching `react-leaflet` major (exact compatible major: UNVERIFIED).

## Consequences

- The map needs internet in the meeting; without it, the list still works (F-3 AC4).
- Phase 2 needs a tile provider with commercial terms (K-03); swapping it is a tile URL and attribution change.
- Coordinates are synthetic points near city centres (ADR-0006); they do not point at real billboard sites.

## Open questions

None.
