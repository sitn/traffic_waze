import Map from 'ol/Map.js';
import View from 'ol/View.js';
import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';
import { getCenter } from 'ol/extent.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import VectorSource from 'ol/source/Vector.js';
import VectorLayer from 'ol/layer/Vector';
import {Tile as TileLayer} from 'ol/layer.js';
import WMTS, {optionsFromCapabilities} from 'ol/source/WMTS.js';
import WMTSCapabilities from 'ol/format/WMTSCapabilities.js';
import { Projection } from 'ol/proj';

 
import Style from 'ol/style/Style.js';
import Stroke from 'ol/style/Stroke.js';
import Fill from 'ol/style/Fill.js';




const extent = [2485071, 1074261,  2837119, 1299941]; //  CH
const EXTENT_NE = [2522857, 1186216, 2575049, 1225789]; // SITN
const CRS = 'EPSG:2056';

proj4.defs(CRS, '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs') 
register(proj4)


const legendData = [
  { label: '< 1 minute', color: '#fff5f0' },
  { label: '1 - 5 minutes', color: '#fcbea5' },
  { label: '5 - 15 minutes', color: '#fb7050' },
  { label: '15 - 30 minutes', color: '#d32020' },
  { label: '> 60 minutes', color: '#67000d' },
];

export function createLegend(map) {
  // Create a container for the legend
  const legend = document.createElement('div');
  legend.id = 'map-legend';
  legend.style.position = 'absolute';
  legend.style.bottom = '10px';
  legend.style.left = '10px';
  legend.style.backgroundColor = 'white';
  legend.style.padding = '10px';
  legend.style.border = '1px solid #ccc';
  legend.style.borderRadius = '5px';
  legend.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.2)';
  legend.style.fontSize = '12px';
  legend.style.zIndex = '1000';

  // Add a title to the legend
  legend.innerHTML = `<strong>Legend</strong><br>`;

  // Add each legend item
  legendData.forEach(item => {
      const legendItem = document.createElement('div');
      legendItem.style.display = 'flex';
      legendItem.style.alignItems = 'center';
      legendItem.style.marginBottom = '5px';

      // Color box
      const colorBox = document.createElement('span');
      colorBox.style.display = 'inline-block';
      colorBox.style.width = '15px';
      colorBox.style.height = '15px';
      colorBox.style.backgroundColor = item.color;
      colorBox.style.marginRight = '5px';
      colorBox.style.border = '1px solid #000';

      // Label
      const label = document.createElement('span');
      label.textContent = item.label;

      legendItem.appendChild(colorBox);
      legendItem.appendChild(label);

      legend.appendChild(legendItem);
  });

  // Add the legend to the map container
  map.getTargetElement().appendChild(legend);
}

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




export async function define_layers(responses) {
    const jams = await responses[0].json()
    const text = await responses[1].text()
    const source_wmts = new WMTS(
      optionsFromCapabilities(
        new WMTSCapabilities().read(text),
          {layer: 'plan_ville_gris', matrixSet: 'EPSG:2056'}
      ),
    );
    source_wmts.setAttributions('<a target = "new" href="https://www.ne.ch/sitn">SITN</a>');

    const fond_plan = new TileLayer({
      source: source_wmts,
    });

    const source_jams = new VectorSource({
      features: new GeoJSON().readFeatures(jams),
      });

      source_jams.setAttributions('<br /><a href="https://support.google.com/waze/partners/answer/10618035?hl=fr">Waze</a>');

    const jams_layer = new VectorLayer({
      source: source_jams,
      style: styleByLevel,
    });
    
    return [jams_layer, fond_plan];
}

export function initializeMap(target, layers) {
  return new Map({
    target: target,
    layers: layers,
    view: new View({
      extent: extent,
      center: getCenter(EXTENT_NE),
      zoom: 3,
      projection: new Projection({
        code: CRS,
        extent: EXTENT_NE,
        units: 'm',
      }),
    }),
  });
}
