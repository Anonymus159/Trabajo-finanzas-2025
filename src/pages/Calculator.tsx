// src/pages/Calculator.tsx

import React, { useState } from "react";
import { API_BASE_URL } from "../config/api";

type TermType = "years" | "months";
type Currency = "PEN" | "USD";
type RateType = "effective" | "nominal";
type GraceType = "none" | "total" | "partial";

interface AmortizationRow {
  period: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

interface UserStored {
  id: number;
  name: string;
  email: string;
}

interface BankConfig {
  id: string;
  name: string;
  defaultAnnualRate?: number;
  defaultYears?: number;
}

// Catálogo simple de entidades (puedes ajustar tasas y plazos)
const BANKS: BankConfig[] = [
  { id: "generic", name: "Sin entidad específica" },
  { id: "bcp", name: "BCP", defaultAnnualRate: 8.5, defaultYears: 20 },
  { id: "bbva", name: "BBVA", defaultAnnualRate: 8.2, defaultYears: 20 },
  { id: "scotiabank", name: "Scotiabank", defaultAnnualRate: 8.0, defaultYears: 20 },
  { id: "interbank", name: "Interbank", defaultAnnualRate: 8.3, defaultYears: 20 },
];

const Calculator: React.FC = () => {
  const [amount, setAmount] = useState<number>(150000);
  const [currency, setCurrency] = useState<Currency>("PEN");

  const [annualRate, setAnnualRate] = useState<number>(8.5);
  const [rateType, setRateType] = useState<RateType>("effective");
  const [capitalization, setCapitalization] = useState<number>(12); // períodos de capitalización al año (nominal)

  const [termValue, setTermValue] = useState<number>(20); // valor que el user mete
  const [termType, setTermType] = useState<TermType>("years"); // años o meses (visual)

  const [graceType, setGraceType] = useState<GraceType>("none");
  const [graceMonths, setGraceMonths] = useState<number>(0);

  const [applyBono, setApplyBono] = useState<boolean>(false);
  const [bonoAmount, setBonoAmount] = useState<number>(0);

  const [selectedBank, setSelectedBank] = useState<string>("generic");

  const [monthlyPayment, setMonthlyPayment] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<AmortizationRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // VAN y TIR
  const [npv, setNpv] = useState<number | null>(null);
  const [irr, setIrr] = useState<number | null>(null);

  // Tasa de descuento para VAN (distinta de la tasa del crédito)
  const [discountRate, setDiscountRate] = useState<number>(10); // 10% anual por defecto

  // estados para guardar simulación
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const formatMoney = (value: number) => {
    const locale = currency === "USD" ? "en-US" : "es-PE";
    const code = currency === "USD" ? "USD" : "PEN";
    return value.toLocaleString(locale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    });
  };

  // Convierte tasa ingresada a tasa efectiva anual (decimal, no en %)
  const getAnnualEffectiveRate = (): number => {
    const entered = annualRate / 100;
    if (rateType === "effective") {
      return entered;
    }
    // Nominal convertible m veces al año
    const m = capitalization > 0 ? capitalization : 12;
    const annualEff = Math.pow(1 + entered / m, m) - 1;
    return annualEff;
  };

