import axios from 'axios'

let accessToken: string | null = null

export function setAuthToken(token: string | null) {
  accessToken = token
}

export function getAuthToken(): string | null {
  return accessToken
}

const rawBaseURL = import.meta.env.VITE_API_BASE ?? '/api'
const normalizedBaseURL = rawBaseURL.endsWith('/') ? rawBaseURL : `${rawBaseURL}/`

const api = axios.create({
  baseURL: normalizedBaseURL,
  timeout: 10_000,
})

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[apiService] request failed', error)
    return Promise.reject(error)
  },
)

export default api

export type { AxiosResponse } from 'axios'
