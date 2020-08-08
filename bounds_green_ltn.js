import { addMapFeatures, API_KEY } from "./bounds_green_ltn_functions.js"



let tileServiceUrl = 'https://api.os.uk/maps/raster/v1/zxy';

let vectorUrl = 'https://api.os.uk/maps/vector/v1/vts';

// Create a map style object using the OS Maps API ZXY service.
let style = {
    'version': 8,
    'sources': {
        'raster-tiles': {
            'type': 'raster',
            'tiles': [tileServiceUrl + '/Light_3857/{z}/{x}/{y}.png?key=' + API_KEY],
            'tileSize': 256,
            'maxzoom': 20
        }
    },
    'layers': [{
        'id': 'os-maps-zxy',
        'type': 'raster',
        'source': 'raster-tiles'
    }]
};

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
