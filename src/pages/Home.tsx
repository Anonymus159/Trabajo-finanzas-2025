import viviendaImg from "../assets/vivienda.jpg";
import actividadImg from "../assets/actividad.webp";
import proyectosImg from "../assets/proyectos.jpg";
import inversionImg from "../assets/inversion.png";
import logoTechoPropio from "../assets/logo-techo-propio.png";
import { Link } from "react-router-dom"; // 👈 añade esto

export default function Home() {
  const cards = [
    {
      title: "¿Buscas Vivienda?",
      img: viviendaImg,
      link: "#",
    },
    {
      title: "Actividad Financiera del Sector",
      img: actividadImg,
      link: "#",
    },
    {
      title: "Información para Construir Proyectos",
      img: proyectosImg,
      link: "#",
    },
    {
      title: "Indicadores para la Inversión",
      img: inversionImg,
      link: "#",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
      {/* TARJETAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((item, index) => (
          <div
            key={index}
            className="relative shadow rounded-lg overflow-hidden group cursor-pointer"
          >
            <img
              src={item.img}
              alt={item.title}
              className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#4FE3FF]/70 to-[#00C4FF]/70 pointer-events-none"></div>
            <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
              <h3 className="font-semibold text-lg drop-shadow-md">
                {item.title}
              </h3>
              <a
                href="https://www.mivivienda.com.pe/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline underline-offset-2 mt-1 opacity-90 hover:opacity-100"
              >
                Ingresa aquí
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* BANNER "SIMULA TU CRÉDITO" */}
      <div className="mt-14">
        <div className="bg-[#003F8C] text-white rounded-md p-6 md:p-8 flex items-center gap-6">
          <img
            src={logoTechoPropio}
            alt="Programa Techo Propio"
            className="h-16 w-auto object-contain"
          />

          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-semibold">
              SIMULA TU CRÉDITO
            </h2>
            <p className="text-sm md:text-base opacity-90">
              Financia aquí tu crédito MiVivienda
            </p>
          </div>

          {/* 👇 aquí el cambio: Link en lugar de <a> */}
          <Link
            to="/calculator"
            className="bg-white text-[#003F8C] px-5 py-2 rounded-full font-semibold hover:bg-gray-100 text-sm md:text-base"
          >
            Simular ahora
          </Link>
        </div>
      </div>
    </div>
  );
}
