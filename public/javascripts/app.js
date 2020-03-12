window.onload = () => {
  
}

document.addEventListener('DOMContentLoaded', () => {
  let calendarEl = document.getElementById('calendar')
  let calendar = new FullCalendar.Calendar(calendarEl, {
    timeZone: 'Asia/Taipei',
    plugins: [ 'list' ],
    defaultView: 'listWeek'
  })
  calendar.render()
  const socketProtocol = (window.location.protocol === 'https:' ? 'wss:' : 'ws:')
  const echoSocketUrl = `${socketProtocol}//${window.location.hostname}:4000/echo/`
  const socket = new WebSocket(echoSocketUrl)
  socket.onopen = () => {
    console.log("Success")
  }
  socket.onmessage = (msg) => {
    event = JSON.parse(msg.data)
    calendar.addEvent(event)
  }
})