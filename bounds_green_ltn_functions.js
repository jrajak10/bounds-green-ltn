export { addMapFeatures, addRoadsLayer, API_KEY }
import { RESIDENTIAL_ROAD_ISSUES, TRAFFIC_ROAD_ISSUES, ONE_WAY_ROAD_ISSUES, BROWNLOW_ROAD_ISSUES } from "./road_issues.js"

const API_KEY = '2RqLGYUE6yOw3yfoF2vw8dFQb3gkrD7R';
const WFS_SERVICE_URL = 'https://api.os.uk/features/v1/wfs';

function addMapFeatures(map) {
    map.dragRotate.disable(); // Disable map rotation using right click + drag.
    map.touchZoomRotate.disableRotation(); // Disable map rotation using touch rotation gesture.

    // Add navigation control (excluding compass button) to the map.
    map.addControl(new mapboxgl.NavigationControl({
        showCompass: false
    }));

    // Add event which waits for the map to be loaded.
    map.on('load', async function () {


        map.on('click', function (e) {


            let bounds = map.getBounds();

            let x = bounds.getSouthWest().lat + ',' + bounds.getSouthWest().lng,
                y = bounds.getNorthEast().lat + ',' + bounds.getNorthEast().lng;

            let z = x + ' ' + y;
            console.log(JSON.stringify(e.lngLat.wrap()))
        });

        let residentialRoadsArray = ['Westbury Road', 'Elvendon Road', "Goring Road", "Beech Road",
            "Hardwicke Road", "Natal Road", "York Road", "Warwick Road", "Highworth Road",
            "Stanley Road", "Ollerton Road", "Evesham Road", "Shrewsbury Road", "Maidstone Road",
            "Tewkesbury Terrace", "Russell Road", "Whittington Road", "Palmerston Road", "Eleanor Road", "Richmond Road",
            "Herbert Road", "Fletton Road"];

        let brownlowArray = ["Brownlow Road"];

        // Creating a separate array of OBJECTIDS on Albert Road but not on the main road 
        // to filter out.
        let albertIDstoFilter = [3398812, 3525624, 3525625, 3480230, 4633431, 4926347, 3377842, 3559461]

        let trafficRoadsArray = ['Bounds Green Road', 'Bowes Road', "Green Lanes", "High Road", "Telford Road",
            "Durnsford Road", "Albert Road", "Powys Lane", "Wilmer Way", "Pinkham Way", "North Circular Road"];

        let oneWayRoadsArray = ["Queens Road", 'Sidney Avenue', "Melbourne Avenue", "Kelvin Avenue", "Belsize Avenue", "Spencer Avenue"];

        let totalRoads = [].concat(residentialRoadsArray, trafficRoadsArray, oneWayRoadsArray, brownlowArray);
        let totalRoadFeatures = await getFeatures('Highways_Roadlink', totalRoads);
        
        let residentialRoads = await filterAndConvert(totalRoadFeatures, residentialRoadsArray);
        let trafficRoadFeatures = await filterAndConvert(totalRoadFeatures, trafficRoadsArray)
        let trafficRoads = trafficRoadFeatures
                            .filter(feature => !albertIDstoFilter.includes(feature.properties.OBJECTID));
        let oneWayRoads = await filterAndConvert(totalRoadFeatures, oneWayRoadsArray);
        let brownlowRoad = await filterAndConvert(totalRoadFeatures, brownlowArray);
        let roadGates = await fetchData('road_gates.json');

        addRoadsLayer(map, oneWayRoads, 'one-way-roads', '#084f9d', 5)
        addRoadsLayer(map, residentialRoads, 'residential-roads', '#FFBF00', 5)
        addRoadsLayer(map, brownlowRoad, 'brownlow-road', '#FFFF00', 10)
        addRoadsLayer(map, trafficRoads, 'traffic-roads', '#F00', 10)
        addRoadsLayer(map, roadGates, 'road-gates', '#000', 7.5)


        /**
     * 
     * @param {object} params
     */
        function click(id, issueObject) {
            // When a click event occurs on a feature in the 'roads' layer, open a popup at
            // the location of the click, with description HTML from its properties.
            map.on('click', id, function (e) {
                let html = "<h1>" + e.features[0].properties.RoadName1 + "</h1><p>" + 
                issueObject[e.features[0].properties.RoadName1] + "</p>"
                if (id === 'road-gates') {
                    html = e.features[0].properties.Name
                }
                new mapboxgl.Popup({maxWidth: "300px"})
                    .setLngLat(e.lngLat)
                    .setHTML(html)
                    .addTo(map);
            });
        }

        function mouseEnter(id) {
            // Change the cursor to a pointer when the mouse is over the 'roads' layer.
            map.on('mouseenter', id, function () {
                map.getCanvas().style.cursor = 'pointer';
            });
        }

        function mouseLeave(id) {
            // Change the cursor back to a pointer when it leaves the 'roads' layer.
            map.on('mouseleave', id, function () {
                map.getCanvas().style.cursor = '';
            });
        }

        click('residential-roads', RESIDENTIAL_ROAD_ISSUES);
        click('traffic-roads', TRAFFIC_ROAD_ISSUES);
        click('one-way-roads', ONE_WAY_ROAD_ISSUES);
        click('brownlow-road', BROWNLOW_ROAD_ISSUES);
        click('road-gates');
        mouseEnter('residential-roads');
        mouseEnter('traffic-roads');
        mouseEnter('one-way-roads');
        mouseEnter('brownlow-road');
        mouseEnter('road-gates');
        mouseLeave('residential-roads');
        mouseLeave('traffic-roads');
        mouseLeave('one-way-roads');
        mouseLeave('brownlow-road');
        mouseLeave('road-gates');
    });
}

/**
 * 
 * @param {array} params
 **/
function xmlRoadsFilter(totalRoads){
    let string = '';
    for(let i=0; i<totalRoads.length; i++){
        string += '<ogc:PropertyIsEqualTo>' +
        '<ogc:PropertyName>RoadName1</ogc:PropertyName>' +
        '<ogc:Literal>'+ totalRoads[i] +'</ogc:Literal>' +
        '</ogc:PropertyIsEqualTo>';
    }
    return string;
}

 /**
 * 
 * @param {array} params
 **/
async function filterRoads(totalRoadFeatures, array) {
    return totalRoadFeatures.filter(road => array.includes(road.properties.RoadName1))
}

/**
 * 
 * @param {array} params
 **/
function convertLineStringCoords(arr) {
    for (let i = 0; i < arr.length; i++) {
        arr[i].geometry.coordinates = arr[i].geometry.coordinates[0];
    }
    return arr;
}

/**
 * 
 * @param {array} params
 */
async function filterAndConvert(totalRoadFeatures, arr) {
    let roads = await filterRoads(totalRoadFeatures, arr);
    let convertedArray = convertLineStringCoords(roads);
    return convertedArray;
}

function addRoadsLayer(map, features, id, color, width) {
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

//fetches json data from json files
async function fetchData(data) {
    let fetchedData = await fetch(data);
    let json = await fetchedData.json();
    let features = json.features;
    return features
}



/**
 * Get features from the WFS.
 */
async function getFeatures(typeName, totalRoads) {
    // Convert the bounds to a formatted string.
    let sw = [51.59536880893367, -0.13772922026373635],
        ne = [51.61892429114269, -0.09636146493642173];

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
    xml += '<ogc:Or>';
    xml += xmlRoadsFilter(totalRoads);
    xml += '</ogc:Or>';
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
        let featureArray = await fetchData(featureUrl)
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

    return WFS_SERVICE_URL + '?' + encodedParameters;
}