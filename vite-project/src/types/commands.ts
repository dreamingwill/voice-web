export type CommandStatus = 'enabled' | 'disabled'

export interface CommandItem {
  id: number
  code?: string | null
  text: string
  createdAt: string
  status: CommandStatus
}

export interface CommandItemResponse {
  id: number
  code?: string | null
  text: string
  created_at: string
  status?: CommandStatus
}

export interface CommandListResponse {
  enabled: boolean
  match_threshold: number
  items: CommandItemResponse[]
  total: number
  page: number
  page_size: number
  updated_at?: string
}

export interface CommandListPayload {
  enabled: boolean
  matchThreshold: number
  commands: CommandItem[]
  total: number
  page: number
  pageSize: number
  updatedAt: string | null
}

export interface CommandSearchResponse {
  items: CommandItemResponse[]
  total: number
  page: number
  page_size: number
}

export interface CommandSearchPayload {
  items: CommandItem[]
  total: number
  page: number
  pageSize: number
}

export interface CommandUploadRequest {
  commands: CommandUploadItem[]
}

export interface CommandUploadItem {
  text: string
  code?: string | null
}

export interface CommandToggleRequest {
  enabled: boolean
  matchThreshold?: number
}

export interface CommandStatusUpdateRequest {
  status: CommandStatus
}

export interface CommandUpdateRequest {
  text: string
  code?: string | null
}

export interface CommandMatchResult {
  matched: boolean
  command?: string
  score?: number
  code?: string
  command_id?: number
  blocked?: boolean
  block_reason?: string
}
