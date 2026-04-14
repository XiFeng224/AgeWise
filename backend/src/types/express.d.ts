import { User } from '../models'

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number
        username: string
        role: string
        realName: string
      }
    }
  }
}

export {}