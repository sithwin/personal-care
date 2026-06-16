export abstract class DomainEvent {
  constructor(
    readonly eventType: string,
    readonly aggregateId: string,
    readonly aggregateType: string,
    readonly payload: Record<string, unknown>,
  ) {}
}
