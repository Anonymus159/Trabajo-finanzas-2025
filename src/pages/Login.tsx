// src/pages/Login.tsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import type { User } from "../App";

interface LoginProps {
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const Login: React.FC<LoginProps> = ({ setUser }) => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/login.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Error al iniciar sesión.");
      }

      const user: User = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
      };

      // guardar sesión simple
      localStorage.setItem("mivi_user", JSON.stringify(user));
      localStorage.setItem("mivi_token", data.auth_token);

      setUser(user);
      navigate("/"); // o "/history" si quieres ir directo al historial
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocurrió un error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-slate-800 mb-4">
        Iniciar sesión
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 text-white text-sm font-medium py-2.5 hover:bg-emerald-700 transition disabled:opacity-60"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        ¿No tienes una cuenta?{" "}
        <Link to="/register" className="text-emerald-600 hover:underline">
          Regístrate aquí
        </Link>
      </p>
    </div>
  );
};

export default Login;
