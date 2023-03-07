import { HttpException } from '@/exceptions/http-exception'
import { Next, Context } from 'koa'

export const catchError = async (ctx: Context, next: Next) => {
  try {
    await next()
  } catch (error) {
    if (error instanceof HttpException) {
      return (ctx.body = { message: error.message, status: error.status })
    }

    console.log('unCatch error', error)
  }
}
