import Overlay from 'ol/Overlay';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import { updateStatistics } from './sidebar';
import { create_histogram } from './histogram';






const styleByLevel = (feature) => {
  const level = feature.get('lastingms') / 60000;

  let color = '#000000';
  if (level < 1) {
    color = '#fff5f0';
  } else if (level >= 1 & level < 5) {
    color = '#fcbea5';
  } else if (level >= 5 & level < 15) {
    color = '#fb7050';
  } else if (level >= 15 & level < 30) {
    color = '#d32020';
  } else if (level >= 30) {
    color = '#67000d';
  }
  
  return new Style({
    fill: new Fill({
      color: color,
    }),
    stroke: new Stroke({
      color: color,
      width: 2,
    }),
  });
}


const highlightStyle = new Style({
stroke : new Stroke({
    color: 'rgba(0,255,0,0.4)',
    width: 2,
}),
fill : new Fill({
    color: 'rgba(0,0,255,1)',
}),
});

let filteredData = [];

const clickTolerance = 20;

export function create_overlay(map) {
    // Add a popup overlay to the map
    const popup = document.createElement('div');
    // set id 
    popup.id = 'popup';
    popup.className = 'ol-popup';

    document.body.appendChild(popup);


    const overlay = new Overlay({
        element:popup, 
        positioning: 'bottom-center',
        stopEvent: true,
        offset: [0, -10],
    })
    map.addOverlay(overlay);

    popup.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    return overlay;
}

export function selecta(event, overlay, map, calendar) {

    // Handles popup overlay and feature highlighting
    overlay.setPosition(undefined); // Close any open popups

    let tableHTML = `
      <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
              <tr>
                  <th style="border: 1px solid #ddd; padding: 8px;">Vitesse (km/h)</th>
                  <th style="border: 1px solid #ddd; padding: 8px;">Délai (s)</th>
                  <th style="border: 1px solid #ddd; padding: 8px;">Longueur (m)</th>
                  <th style="border: 1px solid #ddd; padding: 8px;">Niveau</th>
                  <th style="border: 1px solid #ddd; padding: 8px;">Date</th>
              </tr>
          </thead>
      <tbody>
    `;

    filteredData.forEach(f => f.setStyle(styleByLevel));
    filteredData = [];
    

    let count = 0;

    let speed_mean_seg = 0;
    let delay_mean_seg = 0;
    let length_mean_seg = 0;
    let level_mean_seg = 0;

    let contents = [];
    let contents_sidebar = [];




    map.forEachFeatureAtPixel(event.pixel, (feature) => {
        const properties = feature.getProperties();
        if (count == 0) {
        contents.push(`<strong>${feature.get("street")}, ${feature.get('city')}<br></strong>`);
        // contents_sidebar.push(`<strong>${feature.get("street")}, ${feature.get('city')}<br></strong>`);
        // contents_sidebar.push('Speed kmh /\t/ Delay s /\t/ Length m /\t/ Level /\t/ Date <br>');
        }
        count += 1;

        speed_mean_seg += feature.get('mean_speedkmh');
        delay_mean_seg += feature.get('mean_delay');
        length_mean_seg += feature.get('mean_length');
        level_mean_seg += feature.get('mean_level');


        // Set popup content and position
        //contents.push(`${JSON.stringify(properties, [ 'mean_speedkmh', 'mean_delay', 'mean_length', 'mean_level', 'pubdate'], 2)}<br>`);
        let time = new Date(feature.get('pubdate')).toLocaleString();
        tableHTML += `
          <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${feature.get('mean_speedkmh').toFixed(1)}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${feature.get('mean_delay').toFixed(1)}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${feature.get('mean_length').toFixed(1)}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${feature.get('mean_level').toFixed(1)}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${time}</td>
          </tr>
        `;
        
        //contents_sidebar.push(`${feature.get('mean_speedkmh').toFixed(2)} km/h /\t/ ${feature.get('mean_delay')}  /\t/ ${feature.get('mean_length')} m /\t/ ${feature.get('mean_level')} /\t/ ${time}<br>`);
        overlay.setPosition(feature.getGeometry().getCoordinates()[0]);
        


        // Highlight the selected feature
        feature.setStyle(highlightStyle);

        filteredData.push(feature);

    }, {hitTolerance: clickTolerance});


    if (filteredData.length != 0) {
        updateStatistics(filteredData);
        create_histogram(filteredData);
        document.getElementById('troncon').innerText = filteredData[0].get('street') + ', ' + filteredData[0].get('city') ;
      }
    else {
        document.getElementById('troncon').innerText = '';
        updateStatistics(calendar.getFilteredData());
        create_histogram(calendar.getFilteredData(), 1);
    }

    speed_mean_seg = speed_mean_seg / count;
    delay_mean_seg = delay_mean_seg / count;
    length_mean_seg = length_mean_seg / count;
    level_mean_seg = level_mean_seg / count;
    
    contents.push(`Moyenne des ralentissements sur le segment sélectionné<br>`);
    contents.push(`Vitesse moyenne: ${speed_mean_seg.toFixed(2)} km/h<br>`);
    contents.push(`Retard estimé: ${delay_mean_seg.toFixed(2)} s<br>`);
    contents.push(`Longueur segment maximale: ${length_mean_seg.toFixed(2)} m<br>`);
    //contents.push(`Type de gravité: ${level_mean_seg.toFixed(2)}<br>`);
    contents.push(`Nombre d'événements: ${count}<br>`);
    contents.push('<br>');
    contents = contents.join('');

    tableHTML += '</tbody></table>';
    contents_sidebar.push(tableHTML);
    
    contents_sidebar = contents_sidebar.join('');


    popup.innerHTML = `
    <div>
        ${contents}
        <button id="toggle-events">Afficher les évènements</button>
        <div id="event-list" style="display: none; max-height: 200px; overflow-y: auto;">
            ${contents_sidebar}
        </div>
    </div>
    `;
    
    //popup.innerHTML = contents;

    let event_list = document.getElementById('event-list');
    let toggle_button = document.getElementById('toggle-events');

    event_list.innerHTML = contents_sidebar;

    toggle_button.addEventListener('click', (e) => {
        e.stopPropagation();
        if (event_list.style.display === 'none') {
            event_list.style.display = 'block';
            toggle_button.innerHTML = 'Cacher les évènements';
        } else {
            event_list.style.display = 'none';
            toggle_button.innerHTML = 'Afficher les évènements';
        }
    });


    };

