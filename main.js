import './style.css';
import './loader.css';
import {Map, View} from 'ol';
import Feature from 'ol/Feature';
import {Circle, Point, Polygon} from 'ol/geom';
import {OSM, Vector as VectorSource} from 'ol/source';
import {Style, Fill} from 'ol/style';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import {useGeographic, transform} from 'ol/proj';
import ConvexHullGrahamScan from 'graham_scan';

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
  // let circleFeature = new Feature({
  //   geometry: new Circle(coord, 100000),
  // });
  let circleFeature = new Feature(new Point(coord));
  return circleFeature
}

function createVisitigon(placeCos) {
  console.log("adding visitigon")
  let allPlaceCoords = placeCos.map(convertCoords)
  let polygonCoords

  // For polygon
  if (false) {
    //Create a new instance of ConvexHullGrahamScan.
    var convexHull = new ConvexHullGrahamScan();
    
    //add points using for loop on your coordinates
    for (var i = 0; i < allPlaceCoords.length ; i++) {
        // add your coordinates
        convexHull.addPoint(allPlaceCoords[i][0], allPlaceCoords[i][1]); 
    }
    
    // get point array from convex hull
    var hullPoints = convexHull.getHull();
    polygonCoords = hullPoints.map(pt => [pt.x, pt.y])
  }

  // For bounding rectangle
  else {
    let xCoords = allPlaceCoords.map(coord => coord[0])
    let yCoords = allPlaceCoords.map(coord => coord[1])
  
    let minXCo = Math.min(...xCoords)
    let maxXCo = Math.max(...xCoords)
    let minYCo = Math.min(...yCoords)
    let maxYCo = Math.max(...yCoords)
  
    polygonCoords = [
      [minXCo, maxYCo],
      [maxXCo, maxYCo],
      [maxXCo, minYCo],
      [minXCo, minYCo]
    ]
  }

  let polyFeature = new Feature({
    geometry: new Polygon([polygonCoords])
  })

  return polyFeature
}

let vecSource = new VectorSource({
  features: [
    // polyFeature,
  ],
})

    
// extent1 = [-180, -10]
// extent2 = [180, 10]
// const circleFeature1 = createCircleFeature([80,170]);
// vecSource.addFeature(circleFeature1)
// const circleFeature2 = createCircleFeature(["6.5531169", "67.9544415"]);
// vecSource.addFeature(circleFeature2)
// const polyFeature = createVisitigon(polygonCoords)

function getNewDefaultView() {
  let defaultView = new View({
    // center: transform(["35.6745457", "6.5531169"], 'EPSG:4326', 'EPSG:3857'),
    // center: transform(["67.9544415", "97.395561"], 'EPSG:4326', 'EPSG:3857'),
    // center: [0, 0],
    // zoom: 2,
    center: [0, 4552089.550903365],
    zoom: 1.9128893362299615,
  })

  let extent1 = [90, 180]
  let extent2 = [-80, -180]
  extent1 = convertCoords(extent1)
  extent2 = convertCoords(extent2)
  
  let extent = [
    ...extent2,
    ...extent1
  ]
  
  let padding = 20
  defaultView.fit(extent, {
    padding: [padding,padding,padding,padding]
  })
  return defaultView
}

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
  view: getNewDefaultView()
});

async function searchOSM(searchText) {
  toggleLoader(true)
  let endpoint = 'https://nominatim.openstreetmap.org/search'
  let params = {
    q: searchText,
    format: "jsonv2"
  }
  let url = `${endpoint}?${new URLSearchParams(params).toString()}`
  
  try {
    let resp = await fetch(url)
    let data = await resp.json()
    toggleLoader(false)
    return data
  } catch {
    toggleLoader(false)
    return {
      status: 'error',
      message: 'There was an error while searching. Please try again.'
    }
  }
}

let boundPlaces = {}
let allPlaces = []
let visitigonDict = {}
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

function toggleLoader(val) {
  let messageDiv = document.querySelector('#message')
  let loaderDiv = document.querySelector('.lds-ellipsis')
  if (typeof val != 'boolean') {
    val = loaderDiv.style.display == ''
    val = !val
  }

  if (val) {
    loaderDiv.style.display = ''
    messageDiv.style.display = 'none'
  } else {
    loaderDiv.style.display = 'none'
    messageDiv.style.display = ''
  }
}

