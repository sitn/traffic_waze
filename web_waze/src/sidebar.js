export function updateStatistics(features) {
  const totalJams = features.length;
  const avgSpeed = calculateAverageSpeed(features);
  const avgDelay = calculateAverageDelay(features);
  document.getElementById('total-jams').innerText = totalJams;
  document.getElementById('avg-speed').innerText = `${avgSpeed} km/h`;
  document.getElementById('avg-delay').innerText = `${avgDelay} s`;
}

function calculateAverageSpeed(features) {
  const totalSpeed = features.reduce((sum, f) => sum + f.get('mean_speedkmh'), 0);
  return (totalSpeed / features.length).toFixed(2);
}

function calculateAverageDelay(features) {
  const totalDelay = features.reduce((sum, f) => sum + f.get('mean_delay'), 0);
  return (totalDelay / features.length).toFixed(2);
}

