import Koa from 'koa'
import 'module-alias/register'
import configuration from './config/configuration'
import koaBody from 'koa-body'
import bodyParser from 'koa-bodyparser'
import koaStatic from 'koa-static'
import helmet from 'koa-helmet'
import path from 'path'
import { router } from './router'
import 'reflect-metadata'

const { port } = configuration()
const app = new Koa()

async function bootstrap() {
  // 阻止xss攻击
  app.use(helmet())
  app.use(
    koaBody({
      jsonLimit: '2mb',
      multipart: true,
      formidable: {
        maxFieldsSize: 10 * 1024 * 1024
      }
    })
  )

  app.use(bodyParser())
  app.use(router.routes())

  //测试静态路径
  app.use(koaStatic(path.join(__dirname, './static')))

  app.listen(port, () => {
    console.log('启动成功')
  })
}

bootstrap()
