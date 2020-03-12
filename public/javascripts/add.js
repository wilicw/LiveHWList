document.getElementById('submit').addEventListener('click', (e) => {
  let event = {
    title: '',
    start: ''
  }
  event.title = document.getElementById('title').value
  event.start = document.getElementById('date').value
  const socketProtocol = (window.location.protocol === 'https:' ? 'wss:' : 'ws:')
  const echoSocketUrl = `${socketProtocol}//${window.location.hostname}/echo/`
  const socket = new WebSocket(echoSocketUrl)
  socket.onopen = () => {
    console.log("Success")
    socket.send(JSON.stringify(event))
  }
})