let Calendar = document.getElementById('calendar')
let items = []
let tags = []
let subject = []

const socketProtocol = (window.location.protocol === 'https:' ? 'wss:' : 'ws:')
const echoSocketUrl = `${socketProtocol}//${window.location.hostname}/echo/`
let socket

const pad = (n) => {
  return n < 10 ? `0${n}` : n
}

let today = new Date()
today = new Date(`${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())} 00:00:00`).getTime()
let range = [today, today+86400000]

const dateToString = (time, weekday=false) => {
  let date = new Date(time)
  if (weekday) {
    let formater = new Intl.DateTimeFormat('zh', {weekday: 'long'}).format.bind()
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
  card.append(left_block)

  // if background sync available
  if ('SyncManager' in window) {
    let icons_group = document.createElement('div')
    icons_group.setAttribute('id', `icon${id}`)
    icons_group.classList.add('icon_group')
    
    let icon = document.createElement('span')

    icon.classList.add('iconify')
    icon.setAttribute('data-icon', 'mdi-bell-ring-outline')
    icon.setAttribute('data-inline', 'false')
    icons_group.appendChild(icon)

    icons_group.addEventListener('click', async (e) => {
      if (window.Notification) {
        let status = await Notification.requestPermission()
        if (status === 'granted') {
          settingCard(id)
        }
      }
    })
    card.append(icons_group)
  }
  card.setAttribute('style', `border-left: 5px solid ${tags.color};`)
  return card
}

const setIcon = (id, icon_name) => {
  let icon_group = document.getElementById(`icon${id}`)
  if (!icon_group) return
  icon_group.innerHTML = ''
  let icon = document.createElement('span')
  icon.classList.add('iconify')
  icon.setAttribute('data-icon', icon_name)
  icon.setAttribute('data-inline', 'false')
  icon_group.appendChild(icon)
}

const settingCard = async (id) => {
  let reset = name => {
    let el = document.getElementById(name),
      elClone = el.cloneNode(true)
    el.parentNode.replaceChild(elClone, el)
  }
  document.getElementById('notification_time')._flatpickr.clear()

  // load exist data
  let notification_data = await localforage.getItem('notification') || []
  notification_data.map(i => {
    if (i.id == id) {
      document.getElementById('notification_time')._flatpickr.setDate(new Date(i.time))
    }
  })

  // open card
  document.getElementById('notification_card').classList.add('active')
  document.getElementById('notification_card').addEventListener('click', e => {
    document.getElementById('notification_card').classList.remove('active')
  })
  document.getElementById('setting_card').addEventListener('click', e => {
    e.stopPropagation()
  })

  // save
  document.getElementById('setting_button').addEventListener('click', e => {
    reset('clear_notification')
    reset('setting_button')
    reset('delete_btn')
    console.log(`add notification ${id}`)
    let item = items.filter(i => {
      return i.id == id
    })
    item = item[0]
    let time = document.getElementById('notification_time').value
    if (time) {
      let notification_object = {
        id: item.id,
        time: new Date(time).getTime(),
        title: `${getSubjectByid(item.subject)} ${(getTagsByid(item.tags).name)} ${item.title}`
      }
      notification_data = notification_data.filter(i => i.id !== id)
      notification_data.push(notification_object)
      localforage.setItem('notification', notification_data).then(value => {
        console.log(value)
        document.getElementById('notification_card').classList.remove('active')
        setIcon(id, 'mdi-bell-ring')  
      })
    }
  })

  //clear
  document.getElementById('clear_notification').addEventListener('click', e => {
    reset('clear_notification')
    reset('setting_button')
    reset('delete_btn')
    console.log(`remove notification ${id}`)
    notification_data = notification_data.filter(i => i.id !== id)
    localforage.setItem('notification', notification_data).then(value => {
      console.log(value)
      document.getElementById('notification_card').classList.remove('active')
      setIcon(id, 'mdi-bell-ring-outline')
    })
  })

  //delete item
  document.getElementById('delete_btn').addEventListener('click', e => {
    reset('clear_notification')
    reset('setting_button')
    reset('delete_btn')
    let key = prompt("輸入通關密語", "")
    socket.send(JSON.stringify({
      methods: 'delete',
      id: id,
      key: key
    }))
  })
}

const render = () => {
  Calendar.innerHTML = ''
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
    nothing.innerText = 'Nothing'
    Calendar.appendChild(nothing)
    return
  }
  let dateTitle = ''
  filtered.map(item => {
    dT = dateToString(item.time, true)
    if (dT !== dateTitle) {
      let titleElem = document.createElement('p')
      titleElem.classList.add('dateTitle')
      titleElem.innerText = dT
      Calendar.appendChild(titleElem)
      dateTitle = dT
    }
    Calendar.appendChild(generateItem(item.id, item.title, item.time, item.subject, item.tags))
    localforage.getItem('notification').then(value => {
      let notification_data = value || []
      notification_data.map(i => {
        setIcon(i.id, 'mdi-bell-ring')
      })
    })
  })
}

