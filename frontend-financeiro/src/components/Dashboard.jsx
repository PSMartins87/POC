import React from "react";
import { useMacroEconomics } from "../hooks/useMacro";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const Dashboard = () => {
  const {
    data: macro,
    isLoading,
    isError,
    error,
    refetch,
  } = useMacroEconomics();

  if (isLoading) {
    return (
      <div style={{ color: "white", padding: "20px" }}>
        Carregando indicadores macroeconômicos...
      </div>
    );
  }

  if (isError) {
    const isForbidden = error?.response?.status === 403;

    return (
      <div
        style={{
          padding: "20px",
          background: "#222",
          border: "1px solid #444",
          borderRadius: "8px",
          margin: "20px",
        }}
      >
        <h3 style={{ color: isForbidden ? "#f59e0b" : "#ef4444" }}>
          {isForbidden
            ? "🔒 Acesso Macroeconômico Restrito"
            : "Falha ao carregar indicadores"}
        </h3>
        <p style={{ color: "#ccc", margin: "10px 0 20px 0" }}>
          {isForbidden
            ? "Você não possui a role necessária para visualizar a Taxa Selic e o IPCA."
            : "Houve um problema de comunicação com o servidor do Banco Central."}
        </p>

        {isForbidden ? (
          <button
            onClick={() => (window.location.href = "/suporte/solicitar-acesso")}
            style={{
              padding: "8px 16px",
              background: "#f59e0b",
              color: "#000",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Solicitar Acesso
          </button>
        ) : (
          <button
            onClick={() => refetch()}
            style={{
              padding: "8px 16px",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Tentar Novamente
          </button>
        )}
      </div>
    );
  }

  const handleLogout = () => {
    // URL dinâmica puxando da Cloudflare ou Localhost
    window.location.href = `${API_BASE_URL}/api/auth/logout`;
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ color: "white" }}>
          {macro?.summary || "Cenário Macroeconômico"}
        </h2>

        <button
          onClick={handleLogout}
          style={{
            padding: "8px 16px",
            background: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Sair da Conta
        </button>
      </header>

      <p style={{ color: "gray", fontSize: "14px" }}>Fonte: {macro?.source}</p>

      <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
        <Card title="Taxa SELIC" value={`${macro?.selic}%`} />
        <Card title="IPCA (12m)" value={`${macro?.ipca}%`} />
        <Card title="Dólar (PTAX)" value={`R$ ${macro?.dolar}`} />
      </div>
    </div>
  );
};

const Card = ({ title, value }) => (
  <div
    style={{
      padding: "20px",
      border: "1px solid #333",
      backgroundColor: "#222",
      borderRadius: "8px",
      minWidth: "150px",
      boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
    }}
  >
    <h4 style={{ margin: "0 0 10px 0", color: "#aaa" }}>{title}</h4>
    <p
      style={{
        fontSize: "24px",
        fontWeight: "bold",
        margin: 0,
        color: "#60a5fa",
      }}
    >
      {value !== "null%" && value !== "R$ null" ? value : "Indisponível"}
    </p>
  </div>
);

export default Dashboard;
