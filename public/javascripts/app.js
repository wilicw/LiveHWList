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
  icons_group.setAttribute('id', `icon${id}`)
  icons_group.classList.add('icon_group')
  
  let icon = document.createElement('span')

  icon.classList.add('iconify')
  icon.setAttribute('data-icon', 'mdi-bell-ring-outline')
  icon.setAttribute('data-inline', 'false')
  icons_group.appendChild(icon)

  icons_group.addEventListener('click', e => {
    if (window.Notification) {
      Notification.requestPermission(status => {
        // console.log('Status of the request:', status)
      })
    }
    setNotification(id)
  })

  card.setAttribute('style', `border-left: 5px solid ${tags.color};`)
  card.append(left_block)
  card.append(icons_group)

  return card
}

const setIcon = (id, icon_name) => {
  let icon_group = document.getElementById(`icon${id}`)
  icon_group.innerHTML = ""
  let icon = document.createElement('span')
  icon.classList.add('iconify')
  icon.setAttribute('data-icon', icon_name)
  icon.setAttribute('data-inline', 'false')
  icon_group.appendChild(icon)
}

const setNotification = (id) => {
  let reset = name => {
    let el = document.getElementById(name),
      elClone = el.cloneNode(true)
    el.parentNode.replaceChild(elClone, el)
  }

  // load exist data
  document.getElementById('notification_time')._flatpickr.clear()
  let request = db.transaction('notification', 'readwrite').objectStore('notification').get(id)
  request.onsuccess = event => {
    let result = event.target.result
    if (result) {
      console.log(result)
      document.getElementById('notification_time')._flatpickr.setDate(new Date(result.time))
    }
  }

  // open card
  document.getElementById('notification_card').classList.add('active')
  document.getElementById('notification_card').addEventListener('click', e => {
    document.getElementById('notification_card').classList.remove('active')
  }, { once: true })
  document.getElementById('setting_card').addEventListener('click', e => {
    e.stopPropagation()
  }, { once: true })

  // save
  document.getElementById('setting_button').addEventListener('click', e => {
    reset('clear_notification')
    reset('setting_button')
    console.log(`add notification ${id}`)
    let item = items.filter(i => {
      return i.id == id
    })
    item = item[0]
    let time = document.getElementById('notification_time').value
    if (time) {
      item.time = new Date(time).getTime()
      let req = db.transaction('notification', 'readwrite').objectStore('notification').put(item)
      req.onsuccess = event => {
        document.getElementById('notification_card').classList.remove('active')
        setIcon(id, 'mdi-bell-ring')
      }
      req.onerror = event => {
        alert("請清除快取再試一次")
      }
    }
  })

  //clear
  document.getElementById('clear_notification').addEventListener('click', e => {
    reset('clear_notification')
    reset('setting_button')
    console.log(`remove notification ${id}`)
    let request = db.transaction('notification', 'readwrite').objectStore('notification').delete(id)
    request.onerror = event => {
      console.log(event)
    }
    request.onsuccess = event => {
      document.getElementById('notification_card').classList.remove('active')
      setIcon(id, 'mdi-bell-ring-outline')
    }
  })
}

const initDB = async () => {
  window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
  window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
  if (!window.indexedDB) {
    console.log("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.")
    return
  }
  let request = await window.indexedDB.open("hwList", 5)
  request.onerror = event => {
    // Do nothing with request.errorCode!
    console.log(event)
  }
  request.onsuccess = async (event) => {
    db = request.result
    db.onerror = event => {
      console.log("Database error: " + event.target.errorCode)
    }
  }
  request.onupgradeneeded = async (event) => {
    db = event.target.result
    let objectStore = await db.createObjectStore("lists", { keyPath: "id" })
    await objectStore.createIndex("id", "id", { unique: true })
    await objectStore.createIndex("subject", "subject")
    await objectStore.createIndex("tags", "tags")
    await objectStore.createIndex("time", "time")

    objectStore = await db.createObjectStore("tags", { keyPath: "id" })
    await objectStore.createIndex("id", "id", { unique: true })
    await objectStore.createIndex("name", "name")
    await objectStore.createIndex("color", "color")

    objectStore = await db.createObjectStore("subject", { keyPath: "id" })
    await objectStore.createIndex("id", "id", { unique: true })
    await objectStore.createIndex("name", "name")

    objectStore = await db.createObjectStore("notification", { keyPath: "id" })
    await objectStore.createIndex("id", "id", { unique: true })
    await objectStore.createIndex("time", "time")
    await objectStore.createIndex("title", "title")
  }
}

const addItemInDB = async (item) => {
  let request = await db.transaction('lists', 'readwrite').objectStore('lists').put(item)
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
    let request = db.transaction('notification', 'readwrite').objectStore('notification').get(item.id)
    request.onsuccess = event => {
      let result = event.target.result
      if (result) {
        console.log(result)
        setIcon(item.id, 'mdi-bell-ring')
      }
    }
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

const initWS = async () => {
  await initDB()
  socket.onopen = () => {
    socket.send(JSON.stringify({methods: "gettags"}))
    socket.send(JSON.stringify({methods: "getsubject"}))
    socket.send(JSON.stringify({methods: "get"}))
    console.log("Success")
  }
  socket.onmessage = (msg) => {
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

window.onload = () => {
  initWS()
  initNav()
  flatpickr('#add_time', {
    'locale': 'zh_tw',
    'minDate': new Date()
  })
  flatpickr('#notification_time', {
    'locale': 'zh_tw',
    'enableTime': true
  })
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
    if ('SyncManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        registration.sync.register("notification_sync")
      })
    }
  }
}