const initNav = () => {
  const nav = document.getElementById('nav')
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
    Calendar.innerHTML = ''
    range = [today+86400000, today+2*86400000]
    render()
  })

  document.getElementById('all').addEventListener('click', e => {
    inactive()
    e.srcElement.classList.add('active')
    Calendar.innerHTML = ''
    range = [today, 0]
    render()
  })

  document.getElementById('show_add').addEventListener('click', () => {
    Calendar.classList.remove('active')
    document.getElementById('add').classList.add('active')
    document.getElementById('add_subject').innerHTML = ''
    subject.map(s => {
      let option = document.createElement('option')
      option.value = s.id
      option.innerText = s.name
      document.getElementById('add_subject').appendChild(option)
    })

    document.getElementById('add_tags').innerHTML = ''
    tags.map(tag => {
      let option = document.createElement('option')
      option.value = tag.id
      option.innerText = tag.name
      document.getElementById('add_tags').appendChild(option)
    })
  })
}

const loadCacheData = async () => {
  tags = await localforage.getItem('tags') || []
  subject = await localforage.getItem('subject') || []
  items = await localforage.getItem('lists') || []
}

const initWS = async () => {
  await loadCacheData()
  socket.onopen = event => {
    socket.send(JSON.stringify({methods: 'gettags'}))
    socket.send(JSON.stringify({methods: 'getsubject'}))
    socket.send(JSON.stringify({methods: 'get'}))
    console.log('Success')
  }
  socket.onmessage = msg => {
    event = JSON.parse(msg.data)
    console.log(event)
    if (event.type === 'all') {
      items = event.data
      localforage.setItem('lists', items)
      render()
    } else if (event.type === 'update') {
      items.push(event.data)
      render()
    } else if (event.type === 'delete') {
      items = items.filter(i => i.id !== event.data.id)
      console.log(items)      
      localforage.setItem('lists', items)
      render()
    } else if (event.type === 'tags') {
      tags = event.data
      localforage.setItem('tags', tags)
    } else if (event.type === 'subject') {
      subject = event.data
      localforage.setItem('subject', subject)
    } else if (event.type === 'addSuccess') {
      alert('加入成功')
      document.getElementById('add_title').value = ''
      document.getElementById('add_time').value = ''
      document.getElementById('add_key').value = ''
    } else if (event.type === 'delSuccess') {
      alert('刪除成功')
      document.getElementById('notification_card').classList.remove('active')
    }
  }
  socket.onerror = event => {
    console.log(event)
  }
}

const addItem = () => {
  const title = document.getElementById('add_title').value
  const time = document.getElementById('add_time').value
  const subject = document.getElementById('add_subject').value
  const key = document.getElementById('add_key').value
  const tags = document.getElementById('add_tags').value
  console.log(title)
  socket.send(JSON.stringify({
    methods: 'add',
    title: title,
    time: time,
    subject: subject,
    tags: [tags],
    key: key
  }))
}

const initTimePicker = () => {
  flatpickr.localize(flatpickr.l10ns.zh_tw)
  flatpickr.l10ns.default.firstDayOfWeek = 1
  flatpickr('#add_time', {
    'minDate': today
  })
  flatpickr('#notification_time', {
    'minDate': today,
    'enableTime': true
  })
}

const initServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
    if ('SyncManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        registration.sync.register('notification_sync')
      })
    }
  }
}

window.onload = async () => {
  socket =  await new WebSocket(echoSocketUrl)
  await initWS()
  initNav()
  initTimePicker()
  initServiceWorker()
}