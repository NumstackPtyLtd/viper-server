import type { DomainEvent } from "../events/DomainEvent.js";

/**
 * Port: Event Bus
 *
 * Publishes domain events. Infrastructure can route these to
 * logging, webhooks, queues, etc.
 */
export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
}
