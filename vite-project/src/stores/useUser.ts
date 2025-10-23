import { defineStore } from 'pinia'
import api from '@/services/apiService'

interface Credentials {
  username: string
  password: string
}

interface UserState {
  isAuthenticated: boolean
  operatorName: string | null
  role: string | null
  token: string | null
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    isAuthenticated: false,
    operatorName: null,
    role: null,
    token: null,
  }),
  actions: {
    async login({ username, password }: Credentials): Promise<boolean> {
      try {
        const response = await api.post('/api/login', { username, password })
        const { token } = response.data as { token: string }
        this.isAuthenticated = true
        this.operatorName = '指挥员 张伟'
        this.role = '主管'
        this.token = token
        return true
      } catch (error) {
        this.logout()
        return false
      }
    },
    logout() {
      this.isAuthenticated = false
      this.operatorName = null
      this.role = null
      this.token = null
    },
  },
})
