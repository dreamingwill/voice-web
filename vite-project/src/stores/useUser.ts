import { defineStore } from 'pinia'

interface Credentials {
  username: string
  password: string
}

interface UserState {
  isAuthenticated: boolean
  operatorName: string | null
  role: string | null
}

const MOCK_ACCOUNT: Credentials & { operatorName: string; role: string } = {
  username: 'admin',
  password: 'voice123',
  operatorName: '指挥员 张伟',
  role: 'Supervisor',
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    isAuthenticated: false,
    operatorName: null,
    role: null,
  }),
  actions: {
    login({ username, password }: Credentials): boolean {
      if (username === MOCK_ACCOUNT.username && password === MOCK_ACCOUNT.password) {
        this.isAuthenticated = true
        this.operatorName = MOCK_ACCOUNT.operatorName
        this.role = MOCK_ACCOUNT.role
        return true
      }

      this.logout()
      return false
    },
    logout() {
      this.isAuthenticated = false
      this.operatorName = null
      this.role = null
    },
  },
})
