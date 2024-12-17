// Initialiser le calendrier
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { updateStatistics } from './sidebar.js';
import { create_histogram } from './histogram.js';
import { addDays } from 'date-fns';



export function setupCalendar(data) {
    const calendarEl = document.getElementById('calendar');

    let startDate = null;
    let hoveredEndDate = null;
    let calendar = null
    let filteredData = data;

    const clearSelection = (calendar) => {
        startDate = null;
        hoveredEndDate = null;
        calendar.unselect();
    }
  

    const max_date = Math.max.apply(null, data.map((feature) => new Date(feature.get('pubdate'))));
    const min_date = Math.min.apply(null, data.map((feature) => new Date(feature.get('pubdate'))));
    document.getElementById('date').innerText = `From ${new Date(min_date).toLocaleDateString()} to ${new Date(max_date).toLocaleDateString()}`;

    calendar = new Calendar(calendarEl, {
        plugins: [dayGridPlugin, interactionPlugin, listPlugin], 
        initialView: 'dayGridMonth',
        headerToolbar: {
          left: 'prev,next customButton', 
          center: 'title',
          right: 'dayGridMonth dayGridYear', 
        },
        customButtons: {
          customButton: {
            text: 'Reset',
            click: () => {
              updateStatistics(data);
              create_histogram(data, 1); 
              document.getElementById('troncon').innerText = '';
              filteredData = filterDataByInterval(data, min_date, max_date); 
              document.getElementById('date').innerText = `From ${new Date(min_date).toLocaleDateString()} to ${new Date(max_date).toLocaleDateString()}`;
              calendar.today();
              return filteredData; 
            },
          },
        },
        selectable: true, // Disable drag-to-select
        select : () => {},
        dateClick: (info) => {
          if (!startDate) {
            // First click sets the start date
            startDate = info.dateStr;
          } else {
            // Second click sets the end date
            let endDate = info.dateStr;
    
            // Validate the interval
            if (new Date(startDate) > new Date(endDate)) {
              let tmp = startDate;
              startDate = endDate;
              endDate = tmp;
              return;
            } else if (new Date(startDate) <= new Date(min_date) || 
                new Date(endDate) >= new Date(max_date)) {
                alert('The selected interval is out of range. Please try again.');
                startDate = null;
                return
            }
    

            document.getElementById('date').innerText = `From ${startDate} to ${endDate}`;
    
            // Finalize the interval
            filteredData = filterDataByInterval(data, startDate, endDate);
            updateStatistics(filteredData);
            create_histogram(filteredData, 1);
    
            // Clear the interval highlight
            clearSelection(calendar);
          }
        },
        datesSet: () => {
            clearSelection(calendar);
        }
    });

    
    calendar.render();
    calendarEl.addEventListener('mouseover', (event) => {
        const cell = event.target.closest('.fc-daygrid-day');
        if (cell && startDate) {
            hoveredEndDate = cell.getAttribute('data-date');
            highlightRange(calendar, startDate, hoveredEndDate);
        }
    });
    calendarEl.fullCalendarInstance = calendar;

    return {calendar, getFilteredData: () => filteredData};
  };


// Filtrer les données par date
export function filterDataByInterval(data, startDate, endDate) {
    return data.filter((feature) => {
      const jamDate = new Date(feature.get('pubdate')); // Adapter la clé selon vos données
      return jamDate >= new Date(startDate) && jamDate <= new Date(endDate).setDate(new Date(endDate).getDate() + 1);
    });
}

// Highlight the range between startDate and hoveredEndDate
function highlightRange(calendar, startDate, hoveredEndDate) {
    if (!startDate || !hoveredEndDate) return;
    // add 1 day to hoveredEndDate to include it in the range

    const start = new Date(startDate);
    const end = new Date(hoveredEndDate) ;

    calendar.select({
      start: startDate,
      end: end,
    });
}
  
  