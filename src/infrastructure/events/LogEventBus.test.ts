import { describe, it, expect } from 'vitest'
import { LogEventBus } from './LogEventBus.js'
import type { DomainEvent } from '../../domain/events/DomainEvent.js'

describe('LogEventBus', () => {
  const bus = new LogEventBus()

  const event: DomainEvent = {
    name: 'test.event',
    occurredAt: new Date(),
  }

  it('publishes without throwing', async () => {
    await expect(bus.publish(event)).resolves.toBeUndefined()
  })

  it('publishes all without throwing', async () => {
    await expect(bus.publishAll([event, event])).resolves.toBeUndefined()
  })
})
