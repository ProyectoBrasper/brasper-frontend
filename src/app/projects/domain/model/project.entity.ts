import { BaseEntity } from '../../../shared/domain/model/base-entity';
import { Client } from './client.entity';
import { ProjectStatus } from './project-status';

/** Backend rule (`ProjectCode`): three digits, "BR", Spanish month and year, e.g. 001BR-ENE-2026. */
export const PROJECT_CODE_PATTERN = /^\d{3}BR-(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)-\d{4}$/;

/**
 * Quoted or executed project. Percentages (`participation`, `salesCommissionRate`,
 * `accumulatedProgress`) are fractions, as in the API: 0.6 = 60 %.
 * `estimatedDirectCost` is the sum of the cost estimates and is calculated by the backend.
 */
export class Project implements BaseEntity {
  #id: number;
  #code: string;
  #name: string;
  #description: string;
  #clientId: number;
  #client: Client | null;
  #budget: number;
  #currency: string;
  #quotedOn: string;
  #status: ProjectStatus;
  #participation: number;
  #salesCommissionRate: number;
  #accumulatedProgress: number;
  #estimatedDirectCost: number;

  constructor(project: {
    id: number;
    code: string;
    name: string;
    description: string;
    clientId: number;
    client?: Client | null;
    budget: number;
    currency: string;
    quotedOn: string;
    status: ProjectStatus;
    participation: number;
    salesCommissionRate: number;
    accumulatedProgress: number;
    estimatedDirectCost: number;
  }) {
    this.#id = project.id;
    this.#code = project.code;
    this.#name = project.name;
    this.#description = project.description;
    this.#clientId = project.clientId;
    this.#client = project.client ?? null;
    this.#budget = project.budget;
    this.#currency = project.currency;
    this.#quotedOn = project.quotedOn;
    this.#status = project.status;
    this.#participation = project.participation;
    this.#salesCommissionRate = project.salesCommissionRate;
    this.#accumulatedProgress = project.accumulatedProgress;
    this.#estimatedDirectCost = project.estimatedDirectCost;
  }

  get id(): number {
    return this.#id;
  }

  set id(value: number) {
    this.#id = value;
  }

  get code(): string {
    return this.#code;
  }

  set code(value: string) {
    this.#code = value;
  }

  get name(): string {
    return this.#name;
  }

  set name(value: string) {
    this.#name = value;
  }

  get description(): string {
    return this.#description;
  }

  set description(value: string) {
    this.#description = value;
  }

  get clientId(): number {
    return this.#clientId;
  }

  set clientId(value: number) {
    this.#clientId = value;
  }

  get client(): Client | null {
    return this.#client;
  }

  set client(value: Client | null) {
    this.#client = value;
  }

  get budget(): number {
    return this.#budget;
  }

  set budget(value: number) {
    this.#budget = value;
  }

  get currency(): string {
    return this.#currency;
  }

  set currency(value: string) {
    this.#currency = value;
  }

  /** Quote date, `yyyy-MM-dd`. */
  get quotedOn(): string {
    return this.#quotedOn;
  }

  set quotedOn(value: string) {
    this.#quotedOn = value;
  }

  get status(): ProjectStatus {
    return this.#status;
  }

  set status(value: ProjectStatus) {
    this.#status = value;
  }

  get participation(): number {
    return this.#participation;
  }

  set participation(value: number) {
    this.#participation = value;
  }

  get salesCommissionRate(): number {
    return this.#salesCommissionRate;
  }

  set salesCommissionRate(value: number) {
    this.#salesCommissionRate = value;
  }

  get accumulatedProgress(): number {
    return this.#accumulatedProgress;
  }

  set accumulatedProgress(value: number) {
    this.#accumulatedProgress = value;
  }

  get estimatedDirectCost(): number {
    return this.#estimatedDirectCost;
  }

  set estimatedDirectCost(value: number) {
    this.#estimatedDirectCost = value;
  }

  isInProgress(): boolean {
    return this.#status === ProjectStatus.IN_PROGRESS;
  }

  /** Quoted or in progress: can still be edited, re-estimated or cancelled. */
  isOpen(): boolean {
    return this.#status === ProjectStatus.QUOTED || this.#status === ProjectStatus.IN_PROGRESS;
  }

  /** Only a quoted project can be started. */
  canStart(): boolean {
    return this.#status === ProjectStatus.QUOTED;
  }

  /** Progress still available to reach 100 %, as a fraction. */
  remainingProgress(): number {
    return Math.max(0, Math.round((1 - this.#accumulatedProgress) * 10000) / 10000);
  }
}
