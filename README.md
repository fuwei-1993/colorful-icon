# icon

图标库工具
- 能将svg转换成彩色字体
- 能将svg转换成黑白字体

FontForge 和 font-tools 都需要安装

    # OS X
    brew install fonttools fontforge python-setuptools

    # Ubuntu, for example
    sudo apt install fonttools fontforge python3-fontforge

# 启动

    yarn start


# DTO

```tsx
import { IconInfo } from '../interface/icon.interface'
import { Type } from 'class-transformer'
import { IsNotEmpty, IsString, ValidateNested, IsArray, Matches, IsOptional, IsBoolean } from 'class-validator'

export class IconInfoDto implements IconInfo {
  @Matches(/^[A-z-]+$/, {
    message: 'icon名只能是字母和横杠组合'
  })
  @IsString({
    message: 'icon名必须是字符串'
  })
  @IsNotEmpty({
    message: 'icon名不能为空'
  })
  name: string

  @IsString({
    message: 'icon内容必须是字符串'
  })
  @IsNotEmpty({
    message: 'icon内容不能为空'
  })
  svgContent: string

  @IsBoolean({
    message: 'keepColor字段必须是布尔值'
  })
  @IsOptional()
  keepColor?: boolean
}

export class IconCreateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IconInfoDto)
  iconList: IconInfoDto[]

  @IsString({
    message: 'version内容必须是字符串'
  })
  @IsNotEmpty({
    message: 'version内容不能为空'
  })
  version: string
}
```
