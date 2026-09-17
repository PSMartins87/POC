import { useQuery } from "@tanstack/react-query";
import api from "../services/api";

const fetchMacroEconomics = async () => {
  const response = await api.get("/api/dashboard/macro");

  // Extrai o objeto 'indicadores' retornado pelo backend/Bacen
  const indicadores = response.data.data.indicadores;

  // Retorna os dados mapeados exatamente como a tela espera
  return {
    selic: indicadores?.selic?.valor || "0",
    ipca: indicadores?.ipca?.valor || "0",
    dolar: indicadores?.ptax?.valor || "0",
  };
};

export const useMacroEconomics = () => {
  return useQuery({
    queryKey: ["macroEconomics"],
    queryFn: fetchMacroEconomics,
    staleTime: 1000 * 60 * 5,
  });
};
