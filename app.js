const express = require('express')
const path = require('path')

const app = express()
const indexRouter = require('./routes/index')

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))
app.use('/', indexRouter)

const md5 = require('js-md5')

const sqlite3 = require('sqlite3').verbose()
let db = new sqlite3.Database('./data.db', (err) => {
  if (err) {
    console.error(err.message)
  }
  console.log('Connected to the chinook database.')
})

const WebSocket = require('ws')
const wsport = process.env.WSPORT ? process.env.WSPORT : 4000

const wss = new WebSocket.Server({ port: wsport })

wss.on('connection', connection = ws => {
  ws.on('message', incoming = message => {
    let data = JSON.parse(message)
    console.log(data)
    if (data.methods === "add") {
      const title = data.title
      const time = new Date(data.time).getTime()
      const key = String(md5(data.key))
      const subject = data.subject
      const tags = data.tags.join(",")
      db.serialize(() => {
        db.each(`SELECT * from admins where key LIKE "${key}"`, (err, row) => {
          if (err) {
            return console.error(err)
          }
          let admin = row.name
          console.log(admin)
          let stmt = db.prepare(`INSERT INTO lists ('title', 'subject', 'tags', 'time', 'admin') VALUES (?,?,?,?,?)`)
          stmt.run(title, subject, tags, time, admin, (err) => {
            console.log(err)            
          })
          ws.send(200)
          wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
              let data = {
                type: "update",
                data: {
                  title: title,
                  time: time,
                  admin: admin,
                  tags: tags,
                  subject: subject
                }
              }
              client.send(JSON.stringify(data))
            }
          })
        })
      })
    } else if (data.methods === "get") {
      const pad = (n) => {
        if (n < 10) {
          return `0${n}`
        } else {
          return n
        }
      }
      let now = new Date()
      let time = `${now.getFullYear}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`
      time = new Date(time).getTime()
      db.serialize(() => {
        db.all(`SELECT * from lists where time >= ${time}`, (err, rows) => {
          let response = {
            type: "all",
            data: rows
          }
          ws.send(JSON.stringify(response))
        })
      })
    }
  })
})

module.exports = app
