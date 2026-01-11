import { defineStore } from 'pinia'
import {
  deleteCommand,
  fetchCommandList,
  searchCommands,
  toggleCommandMatching,
  updateCommand as updateCommandRequest,
  updateCommandStatus,
  uploadCommands,
} from '@/services/commandService'
import type { CommandItem, CommandMatchResult, CommandStatus, CommandUploadItem } from '@/types/commands'

const BULK_CODE_DELIMITERS = ['\t', '|', ',', '，']

function parseUploadLine(line: string): CommandUploadItem | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  for (const delimiter of BULK_CODE_DELIMITERS) {
    const index = trimmed.indexOf(delimiter)
    if (index > 0) {
      const codePart = trimmed.slice(0, index).trim()
      const textPart = trimmed.slice(index + 1).trim()
      if (textPart) {
        return {
          text: textPart,
          code: codePart || undefined,
        }
      }
    }
  }

  const multiSpaceMatch = trimmed.match(/^(\S+)\s{2,}(.+)$/)
  if (multiSpaceMatch) {
    const codePart = multiSpaceMatch[1]?.trim()
    const textPart = multiSpaceMatch[2]?.trim()
    if (textPart) {
      return {
        text: textPart,
        code: codePart || undefined,
      }
    }
  }

  return { text: trimmed }
}

interface CommandMatchSnapshot extends CommandMatchResult {
  command: string
  segmentId: number
  timestamp: string
}

interface CommandsState {
  enabled: boolean
  matchThreshold: number
  commands: CommandItem[]
  total: number
  page: number
  pageSize: number
  updatedAt: string | null
  loading: boolean
  saving: boolean
  uploading: boolean
  initialized: boolean
  error: string | null
  lastMatch: CommandMatchSnapshot | null
  searching: boolean
  searchResults: CommandItem[]
  searchTotal: number
  searchPage: number
  searchPageSize: number
  searchQuery: string
  searchCode: string
  searchActive: boolean
}

