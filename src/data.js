// All mock data and pricing rules live here, so swapping in real Gyftr APIs is a one-file job.

export const USER = { phoneMasked: '+91 ••••• •3210' };
export const DEMO_OTP = '123456';

export const CATEGORIES = [
  { id: 'food', label: 'Food', icon: '🍴' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
];

// Real Gyftr partners. Logos and photos were saved from gyftr.com into public/brands.
const B = (id, name, cat, tint, logo, hero) => ({
  id, name, cat, tint, logo: `/brands/${id}-logo.${logo}`, hero: hero ? `/brands/${id}-hero.${hero}` : null,
});
export const BRANDS = [
  B('a', 'Pizza Hut', 'food', '#fde2e4', 'png', 'webp'),
  B('b', 'Myntra', 'shopping', '#ffe4ef', 'png', 'webp'),
  B('c', 'Croma', 'shopping', '#dcfce7', 'png', 'png'),
  B('d', 'BGMI UC', 'entertainment', '#fff1c2', 'png'),
  B('e', 'Bata', 'shopping', '#fee2e2', 'png', 'png'),
  B('f', 'EazyDiner', 'food', '#ffedd5', 'png'),
  B('g', 'MakeMyTrip Hotels', 'travel', '#e0f2fe', 'webp'),
  B('h', 'Ola Cabs', 'travel', '#ecfccb', 'png', 'webp'),
  B('i', 'Lifestyle', 'shopping', '#ede9fe', 'png', 'webp'),
  B('j', 'Zepto', 'food', '#f3e8ff', 'png'),
];

export const PRODUCT_BLURB = 'Valid for 12 months. Delivered instantly on WhatsApp.';
export const DENOMS = [250, 500, 1000, 2000, 5000];
export const CUSTOM_MIN = 100;
export const CUSTOM_MAX = 10000;
export const customAmountError = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n)) return 'Enter a whole amount in rupees';
  if (n < CUSTOM_MIN || n > CUSTOM_MAX) return `Enter an amount from ${fmt(CUSTOM_MIN)} to ${fmt(CUSTOM_MAX)}`;
  return '';
};

// Items the customer put in their cart on the Gyftr app or website, for the abandoned cart journey.
export const WEB_CART = [
  { brandId: 'a', denom: 500, qty: 1 },
  { brandId: 'b', denom: 1000, qty: 1 },
  { brandId: 'c', denom: 2000, qty: 1 },
];

// Promo codes. A promo with a brandId only works on that partner, otherwise it works on any.
export const PROMOS = [
  { code: 'WELCOME10', label: '10% off (up to ₹100)', note: 'First order on Pizza Hut', pct: 10, cap: 100, min: 0, brandId: 'a' },
  { code: 'GIFT50', label: '₹50 off', note: 'On orders of ₹500 and above', flat: 50, min: 500, brandId: null },
  { code: 'TREAT5', label: '5% off (up to ₹75)', note: 'On any partner', pct: 5, cap: 75, min: 0, brandId: null },
  { code: 'TRAVEL15', label: '15% off (up to ₹300)', note: 'Travel partners, ₹1,000 and above', pct: 15, cap: 300, min: 1000, brandId: 'g' },
];

// Marketing banner journey: opens straight into Pizza Hut with this code applied.
export const PROMO = PROMOS[0];

// A cart is a list of { brandId, denom, qty }. Old single-voucher orders have no items, so wrap them.
export const lineItems = (o) => o.items || [{ brandId: o.brandId, denom: o.denom, qty: o.qty }];
export const itemsSubtotal = (items) => items.reduce((n, i) => n + i.denom * i.qty, 0);
export const itemCount = (items) => items.reduce((n, i) => n + i.qty, 0);
export const orderTitle = (o) => {
  const it = lineItems(o);
  const first = `${brandById(it[0].brandId).name}, ${fmt(it[0].denom)} × ${it[0].qty}`;
  return it.length > 1 ? `${first} +${it.length - 1} more` : first;
};
// Add a voucher to a cart, merging a repeat of the same brand and amount.
export const addItem = (items, add) => {
  const hit = items.find((i) => i.brandId === add.brandId && i.denom === add.denom);
  return hit
    ? items.map((i) => (i === hit ? { ...i, qty: Math.min(10, i.qty + add.qty) } : i))
    : [...items, add];
};

// A promo with a brandId only counts the items of that brand.
export const eligibleSubtotal = (promo, items) =>
  itemsSubtotal(items.filter((i) => !promo.brandId || promo.brandId === i.brandId));

export const promoValue = (promo, items) => {
  if (!promo) return 0;
  const sub = eligibleSubtotal(promo, items);
  if (!sub || sub < (promo.min || 0)) return 0;
  return promo.flat ?? Math.min(Math.round((sub * promo.pct) / 100), promo.cap);
};

export const offersForItems = (items) =>
  PROMOS.filter((p) => !p.brandId || items.some((i) => i.brandId === p.brandId));

export function validatePromo(rawCode, items) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return { ok: false, error: 'Enter a promo code' };
  const promo = PROMOS.find((p) => p.code === code);
  if (!promo) return { ok: false, error: 'This code is not valid' };
  const sub = eligibleSubtotal(promo, items);
  if (promo.brandId && !sub) {
    return { ok: false, error: `${promo.code} only works on ${brandById(promo.brandId).name}` };
  }
  if (sub < (promo.min || 0)) {
    return { ok: false, error: `Add ${fmt(promo.min - sub)} more to use ${promo.code}` };
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

// What the payment gateway shows after "Review and pay". Debit and credit cards share the card offer.
export const PAY_METHODS = [
  { id: 'upi', label: 'UPI', icon: '📲', offer: 'upi' },
  { id: 'debit', label: 'Debit Card', icon: '💳', offer: 'card' },
  { id: 'credit', label: 'Credit Card', icon: '💳', offer: 'card' },
  { id: 'netbanking', label: 'Net Banking', icon: '🏦', offer: 'netbanking' },
];
export const UPI_APPS = ['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'CRED'];
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

export function priceOrder({ items, promo, payMode, points }) {
  const subtotal = itemsSubtotal(items);
  const promoDiscount = promoValue(promo, items);
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
