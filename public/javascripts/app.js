let Calendar = document.getElementById('calendar')

const socketProtocol = (window.location.protocol === 'https:' ? 'wss:' : 'ws:')
const echoSocketUrl = `${socketProtocol}//${window.location.hostname}:4000/echo/`
const socket = new WebSocket(echoSocketUrl)

let items = []
let tags = []
let subject = []

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

const generateItem = (title, time, subject, tags) => {

  let date = new Date(time)
  date = `${date.getMonth()+1}/${date.getDate()}`

  let item = document.createElement('div')
  item.classList.add('item_card')
  let titleElem = document.createElement('p')
  titleElem.classList.add('item_title')
  titleElem.innerHTML = `<span>${date}</span> ${title}`

  let subjectElem = document.createElement('span')
  subjectElem.innerHTML = getSubjectByid(subject)

  let tagsElem = document.createElement('span')
  tagsElem.classList.add('tags')
  
  let dot = document.createElement('span')
  dot.classList.add('tags')
  tags = getTagsByid(tags)
  dot.innerText = tags.name
  tagsElem.appendChild(dot)
  
  item.setAttribute('style', `border-left: 3px solid ${tags.color};`)

  item.appendChild(titleElem)
  item.appendChild(subjectElem)
  item.appendChild(tagsElem)
  // item.appendChild(dateTitle)
  return item
}

const render = () => {
  Calendar.innerHTML = ""
  let min = range[0]
  let max = range[1]
  if (max === 0) {
    max = 9999999999999
  }
  let filtered = items.filter(item => {
    return item.time <= max && item.time >= min
  })
  if (filtered.length === 0) {
    let nothing = document.createElement('p')
    nothing.classList.add('nothing')
    nothing.innerText = "Nothing today."
    Calendar.appendChild(nothing)
  }
  filtered.map(item => {
    Calendar.appendChild(generateItem(item.title, item.time, item.subject, item.tags))
  })
}
const initNav = () => {
  document.getElementById('today').addEventListener('click', e => {
    Array.from(nav.children).forEach(elem => {
      elem.classList.remove('active')
    })
    e.srcElement.classList.add('active')
    range = [today, today+86400000]
    render()
  })

  document.getElementById('tomorrow').addEventListener('click', e => {
    Array.from(nav.children).forEach(elem => {
      elem.classList.remove('active')
    })
    e.srcElement.classList.add('active')
    Calendar.innerHTML = ""
    range = [today+86400000, today+2*86400000]
    render()
  })

  document.getElementById('all').addEventListener('click', e => {
    Array.from(nav.children).forEach(elem => {
      elem.classList.remove('active')
    })
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
  socket.onopen = () => {
    socket.send(JSON.stringify({methods: "get"}))
    socket.send(JSON.stringify({methods: "gettags"}))
    socket.send(JSON.stringify({methods: "getsubject"}))
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
      items.sort((a, b) => {
        return a.time - b.time
      })
      render()
    } else if (event.type === "tags") {
      tags = event.data
    } else if (event.type === "subject") {
      subject = event.data
    }
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