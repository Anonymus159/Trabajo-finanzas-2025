// src/components/Navbar.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import type { User } from "../App";
import logoFondoMivivienda from "../assets/logo-fondo-mivivienda.png";

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path
      ? "text-white font-semibold"
      : "text-sky-100 hover:text-white";

  return (
    <header className="w-full bg-[#003F8C] text-white shadow-md">
      <nav className="max-w-7xl mx-auto px-4 md:px-8 h-14 flex items-center">
        {/* LOGO → siempre envía a inicio ("/") */}
        <Link to="/" className="flex items-center gap-2">
          <img
            src={logoFondoMivivienda}
            alt="Fondo Mivivienda"
            className="h-8 w-auto object-contain"
          />
        </Link>

        {/* Links centro-izquierda */}
        <div className="ml-6 flex items-center gap-6 text-sm">
          <Link to="/" className={isActive("/")}>
            Inicio
          </Link>
          <Link to="/calculator" className={isActive("/calculator")}>
            Calculadora
          </Link>
          <Link to="/history" className={isActive("/history")}>
            Historial
          </Link>
        </div>

        {/* Lado derecho */}
        <div className="ml-auto flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="text-sky-100">{user.name}</span>
              <button
                onClick={onLogout}
                className="border border-white/80 rounded-full px-4 py-1 hover:bg-white hover:text-[#003F8C] transition text-xs md:text-sm"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="border border-white/80 rounded-full px-4 py-1 hover:bg-white hover:text-[#003F8C] transition text-xs md:text-sm"
              >
                Iniciar sesión
              </Link>
              <Link
                to="/register"
                className="border border-white/80 rounded-full px-4 py-1 hover:bg-white hover:text-[#003F8C] transition text-xs md:text-sm"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
