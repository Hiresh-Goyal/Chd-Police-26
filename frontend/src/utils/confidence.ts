export const tierColor = (tier: string) => ({
  CONFIRMED: 'bg-green-600 text-white',
  PROBABLE: 'bg-amber-500 text-white',
  CANDIDATE: 'bg-gray-400 text-white',
}[tier] ?? 'bg-gray-300');
