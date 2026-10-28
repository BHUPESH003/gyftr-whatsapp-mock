import { Fragment, useEffect, useRef, useState } from 'react';
import { BRANDS, MODE_LABEL, STATUS_LABEL, brandById, fmt, itemCount, itemsSubtotal, lineItems } from '../data';
import BrandArt from './BrandArt';
import { Camera, CopyIcon, External, FlowIcon, ListIcon, Lock, Mic, Plus, Reply, Send, Sticker, Ticks } from './icons';

/* WhatsApp text formatting: *bold* and ```monospace``` */
function Rich({ text }) {
  const parts = String(text).split(/(\*[^*\n]+\*|```[^`]+```)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('```')) return <code key={i}>{p.slice(3, -3)}</code>;
        if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <b key={i}>{p.slice(1, -1)}</b>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

function Meta({ m }) {
  return (
    <span className="meta">
      {m.time}
      {m.from === 'user' && <Ticks />}
    </span>
  );
}

function Bubble({ m, tail, children, className = '' }) {
  const out = m.from === 'user';
  return (
    <div className={`bubble ${out ? 'out' : 'in'} ${tail ? 'tail' : ''} ${className}`}>
      {children}
      <Meta m={m} />
    </div>
  );
}

const ICONS = { reply: Reply, link: External, list: ListIcon, flow: FlowIcon, copy: CopyIcon };

function WBtn({ icon = 'reply', onClick, children, disabled }) {
  const I = ICONS[icon];
  return (
    <button className="wbtn" onClick={onClick} disabled={disabled}>
      <I size={18} /> <span>{children}</span>
    </button>
  );
}

function Buttons({ buttons, onAct }) {
  return buttons.map((b) => (
    <WBtn key={b.id} onClick={() => onAct(b.id, b.label)}>
      {b.label}
    </WBtn>
  ));
}

function CopyBtn({ codes }) {
  const [done, setDone] = useState(false);
  return (
    <WBtn
      icon="copy"
      onClick={() => {
        try {
          navigator.clipboard?.writeText(codes.join('\n'));
        } catch {
          /* clipboard can be blocked in some contexts */
        }
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? 'Copied' : codes.length > 1 ? 'Copy codes' : 'Copy code'}
    </WBtn>
  );
}

// rows: [text] for a plain line, [label, value] for a "*label:* value" line
function Lines({ rows }) {
  return rows.filter(Boolean).map(([k, v], i) =>
    v === undefined ? (
      <div key={i} className="ln"><Rich text={k || '\u00a0'} /></div>
    ) : (
      <div key={i} className="ln">
        <b>{k}:</b> <Rich text={v} />
      </div>
    )
  );
}

const forWhom = (o) => (o.gift ? `${o.gift.name} (+91 ${o.gift.phone})` : 'Me');

function Message({ m, tail, orders, a }) {
  const order = m.orderId ? orders.find((o) => o.id === m.orderId) : null;

  switch (m.kind) {
    case 'text':
      return (
        <div className="stack">
          <Bubble m={m} tail={tail}>
            <span className="txt"><Rich text={m.text} /></span>
          </Bubble>
        </div>
      );

    case 'flowReply':
      return (
        <div className="stack">
          <Bubble m={m} tail={tail}>
            <div className="ln"><b>{m.title}</b></div>
            {m.lines.map((l) => <div key={l} className="ln">{l}</div>)}
          </Bubble>
        </div>
      );

    case 'buttons':
      return (
        <div className="stack">
          <Bubble m={m} tail={tail}><span className="txt"><Rich text={m.text} /></span></Bubble>
          <Buttons buttons={m.buttons} onAct={a.onAct} />
        </div>
      );

    case 'list':
      return (
        <div className="stack">
          <Bubble m={m} tail={tail}><span className="txt"><Rich text={m.text} /></span></Bubble>
          <WBtn icon="list" onClick={() => a.onOpenList(m)}>{m.title}</WBtn>
        </div>
      );

    case 'carousel':
      return (
        <div className="stack wide">
          <Bubble m={m} tail={tail}><span className="txt"><Rich text={m.text} /></span></Bubble>
          <div className="cards">
            {m.cards.map((c) => (
              <div key={c.id} className="wcard">
                <BrandArt brand={c} className="wcard-img" />
                <div className="wcard-body">
                  <b>{c.name}</b>
                  <span>Gift voucher</span>
                </div>
                <WBtn onClick={() => a.onAct('view:' + c.id, c.name)}>View</WBtn>
              </div>
            ))}
          </div>
        </div>
      );

    case 'product': {
      const b = brandById(m.brandId);
      return (
        <div className="stack">
          <div className="bubble in tail media">
            <BrandArt brand={b} className="prod-art" />
            <span className="txt pad"><b>{b.name} gift voucher</b></span>
            <span className="foot pad">From {m.from}</span>
            <span className="txt pad"><Rich text={m.text} /></span>
            <Meta m={m} />
          </div>
          <WBtn icon="link" onClick={() => a.onOpenProduct(m.brandId)}>View details</WBtn>
        </div>
      );
    }

    // the cart the customer sends from WhatsApp's native catalog flow
    case 'cartSent': {
      const n = itemCount(m.items);
      return (
        <div className="stack">
          <div className="bubble out tail cartmsg">
            <div className="cart-row">
              <BrandArt brand={brandById(m.items[0].brandId)} logo className="cart-thumb" />
              <div className="cart-info">
                <b>🛒 {n} item{n > 1 ? 's' : ''}</b>
                <span>{fmt(itemsSubtotal(m.items))}.00 (estimated total)</span>
              </div>
            </div>
            <Meta m={m} />
          </div>
          <WBtn onClick={() => a.onOpenCart({ items: m.items, readOnly: true })}>View sent cart</WBtn>
        </div>
      );
    }

    case 'cartAdded':
      return (
        <div className="stack">
          <Bubble m={m} tail={tail}><span className="txt"><Rich text={m.text} /></span></Bubble>
          <WBtn icon="flow" onClick={() => a.onOpenFlow()}>Place My Order</WBtn>
          <Buttons buttons={m.buttons} onAct={a.onAct} />
        </div>
      );

    case 'catalog': {
      const brands = (m.items ? m.items.map((i) => brandById(i.brandId)) : BRANDS).slice(0, 4);
      return (
        <div className="stack">
          <div className="bubble in tail media">
            <div className="cat-grid">
              {brands.map((b) => <BrandArt key={b.id} brand={b} logo className="cat-cell" />)}
            </div>
            <span className="txt pad"><Rich text={m.text} /></span>
            <Meta m={m} />
          </div>
          <WBtn icon="list" onClick={() => a.onOpenCatalog(m.items)}>{m.items ? 'View items' : 'View catalogue'}</WBtn>
        </div>
      );
    }

    // marketing template: items left in the cart on the app or website
    case 'abandoned':
      return (
        <div className="stack">
          <div className="bubble in tail media">
            <BrandArt brand={brandById(m.items[0].brandId)} className="prod-art" />
            <span className="txt pad">
              <b>You left something behind 🛒</b>
              {m.items.map((i) => `\n${i.qty} x ${brandById(i.brandId).name} gift voucher (${fmt(i.denom)})`)}
              {`\n\nCart total: ${fmt(itemsSubtotal(m.items))}`}
            </span>
            <span className="foot pad">Sent by Gyftr. Reply STOP to opt out.</span>
            <Meta m={m} />
          </div>
          <Buttons buttons={m.buttons} onAct={a.onAct} />
        </div>
      );

    case 'banner':
      return (
        <div className="stack">
          <div className="bubble in tail media">
            <div className="banner-art">
              <span>🎁</span>
              <b>{m.headline}</b>
            </div>
            <span className="txt pad"><Rich text={m.body} /></span>
            <span className="foot pad">Sent by Gyftr. Reply STOP to opt out.</span>
            <Meta m={m} />
          </div>
          <WBtn onClick={() => a.onAct('claim', m.label)}>{m.label}</WBtn>
        </div>
      );

    case 'flowButton':
      return (
        <div className="stack">
          <Bubble m={m} tail={tail}><span className="txt"><Rich text={m.text} /></span></Bubble>
          <WBtn icon="flow" onClick={() => a.onOpenFlow(m.brandId)}>{m.label}</WBtn>
        </div>
      );

    case 'cta':
      return (
        <div className="stack">
          <Bubble m={m} tail={tail}>
            <span className="txt">
              <Rich text={m.text} />
              {m.linkText && (
                <>
                  {'\n'}
                  <button className="inline-link" onClick={() => a.onOpenPay(m.orderId)}>{m.linkText}</button>
                </>
              )}
            </span>
          </Bubble>
          {m.label && <WBtn icon="link" onClick={() => a.onOpenPay(m.orderId)}>{m.label}</WBtn>}
        </div>
      );

    case 'order': {
      if (!order) return null;
      return (
        <div className="stack">
          <Bubble m={m} tail={tail}>
            <Lines
              rows={[
                ['*Voucher order created!* 🎉'],
                ['Here are the details:'],
                [''],
                ['Order', order.id],
                ...lineItems(order).map((i) => ['Voucher', `${brandById(i.brandId).name}, ${fmt(i.denom)} × ${i.qty}`]),
                ['For', forWhom(order)],
                order.message ? ['Message', order.message] : null,
                ['Payment', MODE_LABEL[order.payMode]],
                order.promoDiscount > 0 ? [`Offer ${order.promo.code}`, '-' + fmt(order.promoDiscount)] : null,
                order.pointsUsed > 0 ? ['Points', fmt(order.pointsUsed)] : null,
                order.payMethod ? ['Pay via', { upi: 'UPI', card: 'Card', netbanking: 'Netbanking' }[order.payMethod]] : null,
                order.saved > 0 ? [order.offerKind === 'cashback' ? 'Cashback later' : 'Offer saving', fmt(order.saved)] : null,
                order.onlineDue > 0 ? ['To pay online', fmt(order.payable ?? order.onlineDue)] : null,
                ['Total', fmt(order.total)],
                [''],
                [m.note],
              ]}
            />
          </Bubble>
          {order.status === 'pending_payment' && <Buttons buttons={m.buttons} onAct={a.onAct} />}
        </div>
      );
    }

    case 'orderStatus': {
      if (!order) return null;
      const steps = [
        ['Order placed', true],
        ['Payment received', order.status === 'processing' || order.status === 'delivered'],
        ['Voucher delivered', order.status === 'delivered'],
      ];
      return (
        <div className="stack">
          <Bubble m={m} tail={tail}>
            <Lines
              rows={[
                [`*Order ${order.id}*`],
                ...lineItems(order).map((i) => [`${brandById(i.brandId).name}, ${fmt(i.denom)} × ${i.qty}`]),
                [`Status: ${STATUS_LABEL[order.status]}`],
                [''],
                ...steps.map(([label, done]) => [`${done ? '✅' : '⏳'} ${label}`]),
                order.status === 'cancelled' ? ['❌ Order cancelled'] : null,
                order.codes?.length ? [''] : null,
                ...(order.codes || []).map((c) => [`\`\`\`${c}\`\`\``]),
              ]}
            />
          </Bubble>
          {order.status === 'pending_payment' && (
            <Buttons buttons={[{ id: 'pay:' + order.id, label: 'Pay now' }]} onAct={a.onAct} />
          )}
          {order.codes?.length > 0 && <CopyBtn codes={order.codes} />}
        </div>
      );
    }

    case 'balance':
      return (
        <div className="stack">
          <Bubble m={m} tail={tail}>
            <Lines
              rows={[
                ['*Points balance*'],
                [`${m.points.toLocaleString('en-IN')} pts (worth ${fmt(m.points)})`],
                [''],
                ['Use points when you pay for a voucher.'],
              ]}
            />
          </Bubble>
          <Buttons buttons={m.buttons} onAct={a.onAct} />
        </div>
      );

    case 'voucher': {
      if (!order) return null;
      let at = 0;
      const groups = lineItems(order).flatMap((i) => {
        const codes = m.codes.slice(at, (at += i.qty));
        return [
          [`${brandById(i.brandId).name} gift voucher, ${fmt(i.denom)}`],
          ...codes.map((c, k) => [codes.length > 1 ? `Code ${k + 1}` : 'Code', `\`\`\`${c}\`\`\``]),
          [''],
        ];
      });
      return (
        <div className="stack">
          <Bubble m={m} tail={tail}>
            <Lines
              rows={[
                ['*Your voucher is ready!* 🎉'],
                ...groups,
                [`${order.gift ? `Sent to ${order.gift.name} (+91 ${order.gift.phone}).` : 'Also sent by SMS and email.'} Valid for 12 months. Terms apply.`],
              ]}
            />
          </Bubble>
          <CopyBtn codes={m.codes} />
        </div>
      );
    }

    case 'upiRequest':
      return (
        <div className="stack">
          <Bubble m={m} tail={tail}>
            <Lines
              rows={[
                ['*UPI payment request sent*'],
                [''],
                ['Amount', fmt(m.amount)],
                ['From', m.vpa],
                m.saved > 0 ? [m.offerKind === 'cashback' ? 'Cashback later' : 'Offer saving', fmt(m.saved)] : null,
                [''],
                [
                  m.state === 'pending'
                    ? 'Open your UPI app and approve the request within 5 minutes.'
                    : m.state === 'approved'
                    ? '✅ Approved'
                    : '❌ Declined',
                ],
              ]}
            />
          </Bubble>
          {m.state === 'pending' && <WBtn onClick={() => a.onOpenPay(m.orderId)}>Change payment method</WBtn>}
        </div>
      );

    default:
      return null;
  }
}

export default function Chat({ messages, orders, onAct, onOpenFlow, onOpenPay, onOpenList, onOpenCart, onOpenProduct, onOpenCatalog }) {
  const ref = useRef(null);
  const a = { onAct, onOpenFlow, onOpenPay, onOpenList, onOpenCart, onOpenProduct, onOpenCatalog };

  // Scroll only the chat itself. scrollIntoView would also scroll the 3D layer's ancestors.
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat" ref={ref}>
      <div className="chip-date">Today</div>
      <div className="chip-note e2e">
        <Lock size={12} />
        <span>
          Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or
          listen to them. Tap to learn more.
        </span>
      </div>
      <div className="chip-note biz">
        This business uses a secure service from Meta to manage this chat. Tap to learn more.
      </div>
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const tail = !prev || prev.from !== m.from;
        return (
          <div key={m.id} className={`msg ${m.from === 'user' ? 'out' : 'in'} ${tail ? 'first' : ''} ${m.kind === 'carousel' ? 'wide' : ''}`}>
            <Message m={m} tail={tail} orders={orders} a={a} />
          </div>
        );
      })}
    </div>
  );
}

export function Composer({ onText }) {
  const [draft, setDraft] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onText(draft);
    setDraft('');
  };
  const has = draft.trim().length > 0;
  return (
    <form className="composer" onSubmit={submit}>
      <button type="button" className="c-ico" aria-label="Attach"><Plus size={28} /></button>
      <div className="field">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message" aria-label="Message" />
        <Sticker size={24} />
      </div>
      {has ? (
        <button type="submit" className="send" aria-label="Send"><Send size={20} /></button>
      ) : (
        <>
          <button type="button" className="c-ico" aria-label="Camera"><Camera size={26} /></button>
          <button type="button" className="c-ico" aria-label="Voice message"><Mic size={26} /></button>
        </>
      )}
    </form>
  );
}
