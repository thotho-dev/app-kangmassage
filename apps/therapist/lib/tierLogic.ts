export const TIER_DATA = [
  {
    tier: 'Bronze',
    orderUnit: 26,
    orderAmount: 5000000,
    komisi: 27, // 27%
    reward: 121500,
    targetMonth: '1 bulan'
  },
  {
    tier: 'Silver',
    orderUnit: 39,
    orderAmount: 8000000,
    komisi: 25, // 25%
    reward: 180000,
    targetMonth: '1 bulan'
  },
  {
    tier: 'Gold',
    orderUnit: 52,
    orderAmount: 15000000,
    komisi: 23, // 23%
    reward: 310500,
    targetMonth: '1 bulan'
  },
  {
    tier: 'Platinum',
    orderUnit: 70,
    orderAmount: 22000000,
    komisi: 21, // 21%
    reward: 415800,
    targetMonth: '1 bulan'
  },
  {
    tier: 'Diamond',
    orderUnit: 0, // No minimum unit or just depends on amount
    orderAmount: 29000000,
    komisi: 20, // 20%
    reward: 522000,
    targetMonth: 'reset /6 bulan (Reset Juli & Januari)'
  }
];

export function calculateTier(orderUnit: number, orderAmount: number): string {
  // Start checking from highest tier
  if (orderAmount >= 29000000) return 'Diamond';
  if (orderUnit >= 70 && orderAmount >= 22000000) return 'Platinum';
  if (orderUnit >= 52 && orderAmount >= 15000000) return 'Gold';
  if (orderUnit >= 39 && orderAmount >= 8000000) return 'Silver';
  if (orderUnit >= 26 && orderAmount >= 5000000) return 'Bronze';
  
  return 'Bronze'; // Default or below bronze, but let's stick to Bronze as base
}

export function getTierDetails(tierName: string) {
  return TIER_DATA.find(t => t.tier.toLowerCase() === tierName.toLowerCase()) || TIER_DATA[0];
}
