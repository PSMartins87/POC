import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// 👇 1. Importe a sua instância configurada do Axios (Ajuste o caminho se necessário)
import api from "./services/api"; 

import Dashboard from "./components/Dashboard";
import MarketOverview from "./components/MarketOverview";

const queryClient = new QueryClient();

// Como o baseURL já está configurado no seu api.js, não precisamos repetir a URL inteira aqui
const API_BASE_URL = "http://localhost:3000"; 

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    // 👇 2. Use o "api" configurado ao invés do "axios" puro!
    api.get("/api/auth/me")
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false));
  }, []);

  if (isAuthenticated === null) {
    return (
      <div style={{ padding: "20px", color: "white" }}>
        Verificando sessão...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>
        <h1 style={{ color: "white" }}>Bem-vindo ao Sistema</h1>
        <a
          href={`${API_BASE_URL}/api/auth/login`}
          style={{
            padding: "10px 20px",
            background: "#3b82f6",
            color: "white",
            textDecoration: "none",
            borderRadius: "5px",
          }}
        >
          Fazer Login com Segurança
        </a>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div style={{ padding: "10px", maxWidth: "1200px", margin: "0 auto" }}>
          <nav
            style={{
              marginBottom: "20px",
              padding: "15px 20px",
              background: "#1f2937",
              borderRadius: "8px",
              display: "flex",
              gap: "20px",
              alignItems: "center",
            }}
          >
            <Link
              to="/"
              style={{
                color: "white",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              Início (Dashboard)
            </Link>
            
            <a
              href={`${API_BASE_URL}/api/auth/logout`}
              style={{
                color: "#ef4444",
                textDecoration: "none",
                fontWeight: "bold",
                marginLeft: "auto",
              }}
            >
              Sair
            </a>
          </nav>

          <Routes>
            <Route
              path="/"
              element={
                <>
                  <Dashboard />
                  <MarketOverview />
                </>
              }
            />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;