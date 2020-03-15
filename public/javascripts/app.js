let Calendar = document.getElementById('calendar')

const socketProtocol = (window.location.protocol === 'https:' ? 'wss:' : 'ws:')
const echoSocketUrl = `${socketProtocol}//${window.location.hostname}/echo/`
const socket = new WebSocket(echoSocketUrl)

let items = []
let tags = []
let subject = []
let db

const nav = document.getElementById('nav')

const pad = (n) => {
  if (n < 10) {
    return `0${n}`
  } else {
    return n
  }
}

let today = new Date();
let dd = pad(today.getDate())
let mm = pad(today.getMonth()+1)
let yyyy = today.getFullYear()
today = new Date(`${yyyy}-${mm}-${dd} 00:00:00`).getTime()
let range = [today, today+86400000]

const dateToString = (time, weekday=false) => {
  let date = new Date(time)
  if (weekday) {
    let formater = new Intl.DateTimeFormat('zh', {weekday: "long"}).format.bind()
    return `${date.getMonth()+1}/${date.getDate()} ${formater(date)}`
  }
  return `${date.getMonth()+1}/${date.getDate()}`
}

const getTagsByid = (id) => {
  let result = tags.filter(tag => {
    return tag.id == id
  })
  return result[0]
}

const getSubjectByid = (id) => {
  let result = subject.filter(s => {
    return s.id == id
  })
  return result[0].name
}

const generateItem = (id, title, time, subject, tags) => {
  let card = document.createElement('div')
  card.classList.add('item_card')
  card.setAttribute('id', `card${id}`)

  let left_block = document.createElement('div')
  left_block.classList.add('left_block')

  let titleElem = document.createElement('p')
  titleElem.classList.add('item_title')
  titleElem.setAttribute('id', `title${id}`)
  titleElem.innerHTML = title

  let subjectElem = document.createElement('span')
  subjectElem.innerHTML = getSubjectByid(subject)

  let tagsElem = document.createElement('span')
  tagsElem.classList.add('tags')
  let dot = document.createElement('span')
  dot.classList.add('tags')
  tags = getTagsByid(tags)
  dot.innerText = tags.name
  tagsElem.appendChild(dot)

  left_block.appendChild(titleElem)
  left_block.appendChild(subjectElem)
  left_block.appendChild(tagsElem)
  
  let icons_group = document.createElement('div')
  icons_group.classList.add('icon_group')
  
  let icon = document.createElement('span')
  icon.classList.add('iconify')
  icon.setAttribute('data-icon', 'mdi-bell-ring-outline')
  icon.setAttribute('data-inline', 'false')
  icon.setAttribute('id', `checkbox${id}`)
  icons_group.appendChild(icon)

  icons_group.addEventListener('click', e => {
    if (window.Notification) {
      Notification.requestPermission(status => {
        console.log('Status of the request:', status);
      })
    }
  })

  card.setAttribute('style', `border-left: 5px solid ${tags.color};`)
  card.append(left_block)
  card.append(icons_group)

  return card
}

const initDB = () => {
  window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
  window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
  if (!window.indexedDB) {
    console.log("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.")
    return
  }
  let request = window.indexedDB.open("hwList")
  request.onerror = event => {
    // Do nothing with request.errorCode!
  }
  request.onsuccess = event => {
    db = request.result
    db.onerror = event => {
      console.log("Database error: " + event.target.errorCode)
    }
  }
  request.onupgradeneeded = event => {
    db = event.target.result
    let objectStore = db.createObjectStore("lists", { keyPath: "id" })
    objectStore.createIndex("id", "id", { unique: true })
    objectStore.createIndex("subject", "subject")
    objectStore.createIndex("tags", "tags")
    objectStore.createIndex("time", "time")

    objectStore = db.createObjectStore("tags", { keyPath: "id" })
    objectStore.createIndex("id", "id", { unique: true })
    objectStore.createIndex("name", "name")
    objectStore.createIndex("color", "color")

    objectStore = db.createObjectStore("subject", { keyPath: "id" })
    objectStore.createIndex("id", "id", { unique: true })
    objectStore.createIndex("name", "name")
  }
}

const addItemInDB = (item) => {
  let request = db.transaction('lists', 'readwrite').objectStore('lists').put(item)
  request.onerror = event => {
    console.log(event)
  }
}

