let API_KEY = 'Ae6wi8HZzLBBiZE3xLoRvqYhqoV83ije';

let wfsServiceUrl = 'https://api.os.uk/features/v1/wfs',
    tileServiceUrl = 'https://api.os.uk/maps/raster/v1/zxy';

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
    center: [-0.1241096, 51.6098585],
    zoom: 15,
    transformRequest: url => {
        if (! /[?&]key=/.test(url)) url += '?key=' + API_KEY
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

function addStreetsLayer(features, id, color, width) {
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
            'line-width': width,
            'line-color': color
        }
    });
}

async function fetchRoads(roads){
    let totalArray = [];
    for (let i = 0; i < roads.length; i++) {
        totalArray.push(await getFeatures('Highways_Roadlink', roads[i]))
    }
    return totalArray
}

function convertAndMerge(array){
    let convertedArrayCoords = array.map(x => convertLineStringCoords(x));
    let mergedArrayCoords = [].concat(...convertedArrayCoords);
    return mergedArrayCoords;
}

// Add event which waits for the map to be loaded.
map.on('load', async function () {

    map.on('click', function (e) {


        let bounds = map.getBounds();

        let x = bounds.getSouthWest().lat + ',' + bounds.getSouthWest().lng,
            y = bounds.getNorthEast().lat + ',' + bounds.getNorthEast().lng;

        let z = x + ' ' + y;
        console.log(JSON.stringify(e.lngLat.wrap()))
    });

    let roads = ['Westbury Road', 'Brownlow Road', 'Elvendon Road', "Goring Road", "Beech Road",
        "Hardwicke Road", "Natal Road", "York Road", "Warwick Road", "Highworth Road",
        "Stanley Road", "Ollerton Road", "Evesham Road", "Shrewsbury Road", "Maidstone Road",
        "Teweskbury Terrace", "Russell Road", "Whittington Road", "Palmerston Road"]

    let trafficRoadsArray = ['Bounds Green Road', 'Bowes Road', "Green Lanes", "High Road", "Telford Road", 
                            "Durnsford Road", "Powys Lane", "Wilmer Way"]

    
    let trafficRoads = await fetchRoads(trafficRoadsArray)
    let mergedTrafficRoads = convertAndMerge(trafficRoads)
   
    let brownlow = await getFeatures('Highways_Roadlink', 'Brownlow Road');

    let bannedStreets = [[brownlow[1]], [brownlow[5]], [brownlow[7]], [brownlow[15]], [brownlow[16]]]
    let mergedBannedStreets = convertAndMerge(bannedStreets);
 
    let allowedStreets = await fetchRoads(roads);
    console.log(allowedStreets)
    let mergedAllowedStreets = convertAndMerge(allowedStreets);


    addStreetsLayer(mergedAllowedStreets, 'allowed-streets', '#00ab66', 5)
    addStreetsLayer(mergedBannedStreets, 'banned-streets', '#FFA500', 10)
    addStreetsLayer(mergedTrafficRoads, 'traffic-streets', '#F00', 10)
    



    // Get the visible map bounds (BBOX).
    let bounds = map.getBounds();

    function click(id) {
        // When a click event occurs on a feature in the 'streets' layer, open a popup at
        // the location of the click, with description HTML from its properties.
        map.on('click', id, function (e) {

            let bounds = map.getBounds();

            let x = bounds.getSouthWest().lat + ',' + bounds.getSouthWest().lng,
                y = bounds.getNorthEast().lat + ',' + bounds.getNorthEast().lng;

            let z = x + ' ' + y;

            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(e.features[0].properties.RoadName1 + ' '+ e.features[0].properties.RoadClassification )
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
    click('traffic-streets')
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
    let sw = [51.59536880893367, -0.13772922026373635],
        ne = [51.61765036734033, -0.08604524597762975];

    let coords = sw + ' ' + ne;
    // Create an OGC XML filter parameter value which will select the Airport
    // features (site function) intersecting the BBOX coordinates.
    let xml = '<ogc:Filter>';
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
    let encodedParameters = Object.keys(params)
        .map(paramName => paramName + '=' + encodeURI(params[paramName]))
        .join('&');

    return wfsServiceUrl + '?' + encodedParameters;
}
