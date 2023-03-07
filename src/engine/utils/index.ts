export const curry = function <T>(...args: [(...args: any[]) => void, ...T[]]) {
  const [f] = args
  const parameters = Array.prototype.slice.call(args, 1)
  return function (...innerArgs) {
    return f.apply(this, parameters.concat(Array.prototype.slice.call(innerArgs, 0)))
  }
}

export const addToXML = function (xml, p) {
  if (p['#name'] === 'g') {
    const g = xml.ele('g', p['$'])
    if (p['$$']) {
      p['$$'].forEach(curry(addToXML, g))
    }
  } else {
    xml.ele(p['#name'], p['$'])
  }
}

export function expandColor(c) {
  if (c == undefined) {
    return c
  }
  if (c === 'white') {
    c = '#fff'
  }
  if (c === 'black') {
    c = '#000'
  }
  c = c.toLowerCase()
  if (c == 'none') {
    return c
  } else if (c.substr(0, 1) == '#') {
    if (c.length == 4) {
      c = '#' + c.substr(1, 1) + c.substr(1, 1) + c.substr(2, 1) + c.substr(2, 1) + c.substr(3, 1) + c.substr(3, 1)
    }
    return c + 'ff'
  } else if (c.substr(0, 4) == 'rgb(') {
    const rgb = c.substr(4, c.length - 1).split(',')
    return (
      '#' +
      rgb
        .map(function (ch) {
          ch = parseFloat(ch.substr(0, ch.length - 1))
          ch = Math.round(ch * 2.55)
          ch = Math.min(ch, 255)
          ch = ch.toString(16)
          switch (ch.length) {
            case 0:
              return '00'
            case 1:
              return '0' + ch
            case 2:
              return ch
          }
        })
        .join('')
    )
  } else {
    throw 'invalid color ' + c
  }
}

export function applyOpacity(c, o) {
  if (c === undefined || c === 'none') {
    return c
  }
  let opacity = (o * parseInt(c.substr(7), 16)) / 255
  opacity = Math.round(opacity * 255)
  let opacityStr = opacity.toString(16)
  if (opacityStr.length === 1) {
    opacityStr = '0' + opacityStr
  }
  return c.substr(0, 7) + opacityStr
}

export function hexByte(b) {
  let s = b.toString(16)
  if (s.length < 2) {
    s = '0' + s
  } else if (s.length > 2) {
    // shouldn't happen
    s = s.substr(s.length - 2, 2)
  }
  return s
}

function decodePath(d) {
  let x = 0
  let y = 0
  const result = []
  let segStart = [0, 0]
  while (d !== '') {
    const matches = d.match('^s*([MmLlHhVvCcZzSsTtQqAa])')
    if (!matches) {
      break
    }
    const len = matches[0].length
    d = d.substr(len)
    const op = matches[1]
    let coords
    const c = '\\s*(-?(?:[0-9]*\\.[0-9]+|[0-9]+)),?'
    if (op === 'M') {
      segStart = undefined
      while ((coords = d.match('^' + c + c))) {
        d = d.substr(coords[0].length)
        x = Number(coords[1])
        y = Number(coords[2])
        if (segStart === undefined) {
          segStart = [x, y]
        }
        result.push([x, y])
      }
    } else if (op === 'L') {
      while ((coords = d.match('^' + c + c))) {
        d = d.substr(coords[0].length)
        x = Number(coords[1])
        y = Number(coords[2])
        result.push([x, y])
      }
    } else if (op === 'm') {
      segStart = undefined
      while ((coords = d.match('^' + c + c))) {
        d = d.substr(coords[0].length)
        x += Number(coords[1])
        y += Number(coords[2])
        if (segStart === undefined) {
          segStart = [x, y]
        }
        result.push([x, y])
      }
    } else if (op === 'l') {
      while ((coords = d.match('^' + c + c))) {
        d = d.substr(coords[0].length)
        x += Number(coords[1])
        y += Number(coords[2])
        result.push([x, y])
      }
    } else if (op === 'H') {
      while ((coords = d.match('^' + c))) {
        d = d.substr(coords[0].length)
        x = Number(coords[1])
        result.push([x, y])
      }
    } else if (op === 'h') {
      while ((coords = d.match('^' + c))) {
        d = d.substr(coords[0].length)
        x += Number(coords[1])
        result.push([x, y])
      }
    } else if (op === 'V') {
      while ((coords = d.match('^' + c))) {
        d = d.substr(coords[0].length)
        y = Number(coords[1])
        result.push([x, y])
      }
    } else if (op === 'v') {
      while ((coords = d.match('^' + c))) {
        d = d.substr(coords[0].length)
        y += Number(coords[1])
        result.push([x, y])
      }
    } else if (op === 'C') {
      while ((coords = d.match('^' + c + c + c + c + c + c))) {
        d = d.substr(coords[0].length)
        x = Number(coords[1])
        y = Number(coords[2])
        result.push([x, y])
        x = Number(coords[3])
        y = Number(coords[4])
        result.push([x, y])
        x = Number(coords[5])
        y = Number(coords[6])
        result.push([x, y])
      }
    } else if (op === 'c') {
      while ((coords = d.match('^' + c + c + c + c + c + c))) {
        d = d.substr(coords[0].length)
        result.push([x + Number(coords[1]), y + Number(coords[2])])
        result.push([x + Number(coords[3]), y + Number(coords[4])])
        x += Number(coords[5])
        y += Number(coords[6])
        result.push([x, y])
      }
    } else if (op === 'S') {
      while ((coords = d.match('^' + c + c + c + c))) {
        d = d.substr(coords[0].length)
        x = Number(coords[1])
        y = Number(coords[2])
        result.push([x, y])
        x = Number(coords[3])
        y = Number(coords[4])
        result.push([x, y])
      }
    } else if (op === 's') {
      while ((coords = d.match('^' + c + c + c + c))) {
        d = d.substr(coords[0].length)
        result.push([x + Number(coords[1]), y + Number(coords[2])])
        x += Number(coords[3])
        y += Number(coords[4])
        result.push([x, y])
      }
    } else if (op === 'Q') {
      while ((coords = d.match('^' + c + c + c + c))) {
        d = d.substr(coords[0].length)
        result.push([x + Number(coords[1]), y + Number(coords[2])])
        x = Number(coords[3])
        y = Number(coords[4])
        result.push([x, y])
      }
    } else if (op === 'q') {
      while ((coords = d.match('^' + c + c + c + c))) {
        d = d.substr(coords[0].length)
        result.push([x + Number(coords[1]), y + Number(coords[2])])
        x += Number(coords[3])
        y += Number(coords[4])
        result.push([x, y])
      }
    } else if (op === 'T') {
      while ((coords = d.match('^' + c + c))) {
        d = d.substr(coords[0].length)
        x = Number(coords[1])
        y = Number(coords[2])
        result.push([x, y])
      }
    } else if (op === 't') {
      while ((coords = d.match('^' + c + c))) {
        d = d.substr(coords[0].length)
        x += Number(coords[1])
        y += Number(coords[2])
        result.push([x, y])
      }
    } else if (op === 'A') {
      // we don't fully handle arc, just grab the endpoint
      while ((coords = d.match('^' + c + c + c + c + c + c + c))) {
        d = d.substr(coords[0].length)
        x = Number(coords[6])
        y = Number(coords[7])
        result.push([x, y])
      }
    } else if (op === 'a') {
      while ((coords = d.match('^' + c + c + c + c + c + c + c))) {
        d = d.substr(coords[0].length)
        x += Number(coords[6])
        y += Number(coords[7])
        result.push([x, y])
      }
    } else if (op === 'Z' || op === 'z') {
      x = segStart[0]
      y = segStart[1]
      result.push([x, y])
    }
  }
  return result
}

