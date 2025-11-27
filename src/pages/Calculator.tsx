// src/pages/Calculator.tsx

import React, { useState } from "react";
import { API_BASE_URL } from "../config/api";

type TermType = "years" | "months";

interface AmortizationRow {
  period: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

const Calculator: React.FC = () => {
  const [amount, setAmount] = useState<number>(150000);
  const [annualRate, setAnnualRate] = useState<number>(8.5);
  const [termValue, setTermValue] = useState<number>(20); // valor que el user mete
  const [termType, setTermType] = useState<TermType>("years"); // años o meses (visual)
  const [monthlyPayment, setMonthlyPayment] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<AmortizationRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // estados para guardar simulación
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const formatMoney = (value: number) =>
    value.toLocaleString("es-PE", {
      style: "currency",
      currency: "PEN",
      maximumFractionDigits: 2,
    });

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !annualRate || !termValue || termValue <= 0) {
      setError("Completa todos los campos con valores válidos.");
      setSchedule([]);
      setMonthlyPayment(null);
      return;
    }

    setError(null);
    setSaveError(null);
    setSaveMessage(null);

    // 👇 Lógica: siempre trabajamos en AÑOS, aunque el usuario pueda escribir meses
    const years = termType === "years" ? termValue : termValue / 12;
    const totalMonths = Math.round(years * 12);

    const monthlyRate = annualRate / 100 / 12;

    if (monthlyRate <= 0 || totalMonths <= 0) {
      setError("La tasa y el plazo deben ser mayores que 0.");
      setSchedule([]);
      setMonthlyPayment(null);
      return;
    }

    // Fórmula de cuota fija
    const m =
      (amount * monthlyRate) /
      (1 - Math.pow(1 + monthlyRate, -totalMonths));

    setMonthlyPayment(m);

    const newSchedule: AmortizationRow[] = [];
    let balance = amount;

    for (let period = 1; period <= totalMonths; period++) {
      const interest = balance * monthlyRate;
      const principal = m - interest;
      balance = balance - principal;

      // Para evitar mostrar -0.0000001
      if (balance < 0) balance = 0;

      newSchedule.push({
        period,
        payment: m,
        interest,
        principal,
        balance,
      });
    }

    setSchedule(newSchedule);
  };

  const handlePrint = () => {
    window.print();
  };

  // 👉 Nuevo: guardar simulación en el backend
  const handleSaveSimulation = async () => {
    setSaveError(null);
    setSaveMessage(null);

    // Leer usuario y token desde localStorage
    const rawUser = localStorage.getItem("mivi_user");
    const token = localStorage.getItem("mivi_token");

    if (!rawUser || !token) {
      setSaveError("Debes iniciar sesión para guardar simulaciones.");
      return;
    }

    const user = JSON.parse(rawUser) as { id: number; name: string; email: string };

    if (!monthlyPayment || schedule.length === 0) {
      setSaveError("Primero calcula una simulación antes de guardarla.");
      return;
    }

    // Derivar años (para guardar un valor coherente en BD)
    const years = termType === "years" ? termValue : termValue / 12;
    const termYears = Math.round(years);

    try {
      setSaving(true);

      const payload = {
        userId: user.id,            // para la versión de PHP que espera user_id en el body
        amount,
        annualRate,
        termYears,
        monthlyPayment,
        productType: "Crédito Mivivienda",
        notes: "",
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      // Si tu PHP ignora Authorization, no pasa nada; si lo usa, ya está listo
      headers["Authorization"] = `Bearer ${token}`;

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
              Monto del crédito (S/)
            </label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={amount}
              min={0}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>

          {/* Tasa anual */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tasa anual (%)
            </label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={annualRate}
              min={0}
              onChange={(e) => setAnnualRate(Number(e.target.value))}
            />
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
                onChange={(e) =>
                  setTermType(e.target.value as TermType)
                }
              >
                <option value="years">Años</option>
                <option value="months">Meses (solo visual)</option>
              </select>
            </div>
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
            <p className="text-xs text-emerald-800 mt-1">
              *Cálculo referencial. No incluye seguros ni otros cargos del
              banco.
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
