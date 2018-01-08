# mapbox-gl-nsw-rfs-majorincidents

A NSW RFS Major Incidents Layer for Mapbox GL.

This module abstracts away all the details of adding a NSW RFS Major Incidents layer to your Mapbox GL JS map. The goal is to make something which works out of the box rather than having every aspect configurable.

It was written specifically to [add information about bushfires nearby bushwalks on BeyondTracks](https://www.beyondtracks.com).

# Design Decisions
## Severity

The RFS use two main classifications of incidents, the alert level and status. Alert level seems to be more related to if an incident will affect life and property with status seeming to indicate how much of a handle or control ground crews have on the incident.

Understandably an out of control fire in the middle of nowhere is less of a concern than a under control fire right next to houses. So on the RFS map the representation of severity or importance is given by the alert level. However given the original purpose of this library is for alerting bushwalkers of nearby fires, an out of control fire in the middle of nowhere that's nearby a track in the middle of nowhere of much greater concern than a fire near houses which is under control. Hence this map shows Advice level incidences which are out of control at a high severity.

## Credits
_NSW RFS Current Incidents are © State of New South Wales (NSW Rural Fire Service). For current information go to www.rfs.nsw.gov.au. Licensed under the Creative Commons Attribution 4.0 International (CC BY 4.0)._

This layer makes use of https://github.com/beyondtracks/nsw-rfs-majorincidents-geojson as such this layer isn't using data directly from RFS.

### Icons
 - Fire icon:  CC0 [_Osmic_](https://gitlab.com/gmgeo/osmic)
 - Exclamation icon: SIL OFL 1.1 [_Font Awesome by Dave Gandy_](http://fontawesome.io)