function getBBox(p) {
  if (p['#name'] === 'path') {
    const points = decodePath(p['$']['d'])
    const result = [undefined, undefined, undefined, undefined]
    points.forEach(function (pt) {
      if (result[0] === undefined || pt[0] < result[0]) {
        result[0] = pt[0]
      }
      if (result[1] === undefined || pt[1] < result[1]) {
        result[1] = pt[1]
      }
      if (result[2] === undefined || pt[0] > result[2]) {
        result[2] = pt[0]
      }
      if (result[3] === undefined || pt[1] > result[3]) {
        result[3] = pt[1]
      }
    })
    return result
  } else if (p['#name'] === 'circle') {
    const cx = Number(p['$']['cx'])
    const cy = Number(p['$']['cy'])
    const r = Number(p['$']['r'])
    return [cx - r, cy - r, cx + r, cy + r]
  } else if (p['#name'] === 'ellipse') {
    const cx = Number(p['$']['cx'])
    const cy = Number(p['$']['cy'])
    const rx = Number(p['$']['rx'])
    const ry = Number(p['$']['ry'])
    return [cx - rx, cy - ry, cx + rx, cy + ry]
  }
  return [0, 0, 0, 0]
}

function overlap(a, b) {
  if (a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1]) {
    return false
  } else {
    return true
  }
}

function hasTransform(p) {
  return p['$']['transform'] !== undefined
}

export function addOrMerge(paths, p, color) {
  let i = -1
  if (!hasTransform(p)) {
    i = paths.length - 1
    const bbox = getBBox(p)
    while (i >= 0) {
      let hasOverlap = false
      paths[i].paths.forEach(function (pp) {
        if (hasTransform(pp) || overlap(bbox, getBBox(pp))) {
          hasOverlap = true
        }
      })
      if (hasOverlap) {
        i = -1
        break
      }
      if (paths[i].color === color) {
        break
      }
      --i
    }
  }
  if (i >= 0) {
    paths[i].paths.push(p)
  } else {
    paths.push({ color: color, paths: [p] })
  }
}

export function recordGradient(graph, urlColor) {
  const stops = []
  const id = '#' + graph['$']['id']
  graph['$$'].forEach(function (child) {
    if (child['#name'] === 'stop') {
      stops.push(expandColor(child['$']['stop-color']))
    }
  })
  const stopCount = stops.length
  let r = 0,
    g = 0,
    b = 0
  if (stopCount > 0) {
    stops.forEach(function (stop) {
      r = r + parseInt(stop.substr(1, 2), 16)
      g = g + parseInt(stop.substr(3, 2), 16)
      b = b + parseInt(stop.substr(5, 2), 16)
    })
    r = Math.round(r / stopCount)
    g = Math.round(g / stopCount)
    b = Math.round(b / stopCount)
  }
  const color = '#' + hexByte(r) + hexByte(g) + hexByte(b)
  urlColor[id] = color
}
