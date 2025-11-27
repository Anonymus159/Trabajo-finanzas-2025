// src/App.tsx
import { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import "./App.css";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Calculator from "./pages/Calculator";
import SimulationHistory from "./pages/SimulationHistory";

// 👇 IMPORTA EL FOOTER
import Footer from "/src/components/Footer";



export interface User {
  id: number;
  name: string;
  email: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("mivi_user");
    localStorage.removeItem("mivi_token");
    setUser(null);
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="flex-1 px-4 md:px-8 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/history" element={<SimulationHistory />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      {/* 👇 FOOTER PERSONALIZEDO */}
      <Footer />
    </div>
  );
}

export default App;
