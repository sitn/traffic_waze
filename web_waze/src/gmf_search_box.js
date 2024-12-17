import { fromLonLat } from 'ol/proj';
import GeoJSON from 'ol/format/GeoJSON';

import 'jquery-ui-dist/jquery-ui.css';
import 'jquery-ui-dist/jquery-ui.js';



export function initializeAutocomplete(map) {
    // Use jQuery autocomplete
    $("#places").autocomplete({
        classes: {
            "ui-autocomplete": "sitn-autocomplete",
        },
        source: (request, response) => {
            // Fetch data from the SITN API
            fetch(`https://sitn.ne.ch/search?query=${encodeURIComponent(request.term)}&limit=20&partitionlimit=24`)
                .then((res) => res.json())
                .then((data) => {
                    const features = data.features.map((f) => ({
                        geom: f.geometry,
                        id: f.id,
                        label: f.properties.label,
                        feature: f,
                    }));
                    response(features);
                })
                .catch((err) => {
                    console.error("Error fetching autocomplete data:", err);
                    response([]); // Return an empty array if there's an error
                });
        },
        select: (event, ui) => {
            let coord;

            if (ui.item.geom.type === 'Point') {
                coord = ui.item.geom.coordinates; // Directly use point coordinates
            } else {
                // Handle other geometry types by calculating the center of the extent
                const geojson = new GeoJSON();
                const feature = geojson.readFeature(ui.item.feature);
                const extent = feature.getGeometry().getExtent();
                coord = [
                    (extent[0] + extent[2]) / 2, // Center longitude
                    (extent[1] + extent[3]) / 2, // Center latitude
                ];
            }

            // Center and zoom the map to the selected location
            const view = map.getView();
            view.centerOn(coord, map.getSize(), [map.getSize()[0] / 2, map.getSize()[1] / 2]);
            view.setZoom(10); // Adjust zoom level as needed
        },
    });
}
