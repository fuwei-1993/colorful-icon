import { Construct } from './utils/map-route'
import 'reflect-metadata'
const SERVICE_METADATA = 'service'

export const Injectable = (): ClassDecorator => {
  return target => {
    Reflect.defineMetadata(SERVICE_METADATA, true, target)
  }
}

export const Factory = <T>(constructor: Construct<T>): T => {
  const paramTypes: any[] | undefined = Reflect.getMetadata('design:paramtypes', constructor)

  const providers =
    paramTypes?.map((provider: Construct<T>) => {
      const isInject = Reflect.getMetadata(SERVICE_METADATA, provider)
      return isInject ? Factory(provider) : undefined
    }) ?? []

  return new constructor(...providers)
}
