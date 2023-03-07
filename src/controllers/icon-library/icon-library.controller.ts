import { RouterContext } from 'koa-router'
import { IconLibraryService } from '../../services/icon-library/icon-library.service'
import { Body, Controller, Delete, Get, Post, Put } from './../../decorators/controller.decorator'
import { IconCreateDto } from './dto/icon-create'
import { Validator } from '../../decorators/validator.decorator'

@Controller('icon-library')
class IconLibrary {
  constructor(private readonly iconLibraryService: IconLibraryService) {}
  @Post('create/font')
  @Validator({
    type: IconCreateDto
  })
  async createFontBySvg(@Body() iconCreate: IconCreateDto, ctx: RouterContext) {
    const { iconList, version } = iconCreate
    const result = await this.iconLibraryService.createIconFont(iconList, version)
    ctx.body = {
      status: 200,
      content: result
    }
  }

  // @Post('create/svg')
  // @Validator({
  //   type: IconCreateDto
  // })
  // async createSymbolJsBySvg(@Body() iconCreate: IconCreateDto, ctx: RouterContext) {
  //   const { iconList } = iconCreate
  //   await this.iconLibraryService.createIconSvgSymbol(iconList)
  // }
}

export default IconLibrary
