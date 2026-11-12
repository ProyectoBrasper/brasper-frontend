import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { Project } from '../../../../projects/domain/model/project.entity';
import { maxTwoDecimals } from '../../../../shared/presentation/amount-validators';
import { LedgerAccount } from '../../../domain/model/ledger-account.entity';
import { balancingLine, DraftLine, draftTotals } from '../../../domain/services/journal-entry-figures';

/** The controls of one line being typed. */
export type JournalLineForm = FormGroup<{
  accountCode: FormControl<string | null>;
  projectId: FormControl<number | null>;
  debit: FormControl<number | null>;
  credit: FormControl<number | null>;
}>;

/** Backend rule (`@PositiveOrZero @Digits(integer = 12, fraction = 2)`): a side may be empty, never negative. */
const SIDE_VALIDATORS = [Validators.min(0), Validators.max(999_999_999_999.99), maxTwoDecimals];

/** Backend `JournalLine`: exactly one side is above zero (a debit or a credit, not both, not none). */
export function oneSideValidator(control: AbstractControl): ValidationErrors | null {
  const { debit, credit } = control.value as DraftLine;
  const debitSet = Number(debit) > 0;
  const creditSet = Number(credit) > 0;
  return debitSet !== creditSet ? null : { oneSide: true };
}

/** Backend `JournalEntry`: at least two lines and the debit equal to the credit (and something to post). */
export function doubleEntryValidator(control: AbstractControl): ValidationErrors | null {
  const lines = control.value as DraftLine[];
  if (lines.length < 2) {
    return { minLines: true };
  }
  const { debit, difference } = draftTotals(lines);
  if (difference !== 0) {
    return { unbalanced: true };
  }
  return debit > 0 ? null : { empty: true };
}

/**
 * A line with its rules. Typing an amount on one side clears the other one, so a line never ends with both sides
 * (the backend would reject it).
 */
export function createJournalLine(line: Partial<{ accountCode: string | null; debit: number | null; credit: number | null }> = {}): JournalLineForm {
  const group: JournalLineForm = new FormGroup(
    {
      accountCode: new FormControl<string | null>(line.accountCode ?? null, Validators.required),
      projectId: new FormControl<number | null>(null),
      debit: new FormControl<number | null>(line.debit ?? null, SIDE_VALIDATORS),
      credit: new FormControl<number | null>(line.credit ?? null, SIDE_VALIDATORS),
    },
    { validators: oneSideValidator },
  );
  const clearOther = (other: FormControl<number | null>) => (value: number | null) => {
    if (Number(value) > 0 && other.value !== null) {
      other.setValue(null, { emitEvent: false });
    }
  };
  group.controls.debit.valueChanges.subscribe(clearOther(group.controls.credit));
  group.controls.credit.valueChanges.subscribe(clearOther(group.controls.debit));
  return group;
}

/**
 * The lines of a manual entry (account, optional project, debit or credit) with the totals and the difference as the
 * user types. A new line carries the difference on the side that is short; there are never fewer than two lines.
 */
@Component({
  selector: 'app-journal-lines-editor',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './journal-lines-editor.html',
  styleUrl: './journal-lines-editor.css',
})
export class JournalLinesEditor implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly lines = input.required<FormArray<JournalLineForm>>();
  /** Active accounts, by code. */
  readonly accounts = input.required<LedgerAccount[]>();
  readonly projects = input.required<Project[]>();

  readonly totals = signal({ debit: 0, credit: 0, difference: 0 });

  ngOnInit(): void {
    const lines = this.lines();
    const refresh = () => this.totals.set(draftTotals(lines.getRawValue()));
    refresh();
    lines.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(refresh);
  }

  onAddLine(): void {
    const lines = this.lines();
    lines.push(createJournalLine(balancingLine(lines.getRawValue()) ?? {}));
  }

  onRemoveLine(index: number): void {
    const lines = this.lines();
    if (lines.length > 2) {
      lines.removeAt(index);
    }
  }

  lineHasSideError(line: JournalLineForm): boolean {
    return line.hasError('oneSide') && (line.controls.debit.touched || line.controls.credit.touched);
  }
}
