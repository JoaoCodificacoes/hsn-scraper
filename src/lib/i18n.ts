import { enUS, pt } from "date-fns/locale";

export const translations = {
  en: {
    title: "HSN Price Analytics",
    subtitle: "Real-time flash sale tracking and historical data.",
    botActive: "Discord Bot Active",
    chartTitle: "Lowest Daily Price",
    chartDesc: "Tracking Evowhey 2Kg and Creatine 1Kg drops over time.",
    noData: "No historical data collected yet.",
    noDataSub: "Data will appear here after the next cron job runs!",
    dateLocale: enUS
  },
  pt: {
    title: "Análise de Preços HSN",
    subtitle: "Rastreamento de promoções em tempo real e histórico de preços.",
    botActive: "Bot Discord Ativo",
    chartTitle: "Preço Mínimo Diário",
    chartDesc: "Acompanhando quedas de preço de Evowhey 2Kg e Creatina 1Kg.",
    noData: "Nenhum dado histórico coletado ainda.",
    noDataSub: "Os dados aparecerão aqui após a próxima execução do cron job!",
    dateLocale: pt
  }
};
