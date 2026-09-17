import React from "react";

export default function MarketNews({ news = [] }) {
  return (
    <div
      style={{
        borderLeft: "1px solid #333",
        paddingLeft: "1.5rem",
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
        Giro de Mercado
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {news.map((article) => (
          <a
            key={article.id}
            href={article.url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            {article.image && (
              <img
                src={article.image}
                alt={article.headline}
                style={{
                  width: "100%",
                  height: "140px",
                  objectFit: "cover",
                  borderRadius: "6px",
                  marginBottom: "0.5rem",
                }}
              />
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "#3b82f6",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                {article.source}
              </span>
              <span style={{ fontSize: "0.7rem", color: "#666" }}>
                {new Date(article.datetime * 1000).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <h4
              style={{
                margin: "0",
                color: "#f8fafc",
                fontSize: "0.95rem",
                lineHeight: "1.4",
              }}
            >
              {article.headline}
            </h4>
          </a>
        ))}
      </div>
    </div>
  );
}
