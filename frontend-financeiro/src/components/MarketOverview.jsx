import React from "react";
import { useMarketData } from "../hooks/useMarketData";
import GlobalClocks from "./Market/GlobalClocks";
import StockRadar from "./Market/StockRadar";
import MarketNews from "./Market/MarketNews";
import MarketError from "./Market/MarketError";

export default function MarketOverview() {
  const { marketData, loading, errorConfig } = useMarketData();

  if (loading) {
    return (
      <div style={{ color: "#fff", padding: "2rem" }}>
        Carregando radar do mercado...
      </div>
    );
  }

  if (errorConfig.hasError) {
    return <MarketError errorConfig={errorConfig} />;
  }

  // 1. Adapta o status do mercado para um array esperado pelo GlobalClocks
  const marketStatuses = marketData?.statusMercado
    ? [
        {
          displayName: "NYSE / NASDAQ (EUA)",
          isOpen: marketData.statusMercado.isOpen,
          session: marketData.statusMercado.session,
        },
      ]
    : [];

  // 2. Adapta o ativo único da API para um array esperado pelo StockRadar
  const stocks = marketData?.ativo
    ? [
        {
          ...marketData.ativo,
          cotacaoAtual: marketData.cotacaoAtual,
          metricas: marketData.metricas,
        },
      ]
    : [];

  // 3. Mapeia as notícias gerais
  const news = marketData?.noticiasGerais || [];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "250px 1fr 300px",
        gap: "2rem",
        padding: "1rem",
        color: "#fff",
        maxWidth: "1600px",
        margin: "0 auto",
        alignItems: "start",
      }}
    >
      <GlobalClocks statuses={marketStatuses} />

      <StockRadar stocks={stocks} />

      <MarketNews news={news} />
    </div>
  );
}