const getDBData = () => {
  let request = db.transaction('lists', 'readwrite').objectStore('lists').openCursor()
  request.onsuccess = event => {
    let cursor = event.target.result
    if (cursor && cursor.value) {
      items.push(cursor.value)
      cursor.continue()
    }
  }

  request = db.transaction('tags', 'readwrite').objectStore('tags').openCursor()
  request.onsuccess = event => {
    let cursor = event.target.result
    if (cursor && cursor.value) {
      tags.push(cursor.value)
      cursor.continue()
    }
  }

  request = db.transaction('subject', 'readwrite').objectStore('subject').openCursor()
  request.onsuccess = event => {
    let cursor = event.target.result
    if (cursor && cursor.value) {
      subject.push(cursor.value)
      cursor.continue()
    }
  }
}

const render = () => {
  Calendar.innerHTML = ""
  let min = range[0]
  let max = range[1]
  if (max === 0) {
    max = 9999999999999
  }
  items = items.sort((a, b) => {
    return a.time - b.time
  })
  let filtered = items.filter(item => {
    return item.time <= max && item.time >= min
  })
  if (filtered.length === 0) {
    let nothing = document.createElement('p')
    nothing.classList.add('nothing')
    nothing.innerText = "Nothing."
    Calendar.appendChild(nothing)
    return
  }
  let dateTitle = ""
  filtered.map(item => {
    addItemInDB(item)
    dT = dateToString(item.time, true)
    if (dT !== dateTitle) {
      let titleElem = document.createElement('p')
      titleElem.classList.add('dateTitle')
      titleElem.innerText = dT
      Calendar.appendChild(titleElem)
      dateTitle = dT
    }
    Calendar.appendChild(generateItem(item.id, item.title, item.time, item.subject, item.tags))
  })
}

const initNav = () => {
  let inactive = () => {
    Calendar.classList.add('active')
    document.getElementById('add').classList.remove('active')
    Array.from(nav.children).forEach(elem => {
      elem.classList.remove('active')
    })
  }
  document.getElementById('today').addEventListener('click', e => {
    inactive()
    e.srcElement.classList.add('active')
    range = [today, today+86400000]
    render()
  })

  document.getElementById('tomorrow').addEventListener('click', e => {
    inactive()
    e.srcElement.classList.add('active')
    Calendar.innerHTML = ""
    range = [today+86400000, today+2*86400000]
    render()
  })

  document.getElementById('all').addEventListener('click', e => {
    inactive()
    e.srcElement.classList.add('active')
    Calendar.innerHTML = ""
    range = [today, 0]
    render()
  })

  document.getElementById('show_add').addEventListener('click', () => {
    Calendar.classList.remove('active')
    document.getElementById('add').classList.add('active')
    document.getElementById('add_subject').innerHTML = ""
    subject.map(s => {
      let option = document.createElement('option')
      option.value = s.id
      option.innerText = s.name
      document.getElementById('add_subject').appendChild(option)
    })

    document.getElementById('add_tags').innerHTML = ""
    tags.map(tag => {
      let option = document.createElement('option')
      option.value = tag.id
      option.innerText = tag.name
      document.getElementById('add_tags').appendChild(option)
    })
  })
}

const initWS = () => {
  initDB()
  socket.onopen = () => {
    socket.send(JSON.stringify({methods: "gettags"}))
    socket.send(JSON.stringify({methods: "getsubject"}))
    socket.send(JSON.stringify({methods: "get"}))
    console.log("Success")
  }
  socket.onmessage = (msg) => {
    initDB()
    event = JSON.parse(msg.data)
    console.log(event)
    if (event.type === "all") {
      items = event.data
      render()
    } else if (event.type === "update") {
      items.push(event.data)
      render()
    } else if (event.type === "tags") {
      tags = event.data
      // Save in db
      tags.map(tag => {
        let request = db.transaction('tags', 'readwrite').objectStore('tags').put(tag)
        request.onerror = event => {
          console.log(event)
        }
      })
    } else if (event.type === "subject") {
      subject = event.data
      // Save in db
      subject.map(s => {
        let request = db.transaction('subject', 'readwrite').objectStore('subject').put(s)
        request.onerror = event => {
          console.log(event)
        }
      })
    }
  }
  socket.onerror = event => {
    getDBData()
  }
}

const addItem = () => {
  const title = document.getElementById('add_title').value
  const time = document.getElementById('add_time').value
  const subject = document.getElementById('add_subject').value
  const key = document.getElementById('add_key').value
  const tags = document.getElementById('add_tags').value
  socket.send(JSON.stringify(
    {
      methods: "add",
      title: title,
      time: time,
      subject: subject,
      tags: [tags],
      key: key
    }
  ))
}

document.addEventListener('DOMContentLoaded', () => {
  initWS()
  initNav()
})

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}
