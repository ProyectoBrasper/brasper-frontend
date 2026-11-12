import { TestBed } from '@angular/core/testing';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';
import { PERU_DATE_FORMATS, PeruDateAdapter } from '../../../../shared/presentation/peru-date-adapter';
import { BankAccount, BankAccountType } from '../../../../treasury/domain/model/bank-account.entity';
import { InvoicePayment, InvoicePaymentType } from '../../../domain/model/invoice-payment.entity';
import { invoiceFixture } from '../../../testing/invoice-fixtures';
import { RegisterPaymentDialog } from './register-payment-dialog';

const account = (id: number, type: BankAccountType, currency = 'PEN') =>
  new BankAccount({ id, bank: 'BCP', accountNumber: `00${id}`, type, currency, openingBalance: 0, currentBalance: 0 });

describe('RegisterPaymentDialog', () => {
  let close: ReturnType<typeof vi.fn>;
  let dialog: RegisterPaymentDialog;

  beforeEach(() => {
    close = vi.fn();
    TestBed.configureTestingModule({
      imports: [RegisterPaymentDialog],
      providers: [
        provideTranslateService({ lang: 'es' }),
        { provide: DateAdapter, useClass: PeruDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: PERU_DATE_FORMATS },
        { provide: MAT_DATE_LOCALE, useValue: 'es-PE' },
        { provide: MatDialogRef, useValue: { close } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            invoice: invoiceFixture(),
            payments: [
              new InvoicePayment({ id: 7, invoiceId: 4, receivedOn: '2026-10-06', amount: 60000, type: InvoicePaymentType.NET_DEPOSIT, bankAccountId: 1, reference: '' }),
            ],
            bankAccounts: [
              account(1, BankAccountType.CHECKING),
              account(3, BankAccountType.DETRACTIONS),
              account(9, BankAccountType.CHECKING, 'USD'),
            ],
          },
        },
      ],
    });
    dialog = TestBed.createComponent(RegisterPaymentDialog).componentInstance;
  });

  it('offers only accounts in the invoice currency', () => {
    expect(dialog.accounts.map((a) => a.id)).toEqual([1, 3]);
  });

  it('proposes the pending net amount and a checking account', () => {
    expect(dialog.paymentForm.controls.amount.value).toBe(60360);
    expect(dialog.paymentForm.controls.bankAccountId.value).toBe(1);
  });

  it('switches to the detractions account for a detraction deposit', () => {
    dialog.paymentForm.controls.type.setValue(InvoicePaymentType.DETRACTION_DEPOSIT);
    expect(dialog.paymentForm.controls.bankAccountId.value).toBe(3);
    expect(dialog.paymentForm.controls.amount.value).toBe(16992);
  });

  it('closes a retention certificate without bank account', () => {
    dialog.paymentForm.controls.type.setValue(InvoicePaymentType.RETENTION_CERTIFICATE);
    expect(dialog.paymentForm.controls.bankAccountId.disabled).toBe(true);
    dialog.paymentForm.controls.receivedOn.setValue(new Date(2026, 10, 6));
    dialog.onSave();
    const saved = close.mock.calls[0][0] as InvoicePayment;
    expect([saved.type, saved.amount, saved.bankAccountId, saved.receivedOn]).toEqual([
      InvoicePaymentType.RETENTION_CERTIFICATE, 4248, null, '2026-11-06',
    ]);
  });

  it('does not allow more than the outstanding balance', () => {
    dialog.paymentForm.controls.amount.setValue(64608.01);
    dialog.onSave();
    expect(close).not.toHaveBeenCalled();
  });
});
