import './style.css';
import './loader.css';
import {Map, View} from 'ol';
import Feature from 'ol/Feature';
import {Circle, Polygon} from 'ol/geom';
import {OSM, Vector as VectorSource} from 'ol/source';
import {Style, Fill} from 'ol/style';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import {useGeographic, transform} from 'ol/proj';

// useGeographic();

// lat, long
let polygonCoords = [
  [19.0916497,72.8647715],
  [28.6847614,77.2274101],
  [13.1358286,80.1926262],
  [8.0772863,77.5559395],
]

function convertCoords(origCoord) {
  let coord = [parseFloat(origCoord[1]), parseFloat(origCoord[0])]
  coord = transform(coord, 'EPSG:4326', 'EPSG:3857')
  return coord
}

console.log(polygonCoords)

function createCircleFeature(coord) {
  coord = convertCoords(coord)
  let circleFeature = new Feature({
    geometry: new Circle(coord, 100000),
  });
  return circleFeature
}

function createVisitigon(placeCos) {
  console.log("adding visitigon")
  let allPlaceCoords = placeCos.map(convertCoords)

  let xCoords = allPlaceCoords.map(coord => coord[0])
  let yCoords = allPlaceCoords.map(coord => coord[1])

  let minXCo = Math.min(...xCoords)
  let maxXCo = Math.max(...xCoords)
  let minYCo = Math.min(...yCoords)
  let maxYCo = Math.max(...yCoords)

  let polygonCoords = [
    [minXCo, maxYCo],
    [maxXCo, maxYCo],
    [maxXCo, minYCo],
    [minXCo, minYCo]
  ]

  let polyFeature = new Feature({
    geometry: new Polygon([polygonCoords])
  })

  return polyFeature
}

// const circleFeature = createCircleFeature([80.1926262, 13.1358286]);
// const polyFeature = createVisitigon(polygonCoords)

let vecSource = new VectorSource({
  features: [
    // polyFeature,
  ],
})

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM()
    }),
    new VectorLayer({
      source: vecSource,
    }),
  ],
  view: new View({
    center: [0, 0],
    zoom: 2
  })
});

async function searchOSM(searchText) {
  let endpoint = 'https://nominatim.openstreetmap.org/search'
  let url = endpoint + `/${searchText}?format=json`
  let resp = await fetch(url)
  let data = await resp.json()
  return data
}

let boundPlaces = {}
let allPlaces = []
let visitigonList = []
let commonWord

function commonWords (first, second) {
  var a = first.split(',')
  var b = second.split(',')
  var c = []
  for (var i = 0; i < a.length; i++) {
    for (var j = 0; j < b.length; j++) {
      if (a[i] === b[j] && c.indexOf(a[i]) !== null) {
        c.push(a[i])
      }
    }
  }
  return c.sort().toString()
}

function updateBoundPlace(dir, place) {
  document.querySelector(`.place-${dir}`).innerHTML = place.display_name.split(',')[0]
}

function checkBoundPlaces(place) {
  let directions = ['north', 'south', 'east', 'west']
  
  function boundsBreached(dir, existingCoords, newCoords) {
    if (dir == 'north') {
      if (newCoords[1] > existingCoords[1]) {
        return true
      }
    } else if (dir == 'south') {
      if (newCoords[1] < existingCoords[1]) {
        return true
      }
    } else if (dir == 'east') {
      if (newCoords[0] > existingCoords[0]) {
        return true
      }
    } else if (dir == 'west') {
      if (newCoords[0] < existingCoords[0]) {
        return true
      }
    }
    return false
  }

  let breached = false

  for (let dir of directions) {
    let boundPlace = boundPlaces[dir]
    if (boundPlace) {
      let coords = convertCoords([boundPlace.lat, boundPlace.lon])
      let placeCoords = convertCoords([place.lat, place.lon])

      let curBoundBreached = boundsBreached(dir, coords, placeCoords)
      if (curBoundBreached) {
        boundPlaces[dir] = place
        updateBoundPlace(dir, place)
      }
      breached = breached || curBoundBreached
    } else {
      boundPlaces[dir] = place
      updateBoundPlace(dir, place)
    }
  }

  return breached
}

async function addPlace() {
  // Hide the keyboard
  document.activeElement.blur();

  let messageDiv = document.querySelector('#message')
  messageDiv.style.display = 'none'
  let loaderDiv = document.querySelector('.lds-ellipsis')
  loaderDiv.style.display = ''

  let resultsDiv = document.querySelector('#search-results')
  resultsDiv.innerHTML = ''

  let searchText = document.getElementById('place-search').value
  let data = await searchOSM(searchText)
  console.log(data)

  loaderDiv.style.display = 'none'
  messageDiv.style.display = ''

  data.forEach((place, ind) => {
    if (ind != 0) { return }
    let lat = parseFloat(place.lat)
    let lon = parseFloat(place.lon)

    if (allPlaces.length) {
      commonWord = commonWords(commonWord, place.display_name)
      console.log(commonWord)
      if (!commonWord) {
        commonWord = 'the world'
      }
      messageDiv.innerHTML = `Every place you've ever visited in ${commonWord} lies within the blue rectangle.`
      messageDiv.style.color = `rgb(22, 166, 223)`
    } else {
      commonWord = place.display_name
    }

    let resDiv = document.createElement('div')
    resDiv.innerHTML = place.display_name
    resDiv.className = 'result-item'
    // resultsDiv.append(resDiv)

    let circle = createCircleFeature([lat, lon])
    vecSource.addFeature(circle)
    allPlaces.push([lat, lon])

    let boundsBreached = checkBoundPlaces(place)
      
    let view = map.getView()
    var extent = vecSource.getExtent();
    let padding = 20
    view.fit(extent, {
      duration: 1000,
      padding: [padding,padding,padding,padding]
    })

    if (boundsBreached) {
      let visitigon = createVisitigon(allPlaces)
      if (visitigonList.length) {
        vecSource.removeFeature(visitigonList[0])
        visitigonList = []
      }
      visitigonList.push(visitigon)
      vecSource.addFeature(visitigon)
    }
  })
}

document.getElementById('add-place-btn').onclick = addPlace

document.getElementById('place-search').addEventListener("keyup", async function (event) {
  if (event.key == 'Enter') {
    addPlace()
  }
});