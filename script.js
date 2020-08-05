var API_KEY = 'Ae6wi8HZzLBBiZE3xLoRvqYhqoV83ije';

var wfsServiceUrl = 'https://api.os.uk/features/v1/wfs',
    tileServiceUrl = 'https://api.os.uk/maps/raster/v1/zxy';

    let vectorUrl = 'https://api.os.uk/maps/vector/v1/vts';

// Create a map style object using the OS Maps API ZXY service.
var style = {
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
var map = new mapboxgl.Map({
    container: 'map',
    minZoom: 12,
    maxZoom: 20,
    style: vectorUrl + '/resources/styles?key=' + API_KEY,
    center: [-0.1304205, 51.6086152],
    zoom: 15,
    transformRequest: url => {
        if(! /[?&]key=/.test(url) ) url += '?key=' + API_KEY
        return {
            url: url + '&srs=3857'
        }
    }
});

map.dragRotate.disable(); // Disable map rotation using right click + drag.
map.touchZoomRotate.disableRotation(); // Disable map rotation using touch rotation gesture.

// Add navigation control (excluding compass button) to the map.
map.addControl(new mapboxgl.NavigationControl({
    showCompass: false
}));


function convertLineStringCoords(arr) {
    for (let i = 0; i < arr.length; i++) {
        arr[i].geometry.coordinates = arr[i].geometry.coordinates[0];
    }
    return arr;
}

function addStreetsLayer(features, id, color) {
    map.addSource(id, {
        'type': 'geojson',
        'data': {
            'type': 'FeatureCollection',
            'features': features
        }
    });

    map.addLayer({
        'id': id,
        'type': 'line',
        'source': id,
        'paint': {
            'line-width': 10,
            'line-color': color
        }
    });
}

// Add event which waits for the map to be loaded.
map.on('load', async function () {

    let westbury = await getFeatures('Highways_Roadlink', 'Westbury Road');
    let brownlow = await getFeatures('Highways_Roadlink', 'Brownlow Road');
    let elvendon = await getFeatures('Highways_Roadlink', 'Elvendon Road');
    let goring = await getFeatures('Highways_Roadlink', 'Goring Road');
    console.log(goring)

    let bannedStreets = [[brownlow[1]], [brownlow[5]], [brownlow[7]], [brownlow[15]], [brownlow[16]]]
    console.log(bannedStreets)
    let convertedBannedCoords = bannedStreets.map(x => convertLineStringCoords(x));
    let mergedBannedStreets = [].concat(...convertedBannedCoords)



    let allowedBrownlow;
    for(let i=0; i<brownlow.length; i++){
        if(i===1 || i=== 5|| i=== 7 || i=== 15 || i===16){
            delete brownlow[i]
        }
        allowedBrownlow = brownlow.filter(Boolean);
    }

    

    let allowedStreets = [westbury, allowedBrownlow, elvendon, [goring[2]]]
    console.log(allowedStreets)


    // console.log(uniqueStreets)
    let convertedAllowedStreetCoords = allowedStreets.map(x => convertLineStringCoords(x))
    let mergedAllowedStreets = [].concat(...convertedAllowedStreetCoords)


    

    addStreetsLayer(mergedAllowedStreets, 'allowed-streets', '#00ab66')
    addStreetsLayer(mergedBannedStreets, 'banned-streets', '#FFA500')



    // Get the visible map bounds (BBOX).
    var bounds = map.getBounds();

    function click(id) {
        // When a click event occurs on a feature in the 'streets' layer, open a popup at
        // the location of the click, with description HTML from its properties.
        map.on('click', id, function (e) {

            var bounds = map.getBounds();

            var x = bounds.getSouthWest().lat + ',' + bounds.getSouthWest().lng,
                y = bounds.getNorthEast().lat + ',' + bounds.getNorthEast().lng;

            var z = x + ' ' + y;

            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(e.features[0].properties.RoadName1)
                .addTo(map);
        });
    }

    function mouseEnter(id) {
        // Change the cursor to a pointer when the mouse is over the 'streets' layer.
        map.on('mouseenter', id, function () {
            map.getCanvas().style.cursor = 'pointer';
        });
    }

    function mouseLeave(id) {
        // Change the cursor back to a pointer when it leaves the 'streets' layer.
        map.on('mouseleave', id, function () {
            map.getCanvas().style.cursor = '';
        });
    }

    click('allowed-streets')
    click('banned-streets')
    mouseEnter('allowed-streets')
    mouseEnter('banned-streets')
    mouseLeave('allowed-streets')
    mouseLeave('banned-streets')

});

/**
 * Get features from the WFS.
 */
async function getFeatures(typeName, literal) {
    // Convert the bounds to a formatted string.
    let sw = [51.6050104126017, -0.14634209284295707],
        ne = [51.615524130859825, -0.11544304499136615];

    let coords = sw + ' ' + ne;
    // Create an OGC XML filter parameter value which will select the Airport
    // features (site function) intersecting the BBOX coordinates.
    var xml = '<ogc:Filter>';
    xml += '<ogc:And>';
    xml += '<ogc:BBOX>';
    xml += '<ogc:PropertyName>SHAPE</ogc:PropertyName>';
    xml += '<gml:Box srsName="urn:ogc:def:crs:EPSG::4326">';
    xml += '<gml:coordinates>' + coords + '</gml:coordinates>';
    xml += '</gml:Box>';
    xml += '</ogc:BBOX>';
    xml += '<ogc:PropertyIsEqualTo>';
    xml += '<ogc:PropertyName>RoadName1</ogc:PropertyName>';
    xml += '<ogc:Literal>' + literal + '</ogc:Literal>';
    xml += '</ogc:PropertyIsEqualTo>';
    xml += '</ogc:And>';
    xml += '</ogc:Filter>';

    // Define (WFS) parameters object.
    let startIndex = 0;
    let featureLength = 0;
    let totalFeatures = [];

    do {
        let params = {
            key: API_KEY,
            service: 'WFS',
            request: 'GetFeature',
            version: '2.0.0',
            typeNames: typeName,
            outputFormat: 'GEOJSON',
            srsName: 'urn:ogc:def:crs:EPSG::4326',
            filter: xml,
            startIndex: startIndex.toString(),
            count: 100
        };

        let featureUrl = getUrl(params);
        let response = await fetch(featureUrl);
        let json = await response.json();
        let featureArray = json.features;
        featureLength = featureArray.length;

        totalFeatures.push(featureArray);
        startIndex += featureLength;
    }
    while (featureLength >= 100)
    return [].concat(...totalFeatures);
}

/**
 * Return URL with encoded parameters.
 * @param {object} params - The parameters object to be encoded.
 */
function getUrl(params) {
    var encodedParameters = Object.keys(params)
        .map(paramName => paramName + '=' + encodeURI(params[paramName]))
        .join('&');

    return wfsServiceUrl + '?' + encodedParameters;
}
