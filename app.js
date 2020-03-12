const express = require('express')
const path = require('path')

const app = express()
const indexRouter = require('./routes/index')

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))
app.use('/', indexRouter)

const WebSocket = require('ws')
const wss = new WebSocket.Server({ port: 4000 })
let data = []
wss.on('connection', connection = ws => {
  ws.on('message', incoming = message => {
    data.push(JSON.parse(message))
    console.log(data)
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  })
})

module.exports = app
