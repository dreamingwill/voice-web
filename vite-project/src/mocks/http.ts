import api from '@/services/apiService'

interface Operator {
  id: string
  name: string
  role: string
  voiceprintId?: string
  updatedAt: string
}

interface LogEntry {
  id: string
  timestamp: string
  type: 'command' | 'report'
  operator: string
  summary: string
  authorized: boolean
}

const operators: Operator[] = [
  { id: 'op-1', name: '张伟', role: '指挥员', voiceprintId: 'VP-88421', updatedAt: new Date().toISOString() },
  { id: 'op-2', name: '李强', role: '操作员', voiceprintId: 'VP-77310', updatedAt: new Date().toISOString() },
  { id: 'op-3', name: '王芳', role: '巡逻员', voiceprintId: undefined, updatedAt: new Date().toISOString() },
]

const logs: LogEntry[] = [
  {
    id: 'log-1',
    timestamp: new Date().toISOString(),
    type: 'command',
    operator: '指挥员 张伟',
    summary: '发起倒计时指令（T-10）',
    authorized: true,
  },
  {
    id: 'log-2',
    timestamp: new Date().toISOString(),
    type: 'report',
    operator: '巡逻员 王芳',
    summary: '外围安全，继续巡查。',
    authorized: true,
  },
  {
    id: 'log-3',
    timestamp: new Date().toISOString(),
    type: 'command',
    operator: '未知人员',
    summary: '尝试在机库入口执行未授权解锁。',
    authorized: false,
  },
]

// simple JWT placeholder
const token = 'mock-jwt-token'

api.interceptors.request.use(async (config) => {
  const { url, method, data, headers } = config

  if (!url?.startsWith('/')) {
    return config
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      let responseData: unknown = null
      let status = 200

      if (url === '/auth/login' && method === 'post') {
        const body = typeof data === 'string' ? JSON.parse(data) : data
        if (body?.username === 'admin' && body?.password === 'voice123') {
          responseData = { token, expiresIn: 3600 }
        } else {
          status = 401
          responseData = { message: 'INVALID_CREDENTIALS' }
        }
      } else if (url === '/users' && method === 'get') {
        responseData = operators
      } else if (url === '/users' && method === 'post') {
        const body = typeof data === 'string' ? JSON.parse(data) : data
        const newOperator: Operator = {
          id: `op-${Date.now()}`,
          name: body.name,
          role: body.role,
          voiceprintId: body.voiceprintId ?? undefined,
          updatedAt: new Date().toISOString(),
        }
        operators.unshift(newOperator)
        responseData = newOperator
      } else if (url?.startsWith('/users/') && method === 'patch') {
        const id = url.split('/').pop()
        const body = typeof data === 'string' ? JSON.parse(data) : data
        const index = operators.findIndex((operator) => operator.id === id)
        if (index >= 0) {
          operators[index] = {
            ...operators[index],
            ...body,
            updatedAt: new Date().toISOString(),
          }
          responseData = operators[index]
        } else {
          status = 404
        }
      } else if (url?.startsWith('/users/') && method === 'delete') {
        const id = url.split('/').pop()
        const index = operators.findIndex((operator) => operator.id === id)
        if (index >= 0) {
          operators.splice(index, 1)
          status = 204
        } else {
          status = 404
        }
      } else if (url?.endsWith('/voiceprint/aggregate') && method === 'post') {
        const operatorId = url.split('/').slice(-3, -2)[0]
        const operator = operators.find((item) => item.id === operatorId)
        if (operator) {
          operator.voiceprintId = `VP-${Math.floor(Math.random() * 90000 + 10000)}`
          operator.updatedAt = new Date().toISOString()
          responseData = { status: 'ok', quality: 0.94 }
        } else {
          status = 404
          responseData = { status: 'error', message: 'operator_not_found' }
        }
      } else if (url === '/logs' && method === 'get') {
        responseData = logs
      } else if (url?.endsWith('/status') && method === 'post') {
        const operatorId = url.split('/').slice(-2, -1)[0]
        const operator = operators.find((item) => item.id === operatorId)
        if (operator) {
          operator.updatedAt = new Date().toISOString()
          responseData = { ...operator, status: (typeof data === 'string' ? JSON.parse(data) : data)?.status }
        } else {
          status = 404
          responseData = { message: 'operator_not_found' }
        }
      } else {
        status = 404
        responseData = { message: 'NOT_FOUND' }
      }

      config.adapter = async () => ({
        data: responseData,
        status,
        statusText: status >= 200 && status < 300 ? 'OK' : 'ERROR',
        headers: headers ?? {},
        config,
        request: {},
      })
      resolve(config)
    }, 300)
  })
})

export type { Operator, LogEntry }