async function addPlace() {
  // Hide the keyboard
  document.activeElement.blur();

  let messageDiv = document.querySelector('#message')
  let resultsDiv = document.querySelector('#search-results')
  resultsDiv.innerHTML = ''

  let searchText = document.getElementById('place-search').value
  let data = await searchOSM(searchText)
  if (data.status) {
    messageDiv.style.color = `red`
    messageDiv.innerHTML = data.message
    return
  }

  messageDiv.style.color = ''
  messageDiv.innerHTML = "Enter at least two places you've visited. After entering a place, press Add."

  data.forEach((place, ind) => {
    if (ind != 0) { return }
    let lat = parseFloat(place.lat)
    let lon = parseFloat(place.lon)

    if (allPlaces.length) {
      commonWord = commonWords(commonWord, place.display_name)
      let commonWordText = commonWord
      console.log(commonWord)
      if (!commonWordText) {
        commonWordText = 'the world'
      }
      messageDiv.innerHTML = `Every place you've ever visited in <span style="font-weight: bold">${commonWordText}</span> lies within the blue rectangle.<br><br> Enter more places to expand the rectangle.`
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
    
    let extentOptions = {}
    if (allPlaces.length == 1) {
      let box = place.boundingbox
      
      let extent1 = [box[1], box[3]]
      let extent2 = [box[0], box[2]]

      extentOptions = {
        extent1,
        extent2,
        animate: true
      }
      fitViewToCoordinates(extentOptions)
    // } else {
    } else if (boundsBreached) {
      let visitigon = createVisitigon(allPlaces)
      if (visitigonDict.polygon) {
        vecSource.removeFeature(visitigonDict.polygon)
      }
      visitigonDict.polygon = visitigon
      vecSource.addFeature(visitigon)
      
      var extent = vecSource.getExtent();
      extentOptions = {
        extent: extent,
        animate: true
      }
      fitViewToCoordinates(extentOptions)
    }
  })
}

function fitViewToCoordinates(extentOptions) {
  let extent
  if (extentOptions.extent) {
    extent = extentOptions.extent
  } else {
    let extent1 = convertCoords(extentOptions.extent1)
    let extent2 = convertCoords(extentOptions.extent2)

    extent = [
      ...extent2,
      ...extent1
    ]
  }
  
  let padding = 20
  let view = map.getView()
  let options = {
    padding: [padding,padding,padding,padding]
  }
  if (extentOptions.animate) {
    options.duration = 1000
  }
  console.log(extent)
  view.fit(extent, options)
}

document.getElementById('add-place-btn').onclick = addPlace

document.getElementById('place-search').addEventListener("keyup", async function (event) {
  if (event.key == 'Enter') {
    addPlace()
  }
});

document.getElementById('export-png').addEventListener('click', async function () {
  let extent1, extent2
  if (commonWord) {
    let data = await searchOSM(commonWord.trim())
    let place = data[0]
    let box = place.boundingbox
    
    extent1 = [box[1], box[3]]
    extent2 = [box[0], box[2]]

  } else {
    // Default coordinates for a global view
    extent1 = [90, 180]
    extent2 = [-80, -180]
  }

  let extentOptions = {
    extent1,
    extent2
  }
  fitViewToCoordinates(extentOptions)

  map.once('rendercomplete', function () {
    const mapCanvas = document.createElement('canvas');
    const size = map.getSize();
    mapCanvas.width = size[0];
    mapCanvas.height = size[1];
    const mapContext = mapCanvas.getContext('2d');
    Array.prototype.forEach.call(
      document.querySelectorAll('.ol-layer canvas'),
      function (canvas) {
        if (canvas.width > 0) {
          const opacity = canvas.parentNode.style.opacity;
          mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity);
          const transform = canvas.style.transform;
          // Get the transform parameters from the style's transform matrix
          const matrix = transform
            .match(/^matrix\(([^\(]*)\)$/)[1]
            .split(',')
            .map(Number);
          // Apply the transform to the export map context
          CanvasRenderingContext2D.prototype.setTransform.apply(
            mapContext,
            matrix
          );
          mapContext.drawImage(canvas, 0, 0);
        }
      }
    );
    if (navigator.msSaveBlob) {
      // link download attribute does not work on MS browsers
      navigator.msSaveBlob(mapCanvas.msToBlob(), 'map.png');
    } else {
      let blob = dataURItoBlob(mapCanvas.toDataURL())
      var file = new File([blob], "picture.jpg", {type: 'image/jpeg'});
      var filesArray = [file];
      navigator.share({
        files: filesArray
      })
      // const link = document.createElement('a');
      // link.download = 'image'
      // link.href = mapCanvas.toDataURL();
      // link.click();
    }
  });
  map.renderSync();
});

function dataURItoBlob(dataURI) {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  var byteString = atob(dataURI.split(',')[1]);

  // separate out the mime component
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

  // write the bytes of the string to an ArrayBuffer
  var ab = new ArrayBuffer(byteString.length);

  // create a view into the buffer
  var ia = new Uint8Array(ab);

  // set the bytes of the buffer to the correct values
  for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
  }

  // write the ArrayBuffer to a blob, and you're done
  var blob = new Blob([ab], {type: mimeString});
  return blob;

}