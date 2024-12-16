import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

const CHART_ID = "event-histogram"
const CHART_ID_TIME = "time-histogram"

export function create_histogram(features, nb_events = 0) {
    // Prepare histogram data
    const dateCounts = {};
    const timeCounts = {};
    features.forEach((feature) => {
        const pubDate = new Date(feature.get('pubdate')).toISOString().split('T')[0];
        const pubTime = new Date(feature.get('pubdate')).toISOString().split('T')[1].split('.')[0].split(':')[0] + 'h';
        dateCounts[pubDate] = (dateCounts[pubDate] || 0) + 1;
        timeCounts[pubTime] = (timeCounts[pubTime] || 0) + 1;
    });

    const labels = Object.keys(dateCounts).sort();
    const counts = labels.map((date) => dateCounts[date]);

    const timeCounts_ord = Object.keys(timeCounts).sort().reduce(
        (obj, key) => { 
          obj[key] = timeCounts[key]; 
          return obj;
        }, 
        {}
      );
    

    const labels_time = Object.keys(timeCounts_ord).filter(el => el !== undefined);
    const counts_time = Object.values(timeCounts_ord);

    if(Chart.getChart(CHART_ID)) {
        Chart.getChart(CHART_ID).destroy()
    }

    if(Chart.getChart(CHART_ID_TIME)) {
        Chart.getChart(CHART_ID_TIME).destroy()
    }

    if (nb_events === 0) {
        let street = features[0].get('street');
        if (street === '') {
            street = features[0].get('city');
        }
        document.getElementById('histogram-title').innerText = `Nombre de ralentissements sur ${street} `;
    }
    else {
        document.getElementById('histogram-title').innerText = `Nombre de ralentissements `;
    }

    new Chart(document.getElementById(CHART_ID).getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: "Nombre de ralentissements",
                data: counts,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            }],
        },
        options: {
            responsive: true,
            scales: {
            x: {
                title: { display: true, text: 'Occurrences' },
            },
            y: {
                title: { display: true, text: 'Date' },
                type: 'time',
                time: {
                    unit: 'day',
                    displayFormats: {
                        day: 'MMM d'
                    }
                },
                reverse: true,
            },
            },
            indexAxis: 'y',
        },
    });
    
    new Chart(document.getElementById(CHART_ID_TIME).getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels_time.filter(el => el !== undefined),
            datasets: [{
                label: "Nombre de ralentissements",
                data: counts_time,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            }],
        },
        options: {
            responsive: true,
            scales: {
            x: {
                title: { display: true, text: 'Occurrences' },
            },
            y: {
                title: { display: true, text: 'Heure' },
                reverse: true,
            },
            },
            indexAxis: 'y',
        },
    });
}
