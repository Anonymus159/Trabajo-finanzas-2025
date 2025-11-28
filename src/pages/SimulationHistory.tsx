// src/pages/SimulationHistory.tsx
import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";

interface Simulation {
  id: number;
  amount: number;
  annual_rate: number;
  term_years: number;
  monthly_payment: number;
  product_type?: string | null;
  notes?: string | null;
  created_at: string;

  // Nuevos campos opcionales
  currency?: string | null;
  rate_type?: string | null;
  capitalization?: number | null;
  grace_type?: string | null;
  grace_months?: number | null;
  bono_amount?: number | null;
  bank_name?: string | null;
  npv?: number | null;
  irr?: number | null;
}

interface UserStored {
  id: number;
  name: string;
  email: string;
}

const formatMoney = (value: number, currency: string = "PEN") => {
  const code = currency === "USD" ? "USD" : "PEN";
  const locale = currency === "USD" ? "en-US" : "es-PE";
  return value.toLocaleString(locale, {
    style: "currency",
    currency: code,
    minimumFractionDigits: 2,
  });
};

const SimulationHistory: React.FC = () => {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserStored | null>(null);

  useEffect(() => {
    const rawUser = localStorage.getItem("mivi_user");

    if (!rawUser) {
      setUser(null);
      setError("Debes iniciar sesión para ver tu historial.");
      setLoading(false);
      return;
    }

    try {
      const parsed: UserStored = JSON.parse(rawUser);
      setUser(parsed);
      fetchSimulations(parsed.id);
    } catch (e) {
      console.error(e);
      setError("No se pudo leer la sesión del usuario.");
      setLoading(false);
    }
  }, []);

  const fetchSimulations = async (userId: number) => {
    try {
      setLoading(true);
      setError(null);

      const url = `${API_BASE_URL}/list_simulations.php?user_id=${userId}`;
      console.log("Llamando a:", url);

      const res = await fetch(url);
      const data = await res.json();

      console.log("Respuesta historial:", data);

      if (!res.ok) {
        throw new Error("Error de red al obtener el historial.");
      }

      if (!data.ok) {
        throw new Error(data.error || "Error al obtener el historial.");
      }

      const rawList = data.simulations || data.simulaciones || [];

      const normalized: Simulation[] = rawList.map((item: any) => {
        const termYears =
          item.term_years ??
          item["años_plazo"] ??
          item.años_plazo ??
          item["plazo_años"] ??
          item.plazo_años ??
          0;

        const currency =
          item.currency ??
          item.moneda ??
          null;

        const rate_type =
          item.rate_type ??
          item.tipo_tasa ??
          null;

        const capitalization =
          item.capitalization ??
          item.capitalizacion ??
          null;

        const grace_type =
          item.grace_type ??
          item.tipo_gracia ??
          null;

        const grace_monthsRaw =
          item.grace_months ??
          item.meses_gracia ??
          null;
        const grace_months =
          grace_monthsRaw !== null && grace_monthsRaw !== undefined
            ? Number(grace_monthsRaw)
            : null;

        const bono_amount =
          item.bono_amount ??
          item.monto_bono ??
          null;

        const bank_name =
          item.bank_name ??
          item.entidad ??
          item.entity_name ??
          null;

        const npv =
          item.npv ??
          item.van ??
          null;

        const irr =
          item.irr ??
          item.tir ??
          null;

        return {
          id: Number(item.id),
          amount: Number(item.amount ?? item.monto ?? 0),
          annual_rate: Number(item.annual_rate ?? item.tasa_anual ?? 0),
          term_years: Number(termYears),
          monthly_payment: Number(
            item.monthly_payment ?? item.pago_mensual ?? 0
          ),
          product_type:
            item.product_type ?? item.tipo_de_producto ?? null,
          notes: item.notes ?? item.notas ?? null,
          created_at: item.created_at ?? item.creado_en ?? "",
          currency,
          rate_type,
          capitalization: capitalization !== null ? Number(capitalization) : null,
          grace_type,
          grace_months,
          bono_amount: bono_amount !== null ? Number(bono_amount) : null,
          bank_name,
          npv: npv !== null ? Number(npv) : null,
          irr: irr !== null ? Number(irr) : null,
        };
      });

      setSimulations(normalized);
    } catch (err: any) {
      console.error("Error en fetchSimulations:", err);
      setError(err.message || "Error al obtener el historial.");
      setSimulations([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-slate-800 mb-4">
        Historial de simulaciones
      </h1>

      {loading && (
        <p className="text-sm text-slate-600">Cargando simulaciones...</p>
      )}

      {!loading && error && (
        <p className="text-sm text-red-600 mb-3">{error}</p>
      )}

      {!loading && !error && !user && (
        <p className="text-sm text-slate-600">
          Debes iniciar sesión para ver tu historial de simulaciones.
        </p>
      )}

      {!loading && !error && user && simulations.length === 0 && (
        <p className="text-sm text-slate-600">
          Aún no tienes simulaciones guardadas. Realiza una desde la
          calculadora y usa el botón “Guardar simulación”.
        </p>
      )}

      {!loading && !error && simulations.length > 0 && (
        <div className="overflow-x-auto mt-4 border border-slate-200 rounded-lg">
          <table className="min-w-full text-xs md:text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-slate-700">Fecha</th>
                <th className="px-3 py-2 text-left text-slate-700">Monto</th>
                <th className="px-3 py-2 text-left text-slate-700">Moneda</th>
                <th className="px-3 py-2 text-left text-slate-700">Tasa anual</th>
                <th className="px-3 py-2 text-left text-slate-700">Tipo tasa</th>
                <th className="px-3 py-2 text-left text-slate-700">Plazo (años)</th>
                <th className="px-3 py-2 text-left text-slate-700">
                  Cuota mensual
                </th>
                <th className="px-3 py-2 text-left text-slate-700">
                  Entidad
                </th>
                <th className="px-3 py-2 text-left text-slate-700">
                  VAN
                </th>
                <th className="px-3 py-2 text-left text-slate-700">
                  TIR
                </th>
                <th className="px-3 py-2 text-left text-slate-700">
                  Producto
                </th>
                <th className="px-3 py-2 text-left text-slate-700">
                  Notas
                </th>
              </tr>
            </thead>
            <tbody>
              {simulations.map((sim) => {
                const cur = sim.currency || "PEN";
                return (
                  <tr key={sim.id} className="border-t border-slate-200">
                    <td className="px-3 py-2 text-slate-700">
                      {new Date(sim.created_at).toLocaleString("es-PE")}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {formatMoney(sim.amount, cur)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {cur === "USD" ? "USD $" : "PEN S/"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {sim.annual_rate.toFixed(2)}%
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {sim.rate_type === "nominal"
                        ? "Nominal"
                        : sim.rate_type === "effective"
                        ? "Efectiva"
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {sim.term_years}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {formatMoney(sim.monthly_payment, cur)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {sim.bank_name || "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {sim.npv !== null && sim.npv !== undefined
                        ? formatMoney(sim.npv, cur)
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {sim.irr !== null && sim.irr !== undefined
                        ? `${sim.irr.toFixed(2)}%`
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {sim.product_type || "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {sim.notes || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SimulationHistory;
