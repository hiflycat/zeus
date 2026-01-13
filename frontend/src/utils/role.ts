const CURRENT_ROLE_ID_KEY = 'current_role_id'

export const roleStorage = {
  get: (): number | null => {
    const value = localStorage.getItem(CURRENT_ROLE_ID_KEY)
    if (value) {
      const roleId = parseInt(value, 10)
      if (!isNaN(roleId)) {
        return roleId
      }
    }
    return null
  },
  set: (roleId: number | null): void => {
    if (roleId !== null) {
      localStorage.setItem(CURRENT_ROLE_ID_KEY, roleId.toString())
    } else {
      localStorage.removeItem(CURRENT_ROLE_ID_KEY)
    }
  },
  remove: (): void => {
    localStorage.removeItem(CURRENT_ROLE_ID_KEY)
  },
}
