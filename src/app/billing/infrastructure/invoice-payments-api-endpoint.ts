import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseResource } from '../../shared/infrastructure/base-resource';
import { ErrorHandlingEnabledBaseType } from '../../shared/infrastructure/error-handling-enabled-base-type';
import { InvoicePayment, InvoicePaymentType } from '../domain/model/invoice-payment.entity';

/** Backend `InvoicePaymentResource` (no invoiceId: it is in the URL). */
export interface InvoicePaymentResource extends BaseResource {
  receivedOn: string;
  amount: number;
  type: string;
  bankAccountId: number | null;
  reference: string | null;
}

/** Body of `POST /invoices/{id}/payments` (backend `RegisterInvoicePaymentResource`). */
export interface RegisterInvoicePaymentRequest {
  receivedOn: string;
  amount: number;
  currency: string;
  type: string;
  bankAccountId: number | null;
  reference: string | null;
}

/** Maps invoice payments; the invoice id comes from the URL. */
export class InvoicePaymentAssembler {
  toEntityFromResource(resource: InvoicePaymentResource, invoiceId: number): InvoicePayment {
    return new InvoicePayment({
      id: resource.id,
      invoiceId,
      receivedOn: resource.receivedOn,
      amount: Number(resource.amount),
      type: resource.type as InvoicePaymentType,
      bankAccountId: resource.bankAccountId ?? null,
      reference: resource.reference ?? '',
    });
  }

  toRequestFromEntity(entity: InvoicePayment, currency: string): RegisterInvoicePaymentRequest {
    return {
      receivedOn: entity.receivedOn,
      amount: entity.amount,
      currency,
      type: entity.type,
      bankAccountId: entity.bankAccountId,
      reference: entity.reference || null,
    };
  }
}

/**
 * Client for `GET/POST /invoices/{invoiceId}/payments`.
 */
export class InvoicePaymentsApiEndpoint extends ErrorHandlingEnabledBaseType {
  private readonly assembler = new InvoicePaymentAssembler();

  constructor(private readonly http: HttpClient) {
    super();
  }

  getByInvoiceId(invoiceId: number): Observable<InvoicePayment[]> {
    return this.http.get<InvoicePaymentResource[]>(this.url(invoiceId)).pipe(
      map((resources) => resources.map((resource) => this.assembler.toEntityFromResource(resource, invoiceId))),
      catchError(this.handleError('Failed to fetch payments')),
    );
  }

  /** The payment must be in the invoice currency (the backend checks it). */
  register(invoiceId: number, payment: InvoicePayment, currency: string): Observable<InvoicePayment> {
    return this.http
      .post<InvoicePaymentResource>(this.url(invoiceId), this.assembler.toRequestFromEntity(payment, currency))
      .pipe(
        map((resource) => this.assembler.toEntityFromResource(resource, invoiceId)),
        catchError(this.handleError('Failed to register payment')),
      );
  }

  private url(invoiceId: number): string {
    return `${environment.platformProviderApiBaseUrl}${environment.platformProviderInvoicesEndpointPath}/${invoiceId}/payments`;
  }
}
