// All mock data and pricing rules live here, so swapping in real Gyftr APIs is a one-file job.

export const USER = { phoneMasked: '+91 ••••• •3210' };
export const DEMO_OTP = '123456';

export const CATEGORIES = [
  { id: 'food', label: 'Food', icon: '🍴' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
];

export const BRANDS = [
  { id: 'a', name: 'Brand A', cat: 'food', icon: '🍕', tint: '#fde2e4' },
  { id: 'b', name: 'Brand B', cat: 'shopping', icon: '🛒', tint: '#fff1c2' },
  { id: 'c', name: 'Brand C', cat: 'shopping', icon: '🏷️', tint: '#dbeafe' },
  { id: 'd', name: 'Brand D', cat: 'entertainment', icon: '🎮', tint: '#dcfce7' },
  { id: 'e', name: 'Brand E', cat: 'entertainment', icon: '▶️', tint: '#ede9fe' },
  { id: 'f', name: 'Brand F', cat: 'food', icon: '🥘', tint: '#ffedd5' },
  { id: 'g', name: 'Brand G', cat: 'travel', icon: '✈️', tint: '#e0f2fe' },
  { id: 'h', name: 'Brand H', cat: 'travel', icon: '🛏️', tint: '#f3e8ff' },
  { id: 'i', name: 'Brand I', cat: 'shopping', icon: '🎁', tint: '#d1fae5' },
];

export const DENOMS = [250, 500, 1000, 2000, 5000];

// Promo codes. A promo with a brandId only works on that partner, otherwise it works on any.
export const PROMOS = [
  { code: 'WELCOME10', label: '10% off (up to ₹100)', note: 'First order on Brand A', pct: 10, cap: 100, min: 0, brandId: 'a' },
  { code: 'GIFT50', label: '₹50 off', note: 'On orders of ₹500 and above', flat: 50, min: 500, brandId: null },
  { code: 'TREAT5', label: '5% off (up to ₹75)', note: 'On any partner', pct: 5, cap: 75, min: 0, brandId: null },
  { code: 'TRAVEL15', label: '15% off (up to ₹300)', note: 'Travel partners, ₹1,000 and above', pct: 15, cap: 300, min: 1000, brandId: 'g' },
];

// Marketing banner journey: opens straight into Brand A with this code applied.
export const PROMO = PROMOS[0];

export const promoValue = (promo, subtotal) => {
  if (!promo || subtotal < (promo.min || 0)) return 0;
  return promo.flat ?? Math.min(Math.round((subtotal * promo.pct) / 100), promo.cap);
};

export const offersForBrand = (brandId) => PROMOS.filter((p) => !p.brandId || p.brandId === brandId);

export function validatePromo(rawCode, brandId, subtotal) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return { ok: false, error: 'Enter a promo code' };
  const promo = PROMOS.find((p) => p.code === code);
  if (!promo) return { ok: false, error: 'This code is not valid' };
  if (promo.brandId && promo.brandId !== brandId) {
    return { ok: false, error: `${promo.code} only works on ${brandById(promo.brandId).name}` };
  }
  if (subtotal < (promo.min || 0)) {
    return { ok: false, error: `Add ${fmt(promo.min - subtotal)} more to use ${promo.code}` };
  }
  return { ok: true, promo };
}

// Offers shown on the payment web view. "instant" lowers the amount charged,
// "cashback" is credited later.
export const OFFERS = [
  { id: 'upi', method: 'upi', label: 'UPI', icon: '📲', kind: 'cashback', title: '5% cashback on UPI', terms: 'Up to ₹50 on orders of ₹500 and above', pct: 5, cap: 50, min: 500 },
  { id: 'card', method: 'card', label: 'Credit or debit card', icon: '💳', kind: 'instant', title: '₹40 off on cards', terms: 'On orders of ₹1,000 and above', flat: 40, min: 1000 },
  { id: 'nb', method: 'netbanking', label: 'Netbanking', icon: '🏦', kind: 'instant', title: '₹25 off on netbanking', terms: 'On orders of ₹750 and above', flat: 25, min: 750 },
];

export const BANKS = ['Bank A', 'Bank B', 'Bank C'];

export const STATUS_LABEL = {
  pending_payment: 'Payment pending',
  processing: 'Processing',
  delivered: 'Voucher delivered',
  cancelled: 'Cancelled',
  failed: 'Failed',
};

export const MODE_LABEL = { points: 'Points', online: 'Pay online', split: 'Points + online' };

export const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');
export const brandById = (id) => BRANDS.find((b) => b.id === id);

export function priceOrder({ denom, qty, promo, payMode, points }) {
  const subtotal = denom * qty;
  const promoDiscount = promoValue(promo, subtotal);
  const total = subtotal - promoDiscount;
  let pointsUsed = 0;
  if (payMode === 'points') pointsUsed = total;
  if (payMode === 'split') pointsUsed = Math.min(points, total);
  return { subtotal, promoDiscount, total, pointsUsed, onlineDue: total - pointsUsed };
}

export function payModeOptions(total, points) {
  const p = points.toLocaleString('en-IN');
  const canPoints = points >= total;
  const canSplit = points > 0 && points < total;
  return [
    {
      id: 'points',
      title: 'Points',
      icon: '🪙',
      ok: canPoints,
      note: canPoints ? `Balance ${p} pts` : `Balance ${p} pts, need ${(total - points).toLocaleString('en-IN')} more`,
    },
    { id: 'online', title: 'Pay online', icon: '💳', ok: true, note: 'UPI, cards or netbanking, with offers' },
    {
      id: 'split',
      title: 'Points + online',
      icon: '🪙',
      ok: canSplit,
      note: canSplit ? `Use ${p} pts, pay ${fmt(total - points)} online` : points === 0 ? 'No points to use' : 'Your points cover this order',
    },
  ];
}

export function offerValue(offer, amount) {
  if (amount < offer.min) return 0;
  return offer.flat ?? Math.min(Math.round((amount * offer.pct) / 100), offer.cap);
}

export function timeline(status) {
  const labels = ['Order placed', 'Payment received', 'Voucher delivered'];
  const done = { pending_payment: 1, processing: 2, delivered: 3, cancelled: 1, failed: 1 }[status] ?? 1;
  return labels.map((label, i) => ({ label, done: i < done }));
}

export const newOrderId = () => 'GF-' + (10300 + Math.floor(Math.random() * 600));
const chunk = () => Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, 'X');
export const newVoucherCode = () => `${chunk()}-${chunk()}-${chunk()}`;

export const SEED_ORDERS = [
  { id: 'GF-10231', brandId: 'b', denom: 500, qty: 1, total: 500, subtotal: 500, promoDiscount: 0, pointsUsed: 0, onlineDue: 500, payMode: 'online', gift: null, status: 'delivered', paidWith: 'UPI', date: '18 Oct', codes: ['K7QX-92LM-P0AD'] },
  { id: 'GF-10198', brandId: 'g', denom: 1000, qty: 1, total: 1000, subtotal: 1000, promoDiscount: 0, pointsUsed: 0, onlineDue: 1000, payMode: 'online', gift: null, status: 'processing', paidWith: 'Netbanking', date: '12 Oct', codes: [] },
];