export const useCommandsStore = defineStore('commands', {
  state: (): CommandsState => ({
    enabled: false,
    matchThreshold: 0.75,
    commands: [],
    total: 0,
    page: 1,
    pageSize: 10,
    updatedAt: null,
    loading: false,
    saving: false,
    uploading: false,
    initialized: false,
    error: null,
    lastMatch: null,
    searching: false,
    searchResults: [],
    searchTotal: 0,
    searchPage: 1,
    searchPageSize: 10,
    searchQuery: '',
    searchCode: '',
    searchActive: false,
  }),
  getters: {
    commandCount: (state) => state.total,
    hasSearchResults: (state) => state.searchActive,
  },
  actions: {
    async fetchCommands(options?: { page?: number; pageSize?: number; force?: boolean }) {
      const nextPage = options?.page ?? this.page
      const nextSize = options?.pageSize ?? this.pageSize
      if (this.loading || (!options?.force && this.initialized && nextPage === this.page && nextSize === this.pageSize)) {
        return
      }

      this.loading = true
      this.error = null

      try {
        const payload = await fetchCommandList({ page: nextPage, pageSize: nextSize })
        this.enabled = payload.enabled
        this.matchThreshold = payload.matchThreshold
        this.commands = payload.commands
        this.total = payload.total
        this.page = payload.page
        this.pageSize = payload.pageSize
        this.updatedAt = payload.updatedAt
        this.initialized = true
      } catch (error) {
        console.error('[useCommandsStore] fetchCommands failed', error)
        this.error = '无法获取指令配置'
      } finally {
        this.loading = false
      }
    },
    async refreshCommands() {
      await this.fetchCommands({ force: true })
    },
    async changePage(page: number) {
      if (page === this.page) return
      await this.fetchCommands({ page, pageSize: this.pageSize, force: true })
    },
    async changePageSize(size: number) {
      if (size === this.pageSize) return
      this.page = 1
      await this.fetchCommands({ page: 1, pageSize: size, force: true })
    },
    async saveSettings(payload: { enabled: boolean; matchThreshold?: number }) {
      if (this.saving) return false
      this.saving = true
      this.error = null
      try {
        const settings = await toggleCommandMatching({
          enabled: payload.enabled,
          matchThreshold: payload.matchThreshold ?? this.matchThreshold,
        })
        this.enabled = settings.enabled
        this.matchThreshold = settings.matchThreshold
        this.commands = settings.commands
        this.total = settings.total
        this.page = settings.page
        this.pageSize = settings.pageSize
        this.updatedAt = settings.updatedAt
        this.initialized = true
        return true
      } catch (error) {
        console.error('[useCommandsStore] saveSettings failed', error)
        this.error = '保存配置失败'
        return false
      } finally {
        this.saving = false
      }
    },
    async uploadCommandList(lines: string[]) {
      if (this.uploading) return false
      const parsed = lines
        .map((line) => parseUploadLine(line))
        .filter((item): item is CommandUploadItem => Boolean(item?.text?.trim()))
      if (!parsed.length) {
        this.error = '请输入至少一条指令'
        return false
      }
      const deduped: CommandUploadItem[] = []
      const uniqueKey = new Set<string>()
      for (const item of parsed) {
        const normalizedText = item.text.trim()
        const normalizedCode = item.code?.trim()
        if (!normalizedText) continue
        const key = `${normalizedCode ?? ''}::${normalizedText}`
        if (uniqueKey.has(key)) continue
        deduped.push({
          text: normalizedText,
          code: normalizedCode || undefined,
        })
        uniqueKey.add(key)
      }
      if (!deduped.length) {
        this.error = '请输入至少一条指令'
        return false
      }

      // const seenCodes = new Set<string>()
      for (const item of deduped) {
        if (!item.code) continue
        const normalizedCode = item.code.trim()
        if (!normalizedCode) {
          item.code = undefined
          continue
        }
        if (normalizedCode.length > 64) {
          this.error = `编号「${normalizedCode}」长度超出 64 个字符`
          return false
        }
        // if (seenCodes.has(normalizedCode)) {
        //   this.error = `编号「${normalizedCode}」重复，请检查上传内容`
        //   return false
        // }
        // seenCodes.add(normalizedCode)
        item.code = normalizedCode
      }

      this.uploading = true
      this.error = null
      try {
        await uploadCommands({ commands: deduped })
        this.page = 1
        await this.fetchCommands({ page: 1, pageSize: this.pageSize, force: true })
        return true
      } catch (error) {
        console.error('[useCommandsStore] uploadCommandList failed', error)
        this.error = '上传指令失败'
        return false
      } finally {
        this.uploading = false
      }
    },
    async search(keyword = '', code?: string, options?: { page?: number; pageSize?: number }) {
      const normalizedKeyword = keyword.trim()
      const normalizedCode = (code ?? '').trim()
      if (!normalizedKeyword && !normalizedCode) {
        this.clearSearchResults()
        this.error = null
        return
      }
      const sameKeyword = normalizedKeyword === this.searchQuery
      const sameCode = normalizedCode === this.searchCode
      const nextPage = options?.page ?? (sameKeyword && sameCode ? this.searchPage : 1)
      const nextPageSize = options?.pageSize ?? this.searchPageSize
      this.searching = true
      this.error = null
      try {
        const payload = await searchCommands(
          {
            keyword: normalizedKeyword || undefined,
            code: normalizedCode || undefined,
          },
          nextPage,
          nextPageSize,
        )
        this.searchResults = payload.items
        this.searchTotal = payload.total
        this.searchPage = payload.page
        this.searchPageSize = payload.pageSize
        this.searchQuery = normalizedKeyword
        this.searchCode = normalizedCode
        this.searchActive = true
      } catch (error) {
        console.error('[useCommandsStore] search failed', error)
        this.error = '搜索指令失败'
        this.searchResults = []
        this.searchTotal = 0
        this.searchCode = ''
        this.searchActive = false
      } finally {
        this.searching = false
      }
    },
    async changeSearchPage(page: number) {
      if (!this.searchActive || page === this.searchPage) return
      await this.search(this.searchQuery, this.searchCode, { page, pageSize: this.searchPageSize })
    },
    async changeSearchPageSize(size: number) {
      if (!this.searchActive || size === this.searchPageSize) return
      await this.search(this.searchQuery, this.searchCode, { page: 1, pageSize: size })
    },
    clearSearchResults() {
      this.searchResults = []
      this.searchTotal = 0
      this.searchPage = 1
      this.searchQuery = ''
      this.searchCode = ''
      this.searchActive = false
    },
    async updateCommand(commandId: number, payload: { text: string; code?: string | null }) {
      try {
        await updateCommandRequest(commandId, payload)
        const updateLocalList = (list: CommandItem[]) =>
          list.map((item) =>
            item.id === commandId ? { ...item, text: payload.text, code: payload.code ?? null } : item,
          )
        this.commands = updateLocalList(this.commands)
        this.searchResults = updateLocalList(this.searchResults)
      } catch (error) {
        console.error('[useCommandsStore] updateCommand failed', error)
        throw new Error('更新指令失败')
      }
    },
    async toggleCommandStatus(commandId: number, status: CommandStatus) {
      try {
        const updated = await updateCommandStatus(commandId, status)
        this.commands = this.commands.map((item) => (item.id === commandId ? updated : item))
        this.searchResults = this.searchResults.map((item) => (item.id === commandId ? updated : item))
      } catch (error) {
        console.error('[useCommandsStore] toggleCommandStatus failed', error)
        throw new Error('切换指令状态失败')
      }
    },
    async removeCommand(commandId: number) {
      try {
        await deleteCommand(commandId)
        const predictedTotal = this.total - 1
        const lastPageIndex = Math.ceil(predictedTotal / this.pageSize) || 1
        if (this.page > lastPageIndex) {
          this.page = lastPageIndex
        }
        await this.fetchCommands({ page: this.page, pageSize: this.pageSize, force: true })
        this.searchResults = this.searchResults.filter((item) => item.id !== commandId)
        if (this.searchActive && this.searchQuery) {
          const nextPage =
            this.searchResults.length === 0 && this.searchPage > 1 ? this.searchPage - 1 : this.searchPage
          await this.search(this.searchQuery, this.searchCode, { page: nextPage, pageSize: this.searchPageSize })
        }
      } catch (error) {
        console.error('[useCommandsStore] removeCommand failed', error)
        throw new Error('删除指令失败')
      }
    },
    setLastMatch(match: CommandMatchSnapshot | null) {
      this.lastMatch = match
    },
    clearLastMatch() {
      this.lastMatch = null
    },
  },
})
