const TOKEN_KEY = 'token'
const LOGIN_TYPE_KEY = 'login_type'
const ID_TOKEN_KEY = 'id_token'

export type LoginType = 'local' | 'oidc'

export const tokenStorage = {
  get: (): string | null => {
    return localStorage.getItem(TOKEN_KEY)
  },
  set: (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token)
  },
  remove: (): void => {
    localStorage.removeItem(TOKEN_KEY)
  },
}

export const loginTypeStorage = {
  get: (): LoginType => {
    return (localStorage.getItem(LOGIN_TYPE_KEY) as LoginType) || 'local'
  },
  set: (type: LoginType): void => {
    localStorage.setItem(LOGIN_TYPE_KEY, type)
  },
  remove: (): void => {
    localStorage.removeItem(LOGIN_TYPE_KEY)
  },
}

export const idTokenStorage = {
  get: (): string | null => {
    return localStorage.getItem(ID_TOKEN_KEY)
  },
  set: (token: string): void => {
    localStorage.setItem(ID_TOKEN_KEY, token)
  },
  remove: (): void => {
    localStorage.removeItem(ID_TOKEN_KEY)
  },
}
