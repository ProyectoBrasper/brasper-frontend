import { LedgerAccount, LedgerAccountType } from '../domain/model/ledger-account.entity';

/** The chart of accounts the backend seeds (migrations V31–V37), in the order they were inserted. */
const CHART: [string, string, LedgerAccountType][] = [
  ['10', 'Efectivo y equivalentes de efectivo', LedgerAccountType.ASSET],
  ['12', 'Cuentas por cobrar comerciales', LedgerAccountType.ASSET],
  ['33', 'Inmuebles, maquinaria y equipo', LedgerAccountType.ASSET],
  ['39', 'Depreciación acumulada', LedgerAccountType.ASSET],
  ['40111', 'IGV - Cuenta propia', LedgerAccountType.LIABILITY],
  ['42', 'Cuentas por pagar comerciales', LedgerAccountType.LIABILITY],
  ['45', 'Obligaciones financieras', LedgerAccountType.LIABILITY],
  ['50', 'Capital', LedgerAccountType.EQUITY],
  ['59', 'Resultados acumulados', LedgerAccountType.EQUITY],
  ['60', 'Compras', LedgerAccountType.EXPENSE],
  ['62', 'Gastos de personal', LedgerAccountType.EXPENSE],
  ['63', 'Gastos de servicios prestados por terceros', LedgerAccountType.EXPENSE],
  ['67', 'Gastos financieros', LedgerAccountType.EXPENSE],
  ['68', 'Depreciación del ejercicio', LedgerAccountType.EXPENSE],
  ['70', 'Ventas', LedgerAccountType.REVENUE],
  ['4017', 'Impuesto a la renta', LedgerAccountType.LIABILITY],
  ['122', 'Anticipos de clientes', LedgerAccountType.LIABILITY],
  ['16', 'Préstamos por cobrar', LedgerAccountType.ASSET],
  ['77', 'Ingresos financieros', LedgerAccountType.REVENUE],
  ['65', 'Otros gastos de gestión', LedgerAccountType.EXPENSE],
  ['455', 'Cuentas por pagar a socios', LedgerAccountType.LIABILITY],
];

/** The 21 accounts of the backend chart: 5 assets, 6 liabilities, 2 equity, 2 revenue, 6 expenses. */
export const backendChart = (): LedgerAccount[] =>
  CHART.map(([code, name, type], i) => new LedgerAccount({ id: i + 1, code, name, type, active: true }));
