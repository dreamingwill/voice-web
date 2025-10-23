import { defineStore } from 'pinia'
import type { StructuredEvent } from '@/types/realtime'

interface EventsState {
  events: StructuredEvent[]
  latestUnauthorizedId: string | null
}

export const useEventsStore = defineStore('events', {
  state: (): EventsState => ({
    events: [],
    latestUnauthorizedId: null,
  }),
  getters: {
    hasUnauthorizedAlert: (state) => Boolean(state.latestUnauthorizedId),
    latestUnauthorizedEvent: (state) =>
      state.events.find((event) => event.id === state.latestUnauthorizedId) ?? null,
  },
  actions: {
    pushEvent(event: StructuredEvent) {
      this.events.unshift(event)
      if (this.events.length > 50) {
        this.events.pop()
      }

      if (!event.authorized) {
        this.latestUnauthorizedId = event.id
      }
    },
    acknowledgeUnauthorized() {
      this.latestUnauthorizedId = null
    },
    clear() {
      this.events = []
      this.latestUnauthorizedId = null
    },
  },
})
