import { Factory } from '../ioc.decorator'
import isFunction from 'lodash/isFunction'
import Router from 'koa-router'
import { METHOD_METADATA, PATH_METADATA } from '../controller.decorator'

export type Construct<T = any> = new (...args: any[]) => T

function isConstructor(name: string) {
  return name === 'constructor'
}

export function mapRoute<T>(instance: T) {
  const prototype = Object.getPrototypeOf(instance)

  const methodsNames = Object.getOwnPropertyNames(prototype).filter(
    name => !isConstructor(name) && isFunction(prototype[name])
  )

  return methodsNames.map(methodName => {
    const fn: () => void = prototype[methodName]
    const route: string = Reflect.getMetadata(PATH_METADATA, fn)
    const method: string = Reflect.getMetadata(METHOD_METADATA, fn)

    return {
      route,
      method,
      fn
    }
  })
}

export function mapController<T>(Controller: Construct<T>): [string, Router.IMiddleware] {
  const controllerPath = Reflect.getMetadata(PATH_METADATA, Controller)
  const instance = Factory(Controller)

  const routes = mapRoute(instance)
  const router = new Router()

  routes.forEach(({ route, method, fn }) => {
    router[method](`/${route}`, fn.bind(instance))
  })

  return [`/${controllerPath}`, router.routes()]
}
