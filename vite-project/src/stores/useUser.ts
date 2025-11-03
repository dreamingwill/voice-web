import { defineStore } from 'pinia'
import api, { setAuthToken } from '@/services/apiService'

interface Credentials {
  username: string
  password: string
}

interface AuthUser {
  id: number
  username: string
  role: string
  display_name?: string | null
}

interface UserState {
  isAuthenticated: boolean
  token: string | null
  refreshToken: string | null
  user: AuthUser | null
  initialized: boolean
}

const STORAGE_KEYS = {
  token: 'voice_web_token',
  refresh: 'voice_web_refresh_token',
  user: 'voice_web_user',
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    isAuthenticated: false,
    token: null,
    refreshToken: null,
    user: null,
    initialized: false,
  }),
  getters: {
    operatorName: (state) => state.user?.display_name ?? state.user?.username ?? null,
    role: (state) => state.user?.role ?? null,
  },
  actions: {
    initialize() {
      if (this.initialized) return

      const token = localStorage.getItem(STORAGE_KEYS.token)
      const refreshToken = localStorage.getItem(STORAGE_KEYS.refresh)
      const userRaw = localStorage.getItem(STORAGE_KEYS.user)

      if (token && userRaw) {
        try {
          const user = JSON.parse(userRaw) as AuthUser
          this.token = token
          this.refreshToken = refreshToken
          this.user = user
          this.isAuthenticated = true
          setAuthToken(token)
        } catch (error) {
          console.warn('[useUserStore] failed to parse stored user', error)
          this.clearPersisted()
        }
      }

      this.initialized = true
    },
    persist() {
      if (this.token) {
        localStorage.setItem(STORAGE_KEYS.token, this.token)
      }
      if (this.refreshToken) {
        localStorage.setItem(STORAGE_KEYS.refresh, this.refreshToken)
      }
      if (this.user) {
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.user))
      }
    },
    clearPersisted() {
      localStorage.removeItem(STORAGE_KEYS.token)
      localStorage.removeItem(STORAGE_KEYS.refresh)
      localStorage.removeItem(STORAGE_KEYS.user)
    },
    async login({ username, password }: Credentials): Promise<boolean> {
      try {
        const response = await api.post('/auth/login', { username, password })
        const { token, refresh_token: refreshToken, user } = response.data as {
          token: string
          refresh_token: string
          user: AuthUser
        }
        this.isAuthenticated = true
        this.token = token
        this.refreshToken = refreshToken
        this.user = user
        setAuthToken(token)
        this.persist()
        return true
      } catch (error) {
        this.logout()
        return false
      }
    },
    logout() {
      this.isAuthenticated = false
      this.token = null
      this.refreshToken = null
      this.user = null
      setAuthToken(null)
      this.clearPersisted()
    },
  },
})
