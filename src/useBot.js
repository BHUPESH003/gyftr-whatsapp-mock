import { useEffect, useRef, useState } from 'react';
import {
  BRANDS,
  CATEGORIES,
  DEMO_OTP,
  DENOMS,
  MODE_LABEL,
  PRODUCT_BLURB,
  PROMO,
  SEED_ORDERS,
  STATUS_LABEL,
  USER,
  brandById,
  fmt,
  newOrderId,
  newVoucherCode,
  addItem,
  itemCount,
  itemsSubtotal,
  CUSTOM_MAX,
  CUSTOM_MIN,
  WEB_CART,
  customAmountError,
  lineItems,
  offersForItems,
  orderTitle,
  payModeOptions,
  priceOrder,
  validatePromo,
} from './data';

const CART_BUTTONS = [
  { id: 'buy', label: 'Continue shopping' },
  { id: 'editcart', label: 'Edit cart' },
];
const itemLabel = (i) => `${brandById(i.brandId).name}, ${fmt(i.denom)} × ${i.qty}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const clock = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const today = () => new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
let uid = 0;

/**
 * The whole bot lives here. Two modes share the same business logic:
 *  - "flow": buttons, lists, carousel and a WhatsApp Flow for checkout (hybrid)
 *  - "menu": plain numbered text replies, for when Flows are not available
 */
export function useBot({ entry, mode, startPoints }) {
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [points, setPoints] = useState(startPoints);
  const [orders, setOrders] = useState(SEED_ORDERS);
  const [overlay, setOverlay] = useState(null);

  const sess = useRef(0);
  const queue = useRef(Promise.resolve());
  const st = useRef({ step: null, lastPrompt: '', draft: {}, promo: null, otpTries: 0, cart: null });
  const live = useRef({ points: startPoints, orders: SEED_ORDERS });
  const cfg = useRef({ entry, mode });
  cfg.current = { entry, mode };

  const isMenu = () => cfg.current.mode === 'menu';

  // ---------- state helpers ----------
  const putPoints = (v) => {
    live.current.points = v;
    setPoints(v);
  };
  const putOrders = (fn) => {
    live.current.orders = fn(live.current.orders);
    setOrders(live.current.orders);
  };
  const patchOrder = (id, patch) => putOrders((os) => os.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const findOrder = (id) => live.current.orders.find((o) => o.id === id);

  const addMsg = (m) => setMessages((p) => [...p, { id: ++uid, time: clock(), ...m }]);
  const userSay = (text) => addMsg({ from: 'user', kind: 'text', text });

  // Bot messages go through a queue so they arrive in order with a typing pause.
  const say = (...msgs) => {
    const sid = sess.current;
    queue.current = queue.current.then(async () => {
      for (const { delay, after, ...m } of msgs) {
        if (sid !== sess.current) return;
        setTyping(true);
        await wait(delay ?? 650);
        if (sid !== sess.current) return;
        setTyping(false);
        addMsg({ from: 'bot', ...m });
        if (after) after();
      }
    });
  };

  // Menu mode helper: remember the prompt so we can repeat it on bad input.
  const ask = (step, text) => {
    st.current.step = step;
    st.current.lastPrompt = text;
    say({ kind: 'text', text });
  };

  // ---------- main menu, balance, tracking ----------
  const mainMenu = (greet) => {
    const hello = greet ? 'Hi! 👋 Welcome to Gyftr.\n' : '';
    if (isMenu()) {
      ask('menu_main', `${hello}Reply with a number:\n1. Buy a voucher\n2. Track an order\n3. Check points balance`);
      return;
    }
    st.current.step = null;
    say({
      kind: 'buttons',
      text: greet ? `${hello}What would you like to do today?` : 'What would you like to do next?',
      buttons: [
        { id: 'buy', label: 'Buy a voucher' },
        { id: 'track', label: 'Track order' },
        { id: 'balance', label: 'Check balance' },
      ],
    });
  };

  const showBalance = () => {
    const p = live.current.points;
    if (isMenu()) {
      ask('menu_after', `Your points balance: ${p.toLocaleString('en-IN')} pts (worth ${fmt(p)}).\n\nReply 0 for the main menu.`);
      return;
    }
    st.current.step = null;
    say({
      kind: 'balance',
      points: p,
      buttons: [
        { id: 'buy', label: 'Buy a voucher' },
        { id: 'track', label: 'Track order' },
      ],
    });
  };

  const showOrdersList = () => {
    const list = live.current.orders.slice(0, 5);
    if (!list.length) {
      say({ kind: 'text', text: 'You have no orders yet.' });
      mainMenu(false);
      return;
    }
    if (isMenu()) {
      st.current.draft.trackList = list.map((o) => o.id);
      const lines = list.map((o, i) => `${i + 1}. ${o.id}, ${orderTitle(o)}, ${fmt(o.total)} (${STATUS_LABEL[o.status]})`);
      ask('menu_track', `Your recent orders:\n${lines.join('\n')}\n\nReply with a number to see details, or 0 for the menu.`);
      return;
    }
    st.current.step = null;
    say({
      kind: 'list',
      title: 'Orders',
      text: 'Your recent orders. Tap the button to pick one:',
      rows: list.map((o) => ({
        id: 'order:' + o.id,
        label: `${o.id}, ${orderTitle(o)}`,
        sub: `${fmt(o.total)}, ${STATUS_LABEL[o.status]}`,
        icon: '🧾',
      })),
    });
  };

  const showOrder = (id) => {
    const o = findOrder(id);
    if (!o) {
      say({ kind: 'text', text: 'I could not find that order.' });
      return;
    }
    if (isMenu()) {
      const code = o.codes?.length ? `\nCode: ${o.codes.join(', ')}` : '';
      ask(
        'menu_after',
        `Order ${o.id}\n${lineItems(o).map(itemLabel).join('\n')}\nStatus: ${STATUS_LABEL[o.status]}${code}\n\nReply 0 for the main menu.`
      );
      return;
    }
    say({ kind: 'orderStatus', orderId: id });
  };

  // ---------- browsing ----------
  const categoryList = (text) => ({
    kind: 'list',
    title: 'Categories',
    text,
    rows: CATEGORIES.map((c) => ({ id: 'cat:' + c.id, label: c.label, icon: c.icon })),
  });
  // A catalog message opens WhatsApp's catalog view. With items it is a multi-product message.
  const catalogMsg = (text, items) => ({ kind: 'catalog', text, items });

  const buyIntro = () => {
    st.current.step = null;
    say(
      { kind: 'carousel', text: 'Here are some popular brands:', cards: BRANDS.slice(0, 6) },
      catalogMsg('Want to see everything? Browse the full catalogue.'),
      categoryList('Or choose a category:')
    );
  };

  const showCategory = (catId) => {
    const c = CATEGORIES.find((x) => x.id === catId);
    say(
      { kind: 'carousel', text: `Popular brands in ${c.label}:`, cards: BRANDS.filter((b) => b.cat === catId) },
      {
        kind: 'buttons',
        text: 'Not what you are looking for?',
        buttons: [
          { id: 'cats', label: 'Change category' },
          { id: 'catalog', label: 'Browse catalogue' },
        ],
      }
    );
  };

  // A carousel button can only send a quick reply, and a Flow can only be opened
  // from a button in an interactive message. So "View" sends this message first.
  // Product details: an image card with a button that opens the product page.
  // Adding from there sends a cart message, like WhatsApp's native cart flow.
  const showBrand = (id, note) => {
    const b = brandById(id);
    const s = st.current;
    if (isMenu()) {
      s.draft.brandId = id;
      say({ kind: 'text', text: `*${b.name} gift voucher*\nFrom ${fmt(DENOMS[0])}. ${PRODUCT_BLURB}${note ? `\n${note}` : ''}` });
      return askDenom();
    }
    say({
      kind: 'product',
      brandId: id,
      from: fmt(DENOMS[0]),
      text: `${PRODUCT_BLURB}${note ? `\n${note}` : ''}`,
    });
  };

  const cartText = (items) =>
    `${items.map((i) => `${i.qty} x ${brandById(i.brandId).name} gift voucher (${fmt(i.denom)})`).join('\n')}\n\nCart total: ${fmt(itemsSubtotal(items))}`;
  const promoFor = (items) => {
    const p = st.current.promo;
    return p && items.some((i) => i.brandId === p.brandId) ? p : null;
  };

  const putCart = (items) => {
    st.current.cart = items;
  };

  // The customer sent a cart: add what they sent and confirm with the whole cart.
  const addItemsToCart = (sent, intro = 'Hooray! 🎉 The product has been added to your cart.') => {
    const items = sent.reduce(addItem, st.current.cart || []);
    putCart(items);
    addMsg({ from: 'user', kind: 'cartSent', items: sent });
    const p = promoFor(items);
    say({
      kind: 'cartAdded',
      text: `${intro}\n\n${cartText(items)}${p ? `\nOffer ${p.code} will be applied at checkout.` : ''}`,
      buttons: CART_BUTTONS,
    });
  };
  const addToCart = (brandId, denom, qty = 1) => addItemsToCart([{ brandId, denom, qty }]);

  // The bot cart only exists in messages, so editing it is a list of items to remove.
  const editCart = () => {
    const items = st.current.cart || [];
    if (!items.length) return say({ kind: 'text', text: 'Your cart is empty.' });
    return say({
      kind: 'list',
      title: 'Remove an item',
      text: 'Which item do you want to remove?',
      rows: items.map((i, k) => ({ id: 'remove:' + k, label: `Remove ${brandById(i.brandId).name}`, sub: `${fmt(i.denom)} × ${i.qty}`, icon: '🗑️' })),
    });
  };
  const removeItem = (k) => {
    const items = (st.current.cart || []).filter((_, i) => i !== Number(k));
    putCart(items.length ? items : null);
    if (!items.length) {
      say({ kind: 'text', text: 'Your cart is now empty.' });
      return mainMenu(false);
    }
    return say({ kind: 'cartAdded', text: `Removed. Your cart:\n\n${cartText(items)}`, buttons: CART_BUTTONS });
  };

  // ---------- abandoned cart ----------
  // The cart saved from the app or website, sent as a marketing template message.
  const abandonedMsg = () => ({
    kind: 'abandoned',
    items: WEB_CART,
    buttons: [
      { id: 'resume', label: 'Complete my order' },
      { id: 'webcat', label: 'Show items in catalogue' },
    ],
    delay: 300,
  });
  // Option 1: we load the saved cart into the bot cart ourselves.
  const resumeCart = () => {
    putCart(WEB_CART);
    const p = promoFor(WEB_CART);
    say({
      kind: 'cartAdded',
      text: `Welcome back! 🛒 Your cart is ready.\n\n${cartText(WEB_CART)}${p ? `\nOffer ${p.code} will be applied at checkout.` : ''}`,
      buttons: CART_BUTTONS,
    });
  };
  // Option 2: a catalog with only those items; the customer adds them to a WhatsApp cart and sends it.
  const showWebCatalog = () =>
    say(catalogMsg('Here are the items you picked on the Gyftr app. Add them to your cart and send it to us.', WEB_CART));

  const claimOffer = () => {
    st.current.promo = PROMO;
    const b = brandById(PROMO.brandId);
    if (isMenu()) {
      st.current.draft = { brandId: PROMO.brandId };
      say({ kind: 'text', text: `Offer ${PROMO.code} applied 🎉\n${PROMO.label} on ${b.name}.` });
      askDenom();
      return;
    }
    showBrand(PROMO.brandId, `Offer ${PROMO.code} applied 🎉 ${PROMO.label} on ${b.name}.`);
  };

  const openFlow = () => {
    const items = st.current.cart;
    if (items?.length) setOverlay({ type: 'flow', items, promo: promoFor(items) });
  };

  // ---------- orders and payment ----------
  const createOrder = (d) => {
    const price = priceOrder({ items: d.items, promo: d.promo, payMode: d.payMode, points: live.current.points });
    const o = {
      id: newOrderId(),
      items: d.items,
      gift: d.gift,
      message: d.message || '',
      payMode: d.payMode,
      promo: d.promo,
      ...price,
      status: 'pending_payment',
      date: today(),
      codes: [],
    };
    putOrders((os) => [o, ...os]);
    return o;
  };

  const onFlowSubmit = (d) => {
    setOverlay(null);
    putCart(null);
    addMsg({
      from: 'user',
      kind: 'flowReply',
      title: 'Buy Voucher',
      lines: [...d.items.map(itemLabel), `Payment: ${MODE_LABEL[d.payMode]}`],
    });
    const o = createOrder(d);
    st.current.draft.orderId = o.id;
    say({
      kind: 'order',
      orderId: o.id,
      note: 'Held for 30 minutes.',
      label: o.pointsUsed > 0 && o.onlineDue === 0 ? 'Pay with points' : 'Review and pay',
    });
  };

  const ctaMsg = (o) =>
    isMenu()
      ? {
          kind: 'cta',
          orderId: o.id,
          text: `Review your order and pay ${fmt(o.payable ?? o.onlineDue)} securely.\nThe link expires in 30 minutes:`,
          linkText: `pay.gyftr.example/o/${o.id}`,
        }
      : {
          kind: 'cta',
          orderId: o.id,
          text: `Review your order and pay ${fmt(o.payable ?? o.onlineDue)} securely.\nThe link expires in 30 minutes.`,
          label: 'Review and Pay',
        };

  const startPayment = (id) => {
    const o = findOrder(id);
    const s = st.current;
    if (!o || o.status !== 'pending_payment') {
      say({ kind: 'text', text: 'This order can no longer be paid.' });
      return;
    }
    s.draft.orderId = id;
    if (o.pointsUsed > 0 && !o.pointsPaid) {
      s.step = 'otp';
      s.otpTries = 0;
      s.draft.payOrder = id;
      say({
        kind: 'text',
        text: `To use ${o.pointsUsed.toLocaleString('en-IN')} points, enter the 6-digit OTP we sent to ${USER.phoneMasked}.\n(Demo OTP: ${DEMO_OTP})`,
      });
      return;
    }
    if (o.onlineDue > 0) {
      s.step = null;
      // In the Flow experience the order message button opens the payment page directly.
      if (isMenu()) say(ctaMsg(o));
      else openPay(id);
      return;
    }
    completeOrder(id, 'Points');
  };

  const cancelOrder = (id) => {
    const o = findOrder(id);
    if (o && o.status === 'pending_payment') patchOrder(id, { status: 'cancelled' });
    st.current.draft = {};
    say({ kind: 'text', text: `Order ${id} cancelled. No money was taken.` });
    mainMenu(false);
  };

  const verifyOtp = (t) => {
    const s = st.current;
    const o = findOrder(s.draft.payOrder);
    if (t === DEMO_OTP) {
      s.step = null;
      s.otpTries = 0;
      putPoints(live.current.points - o.pointsUsed);
      patchOrder(o.id, { pointsPaid: true });
      if (o.onlineDue > 0) {
        say(
          {
            kind: 'text',
            text: `${fmt(o.pointsUsed)} paid with points ✅\nNew balance: ${live.current.points.toLocaleString('en-IN')} pts.\nRemaining ${fmt(o.onlineDue)} to pay online.`,
          },
          ctaMsg(o)
        );
      } else {
        completeOrder(o.id, 'Points');
      }
      return;
    }
    s.otpTries += 1;
    if (s.otpTries >= 3) {
      s.step = null;
      say({ kind: 'text', text: 'Too many wrong attempts. Your order is still open. Type "menu" to start again.' });
      return;
    }
    say({ kind: 'text', text: `That OTP does not match. ${3 - s.otpTries} tries left.` });
  };

  const completeOrder = (id, method, saved = 0) => {
    const o = findOrder(id);
    patchOrder(id, { status: 'processing', paidWith: method });
    const codes = Array.from({ length: lineItems(o).reduce((n, i) => n + i.qty, 0) }, newVoucherCode);
    const received = {
      kind: 'text',
      text: `Payment received via ${method} ✅${saved ? `\nOffer savings: ${fmt(saved)}` : ''}\nGenerating your voucher…`,
      delay: 500,
    };
    const deliver = () => patchOrder(id, { status: 'delivered', codes });
    if (isMenu()) {
      const to = o.gift ? `Sent to ${o.gift.name} (+91 ${o.gift.phone}).` : 'Also sent by SMS and email.';
      say(received, {
        kind: 'text',
        delay: 1500,
        text: `Your voucher is ready 🎉\n${lineItems(o).map(itemLabel).join('\n')}\nCode: ${codes.join(', ')}\nValid for 12 months. ${to}\n\nReply 0 for the main menu.`,
        after: () => {
          deliver();
          st.current.step = 'menu_after';
        },
      });
      return;
    }
    say(received, { kind: 'voucher', orderId: id, codes, delay: 1500, after: deliver });
    say({
      kind: 'buttons',
      text: 'Anything else I can help with?',
      buttons: [
        { id: 'buy', label: 'Buy another' },
        { id: 'track', label: 'Track order' },
        { id: 'balance', label: 'Check balance' },
      ],
      delay: 900,
    });
  };

  const payFailed = (id) => {
    st.current.draft.orderId = id;
    if (isMenu()) {
      ask('menu_pay', 'Payment was not completed. Your order is still open.\n1. Try again\n2. Cancel order\n0. Main menu');
      return;
    }
    say({
      kind: 'buttons',
      text: 'Payment was not completed. Your order is still open for 30 minutes.',
      buttons: [
        { id: 'pay:' + id, label: 'Try again' },
        { id: 'cancel:' + id, label: 'Cancel order' },
        { id: 'menu', label: 'Main menu' },
      ],
    });
  };

  // Called by the in-chat payment flow. On success the receipt stays open while the chat gets the voucher.
  const onPayment = ({ orderId, ok, method, saved = 0, payable, kind }) => {
    if (!ok) {
      setOverlay(null);
      payFailed(orderId);
      return;
    }
    patchOrder(orderId, { payable, saved, offerKind: kind });
    completeOrder(orderId, method, saved);
  };

  const openPay = (orderId) => setOverlay({ type: 'pay', orderId });
  const closeOverlay = () => setOverlay(null);


  // ---------- menu mode purchase steps ----------
  const menuBuy = () => {
    st.current.draft = {};
    ask(
      'menu_cat',
      `Pick a category:\n${CATEGORIES.map((c, i) => `${i + 1}. ${c.label}`).join('\n')}\n0. Main menu`
    );
  };
  const menuBrands = (catId) => {
    const c = CATEGORIES.find((x) => x.id === catId);
    const list = BRANDS.filter((b) => b.cat === catId);
    st.current.draft.brandList = list.map((b) => b.id);
    ask('menu_brand', `Brands in ${c.label}:\n${list.map((b, i) => `${i + 1}. ${b.name}`).join('\n')}\n\nReply C to change category.`);
  };
  const askDenom = () =>
    ask('menu_denom', `Choose an amount:\n${DENOMS.map((d, i) => `${i + 1}. ${fmt(d)}`).join('\n')}\n${DENOMS.length + 1}. Other amount`);
  const askQty = () => ask('menu_qty', 'How many vouchers? Reply with a number from 1 to 10.');
  const askRecipient = () => ask('menu_recipient', 'Who is this for?\n1. Me\n2. Someone else (gift)');
  const activePromo = (d) => d.promo || promoFor(st.current.cart || []);

  // Menu mode: ask for a promo code unless one is already applied (for example from the banner)
  const askPromo = () => {
    const d = st.current.draft;
    const existing = activePromo(d);
    if (existing) {
      say({ kind: 'text', text: `Offer ${existing.code} applied 🎉` });
      return askRecipient();
    }
    return ask(
      'menu_promo',
      `Have a promo code? Type it now.\nReply OFFERS to see available offers, or SKIP to continue without one.`
    );
  };

  const askPayMode = () => {
    const d = st.current.draft;
    const base = priceOrder({ items: st.current.cart, promo: activePromo(d), payMode: 'online', points: live.current.points });
    const opts = payModeOptions(base.total, live.current.points).filter((o) => o.ok);
    d.payOptions = opts.map((o) => o.id);
    ask(
      'menu_pay_mode',
      `How would you like to pay ${fmt(base.total)}?\n${opts.map((o, i) => `${i + 1}. ${o.title} (${o.note})`).join('\n')}`
    );
  };

  const menuSummary = () => {
    const d = st.current.draft;
    const promo = activePromo(d);
    const items = st.current.cart;
    const price = priceOrder({ items, promo, payMode: d.payMode, points: live.current.points });
    const lines = [
      'Please confirm your order:',
      ...items.map(itemLabel),
      `For: ${d.gift ? `${d.gift.name} (+91 ${d.gift.phone})` : 'Me'}`,
      `Payment: ${MODE_LABEL[d.payMode]}`,
    ];
    if (promo && price.promoDiscount) lines.push(`Offer ${promo.code}: -${fmt(price.promoDiscount)}`);
    if (price.pointsUsed) lines.push(`Points used: ${fmt(price.pointsUsed)}`);
    if (price.onlineDue) lines.push(`To pay online: ${fmt(price.onlineDue)}`);
    lines.push(`Total: ${fmt(price.total)}`, '', '1. Confirm', '2. Cancel');
    ask('menu_confirm', lines.join('\n'));
  };

  const handleMenu = (t) => {
    const s = st.current;
    const n = /^\d+$/.test(t) ? parseInt(t, 10) : NaN;
    if (/^(0|menu|hi|hello|start)$/i.test(t)) {
      s.draft = {};
      return mainMenu(false);
    }
    const bad = () => say({ kind: 'text', text: `Sorry, that is not an option.\n\n${s.lastPrompt}` });
    switch (s.step) {
      case 'menu_main':
        if (n === 1) return menuBuy();
        if (n === 2) return showOrdersList();
        if (n === 3) return showBalance();
        return bad();
      case 'menu_abandoned':
        if (n === 1) {
          putCart(WEB_CART);
          say({ kind: 'text', text: `Your cart is ready 🛒\n${cartText(WEB_CART)}` });
          return ask('menu_more', '1. Add another voucher\n2. Checkout');
        }
        if (n === 2) return mainMenu(false);
        return bad();
      case 'menu_claim':
        if (n === 1) return claimOffer();
        return bad();
      case 'menu_cat': {
        const c = CATEGORIES[n - 1];
        return c ? menuBrands(c.id) : bad();
      }
      case 'menu_brand': {
        if (/^c$/i.test(t)) return menuBuy();
        const id = s.draft.brandList?.[n - 1];
        if (!id) return bad();
        s.draft.brandId = id;
        return askDenom();
      }
      case 'menu_custom': {
        const err = customAmountError(t.replace(/[₹,\s]/g, ''));
        if (err) return say({ kind: 'text', text: `${err}.` });
        s.draft.denom = Number(t.replace(/[₹,\s]/g, ''));
        return askQty();
      }
      case 'menu_denom': {
        if (n === DENOMS.length + 1) return ask('menu_custom', `Type the amount, from ${fmt(CUSTOM_MIN)} to ${fmt(CUSTOM_MAX)}.`);
        const d = DENOMS[n - 1];
        if (!d) return bad();
        s.draft.denom = d;
        return askQty();
      }
      case 'menu_qty':
        if (!(n >= 1 && n <= 10)) return bad();
        putCart(addItem(s.cart || [], { brandId: s.draft.brandId, denom: s.draft.denom, qty: n }));
        say({ kind: 'text', text: `Added to your cart 🛒\n${cartText(s.cart)}` });
        return ask('menu_more', '1. Add another voucher\n2. Checkout');
      case 'menu_more':
        if (n === 1) return menuBuy();
        if (n === 2) return askPromo();
        return bad();
      case 'menu_promo': {
        if (/^skip$/i.test(t)) return askRecipient();
        if (/^offers?$/i.test(t)) {
          const lines = offersForItems(s.cart).map((o) => `${o.code}: ${o.label}. ${o.note}`);
          return say({ kind: 'text', text: `Available offers:\n${lines.join('\n')}\n\n${s.lastPrompt}` });
        }
        const r = validatePromo(t, s.cart);
        if (!r.ok) return say({ kind: 'text', text: `${r.error}. Try another code, or reply SKIP.` });
        s.draft.promo = r.promo;
        say({ kind: 'text', text: `${r.promo.code} applied 🎉 You save ${fmt(priceOrder({ items: s.cart, promo: r.promo, payMode: 'online', points: 0 }).promoDiscount)}.` });
        return askRecipient();
      }
      case 'menu_recipient':
        if (n === 1) {
          s.draft.gift = null;
          return askPayMode();
        }
        if (n === 2) return ask('menu_gift', "Send the recipient's name and mobile number, like:\nRahul Sharma 9876543210");
        return bad();
      case 'menu_gift': {
        const cleaned = t.replace(/(\d)\s+(?=\d)/g, '$1');
        const m = cleaned.match(/^(.+?)\s+(?:\+?91[\s-]?)?([6-9]\d{9})$/);
        if (!m) return bad();
        s.draft.gift = { name: m[1].trim(), phone: m[2] };
        return askPayMode();
      }
      case 'menu_pay_mode': {
        const id = s.draft.payOptions?.[n - 1];
        if (!id) return bad();
        s.draft.payMode = id;
        return menuSummary();
      }
      case 'menu_confirm': {
        if (n === 2) {
          s.draft = {};
          putCart(null);
          say({ kind: 'text', text: 'Order cancelled.' });
          return mainMenu(false);
        }
        if (n !== 1) return bad();
        const d = s.draft;
        const o = createOrder({ ...d, items: s.cart, promo: activePromo(d), message: '' });
        putCart(null);
        s.draft = { orderId: o.id };
        const payWord = o.pointsUsed > 0 ? 'pay with points' : 'pay now';
        return ask('menu_pay', `Order ${o.id} created ✅\n1. ${payWord[0].toUpperCase() + payWord.slice(1)}\n2. Cancel order\n0. Main menu`);
      }
      case 'menu_pay':
        if (n === 1) return startPayment(s.draft.orderId);
        if (n === 2) return cancelOrder(s.draft.orderId);
        return bad();
      case 'menu_track': {
        const id = s.draft.trackList?.[n - 1];
        return id ? showOrder(id) : bad();
      }
      default:
        return mainMenu(false);
    }
  };

  // ---------- inputs from the UI ----------
  // Taps on buttons, list rows and carousel cards.
  const act = (id, label) => {
    const [k, v] = id.split(':');
    userSay(label);
    switch (k) {
      case 'buy':
        return buyIntro();
      case 'track':
        return showOrdersList();
      case 'balance':
        return showBalance();
      case 'cat':
        return showCategory(v);
      case 'editcart':
        return editCart();
      case 'remove':
        return removeItem(v);
      case 'cats':
        return say(categoryList('Choose a category:'));
      case 'catalog':
        return say(catalogMsg('Browse the full Gyftr catalogue.'));
      case 'resume':
        return resumeCart();
      case 'webcat':
        return showWebCatalog();
      case 'view':
        return showBrand(v);
      case 'claim':
        return claimOffer();
      case 'order':
        return showOrder(v);
      case 'pay':
        return startPayment(v);
      case 'cancel':
        return cancelOrder(v);
      case 'menu':
        return mainMenu(false);
      default:
        return undefined;
    }
  };

  // Typed messages.
  const onText = (raw) => {
    const t = raw.trim();
    if (!t) return;
    userSay(t);
    const s = st.current;
    if (s.step === 'otp') {
      if (/^(0|menu)$/i.test(t)) {
        s.step = null;
        return mainMenu(false);
      }
      return verifyOtp(t);
    }
    if (isMenu()) return handleMenu(t);
    if (/^(hi|hello|hey|menu|start)$/i.test(t)) return mainMenu(false);
    return say({ kind: 'text', text: 'I did not catch that. Tap one of the buttons above, or type "menu" to start over.' });
  };

  // ---------- start / cleanup ----------
  useEffect(() => {
    sess.current += 1;
    queue.current = Promise.resolve();
    setMessages([]);
    setTyping(false);
    setOverlay(null);
    live.current = { points: startPoints, orders: SEED_ORDERS };
    setPoints(startPoints);
    setOrders(SEED_ORDERS);
    st.current = { step: null, lastPrompt: '', draft: {}, promo: null, otpTries: 0, cart: null };

    if (cfg.current.entry === 'abandoned') {
      if (isMenu()) {
        const lines = WEB_CART.map((i) => `${itemLabel(i)}`).join('\n');
        ask('menu_abandoned', `🛒 You left these in your Gyftr cart:\n${lines}\nTotal: ${fmt(itemsSubtotal(WEB_CART))}\n\n1. Complete my order\n2. Main menu`);
      } else {
        say(abandonedMsg());
      }
    } else if (cfg.current.entry === 'marketing') {
      if (isMenu()) {
        ask('menu_claim', `🎉 Gift smarter with Gyftr!\nGet ${PROMO.label} on ${brandById(PROMO.brandId).name} vouchers. Valid till 31 Oct.\n\nReply 1 to claim the offer.`);
      } else {
        say({
          kind: 'banner',
          headline: '10% off Pizza Hut vouchers',
          body: 'Gift smarter with Gyftr. Use code WELCOME10 on your first order. Valid till 31 Oct.',
          label: 'Claim offer',
          delay: 300,
        });
      }
    } else {
      userSay('Hi');
      mainMenu(true);
    }
    return () => {
      sess.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    messages,
    typing,
    points,
    orders,
    overlay,
    act,
    onText,
    openFlow,
    startPayment,
    addItemsToCart,
    addToCart,
    openPay,
    closeOverlay,
    onFlowSubmit,
    onPayment,
  };
}
