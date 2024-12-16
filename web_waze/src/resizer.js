



export function setupResizer(sidebarId, resizerId, mapId, minWidth=200, maxWidth=800) {
  const sidebar = document.getElementById(sidebarId);
  const resizer = document.getElementById(resizerId);
  const mapElement = document.getElementById(mapId);
  const calendarEl = document.getElementById('calendar');
  let isResizing = false;
  // create event listeners


  
  function resizeSidebar(e) {
    const newWidth = e.clientX;
    if (newWidth > minWidth && newWidth < maxWidth) { // Limiter la largeur minimale et maximale
      sidebar.style.width = newWidth - 20 + 'px';
      resizer.style.left = newWidth + 'px';
      map.style.left = (newWidth + 5) + 'px'; // Ajuster la position de la carte
      map.style.width = `calc(100% - ${newWidth + 5}px)`; // Adapter la largeur de la carte
      //update calendar
      const calendarInstance = calendarEl.fullCalendarInstance;
      if (calendarInstance) {
        calendarInstance.updateSize();
        calendarInstance.render();
      }
    }
  }

  function stopResize() {
    document.removeEventListener('mousemove', resizeSidebar);
    document.removeEventListener('mouseup', stopResize);
  }

  resizer.addEventListener('mousedown', function (e) {
    e.preventDefault();
    
    document.addEventListener('mousemove', resizeSidebar);
    document.addEventListener('mouseup', stopResize);
  });
} 
