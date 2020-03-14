let Calendar = document.getElementById('calendar')

const socketProtocol = (window.location.protocol === 'https:' ? 'wss:' : 'ws:')
const echoSocketUrl = `${socketProtocol}//${window.location.hostname}/echo/`
const socket = new WebSocket(echoSocketUrl)

let items = []

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

const generateItem = (title, time, subject, tags) => {

  let date = new Date(time)
  date = `${date.getMonth()+1}/${date.getDate()}`

  let item = document.createElement('div')
  item.classList.add('item_card')
  let titleElem = document.createElement('p')
  titleElem.classList.add('item_title')
  titleElem.innerHTML = `<span>${date}</span> ${title}`

  let subjectElem = document.createElement('span')
  subjectElem.innerHTML = subject

  // let tagsElem = document.createElement('span')
  // tagsElem.classList.add('tags')
  
  // tags.map(tag => {
  //   let dot = document.createElement('span')
  //   dot.classList.add('tags_dot')
  //   dot.innerText = tag
  //   tagsElem.appendChild(dot)
  // })

  
  item.appendChild(titleElem)
  item.appendChild(subjectElem)
  //item.appendChild(tagsElem)
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
  })
}

const initWS = () => {
  socket.onopen = () => {
    socket.send(JSON.stringify({
      methods: "get"
    }))
    console.log("Success")
    // socket.send(JSON.stringify(
    //   {
    //     methods: "add",
    //     title: "test",
    //     time: "2020-03-15",
    //     subject: "國文",
    //     tags: [1,2],
    //     key: "mwjc8pCH"
    //   }
    // ))
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