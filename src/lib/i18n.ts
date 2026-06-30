import { enUS, pt } from "date-fns/locale";

export const translations = {
  en: {
    title: "HSN Price Analytics",
    subtitle: "Real-time flash sale tracking and historical data.",
    botActive: "Discord Bot Active",
    chartTitle: "Lowest Daily Price",
    chartDesc: "Tracking Evowhey and Creatine 1Kg drops over time.",
    noData: "No historical data collected yet.",
    noDataSub: "Data will appear here after the next cron job runs!",
    addDiscord: "Add to Discord",
    dateLocale: enUS
  },
  pt: {
    title: "Análise de Preços HSN",
    subtitle: "Rastreamento de promoções em tempo real e histórico de preços.",
    botActive: "Bot Discord Ativo",
    chartTitle: "Preço Mínimo Diário",
    chartDesc: "Acompanhando quedas de preço de Evowhey e Creatina 1Kg.",
    noData: "Nenhum dado histórico coletado ainda.",
    noDataSub: "Os dados aparecerão aqui após a próxima execução do cron job!",
    addDiscord: "Adicionar ao Discord",
    dateLocale: pt
  }
};
