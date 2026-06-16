export type UUID = string;

// Domain value types
export type TaskStatus = 'ready' | 'ongoing' | 'pending' | 'planned' | 'done';
export type ItemStatus = 'to_buy' | 'available' | 'consumed';
export type ProjectStatus = 'active' | 'on_hold' | 'done';
export type ResourceType = 'link' | 'note' | 'video' | 'file' | 'doc';
export type RecurrenceUnit = 'day' | 'week' | 'month' | 'year';
export type DurationUnit = 'hour' | 'day';
export type BalanceFrequency = 'daily' | 'weekly' | 'monthly';
export type DayRestriction = 'weekend' | 'weekday' | null;

export interface RecurrenceRule {
  interval: number;
  unit: RecurrenceUnit;
}

export interface EstimatedDuration {
  value: number;
  unit: DurationUnit;
}

// Event store types
export interface StoredEvent {
  id: number;
  aggregateId: UUID;
  aggregateType: string;
  eventType: string;
  payload: Record<string, unknown>;
  version: number;
  createdAt: Date;
}

export { DomainEvent } from './domain/shared/DomainEvent';
