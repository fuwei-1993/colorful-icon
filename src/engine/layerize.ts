import fs from 'fs'
import xmlbuilder from 'xmlbuilder'
import xml2js from 'xml2js'
import rmdir from 'rmdir'
import unzipper from 'unzipper'
import { recordGradient, expandColor, applyOpacity, addOrMerge, curry, addToXML } from './utils'

const [, , sourceZip, targetDir, fontName, startIndex] = process.argv

if (fontName === undefined) {
  console.error('### 文件名称不存在')
  console.error('### Usage: node ' + process.argv[1] + ' icons.zip build-dir font-name')
  process.exit(1)
}

const components = {}
// maps svg-data -> glyphName
const chars = []
// unicode -> components[]
//              color
//              glyphName
const ligatures = []
// [unicode1, unicode2] -> components[]

const colors = []
const colorToId = {}

const codepoints = []

function processFile(fileName, data) {
  // strip .svg extension off the name
  const baseName = fileName.replace('.svg', '')
  // Twitter doesn't include the VS16 in the keycap filenames

  const parser = new xml2js.Parser({
    preserveChildrenOrder: true,
    explicitChildren: true,
    explicitArray: true,
    trim: true
  })

  // Save the original file also for visual comparison
  fs.writeFileSync(targetDir + '/colorGlyphs/u' + baseName + '.svg', data)

  // split name of glyph that corresponds to multi-char ligature
  const unicodes = baseName.split('-')

  parser.parseString(data, function (err, result) {
    const paths = []
    const defs = {}
    const urlColor = {
      '#paint0_angular_5163_21507': '#000',
      '#paint1_angular_5163_21507': '#000',
      '#paint2_angular_5163_21507': '#000',
      '#paint3_linear_5163_21507': '#000',
      '#paint0_angular_10230_47477': '#000',
      '#paint1_angular_10230_47477': '#000',
      '#paint2_angular_10230_47477': '#000',
      '#paint3_angular_10230_47477': '#000',
      '#paint3_linear_10230_47477': '#000',
      '#paint4_linear_10230_47477': '#000',
      '#paint5_linear_10230_47477': '#000'
    }

    const addToPaths = function (defaultFill, defaultStroke, defaultOpacity, defaultStrokeWidth, xform, elems) {
      elems.forEach(function (e) {
        if (e['#name'] === 'metadata') {
          e = undefined
          return
        }

        if (e['#name'] === 'defs') {
          if (e['$$'] === undefined) {
            return
          }
          e['$$'].forEach(function (def) {
            if (def['#name'] === 'linearGradient') {
              recordGradient(def, urlColor)
            } else {
              const id = '#' + def['$']['id']
              defs[id] = def
            }
          })
        }

        if (e['#name'] == 'linearGradient') {
          recordGradient(e, urlColor)
          return
        }

        if (e['$'] == undefined) {
          e['$'] = {}
        }

        let fill = e['$']['fill']
        let stroke = e['$']['stroke']
        const strokeWidth = e['$']['stroke-width'] || defaultStrokeWidth

        // any path with an 'id' might get re-used, so remember it
        if (e['$']['id']) {
          const id = '#' + e['$']['id']
          defs[id] = JSON.parse(JSON.stringify(e))
        }

        let t = e['$']['transform']
        if (t) {
          // fontforge import doesn't understand 3-argument 'rotate',
          // so we decompose it into translate..rotate..untranslate
          const c = '(-?(?:[0-9]*\\.[0-9]+|[0-9]+))'
          while (true) {
            const m = t.match('rotate\\(' + c + '\\s+' + c + '\\s' + c + '\\)')
            if (!m) {
              break
            }
            const a = Number(m[1])
            const x = Number(m[2])
            const y = Number(m[3])
            const rep = 'translate(' + x + ' ' + y + ') ' + 'rotate(' + a + ') ' + 'translate(' + -x + ' ' + -y + ')'
            t = t.replace(m[0], rep)
          }
          e['$']['transform'] = t
        }

        if (fill && fill.substr(0, 3) === 'url') {
          const id = fill.substr(4, fill.length - 5)

          if (urlColor[id] === undefined) {
            console.log('### ' + baseName + ': no mapping for ' + fill)
          } else {
            fill = urlColor[id]
          }
        }
        if (fill === 'currentColor') {
          fill = '#000'
        }
        if (stroke && stroke.substr(0, 3) === 'url') {
          const id = stroke.substr(4, stroke.length - 5)
          if (urlColor[id] === undefined) {
            console.log('### ' + baseName + ': no mapping for ' + stroke)
          } else {
            stroke = urlColor[id]
          }
        }

        fill = expandColor(fill) || defaultFill
        stroke = expandColor(stroke) || defaultStroke

        const opacity = (e['$']['opacity'] || 1.0) * defaultOpacity

        if (e['#name'] === 'g') {
          if (e['$$'] !== undefined) {
            addToPaths(fill, stroke, opacity, strokeWidth, e['$']['transform'] || xform, e['$$'])
          }
        } else if (e['#name'] === 'use') {
          const href = e['$']['xlink:href']
          const target = defs[href]
          if (target) {
            addToPaths(fill, stroke, opacity, strokeWidth, e['$']['transform'] || xform, [
              JSON.parse(JSON.stringify(target))
            ])
          }
        } else {
          if (!e['$']['transform'] && xform) {
            e['$']['transform'] = xform
          }
          if (fill !== 'none') {
            const f = JSON.parse(JSON.stringify(e))
            f['$']['stroke'] = 'none'
            f['$']['stroke-width'] = '0'
            f['$']['fill'] = '#000'
            if (opacity !== 1.0) {
              fill = applyOpacity(fill, opacity)
            }
            // Insert a Closepath before any Move commands within the path data,
            // as fontforge import doesn't handle unclosed paths reliably.
            if (f['#name'] === 'path') {
              let d = f['$']['d']
              d = d.replace(/M/g, 'zM').replace(/m/g, 'zm').replace(/^z/, '').replace(/zz/gi, 'z')
              if (f['$']['d'] !== d) {
                f['$']['d'] = d
              }
            }
            addOrMerge(paths, f, fill)
          }

          // fontforge seems to hang on really complex thin strokes
          // so we arbitrarily discard them for now :(
          // Also skip stroking the zodiac-sign glyphs to work around
          // conversion problems with those outlines; we'll just have
          // slightly thinner symbols (fill only, no stroke)
          function skipStrokeOnZodiacSign(u) {
            u = parseInt(u, 16)
            return u >= 0x2648 && u <= 0x2653
          }

          if (stroke !== 'none' && !skipStrokeOnZodiacSign(unicodes[0])) {
            if (
              e['#name'] !== 'path' ||
              Number(strokeWidth) > 0.25 ||
              (e['$']['d'].length < 500 && Number(strokeWidth) > 0.1)
            ) {
              const s = JSON.parse(JSON.stringify(e))
              s['$']['fill'] = 'none'
              s['$']['stroke'] = '#000'
              s['$']['stroke-width'] = strokeWidth
              if (opacity) {
                stroke = applyOpacity(stroke, opacity)
              }
              addOrMerge(paths, s, stroke)
            } else {
              //console.log("Skipping stroke in " + baseName + ", color " + stroke + " width " + strokeWidth);
              //console.log(e['$']);
            }
          }
        }
      })
    }

    addToPaths('#000000ff', 'none', 1.0, '1', undefined, result['svg']['$$'])

    let layerIndex = 0
    const layers = []
    paths.forEach(function (path) {
      const svg = xmlbuilder.create('svg')
      for (const i in result['svg']['$']) {
        svg.att(i, result['svg']['$'][i])
      }

      path.paths.forEach(curry(addToXML, svg))
      const svgString = svg.toString()

      // see if there's an already-defined component that matches this shape
      let glyphName = components[svgString]

      // if not, create a new component glyph for this layer
      if (glyphName === undefined) {
        glyphName = baseName + '_layer' + layerIndex
        components[svgString] = glyphName
        codepoints.push('"u' + glyphName + '": -1')
        fs.writeFileSync(targetDir + '/glyphs/u' + glyphName + '.svg', svgString)
      }

      // add to the glyph's list of color layers
      layers.push({ color: path.color, glyphName: glyphName })

      // if we haven't seen this color before, add it to the palette
      if (colorToId[path.color] === undefined) {
        colorToId[path.color] = colors.length
        colors.push(path.color)
      }
      layerIndex = layerIndex + 1
    })

    if (unicodes.length === 1) {
      // simple character (single codepoint)
      chars.push({ unicode: unicodes[0], components: layers })
    } else {
      ligatures.push({ unicodes: unicodes, components: layers })
      // create the placeholder glyph for the ligature (to be mapped to a set of color layers)
      fs.writeFileSync(
        targetDir + '/glyphs/u' + unicodes.join('_') + '.svg',
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" enable-background="new 0 0 64 64"></svg>'
      )
      codepoints.push('"u' + unicodes.join('_') + '": -1')
    }
    unicodes.forEach(function (u) {
      // make sure we have a placeholder glyph for the individual character, or for each component of the ligature
      fs.writeFileSync(
        targetDir + '/glyphs/u' + u + '.svg',
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" enable-background="new 0 0 64 64"></svg>'
      )
      codepoints.push('"u' + u + '": ' + parseInt(u, 16))
    })
  })
}

