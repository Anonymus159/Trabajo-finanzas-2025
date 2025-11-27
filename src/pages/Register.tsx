// src/pages/Register.tsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name || !email || !password) {
      setError("Completa todos los campos.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/register.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Error en el registro.");
      }

      setSuccess("Registro exitoso. Ahora puedes iniciar sesión.");
      // opcional: redirigir al login después de unos segundos
      setTimeout(() => navigate("/login"), 1200);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocurrió un error al registrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-slate-800 mb-4">
        Crear cuenta
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nombre completo
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Juan Pérez"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Correo electrónico
          </label>
          <input
            type="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Contraseña
          </label>
          <input
            type="password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 text-white text-sm font-medium py-2.5 hover:bg-emerald-700 transition disabled:opacity-60"
        >
          {loading ? "Creando cuenta..." : "Registrarme"}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        ¿Ya tienes cuenta?{" "}
        <Link to="/login" className="text-emerald-600 hover:underline">
          Inicia sesión aquí
        </Link>
      </p>
    </div>
  );
};

export default Register;
