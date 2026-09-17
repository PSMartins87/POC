import React from "react";

export default function MarketError({ errorConfig }) {
  return (
    <div
      style={{
        padding: "3rem",
        textAlign: "center",
        background: "#1a1a1a",
        borderRadius: "8px",
        border: "1px solid #333",
        margin: "2rem",
      }}
    >
      <h2
        style={{
          color: errorConfig.isForbidden ? "#f59e0b" : "#ef4444",
          marginBottom: "1rem",
        }}
      >
        {errorConfig.isForbidden ? "Acesso Negado 🔒" : "Ops! Algo deu errado."}
      </h2>
      <p style={{ color: "#e2e8f0", fontSize: "1.1rem", marginBottom: "2rem" }}>
        {errorConfig.message}
      </p>

      {errorConfig.isForbidden && (
        <button
          onClick={() => (window.location.href = "/suporte/solicitar-acesso")}
          style={{
            padding: "10px 20px",
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Solicitar Acesso de Investidor
        </button>
      )}
    </div>
  );
}
