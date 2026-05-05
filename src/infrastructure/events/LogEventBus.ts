import type { EventBus } from "../../domain/ports/EventBus.js";
import type { DomainEvent } from "../../domain/events/DomainEvent.js";
import { logger } from "../../shared/logger.js";

export class LogEventBus implements EventBus {
  async publish(event: DomainEvent): Promise<void> {
    logger.info({ event: event.name, occurredAt: event.occurredAt }, "Domain event published");
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
