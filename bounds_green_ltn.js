import { addMapFeatures, API_KEY } from "./bounds_green_ltn_functions.js"

let vectorUrl = 'https://api.os.uk/maps/vector/v1/vts';

// Initialize the map object.
let map = new mapboxgl.Map({
    container: 'map',
    minZoom: 12,
    maxZoom: 20,
    style: vectorUrl + '/resources/styles?key=' + API_KEY,
    center: [-0.1188682761282962, 51.60766464643319],
    zoom: 14,
    transformRequest: url => {
        if (! /[?&]key=/.test(url)) url += '?key=' + API_KEY
        return {
            url: url + '&srs=3857'
        }
    }
});


addMapFeatures(map)
