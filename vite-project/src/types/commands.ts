export interface CommandItem {
  id: number
  text: string
  createdAt: string
}

export interface CommandItemResponse {
  id: number
  text: string
  created_at: string
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
}

export interface CommandUploadRequest {
  commands: string[]
}

export interface CommandToggleRequest {
  enabled: boolean
  matchThreshold?: number
}

export interface CommandMatchResult {
  matched: boolean
  command?: string
  score?: number
}
