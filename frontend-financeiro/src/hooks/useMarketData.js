import { useState, useEffect } from "react";
import api from "../services/api";

export function useMarketData() {
  const [marketData, setMarketData] = useState({
    ativo: null,
    cotacaoAtual: null,
    metricas: null,
  });
  const [loading, setLoading] = useState(true);
  const [errorConfig, setErrorConfig] = useState({
    hasError: false,
    message: null,
    isForbidden: false,
  });

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await api.get("/api/dashboard/market");
        setMarketData(response.data.data);
      } catch (err) {
        console.error("Erro na API Market:", err);

        if (err.response) {
          const status = err.response.status;
          if (status === 403) {
            setErrorConfig({
              hasError: true,
              isForbidden: true,
              message:
                "Acesso Restrito: Seu perfil não possui a permissão de 'Investidor' para visualizar o Radar de Mercado.",
            });
          } else if (status === 401) {
            setErrorConfig({
              hasError: true,
              isForbidden: false,
              message: "Sua sessão expirou. Por favor, faça login novamente.",
            });
          } else {
            setErrorConfig({
              hasError: true,
              isForbidden: false,
              message: `O servidor retornou um erro (${status}). Tente novamente mais tarde.`,
            });
          }
        } else {
          setErrorConfig({
            hasError: true,
            isForbidden: false,
            message:
              "Falha de comunicação com o servidor. Verifique sua conexão.",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
  }, []);

  return { marketData, loading, errorConfig };
}
