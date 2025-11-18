import api from '@/services/apiService'

interface SystemSettingsResponse {
  enable_speaker_recognition: boolean
}

export async function fetchSystemSettings(): Promise<SystemSettingsResponse> {
  const response = await api.get<SystemSettingsResponse>('api/settings/system')
  return response.data
}

export async function updateSystemSettings(body: { enable_speaker_recognition: boolean }): Promise<SystemSettingsResponse> {
  const response = await api.patch<SystemSettingsResponse>('api/settings/system', body)
  return response.data
}
