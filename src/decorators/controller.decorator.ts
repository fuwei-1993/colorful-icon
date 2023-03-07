import { RouterContext } from 'koa-router'
import get from 'lodash/get'

export const METHOD_METADATA = 'method'
export const PATH_METADATA = 'path'
export const PARAM_METADATA = 'param'

enum MethodType {
  POST = 'post',
  GET = 'get',
  PATCH = 'patch',
  DELETE = 'delete',
  PUT = 'put'
}

type ParamMetadata = {
  parameterIndex: number
  path: ParamType
  objectPath: string
}

enum ParamType {
  QUERY = 'query',
  PARAM = 'params',
  BODY = 'body'
}

export const Controller = (path: string): ClassDecorator => {
  return target => {
    Reflect.defineMetadata(PATH_METADATA, path, target)
  }
}

const createMappingDecorator =
  (method: MethodType) =>
  (path: string): MethodDecorator => {
    return (target, key, descriptor) => {
      const originFn = descriptor.value
      descriptor.value = async function (...originParams: [RouterContext, ...any[]]) {
        const params = formatParams(originParams, Reflect.getMetadata(PARAM_METADATA, target, key))

        return await (originFn as unknown as () => void).apply(this, params)
      } as unknown as typeof descriptor.value

      Reflect.defineMetadata(PATH_METADATA, path, descriptor.value)
      Reflect.defineMetadata(METHOD_METADATA, method, descriptor.value)
    }
  }

const formatParams = <T extends [RouterContext, ...any[]]>(originParams: T, metadata: ParamMetadata) => {
  if (!metadata) return originParams

  const [context] = originParams
  const { parameterIndex, path, objectPath } = metadata
  const result = []
  const target = getTargetObjByPath(context, path)
  result[parameterIndex] = objectPath ? get(target, `${objectPath}`) : target

  return result.concat(originParams)
}

const getTargetObjByPath = (context: RouterContext, path: ParamType) => {
  switch (path) {
    case ParamType.QUERY:
    case ParamType.PARAM:
      return context[path]
    case ParamType.BODY:
      return context.request[path]
    default:
      return context[path]
  }
}

const createParamDecorator =
  (path: ParamType) =>
  (objectPath = ''): ParameterDecorator => {
    return (target, propertyKey, parameterIndex) => {
      const paramMetadata: ParamMetadata = {
        parameterIndex,
        path,
        objectPath
      }
      Reflect.defineMetadata(PARAM_METADATA, paramMetadata, target, propertyKey)
    }
  }

export const Body = createParamDecorator(ParamType.BODY)
export const Param = createParamDecorator(ParamType.PARAM)
export const Query = createParamDecorator(ParamType.QUERY)

export const Get = createMappingDecorator(MethodType.GET)
export const Post = createMappingDecorator(MethodType.POST)
export const Put = createMappingDecorator(MethodType.PUT)
export const Delete = createMappingDecorator(MethodType.DELETE)