  // PMT para cuota fija
  const computeMonthlyPayment = (principal: number, monthlyRate: number, nMonths: number): number => {
    if (monthlyRate === 0) {
      return principal / nMonths;
    }
    return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -nMonths));
  };

  // VAN con tasa anual (en %) y flujos mensuales
  const computeNPV = (cashFlows: number[], discountAnnualRatePercent: number): number => {
    if (cashFlows.length === 0) return 0;
    const annual = discountAnnualRatePercent / 100;
    const monthlyRate = Math.pow(1 + annual, 1 / 12) - 1;
    let npvValue = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      npvValue += cashFlows[t] / Math.pow(1 + monthlyRate, t);
    }
    return npvValue;
  };

  // IRR (devuelve TIR anual en %), usando búsq. binaria sobre tasa mensual
  const computeIRR = (cashFlows: number[]): number | null => {
    if (cashFlows.length < 2) return null;

    const npvAt = (rate: number) => {
      let val = 0;
      for (let t = 0; t < cashFlows.length; t++) {
        val += cashFlows[t] / Math.pow(1 + rate, t);
      }
      return val;
    };

    let low = -0.99; // -99% mensual
    let high = 5; // 500% mensual
    let npvLow = npvAt(low);
    let npvHigh = npvAt(high);

    if (npvLow * npvHigh > 0) {
      // No hay cambio de signo => no se puede encontrar IRR de forma estándar
      return null;
    }

    const tolerance = 1e-7;
    const maxIter = 1000;

    for (let i = 0; i < maxIter; i++) {
      const mid = (low + high) / 2;
      const npvMid = npvAt(mid);

      if (Math.abs(npvMid) < tolerance) {
        const irrAnnual = Math.pow(1 + mid, 12) - 1;
        return irrAnnual * 100;
      }

      if (npvLow * npvMid < 0) {
        high = mid;
        npvHigh = npvMid;
      } else {
        low = mid;
        npvLow = npvMid;
      }
    }

    const mid = (low + high) / 2;
    const irrAnnual = Math.pow(1 + mid, 12) - 1;
    return irrAnnual * 100;
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setSaveError(null);
    setSaveMessage(null);
    setNpv(null);
    setIrr(null);

    if (!amount || !annualRate || !termValue || termValue <= 0) {
      setError("Completa todos los campos con valores válidos.");
      setSchedule([]);
      setMonthlyPayment(null);
      return;
    }

    // 👇 Lógica: siempre trabajamos en AÑOS, aunque el usuario pueda escribir meses
    const years = termType === "years" ? termValue : termValue / 12;
    const totalMonths = Math.round(years * 12);

    if (totalMonths <= 0) {
      setError("El plazo debe ser mayor que 0.");
      setSchedule([]);
      setMonthlyPayment(null);
      return;
    }

    if (graceMonths < 0) {
      setError("Los meses de gracia no pueden ser negativos.");
      setSchedule([]);
      setMonthlyPayment(null);
      return;
    }

    if (graceMonths >= totalMonths && graceType !== "none") {
      setError("Los meses de gracia deben ser menores que el plazo total.");
      setSchedule([]);
      setMonthlyPayment(null);
      return;
    }

    const annualEffective = getAnnualEffectiveRate();
    const monthlyRate = Math.pow(1 + annualEffective, 1 / 12) - 1;

    if (monthlyRate <= 0) {
      setError("La tasa debe ser mayor que 0.");
      setSchedule([]);
      setMonthlyPayment(null);
      return;
    }

    // Monto financiado con bono
    const bono = applyBono ? bonoAmount : 0;
    const financedAmount = amount - bono;

    if (financedAmount <= 0) {
      setError("El monto financiado debe ser mayor que 0. Revisa el bono aplicado.");
      setSchedule([]);
      setMonthlyPayment(null);
      return;
    }

    const newSchedule: AmortizationRow[] = [];
    let balance = financedAmount;
    let calcMonthlyPayment = 0;

    const graceM = graceType === "none" ? 0 : Math.min(graceMonths, totalMonths - 1);
    const amortizationMonths = totalMonths - graceM;

    if (graceType === "none" || graceM === 0) {
      // Sin gracia: cálculo estándar
      calcMonthlyPayment = computeMonthlyPayment(balance, monthlyRate, totalMonths);

      for (let period = 1; period <= totalMonths; period++) {
        const interest = balance * monthlyRate;
        const principal = calcMonthlyPayment - interest;
        balance = balance - principal;

        if (balance < 0) balance = 0;

        newSchedule.push({
          period,
          payment: calcMonthlyPayment,
          interest,
          principal,
          balance,
        });
      }
    } else {
      // Con gracia (total o parcial)
      // 1) Periodos de gracia
      for (let period = 1; period <= graceM; period++) {
        const interest = balance * monthlyRate;
        let payment = 0;
        let principal = 0;

        if (graceType === "total") {
          // No se paga nada, interés se capitaliza
          balance = balance + interest;
        } else if (graceType === "partial") {
          // Se paga solo interés
          payment = interest;
          // principal=0, saldo no cambia
        }

        newSchedule.push({
          period,
          payment,
          interest,
          principal,
          balance,
        });
      }

      // 2) Periodos de amortización normal luego de la gracia
      calcMonthlyPayment = computeMonthlyPayment(balance, monthlyRate, amortizationMonths);

      for (let i = 1; i <= amortizationMonths; i++) {
        const period = graceM + i;
        const interest = balance * monthlyRate;
        const principal = calcMonthlyPayment - interest;
        balance = balance - principal;

        if (balance < 0) balance = 0;

        newSchedule.push({
          period,
          payment: calcMonthlyPayment,
          interest,
          principal,
          balance,
        });
      }
    }

    setSchedule(newSchedule);
    setMonthlyPayment(calcMonthlyPayment);

    // VAN y TIR con flujos mensuales
    const cashFlows: number[] = [];
    // t=0: desembolso (recibe el cliente)
    cashFlows.push(financedAmount);
    // t>0: pagos mensuales (salen del cliente)
    for (const row of newSchedule) {
      cashFlows.push(-row.payment);
    }

    // 👉 VAN usando la tasa de DESCUENTO elegida (NO la del crédito)
    const npvValue = computeNPV(cashFlows, discountRate);
    const irrValue = computeIRR(cashFlows);

    setNpv(npvValue);
    setIrr(irrValue);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveSimulation = async () => {
    setSaveError(null);
    setSaveMessage(null);

    const rawUser = localStorage.getItem("mivi_user");
    const token = localStorage.getItem("mivi_token");

    if (!rawUser || !token) {
      setSaveError("Debes iniciar sesión para guardar simulaciones.");
      return;
    }

    const user = JSON.parse(rawUser) as UserStored;

    if (!monthlyPayment || schedule.length === 0) {
      setSaveError("Primero calcula una simulación antes de guardarla.");
      return;
    }

    const years = termType === "years" ? termValue : termValue / 12;
    const termYears = Math.round(years);

    const bank = BANKS.find((b) => b.id === selectedBank);

    try {
      setSaving(true);

      const payload = {
        userId: user.id,
        amount,
        currency,
        annualRate,
        rateType,
        capitalization,
        termYears,
        monthlyPayment,
        graceType,
        graceMonths,
        applyBono,
        bonoAmount,
        bankId: selectedBank,
        bankName: bank?.name ?? null,
        npv,
        irr,
        productType: "Crédito Mivivienda",
        notes: "",
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      const res = await fetch(`${API_BASE_URL}/save_simulation.php`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Error al guardar la simulación.");
      }

      setSaveMessage("Simulación guardada correctamente.");
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || "Error al guardar la simulación.");
    } finally {
      setSaving(false);
    }
  };

  const handleBankChange = (value: string) => {
    setSelectedBank(value);
    const bank = BANKS.find((b) => b.id === value);
    if (bank?.defaultAnnualRate) {
      setAnnualRate(bank.defaultAnnualRate);
    }
    if (bank?.defaultYears) {
      setTermType("years");
      setTermValue(bank.defaultYears);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl bg-white shadow-xl rounded-2xl p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-800 mb-6 text-center">
          Calculadora de Crédito Mivivienda
        </h1>

        <form
          onSubmit={handleCalculate}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
        >
          {/* Monto */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Monto del crédito
            </label>
            <div className="flex gap-2">
              <select
                className="w-1/3 rounded-lg border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                <option value="PEN">Soles (S/)</option>
                <option value="USD">Dólares ($)</option>
              </select>
              <input
                type="number"
                className="w-2/3 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={amount}
                min={0}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Tasa anual + tipo de tasa */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tasa anual
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                className="w-1/2 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={annualRate}
                min={0}
                onChange={(e) => setAnnualRate(Number(e.target.value))}
              />
              <select
                className="w-1/2 rounded-lg border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={rateType}
                onChange={(e) => setRateType(e.target.value as RateType)}
              >
                <option value="effective">Efectiva anual</option>
                <option value="nominal">Nominal anual</option>
              </select>
            </div>
            {rateType === "nominal" && (
              <div className="mt-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Capitalización (veces al año)
                </label>
                <select
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={capitalization}
                  onChange={(e) => setCapitalization(Number(e.target.value))}
                >
                  <option value={12}>Mensual (12)</option>
                  <option value={4}>Trimestral (4)</option>
                  <option value={2}>Semestral (2)</option>
                  <option value={1}>Anual (1)</option>
                </select>
              </div>
            )}

            {/* Tasa de descuento para VAN */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Tasa de descuento para VAN (% anual)
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={discountRate}
                onChange={(e) => setDiscountRate(Number(e.target.value))}
              />
              <p className="mt-1 text-xs text-slate-500">
                Esta tasa se usa solo para calcular el VAN, no afecta la cuota.
              </p>
            </div>
          </div>

          {/* Plazo + tipo (años/meses) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Plazo
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                className="w-1/2 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={termValue}
                min={1}
                onChange={(e) => setTermValue(Number(e.target.value))}
              />
              <select
                className="w-1/2 rounded-lg border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={termType}
                onChange={(e) => setTermType(e.target.value as TermType)}
              >
                <option value="years">Años</option>
                <option value="months">Meses (solo visual)</option>
              </select>
            </div>
          </div>

          {/* Config: gracia */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Período de gracia
            </label>
            <div className="flex gap-2">
              <select
                className="w-1/2 rounded-lg border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={graceType}
                onChange={(e) => setGraceType(e.target.value as GraceType)}
              >
                <option value="none">Sin gracia</option>
                <option value="total">Gracia total</option>
                <option value="partial">Gracia parcial</option>
              </select>
              <input
                type="number"
                className="w-1/2 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={graceMonths}
                min={0}
                onChange={(e) => setGraceMonths(Number(e.target.value))}
                placeholder="Meses de gracia"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Gracia total: no se paga nada y los intereses se capitalizan. Gracia
              parcial: se paga solo interés.
            </p>
          </div>

          {/* Bono Techo Propio */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Bono Techo Propio
            </label>
            <div className="flex items-center gap-2">
              <input
                id="bono-check"
                type="checkbox"
                className="rounded border-slate-300"
                checked={applyBono}
                onChange={(e) => setApplyBono(e.target.checked)}
              />
              <label htmlFor="bono-check" className="text-sm text-slate-700">
                Aplicar bono
              </label>
            </div>
            {applyBono && (
              <input
                type="number"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={bonoAmount}
                min={0}
                onChange={(e) => setBonoAmount(Number(e.target.value))}
                placeholder="Monto del bono"
              />
            )}
          </div>

          {/* Entidad financiera */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Entidad financiera
            </label>
            <select
              className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={selectedBank}
              onChange={(e) => handleBankChange(e.target.value)}
            >
              {BANKS.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Se usa como referencia para tasa y plazo (puedes modificarlos manualmente).
            </p>
          </div>

          {/* Botones */}
          <div className="md:col-span-4 flex flex-wrap gap-3 justify-end mt-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
            >
              Calcular
            </button>

            {schedule.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  Imprimir
                </button>

                <button
                  type="button"
                  onClick={handleSaveSimulation}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60 transition"
                >
                  {saving ? "Guardando..." : "Guardar simulación"}
                </button>
              </>
            )}
          </div>
        </form>

        {/* Mensajes de error / éxito de guardado */}
        {saveError && (
          <div className="mb-3 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-700">
            {saveError}
          </div>
        )}
        {saveMessage && (
          <div className="mb-3 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
            {saveMessage}
          </div>
        )}

        {/* Mensaje de error de cálculo */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Resumen */}
        {monthlyPayment && (
          <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p>
              Cuota mensual aproximada:{" "}
              <span className="font-semibold">
                {formatMoney(monthlyPayment)}
              </span>
            </p>
            {npv !== null && (
              <p className="mt-1">
                VAN (con tasa de descuento {discountRate.toFixed(2)}%):{" "}
                <span className="font-semibold">
                  {formatMoney(npv)}
                </span>
              </p>
            )}
            {irr !== null && (
              <p className="mt-1">
                TIR aproximada:{" "}
                <span className="font-semibold">
                  {irr.toFixed(2)}%
                </span>
              </p>
            )}
            <p className="text-xs text-emerald-800 mt-1">
              *Cálculo referencial. No incluye seguros ni otros cargos del banco.
            </p>
          </div>
        )}

        {/* Tabla de amortización */}
        {schedule.length > 0 && (
          <div className="mt-4 max-h-[420px] overflow-auto border border-slate-200 rounded-xl">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">
                    # Cuota
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">
                    Cuota
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">
                    Interés
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">
                    Amortización
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">
                    Saldo
                  </th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => (
                  <tr
                    key={row.period}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-3 py-2">{row.period}</td>
                    <td className="px-3 py-2 text-right">
                      {formatMoney(row.payment)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatMoney(row.interest)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatMoney(row.principal)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatMoney(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Info si aún no hay tabla */}
        {schedule.length === 0 && !error && (
          <p className="mt-4 text-xs text-slate-500">
            Ingresa los datos del crédito y haz clic en{" "}
            <span className="font-semibold">“Calcular”</span> para ver la
            tabla de amortización.
          </p>
        )}
      </div>
    </div>
  );
};

export default Calculator;
