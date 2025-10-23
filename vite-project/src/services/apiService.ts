import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '/api',
  timeout: 10_000,
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
