import { mapController } from './decorators/utils/map-route'
import IconLibrary from './controllers/icon-library/icon-library.controller'
import Router from 'koa-router'
import configuration from './config/configuration'
import { catchError } from './middleware/catch-error'

const { prefix } = configuration()
const router = new Router({ prefix })
router.use(catchError)
router.use(...mapController(IconLibrary))

export { router }
