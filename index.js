'use strict';

const extend = require('xtend');
const mapboxgl = require('mapbox-gl');
const async = require('async');
const turf = {
    bbox: require('@turf/bbox')
};

const popupTemplate = require('./popup.handlebars');
const moment = require('moment');

/**
 * A NSW RFS Major Incidents Layer for Mapbox GL
 * @class MapboxGLNSWRFSMajorIncidents
 *
 * @param {Object} options
 * @param {String} [options.url=https://www.beyondtracks.com/contrib/nsw-rfs-majorincidents.geojson] URL to the NSW RFS Major Incidents feed as processed by https://github.com/beyondtracks/nsw-rfs-majorincidents-geojson
 * @example
 * var nswRFSMajorIncidents = new MapboxGLNSWRFSMajorIncidents();
 * map.addControl(nswRFSMajorIncidents);
 * @return {MapboxGLNSWRFSMajorIncidents} `this`
 */
function MapboxGLNSWRFSMajorIncidents(options) {
    this.options = extend({}, this.options, options);
}

MapboxGLNSWRFSMajorIncidents.prototype = {
    options: {
        url: 'https://www.beyondtracks.com/contrib/nsw-rfs-majorincidents.geojson'
    },

    onAdd: function(map) {
        var self = this;
        this._map = map;
        var el = this.container = document.createElement('div');

        this._map.on('load', function () {
            self._map.addSource('_nswrfsmajorincidents', {
                type: 'geojson',
                data: self.options.url
            });

            self._map.addLayer({
                id: '_nswrfsmajorincidents-fill',
                source: '_nswrfsmajorincidents',
                type: 'fill',
                paint: {
                    "fill-color": "red",
                    "fill-opacity": 0.5
                },
                filter: ["==", "$type", "Polygon"]
            });

            self._map.addLayer({
                id: '_nswrfsmajorincidents-outline',
                source: '_nswrfsmajorincidents',
                type: 'line',
                paint: {
                    "line-color": "red",
                    "line-width": 2
                },
                filter: ["==", "$type", "Polygon"]
            });

            self._map.addLayer({
                id: '_nswrfsmajorincidents-outline-selected',
                source: '_nswrfsmajorincidents',
                type: 'line',
                paint: {
                    "line-color": "blue",
                    "line-width": 2
                },
                filter: ["all", ["==", "$type", "Polygon"], ["==", "guid", ""]]
            });

            async.parallel(['non-fire', 'under-control', 'being-controlled', 'out-of-control'].map(function (icon) {
                // async function
                return {
                    key: icon,
                    value: function (callback) {
                        self._map.loadImage('icons/' + icon + '.png', callback)
                    }
                };
            }).reduce(function(acc, cur) {
                acc[cur.key] = cur.value;
                return acc;
            }, {}), function (err, results) {
                for (var icon in results) {
                    self._map.addImage('_nswrfsmajorincidents-' + icon, results[icon]);
                }

                self._map.addLayer({
                    id: '_nswrfsmajorincidents-symbol',
                    source: '_nswrfsmajorincidents',
                    type: 'symbol',
                    layout: {
                        "icon-image": [
                            "case",
                                ["get", "fire"], [
                                    "match",
                                        ["get", "status"],
                                        "Under control", '_nswrfsmajorincidents-under-control',
                                        "Being controlled", '_nswrfsmajorincidents-being-controlled',
                                        "Out of control", '_nswrfsmajorincidents-out-of-control',
                                        '_nswrfsmajorincidents-under-control' // default
                                ],
                                '_nswrfsmajorincidents-non-fire' // false (default)
                        ],
                        "icon-allow-overlap": true
                    },
                    filter: ["==", "$type", "Point"]
                });

                self._map.addLayer({
                    id: '_nswrfsmajorincidents-symbol-selected',
                    source: '_nswrfsmajorincidents',
                    type: 'circle',
                    paint: {
                        "circle-opacity": 0,
                        "circle-stroke-color": "blue",
                        "circle-radius": 14,
                        "circle-stroke-width": 4,
                        "circle-stroke-opacity": 0.8
                    },
                    filter: ["all", ["==", "$type", "Point"], ["==", "guid", ""]]
                });
            });

            // open popup on click, since we don't want two popups when clicking over both the symbol and fill, we can't limit the on to a specific layer
            self._map.on('click', function (e) {
                if (e && e.point) {
                    var features = self._map.queryRenderedFeatures(e.point, {
                        layers: ['_nswrfsmajorincidents-symbol', '_nswrfsmajorincidents-fill']
                    });
                    if (features && features.length) {
                        self._selected = features[0].properties.guid;
                        // popup
                        var options = {
                            closeButton: false // if true then a bug appears deselecting the feature when closing the popup manually
                        };
                        var lngLat;
                        switch (features[0].layer.id) {
                            case '_nswrfsmajorincidents-symbol':
                                options.offset = 15 + 4;
                                lngLat = features[0].geometry.coordinates;
                                break;
                            case '_nswrfsmajorincidents-fill':
                                var matchingPointFeatures = self._map.querySourceFeatures('_nswrfsmajorincidents', {
                                    filter: ["all", ["==", "$type", "Point"], ["==", "guid", features[0].properties.guid]]
                                });

                                var existingBounds = self._map.getBounds();
                                var extendedBounds = mapboxgl.LngLatBounds.convert(existingBounds.toArray()); // clone as operations happen in-place
                                // extend to fit polygon feature
                                extendedBounds.extend(new mapboxgl.LngLatBounds(turf.bbox(features[0].geometry)))

                                if (matchingPointFeatures && matchingPointFeatures.length) {
                                    // use the matching point feature
                                    options.offset = 15 + 4;
                                    lngLat = matchingPointFeatures[0].geometry.coordinates;
                                    // further extend to ensure we have the matching point feature
                                    extendedBounds.extend(new mapboxgl.LngLat(lngLat[0], lngLat[1]));
                                } else {
                                    // use use where the user clicked
                                    lngLat = e.lngLat;
                                }

                                // if the extended bounds are different to the existing bounds, fit the map to include as much as the feature as we know about
                                if (existingBounds.toString() !== extendedBounds.toString()) {
                                    self._map.fitBounds(extendedBounds, {
                                        padding: 20
                                    });
                                }
                                break;
                            default:
                                return;
                        }
                        var templateData = self._extraTemplateData(features[0].properties);
                        new mapboxgl.Popup(options)
                            .setLngLat(lngLat)
                            .setHTML(popupTemplate(features[0].properties))
                            .addTo(self._map)
                            .on('close', function () {
                                if (self._selected == null) {
                                    // reset selection
                                    self._map.setFilter('_nswrfsmajorincidents-symbol-selected', ["all", ["==", "$type", "Point"], ["==", "guid", ""]]);
                                    self._map.setFilter('_nswrfsmajorincidents-outline-selected', ["all", ["==", "$type", "Polygon"], ["==", "guid", ""]]);
                                }
                            });

                        // highlight incident
                        self._map.setFilter('_nswrfsmajorincidents-symbol-selected', ["all", ["==", "$type", "Point"], ["==", "guid", features[0].properties.guid]]);
                        self._map.setFilter('_nswrfsmajorincidents-outline-selected', ["all", ["==", "$type", "Polygon"], ["==", "guid", features[0].properties.guid]]);
                    } else {
                        self._selected = null;
                    }
                }
            });

            // cursor hover pointer
            self._map.on('mouseenter', '_nswrfsmajorincidents-symbol', function () {
                map.getCanvas().style.cursor = 'pointer';
            });
            self._map.on('mouseleave', '_nswrfsmajorincidents-symbol', function () {
                map.getCanvas().style.cursor = '';
            });
            self._map.on('mouseenter', '_nswrfsmajorincidents-fill', function () {
                map.getCanvas().style.cursor = 'pointer';
            });
            self._map.on('mouseleave', '_nswrfsmajorincidents-fill', function () {
                map.getCanvas().style.cursor = '';
            });
        });

        return el;
    },

    onRemove: function() {
        this.container.parentNode.removeChild(this.container);
        this._map = null;
        return this;
    },

    _extraTemplateData: function (d) {
        d['alert-level-color'] = alertLevelToClass(d['alert-level']);
        d['status-color'] = statusToClass(d['status']);

        //d['alert-level-tooltip'] = alertLevelTooltip(d['alert-level']);
        //d['status-tooltip'] = statusTooltip(d['status']);

        var currentAsOfFormatString = "DD/MM/YYYY hh:mm:ss A";
        d['current-as-of'] = moment(d['pub-date']).calendar(),
        d['current-as-of-ago'] = moment(d['pub-date']).fromNow()

        return d;
    }
};

/* set bootstrap text class's according to incident alert level */
function alertLevelToClass(alertValue) {
    switch (alertValue) {
        case 'Emergency Warning':
            return 'danger';
            break;
        case 'Watch and Act':
            return 'warning';
            break;
        case 'Advice':
            return 'info';
            break;
        case 'Not Applicable':
            return 'muted';
            break;
        default:
            return '';
    }
}

/* set bootstrap text class's according to incident status */
function statusToClass(statusValue) {
    switch (statusValue) {
        case 'Out of Control':
            return 'danger';
            break;
        case 'Being Controlled':
            return 'warning';
            break;
        case 'Under Control':
            return 'info';
            break;
        default:
            return '';
    }
}


module.exports = MapboxGLNSWRFSMajorIncidents;
