const DOWNSTREAM_STATUS_PREFIX = 'Command forward request failed: downstream_status='
const NETWORK_ERROR_PREFIX = 'Command forward request failed: network_error='
const DOWNSTREAM_STATUS_BARE_PREFIX = 'downstream_status='
const NETWORK_ERROR_BARE_PREFIX = 'network_error='

export function getCommandForwardErrorMessage(detail?: string | null): string | null {
  if (!detail) return null
  const normalized = detail.trim()

  if (normalized === '没有该指令') {
    return '没有该指令，请确认项目编号或指令配置'
  }
  if (normalized === '没有该操作员') {
    return '没有该操作员，请确认账号与姓名'
  }
  if (normalized === 'Command forward URL not configured') {
    return '发送失败：未配置指令转发地址，请联系管理员'
  }
  if (normalized.startsWith(DOWNSTREAM_STATUS_PREFIX)) {
    const status = normalized.slice(DOWNSTREAM_STATUS_PREFIX.length).trim()
    if (status === '503') {
      return '发送失败：目标服务不可用（503），请确认接收端已启动并可访问'
    }
    return status ? `发送失败（下游状态码 ${status}）` : '发送失败（下游服务异常）'
  }
  if (normalized.startsWith(NETWORK_ERROR_PREFIX)) {
    const reason = normalized.slice(NETWORK_ERROR_PREFIX.length).trim()
    return reason ? `发送失败（网络错误：${reason}）` : '发送失败（网络异常）'
  }
  if (normalized.startsWith(DOWNSTREAM_STATUS_BARE_PREFIX)) {
    const status = normalized.slice(DOWNSTREAM_STATUS_BARE_PREFIX.length).trim()
    if (status === '503') {
      return '发送失败：目标服务不可用（503），请确认接收端已启动并可访问'
    }
    return status ? `发送失败（下游状态码 ${status}）` : '发送失败（下游服务异常）'
  }
  if (normalized.startsWith(NETWORK_ERROR_BARE_PREFIX)) {
    const reason = normalized.slice(NETWORK_ERROR_BARE_PREFIX.length).trim()
    return reason ? `发送失败（网络错误：${reason}）` : '发送失败（网络异常）'
  }

  return null
}
