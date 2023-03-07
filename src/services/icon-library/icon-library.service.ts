import { Injectable } from '../../decorators/ioc.decorator'
import fontCarrier from 'font-carrier'
import { processString } from 'uglifycss'
import spawn from 'cross-spawn'
import JSZip from 'jszip'
import { ICON_NAME, CSS_FONT_FORMAT, ICON_COLORFUL_NAME } from '../../constants/icon-library'
import { IconInfo } from '@/controllers/icon-library/interface/icon.interface'
import { join } from 'path'
import ttf2woff from 'ttf2woff'
import ttf2woff2 from 'ttf2woff2'
import rmdir from 'rmdir'
import fs from 'fs'

const FONT_ENGINE_DIR = join(__dirname, '../../engine')

@Injectable()
export class IconLibraryService {
  // constructor(private readonly ossService: OssService) {}
  async createIconFont(iconInfo: IconInfo[], version: string) {
    const icons = iconInfo.filter(icon => !icon.keepColor)
    const iconsColorful = iconInfo.filter(icon => icon.keepColor)

    // const fontBufferMap = font.output() as Record<string, Buffer>
    // const fontKeys = Object.keys(fontBufferMap)
    // for (const key of fontKeys) {
    //   fontDownloadUrlMap[key] = `./${ICON_NAME}.${key}`
    // }
    const cssStr = this.createIconCssContent([ICON_NAME, ICON_COLORFUL_NAME], [...icons, ...iconsColorful], version)
    const colorfulFont = await this.createColorfulFont(icons.length, iconsColorful)
    const font = this.createFont(icons)

    const uglified = processString(cssStr, {
      maxLineLen: 500,
      expandVars: true
    })

    return {
      css: uglified,
      fonts: {
        [ICON_NAME]: font,
        [ICON_COLORFUL_NAME]: colorfulFont
      }
    }
  }

  private createFont = (icons: IconInfo[]) => {
    const font = fontCarrier.create()
    const result = icons.reduce((prev, { svgContent }, index) => {
      prev[`&#x${this.createUnicode(index)}`] = {
        svg: svgContent,
        glyphName: `&#x${this.createUnicode(index)}`
      }
      return prev
    }, {})

    font.setGlyph(result)
    return font.output({
      types: ['woff2', 'woff', 'ttf']
    })
  }

  private async createColorfulFont(startIndex: number, colorfulIcons: IconInfo[]) {
    const zip = new JSZip()
    return new Promise(async (resolve, reject) => {
      try {
        colorfulIcons.forEach(icon => {
          zip.file(`${icon.name}.svg`, icon.svgContent)
        })

        const content = await zip.generateAsync({ type: 'nodebuffer' })

        fs.writeFileSync(`${FONT_ENGINE_DIR}/${ICON_COLORFUL_NAME}.zip`, content, 'binary')
        rmdir(`${FONT_ENGINE_DIR}/build`, async () => {
          spawn.sync('make', ['-C', FONT_ENGINE_DIR, `START_LEN=${startIndex}`, `FONT_NAME=${ICON_COLORFUL_NAME}`], {
            stdio: 'inherit'
          })

          const ttf = fs.readFileSync(`${FONT_ENGINE_DIR}/build/${ICON_COLORFUL_NAME}.ttf`)

          resolve({
            ttf,
            woff: this.ttf2woff(ttf),
            woff2: this.ttf2woff2(ttf)
          })
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  private ttf2woff(input: Buffer) {
    return Buffer.from(ttf2woff(input).buffer)
  }
  private ttf2woff2(input: Buffer) {
    return Buffer.from(ttf2woff2(input).buffer)
  }

  createIconClassName(iconInfo: IconInfo[]) {
    return iconInfo.reduce((result, icon, index) => {
      result += `\n.${
        icon.name[0].toLocaleLowerCase() +
        icon.name.slice(1).replace(/[A-Z]/g, $1 => {
          return '-' + $1.toLocaleLowerCase()
        })
      }::after {
        content: '\\${this.createUnicode(index)}'
      }`
      return result
    }, '')
  }

  createUnicode(index: number) {
    const startCode = 57344
    return (startCode + index).toString(16)
  }

  createIconCssContent(fontNames: string[], iconInfo: IconInfo[], version) {
    const createFontFamilyBy = () => fontNames.map(name => `'${name}'`)
    const createFontFaceBy = () => {
      return fontNames.reduce((result, name) => {
        result += `\n @font-face {
          font-family: '${name}';
          src: url('./${name}.woff2?V=${version}') format('${CSS_FONT_FORMAT.woff2}'),
               url('./${name}.woff?V=${version}') format('${CSS_FONT_FORMAT.woff}'),
               url('./${name}.ttf?V=${version}') format('${CSS_FONT_FORMAT.ttf}');
         }`
        return result
      }, '')
    }
    const cssContent = `${createFontFaceBy()}
     .${ICON_COLORFUL_NAME} {
      font-family: '${ICON_COLORFUL_NAME}';
      font-weight: normal;
      font-style: normal;
     }
     .${ICON_NAME} {
      font-family: '${ICON_NAME}';
      font-weight: normal;
      font-style: normal;
     }
     `
    return cssContent + this.createIconClassName(iconInfo)
  }

  // async createIconSvgSymbol(iconInfo: IconInfo[]) {
  //   // TODO..
  // }
}
