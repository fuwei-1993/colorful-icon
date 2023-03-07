import { validate } from 'class-validator'
import { Construct } from './utils/map-route'
import { plainToClass } from 'class-transformer'
import { HttpException } from '../exceptions/http-exception'

export const Validator = <T extends Record<string, any>>({ type }: { type: Construct<T> }): MethodDecorator => {
  return (target, propertyKey, descriptor) => {
    const originFn = descriptor.value

    descriptor.value = async function (...args) {
      const paramTypes: any[] | undefined = Reflect.getMetadata('design:paramtypes', target, propertyKey)
      const validateInstance = new type()
      const index = paramTypes?.findIndex(paramType => validateInstance instanceof paramType) ?? null

      if (typeof index === 'number') {
        const dtoInstance = plainToClass(type, args[index])
        const errors = await validate(dtoInstance)
        if (errors.length) {
          throw new HttpException({ msg: errors, status: 400 })
        }
      }

      return await (originFn as unknown as () => void).apply(this, args)
    } as unknown as typeof descriptor.value
  }
}
