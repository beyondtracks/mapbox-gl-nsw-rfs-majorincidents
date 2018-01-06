'use strict';
var mapboxgl = require('mapbox-gl');
var insertCss = require('insert-css');
var fs = require('fs');
mapboxgl.accessToken = window.localStorage.getItem('MapboxAccessToken');

insertCss(fs.readFileSync('./node_modules/mapbox-gl/dist/mapbox-gl.css', 'utf8'));

var MapboxGLNSWRFSMajorIncidents = require('./');

var mapDiv = document.body.appendChild(document.createElement('div'));
mapDiv.style.position = 'absolute';
mapDiv.style.top = 0;
mapDiv.style.right = 0;
mapDiv.style.left = 0;
mapDiv.style.bottom = 0;

var map = new mapboxgl.Map({
  container: mapDiv,
  style: 'mapbox://styles/mapbox/streets-v9',
  center: [147, -33],
  zoom: 5,
  hash: true
});
window.map = map;

var nswRFSMajorIncidents = new MapboxGLNSWRFSMajorIncidents();

window.nswRFSMajorIncidents = nswRFSMajorIncidents;

map.addControl(nswRFSMajorIncidents);
