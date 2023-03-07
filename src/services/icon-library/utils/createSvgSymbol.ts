import { load } from 'cheerio'

export function createSvgSymbol(svgFiles: { svgContent: string; name: string }[]) {
  const $ = load(
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="0" height="0" style="display:none;"></svg>'
  )
  return new Promise<{ svg: string }>(resolve => {
    svgFiles.forEach(({ svgContent, name }) => {
      const svgNode = $(svgContent)
      const symbolNode = $('<symbol></symbol>')
      symbolNode.attr('viewBox', svgNode.attr('viewBox'))
      symbolNode.attr('id', `${name}`)
      symbolNode.append(svgNode.html())
      $('svg').append(symbolNode)
    })
    resolve({
      svg: $.html('svg')
    })
  })
}
