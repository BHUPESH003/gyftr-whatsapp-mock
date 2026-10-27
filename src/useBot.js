import { useEffect, useRef, useState } from 'react';
import {
  BRANDS,
  CATEGORIES,
  DEMO_OTP,
  DENOMS,
  MODE_LABEL,
  PROMO,
  SEED_ORDERS,
  STATUS_LABEL,
  USER,
  brandById,
  fmt,
  newOrderId,
  newVoucherCode,
  payModeOptions,
  priceOrder,
} from './data';

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
  const st = useRef({ step: null, lastPrompt: '', draft: {}, promo: null, otpTries: 0 });
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
  const patchUpi = (orderId, patch) =>
    setMessages((p) => p.map((m) => (m.kind === 'upiRequest' && m.orderId === orderId ? { ...m, ...patch } : m)));
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
    const hello = greet ? 'Hi! 👋 Welcome to Voucher Bot.\n' : '';
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
      const lines = list.map((o, i) => `${i + 1}. ${o.id}, ${brandById(o.brandId).name}, ${fmt(o.total)} (${STATUS_LABEL[o.status]})`);
      ask('menu_track', `Your recent orders:\n${lines.join('\n')}\n\nReply with a number to see details, or 0 for the menu.`);
      return;
    }
    st.current.step = null;
    say({
      kind: 'list',
      text: 'Your recent orders. Tap one to see its status:',
      rows: list.map((o) => ({
        id: 'order:' + o.id,
        label: `${o.id}, ${brandById(o.brandId).name}`,
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
      const b = brandById(o.brandId);
      const code = o.codes?.length ? `\nCode: ${o.codes.join(', ')}` : '';
      ask(
        'menu_after',
        `Order ${o.id}\n${b.name}, ${fmt(o.denom)} × ${o.qty}\nStatus: ${STATUS_LABEL[o.status]}${code}\n\nReply 0 for the main menu.`
      );
      return;
    }
    say({ kind: 'orderStatus', orderId: id });
  };

  // ---------- browsing ----------
  const buyIntro = () => {
    st.current.step = null;
    say(
      { kind: 'carousel', text: 'Here are some popular brands:', cards: BRANDS.slice(0, 6) },
      {
        kind: 'list',
        text: 'Or choose a category:',
        rows: CATEGORIES.map((c) => ({ id: 'cat:' + c.id, label: c.label, icon: c.icon })),
      }
    );
  };

  const showCategory = (catId) => {
    const c = CATEGORIES.find((x) => x.id === catId);
    say({ kind: 'carousel', text: `Popular brands in ${c.label}:`, cards: BRANDS.filter((b) => b.cat === catId) });
  };

  // A carousel button can only send a quick reply, and a Flow can only be opened
  // from a button in an interactive message. So "View" sends this message first.
  const showBrand = (id) => {
    const b = brandById(id);
    say({
      kind: 'flowButton',
      brandId: id,
      text: `${b.icon} ${b.name} gift voucher\nValid for 12 months. Delivered instantly on WhatsApp.`,
      label: 'Buy voucher',
    });
  };

  const claimOffer = () => {
    st.current.promo = PROMO;
    const b = brandById(PROMO.brandId);
    if (isMenu()) {
      st.current.draft = { brandId: PROMO.brandId };
      say({ kind: 'text', text: `Offer ${PROMO.code} applied 🎉\n${PROMO.label} on ${b.name}.` });
      askDenom();
      return;
    }
    say({
      kind: 'flowButton',
      brandId: PROMO.brandId,
      text: `Offer ${PROMO.code} applied 🎉\n${PROMO.label} on ${b.name}. Tap below to finish your order.`,
      label: 'Buy voucher',
    });
  };

  const openFlow = (brandId) => {
    const p = st.current.promo;
    setOverlay({ type: 'flow', brandId, promo: p && p.brandId === brandId ? p : null });
  };

  // ---------- orders and payment ----------
  const createOrder = (d) => {
    const price = priceOrder({ denom: d.denom, qty: d.qty, promo: d.promo, payMode: d.payMode, points: live.current.points });
    const o = {
      id: newOrderId(),
      brandId: d.brandId,
      denom: d.denom,
      qty: d.qty,
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
    const b = brandById(d.brandId);
    addMsg({
      from: 'user',
      kind: 'flowReply',
      title: 'Buy Voucher',
      lines: [`${b.name}, ${fmt(d.denom)} × ${d.qty}`, `Payment: ${MODE_LABEL[d.payMode]}`],
    });
    const o = createOrder(d);
    st.current.draft.orderId = o.id;
    const payLabel = o.pointsUsed > 0 ? (o.onlineDue > 0 ? 'Continue to pay' : 'Pay with points') : 'Pay now';
    say({
      kind: 'order',
      orderId: o.id,
      text: 'Voucher order created! 🎉\nHere are the details:',
      note: 'Complete the payment to receive your voucher. This order is held for 30 minutes.',
      buttons: [
        { id: 'pay:' + o.id, label: payLabel },
        { id: 'cancel:' + o.id, label: 'Cancel order' },
      ],
    });
  };

  const ctaMsg = (o) =>
    isMenu()
      ? {
          kind: 'cta',
          orderId: o.id,
          text: `Pay ${fmt(o.onlineDue)} securely. You will see all payment offers on this page.\nThe link expires in 30 minutes:`,
          linkText: `pay.gyftr.example/o/${o.id}`,
        }
      : {
          kind: 'cta',
          orderId: o.id,
          text: `Pay ${fmt(o.onlineDue)} securely. You will see all payment offers on the next page.\nThe link expires in 30 minutes.`,
          label: 'View offers and pay',
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
      say(ctaMsg(o));
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
    const b = brandById(o.brandId);
    patchOrder(id, { status: 'processing', paidWith: method });
    const codes = Array.from({ length: o.qty }, newVoucherCode);
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
        text: `Your voucher is ready 🎉\n${b.name}, ${fmt(o.denom)} × ${o.qty}\nCode: ${codes.join(', ')}\nValid for 12 months. ${to}\n\nReply 0 for the main menu.`,
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

  // Called by the payment web view.
  // UPI: the web view closes and a UPI request message lands in the chat.
  const onUpiPay = ({ orderId, vpa, payable, saved, kind }) => {
    setOverlay(null);
    patchOrder(orderId, { payable, saved, offerKind: kind });
    if (isMenu()) {
      st.current.draft.orderId = orderId;
      st.current.step = 'menu_upi';
    }
    say({ kind: 'upiRequest', orderId, vpa, amount: payable, saved, offerKind: kind, state: 'pending' });
  };

  // Mock-only: simulates the customer approving or declining in their UPI app.
  const onUpiResult = (orderId, ok) => {
    const o = findOrder(orderId);
    if (!o || o.status !== 'pending_payment') return;
    patchUpi(orderId, { state: ok ? 'approved' : 'declined' });
    if (ok) completeOrder(orderId, 'UPI', o.saved || 0);
    else payFailed(orderId);
  };

  // Called by the payment web view for cards and netbanking (bank or gateway page).
  const onGatewayDone = ({ orderId, ok, method, saved }) => {
    setOverlay(null);
    if (ok) completeOrder(orderId, method, saved);
    else payFailed(orderId);
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
    ask('menu_brand', `Brands in ${c.label}:\n${list.map((b, i) => `${i + 1}. ${b.name}`).join('\n')}`);
  };
  const askDenom = () =>
    ask('menu_denom', `Choose an amount:\n${DENOMS.map((d, i) => `${i + 1}. ${fmt(d)}`).join('\n')}`);
  const askQty = () => ask('menu_qty', 'How many vouchers? Reply with a number from 1 to 10.');
  const askRecipient = () => ask('menu_recipient', 'Who is this for?\n1. Me\n2. Someone else (gift)');
  const activePromo = (d) => (st.current.promo && st.current.promo.brandId === d.brandId ? st.current.promo : null);

  const askPayMode = () => {
    const d = st.current.draft;
    const base = priceOrder({ denom: d.denom, qty: d.qty, promo: activePromo(d), payMode: 'online', points: live.current.points });
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
    const price = priceOrder({ denom: d.denom, qty: d.qty, promo, payMode: d.payMode, points: live.current.points });
    const b = brandById(d.brandId);
    const lines = [
      'Please confirm your order:',
      `${b.name}, ${fmt(d.denom)} × ${d.qty}`,
      `For: ${d.gift ? `${d.gift.name} (+91 ${d.gift.phone})` : 'Me'}`,
      `Payment: ${MODE_LABEL[d.payMode]}`,
    ];
    if (promo) lines.push(`Offer ${promo.code}: -${fmt(price.promoDiscount)}`);
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
      case 'menu_claim':
        if (n === 1) return claimOffer();
        return bad();
      case 'menu_cat': {
        const c = CATEGORIES[n - 1];
        return c ? menuBrands(c.id) : bad();
      }
      case 'menu_brand': {
        const id = s.draft.brandList?.[n - 1];
        if (!id) return bad();
        s.draft.brandId = id;
        return askDenom();
      }
      case 'menu_denom': {
        const d = DENOMS[n - 1];
        if (!d) return bad();
        s.draft.denom = d;
        return askQty();
      }
      case 'menu_qty':
        if (!(n >= 1 && n <= 10)) return bad();
        s.draft.qty = n;
        return askRecipient();
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
          say({ kind: 'text', text: 'Order cancelled.' });
          return mainMenu(false);
        }
        if (n !== 1) return bad();
        const d = s.draft;
        const o = createOrder({ ...d, promo: activePromo(d), message: '' });
        s.draft = { orderId: o.id };
        const payWord = o.pointsUsed > 0 ? 'pay with points' : 'pay now';
        return ask('menu_pay', `Order ${o.id} created ✅\n1. ${payWord[0].toUpperCase() + payWord.slice(1)}\n2. Cancel order\n0. Main menu`);
      }
      case 'menu_pay':
        if (n === 1) return startPayment(s.draft.orderId);
        if (n === 2) return cancelOrder(s.draft.orderId);
        return bad();
      case 'menu_upi':
        return say({ kind: 'text', text: 'Waiting for your UPI approval. Open your UPI app to approve the request, or reply 0 for the menu.' });
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
    userSay(label);
    const [k, v] = id.split(':');
    switch (k) {
      case 'buy':
        return buyIntro();
      case 'track':
        return showOrdersList();
      case 'balance':
        return showBalance();
      case 'cat':
        return showCategory(v);
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
    st.current = { step: null, lastPrompt: '', draft: {}, promo: null, otpTries: 0 };

    if (cfg.current.entry === 'marketing') {
      if (isMenu()) {
        ask('menu_claim', `🎉 Gift smarter with Gyftr!\nGet ${PROMO.label} on ${brandById(PROMO.brandId).name} vouchers. Valid till 31 Oct.\n\nReply 1 to claim the offer.`);
      } else {
        say({
          kind: 'banner',
          headline: '10% off Brand A vouchers',
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
    openPay,
    closeOverlay,
    onFlowSubmit,
    onUpiPay,
    onUpiResult,
    onGatewayDone,
  };
}
