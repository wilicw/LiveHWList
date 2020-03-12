const express = require('express')
const path = require('path')

const app = express()
const indexRouter = require('./routes/index')

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))
app.use('/', indexRouter)

const WebSocket = require('ws')
const wsport = process.env.WSPORT ? process.env.WSPORT : 27017

const wss = new WebSocket.Server({ port: wsport })

wss.on('connection', connection = ws => {
  ws.on('message', incoming = message => {
    console.log(data)
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  })
})

module.exports = app
