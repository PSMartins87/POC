import React from "react";

export default function StockRadar({ stocks = [] }) {
  return (
    <div>
      <h2
        style={{
          borderBottom: "1px solid #444",
          paddingBottom: "0.5rem",
          marginBottom: "2rem",
          color: "#e2e8f0",
          fontSize: "1.3rem",
        }}
      >
        Radar de Ações
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {stocks.map((stock) => {
          // Mapeia com segurança para as propriedades reais do Finnhub
          const change = stock.cotacaoAtual?.dp || 0;
          const isPositive = change >= 0;
          const price = stock.cotacaoAtual?.c || 0;
          const high52 = stock.metricas?.metric?.["52WeekHigh"];
          const low52 = stock.metricas?.metric?.["52WeekLow"];

          return (
            <div
              key={stock.ticker || stock.symbol}
              style={{
                padding: "1.5rem",
                borderRadius: "8px",
                background: "#1a1a1a",
                border: "1px solid #333",
                boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <h3
                  style={{ margin: "0", color: "#60a5fa", fontSize: "1.5rem" }}
                >
                  {stock.ticker || stock.symbol}
                </h3>
                <span
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: "bold",
                    color: isPositive ? "#22c55e" : "#ef4444",
                  }}
                >
                  {isPositive ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
                </span>
              </div>
              <p
                style={{
                  fontSize: "2rem",
                  margin: "0 0 1.5rem 0",
                  fontWeight: "bold",
                }}
              >
                $ {Number(price).toFixed(2)}
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                  borderTop: "1px solid #333",
                  paddingTop: "1rem",
                  color: "#aaa",
                }}
              >
                <div>
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.7rem",
                      color: "#666",
                      textTransform: "uppercase",
                    }}
                  >
                    52W High
                  </span>
                  <strong style={{ color: "#e2e8f0" }}>
                    $ {high52 ? Number(high52).toFixed(2) : "-"}
                  </strong>
                </div>
                <div>
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.7rem",
                      color: "#666",
                      textTransform: "uppercase",
                    }}
                  >
                    52W Low
                  </span>
                  <strong style={{ color: "#e2e8f0" }}>
                    $ {low52 ? Number(low52).toFixed(2) : "-"}
                  </strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