function generateTTX() {
  // After we've processed all the source SVGs, we'll generate the auxiliary
  // files needed for OpenType font creation.
  // We also save the color-layer info in a separate JSON file, for the convenience
  // of the test script.

  const layerInfo = {}

  const ttFont = xmlbuilder.create('ttFont')
  ttFont.att('sfntVersion', '\\x00\\x01\\x00\\x00')
  ttFont.att('ttLibVersion', '3.0')

  // COLR table records the color layers that make up each colored glyph
  const COLR = ttFont.ele('COLR')
  COLR.ele('version', { value: 0 })
  chars.forEach(function (ch) {
    const colorGlyph = COLR.ele('ColorGlyph', { name: 'u' + ch.unicode })
    ch.components.forEach(function (cmp) {
      colorGlyph.ele('layer', { colorID: colorToId[cmp.color], name: 'u' + cmp.glyphName })
    })
    layerInfo[ch.unicode] = ch.components.map(function (cmp) {
      return 'u' + cmp.glyphName
    })
  })

  ligatures.forEach(function (lig) {
    const colorGlyph = COLR.ele('ColorGlyph', { name: 'u' + lig.unicodes.join('_') })
    lig.components.forEach(function (cmp) {
      colorGlyph.ele('layer', { colorID: colorToId[cmp.color], name: 'u' + cmp.glyphName })
    })
    layerInfo[lig.unicodes.join('_')] = lig.components.map(function (cmp) {
      return 'u' + cmp.glyphName
    })
  })
  fs.writeFileSync(targetDir + '/layer_info.json', JSON.stringify(layerInfo, null, 2))

  // CPAL table maps color index values to RGB colors
  const CPAL = ttFont.ele('CPAL')
  CPAL.ele('version', { value: 0 })
  CPAL.ele('numPaletteEntries', { value: colors.length })
  const palette = CPAL.ele('palette', { index: 0 })
  let index = 0
  colors.forEach(function (c) {
    if (c.substr(0, 3) === 'url') {
      console.log('unexpected color: ' + c)
      c = '#000000ff'
    }
    palette.ele('color', { index: index, value: c })
    index = index + 1
  })

  // GSUB table implements the ligature rules for Regional Indicator pairs and emoji-ZWJ sequences
  const GSUB = ttFont.ele('GSUB')
  GSUB.ele('Version', { value: '0x00010000' })

  const scriptRecord = GSUB.ele('ScriptList').ele('ScriptRecord', { index: 0 })
  scriptRecord.ele('ScriptTag', { value: 'DFLT' })

  const defaultLangSys = scriptRecord.ele('Script').ele('DefaultLangSys')
  defaultLangSys.ele('ReqFeatureIndex', { value: 65535 })
  defaultLangSys.ele('FeatureIndex', { index: 0, value: 0 })

  // The ligature rules are assigned to the "ccmp" feature (*not* "liga"),
  // as they should not be disabled in contexts such as letter-spacing or
  // inter-character justification, where "normal" ligatures are turned off.
  const featureRecord = GSUB.ele('FeatureList').ele('FeatureRecord', { index: 0 })
  featureRecord.ele('FeatureTag', { value: 'ccmp' })
  featureRecord.ele('Feature').ele('LookupListIndex', { index: 0, value: 0 })

  const lookup = GSUB.ele('LookupList').ele('Lookup', { index: 0 })
  lookup.ele('LookupType', { value: 4 })
  lookup.ele('LookupFlag', { value: 0 })

  const ligatureSubst = lookup.ele('LigatureSubst', { index: 0, Format: 1 })
  const ligatureSets = {}
  const ligatureSetKeys = []

  const addLigToSet = function (lig) {
    const startGlyph = 'u' + lig.unicodes[0]
    const components = 'u' + lig.unicodes.slice(1).join(',u')
    const glyphName = lig.glyphName || 'u' + lig.unicodes.join('_')
    if (ligatureSets[startGlyph] === undefined) {
      ligatureSetKeys.push(startGlyph)
      ligatureSets[startGlyph] = []
    }
    ligatureSets[startGlyph].push({ components: components, glyph: glyphName })
  }

  ligatures.forEach(addLigToSet)
  // extraLigatures.forEach(addLigToSet);

  ligatureSetKeys.sort()
  ligatureSetKeys.forEach(function (glyph) {
    const ligatureSet = ligatureSubst.ele('LigatureSet', { glyph: glyph })
    const set = ligatureSets[glyph]
    // sort ligatures with more components first
    set.sort(function (a, b) {
      return b.components.length - a.components.length
    })
    set.forEach(function (lig) {
      ligatureSet.ele('Ligature', { components: lig.components, glyph: lig.glyph })
    })
  })

  const ttx = fs.createWriteStream(targetDir + '/' + fontName + '.ttx')
  ttx.write('<?xml version="1.0" encoding="UTF-8"?>\n')
  ttx.write(ttFont.toString())
  ttx.end()

  // Write out the codepoints file to control character code assignments by grunt-webfont
  fs.writeFileSync(targetDir + '/codepoints.js', '{\n' + codepoints.join(',\n') + '\n}\n')
}

// Delete and re-create target directory, to remove any pre-existing junk
// Delete and re-create target directory, to remove any pre-existing junk
rmdir(targetDir, function () {
  fs.mkdirSync(targetDir)
  fs.mkdirSync(targetDir + '/glyphs')
  fs.mkdirSync(targetDir + '/colorGlyphs')

  // Read glyphs from the "extras" directory

  // Get list of glyphs in the "overrides" directory, which will be used to replace
  // same-named glyphs from the main source archive

  let index = 57344 + Number(startIndex)
  // Finally, we're ready to process the images from the main source archive:
  fs.createReadStream(sourceZip)
    .pipe(unzipper.Parse())
    .on('entry', function (e) {
      let data = ''
      let fileName = e.path.replace(/^.*\//, '') // strip any directory names
      if (e.type === 'File' && e.path.substr(-4, 4) === '.svg' && !fileName.startsWith('.')) {
        // Check for an override; if present, read that instead

        fileName = index.toString(16)
        index++

        e.on('data', function (c) {
          data += c.toString()
        })
        e.on('end', function () {
          processFile(fileName, data)
        })
      } else {
        e.autodrain()
      }
    })
    .on('close', generateTTX)
})
