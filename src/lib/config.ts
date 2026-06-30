export interface Product {
  id: string;
  name: string;
  url: string;
  weightLabel?: string;
}

export const PRODUCTS: Product[] = [
  {
    id: 'evowhey',
    name: 'Evowhey',
    url: 'https://www.hsnstore.pt/marcas/sport-series/evowhey-protein',
    weightLabel: '2Kg'
  },
  {
    id: 'creatine',
    name: 'Creatine 1Kg',
    url: 'https://www.hsnstore.pt/marcas/raw-series/creatina-monoidrato-em-po-200-mesh',
    weightLabel: '1Kg'
  }
];

export const getDiscordCommandChoices = () => {
  return PRODUCTS.map(p => ({
    name: p.name,
    value: p.id
  }));
};
