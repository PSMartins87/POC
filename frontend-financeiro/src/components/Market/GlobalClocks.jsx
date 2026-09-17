import React from "react";

export default function GlobalClocks({ statuses = [] }) {
  return (
    <div
      style={{
        borderRight: "1px solid #333",
        paddingRight: "1.5rem",
        height: "100%",
      }}
    >
      <h2
        style={{
          borderBottom: "1px solid #444",
          paddingBottom: "0.5rem",
          marginBottom: "2rem",
          color: "#e2e8f0",
          fontSize: "1.3rem",
        }}
      >
        Relógio Global
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
        {statuses.map((market, index) => (
          <div
            key={index}
            style={{
              padding: "1rem",
              background: "#1a1a1a",
              borderRadius: "8px",
              border: "1px solid #333",
              boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
            }}
          >
            <h3
              style={{
                margin: "0 0 0.8rem 0",
                color: "#e2e8f0",
                fontSize: "1rem",
              }}
            >
              {market.displayName}
            </h3>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: market.isOpen ? "#22c55e" : "#ef4444",
                  boxShadow: `0 0 8px ${market.isOpen ? "#22c55e" : "#ef4444"}`,
                }}
              ></div>
              <span
                style={{
                  color: market.isOpen ? "#22c55e" : "#ef4444",
                  fontWeight: "bold",
                  fontSize: "0.9rem",
                }}
              >
                {market.isOpen ? "ABERTO" : "FECHADO"}
              </span>
            </div>
            <div
              style={{
                marginTop: "0.5rem",
                fontSize: "0.8rem",
                color: "#888",
                textTransform: "uppercase",
              }}
            >
              Sessão:{" "}
              <span style={{ color: "#aaa" }}>{market.session || "N/A"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
