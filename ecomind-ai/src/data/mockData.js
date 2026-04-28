export const dashboardData = {
  totalUsage: 342,
  monthlyBill: 47.85,
  savingsThisMonth: 12.40,
  co2Emissions: 156,
  ecoScore: 78,
  topConsumer: 'Kondicioneri',
  aiSuggestion: 'Ulni temperaturën e AC në 24°C për të kursyer rreth 15.20€ këtë muaj.',
  weeklyUsage: [42, 38, 45, 52, 40, 35, 30],
  weeklyLabels: ['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die']
};

export const deviceData = [
  { id: '1', name: 'Kondicioneri', usage: '1.2 kWh', status: 'Aktiv' },
  { id: '2', name: 'Frigoriferi', usage: '0.4 kWh', status: 'Aktiv' },
  { id: '3', name: 'Bojleri', usage: '2.5 kWh', status: 'Fikur' },
  { id: '4', name: 'TV & Gaming', usage: '0.3 kWh', status: 'Aktiv' },
];

export const aiInsights = [
  {
    id: '1',
    title: 'Tarifa e Lirë',
    desc: 'Përdorni rrobëlarësen pas orës 22:00 për të paguar 50% më pak për energjinë e shpenzuar.',
    type: 'kursim'
  },
  {
    id: '2',
    title: 'Pajisjet Stand-by',
    desc: 'Fikni televizorin nga priza gjatë natës për të kursyer rreth 3€ në muaj.',
    type: 'paralajmërim'
  }
];
