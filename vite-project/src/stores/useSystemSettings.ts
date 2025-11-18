import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import { fetchSystemSettings, updateSystemSettings } from '@/services/systemSettingsService'

interface SystemSettingsState {
  enableSpeakerRecognition: boolean
  loading: boolean
  updating: boolean
  initialized: boolean
  error: string | null
  sessionSpeakerEnabled: boolean | null
}

export const useSystemSettingsStore = defineStore('systemSettings', {
  state: (): SystemSettingsState => ({
    enableSpeakerRecognition: true,
    loading: false,
    updating: false,
    initialized: false,
    error: null,
    sessionSpeakerEnabled: null,
  }),
  actions: {
    async loadSettings(force = false) {
      if (this.loading || (this.initialized && !force)) return
      this.loading = true
      this.error = null
      try {
        const settings = await fetchSystemSettings()
        this.enableSpeakerRecognition = Boolean(settings.enable_speaker_recognition)
        this.initialized = true
      } catch (error) {
        console.error('[useSystemSettingsStore] loadSettings failed', error)
        this.error = '无法获取系统设置'
      } finally {
        this.loading = false
      }
    },
    async toggleSpeakerRecognition(nextValue: boolean) {
      if (this.updating) return
      this.updating = true
      this.error = null
      const previous = this.enableSpeakerRecognition
      this.enableSpeakerRecognition = nextValue
      try {
        const payload = await updateSystemSettings({ enable_speaker_recognition: nextValue })
        this.enableSpeakerRecognition = Boolean(payload.enable_speaker_recognition)
        ElMessage.success('说话人识别配置已更新，新建会话生效')
      } catch (error) {
        console.error('[useSystemSettingsStore] toggleSpeakerRecognition failed', error)
        this.enableSpeakerRecognition = previous
        this.error = '更新说话人识别配置失败'
        ElMessage.error('更新失败，请重试')
      } finally {
        this.updating = false
      }
    },
    setSessionSpeakerEnabled(enabled: boolean | null) {
      this.sessionSpeakerEnabled = enabled
    },
  },
})
