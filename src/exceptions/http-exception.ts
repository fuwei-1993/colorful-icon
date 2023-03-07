export class HttpException extends Error {
  status: number
  constructor({ msg = '前端参数错误' as any, status = 400 }) {
    super()
    this.message = msg
    this.status = status
  }
}
