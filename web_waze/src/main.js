import './jquery-global.js';
import { initializeMap, define_layers, createLegend} from './map.js';

import { updateStatistics } from './sidebar.js';
import { setupResizer } from './resizer.js';
import { setupCalendar } from './calendar.js';
import { create_overlay, selecta } from './popup.js';
import { create_histogram } from './histogram.js';
import { initializeAutocomplete } from './gmf_search_box.js';



const urls = ['/src/data/jams_agg.geojson', 
  'https://sitn.ne.ch/services/wmts?SERVICE=WMTS&REQUEST=GetCapabilities'];

setupResizer('sidebar', 'resizer', 'map');


// Fetch data and update stats
Promise.all(urls.map(url => fetch(url))).then(responses => define_layers(responses)).then(([jams_layer, fond_plan]) => {
    const map = initializeMap('map', [fond_plan, jams_layer]);
    createLegend(map);
    initializeAutocomplete(map);

  	const features = jams_layer.getSource().getFeatures();
    const initialLength = features.length;
    const overlay = create_overlay(map);
    const calendarInstance = setupCalendar(features);
    updateStatistics(features);
    create_histogram(features, initialLength);

    const updateMapDisplay = () => {
      const filteredFeatures = calendarInstance.getFilteredData();
      if (filteredFeatures) {
          jams_layer.getSource().clear();
          jams_layer.getSource().addFeatures(filteredFeatures); 
          overlay.setPosition(undefined); 
          document.getElementById('troncon').innerText = '';

      }
    };

    // Watch for calendar changes
    calendarInstance.calendar.on('datesSet', updateMapDisplay);
    calendarInstance.calendar.on('dateClick', updateMapDisplay);

    map.on('click', (event) => selecta(event, overlay, map, calendarInstance));
});

