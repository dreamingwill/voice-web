import api from '@/services/apiService'
import type {
  CommandListResponse,
  CommandListPayload,
  CommandUploadRequest,
  CommandToggleRequest,
  CommandSearchResponse,
  CommandItem,
  CommandSearchPayload,
  CommandItemResponse,
  CommandStatus,
  CommandStatusUpdateRequest,
  CommandUpdateRequest,
} from '@/types/commands'

function normalizeItem(item: CommandItemResponse): CommandItem {
  return {
    id: item.id,
    code: item.code ?? null,
    text: item.text,
    createdAt: item.created_at,
    status: item.status ?? 'enabled',
  }
}

function normalizeList(response: CommandListResponse): CommandListPayload {
  return {
    enabled: Boolean(response.enabled),
    matchThreshold: typeof response.match_threshold === 'number' ? response.match_threshold : 0.75,
    commands: Array.isArray(response.items) ? response.items.map(normalizeItem) : [],
    total: response.total ?? 0,
    page: response.page ?? 1,
    pageSize: response.page_size ?? 10,
    updatedAt: response.updated_at ?? null,
  }
}

export async function fetchCommandList(params?: { page?: number; pageSize?: number }): Promise<CommandListPayload> {
  const response = await api.get<CommandListResponse>('api/commands', {
    params: {
      page: params?.page,
      page_size: params?.pageSize,
    },
  })
  return normalizeList(response.data)
}

export async function uploadCommands(body: CommandUploadRequest): Promise<void> {
  await api.post('api/commands/upload', body)
}

export async function toggleCommandMatching({
  enabled,
  matchThreshold,
}: CommandToggleRequest): Promise<CommandListPayload> {
  const response = await api.post<CommandListResponse>('api/commands/toggle', {
    enabled,
    match_threshold: matchThreshold,
  })
  return normalizeList(response.data)
}

export async function searchCommands(
  filters: { keyword?: string; code?: string },
  page?: number,
  pageSize?: number,
): Promise<CommandSearchPayload> {
  const response = await api.get<CommandSearchResponse>('api/commands/search', {
    params: {
      q: filters.keyword,
      code: filters.code,
      page,
      page_size: pageSize,
    },
  })
  const items = Array.isArray(response.data.items) ? response.data.items.map(normalizeItem) : []
  return {
    items,
    total: response.data.total ?? items.length,
    page: response.data.page ?? page ?? 1,
    pageSize: response.data.page_size ?? pageSize ?? 20,
  }
}

export async function updateCommand(commandId: number, payload: CommandUpdateRequest): Promise<void> {
  await api.put(`api/commands/${commandId}`, payload)
}

export async function deleteCommand(commandId: number): Promise<void> {
  await api.delete(`api/commands/${commandId}`)
}

export async function updateCommandStatus(commandId: number, status: CommandStatus): Promise<CommandItem> {
  const body: CommandStatusUpdateRequest = { status }
  const response = await api.patch<CommandItemResponse>(`api/commands/${commandId}/status`, body)
  return normalizeItem(response.data)
}
