import { useEffect, useRef, useState } from 'react';
import { MODE_LABEL, STATUS_LABEL, brandById, fmt, timeline } from '../data';

const Time = ({ m }) => <span className="time">{m.time}</span>;

function Pills({ buttons, onAct }) {
  return (
    <div className="pills">
      {buttons.map((b) => (
        <button key={b.id} className="pill" onClick={() => onAct(b.id, b.label)}>
          {b.label}
        </button>
      ))}
    </div>
  );
}

function Row({ k, v, good }) {
  return (
    <div className="line">
      <span>{k}</span>
      <b className={good ? 'good' : ''}>{v}</b>
    </div>
  );
}

function OrderCard({ order }) {
  const b = brandById(order.brandId);
  return (
    <div className="card">
      <div className="card-head">
        <span className="brand-ico sm" style={{ background: b.tint }}>{b.icon}</span>
        <div>
          <b>{b.name}</b>
          <small>Gift voucher, {order.id}</small>
        </div>
      </div>
      <Row k="Amount" v={fmt(order.denom)} />
      <Row k="Quantity" v={order.qty} />
      <Row k="For" v={order.gift ? `${order.gift.name}, +91 ${order.gift.phone}` : 'Me'} />
      {order.message && <Row k="Message" v={order.message} />}
      <Row k="Payment" v={MODE_LABEL[order.payMode]} />
      {order.promoDiscount > 0 && <Row k={`Offer ${order.promo.code}`} v={'-' + fmt(order.promoDiscount)} good />}
      {order.pointsUsed > 0 && <Row k="Points" v={fmt(order.pointsUsed)} />}
      {order.onlineDue > 0 && <Row k="To pay online" v={fmt(order.onlineDue)} />}
      <div className="total">
        <span>Total amount</span>
        <b>{fmt(order.total)}</b>
      </div>
    </div>
  );
}

function CopyBtn({ code }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="copy"
      onClick={() => {
        navigator.clipboard?.writeText(code);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

function Message({ m, orders, onAct, onOpenFlow, onOpenPay, onUpiResult }) {
  const mine = m.from === 'user';
  const order = m.orderId ? orders.find((o) => o.id === m.orderId) : null;

  switch (m.kind) {
    case 'text':
      return (
        <div className={'bubble ' + (mine ? 'mine' : '')}>
          <p>{m.text}</p>
          <Time m={m} />
        </div>
      );

    case 'flowReply':
      return (
        <div className="bubble mine flow-reply">
          <b>🧾 {m.title}</b>
          {m.lines.map((l) => <p key={l}>{l}</p>)}
          <Time m={m} />
        </div>
      );

    case 'buttons':
      return (
        <>
          <div className="bubble">
            <p>{m.text}</p>
            <Time m={m} />
          </div>
          <Pills buttons={m.buttons} onAct={onAct} />
        </>
      );

    case 'list':
      return (
        <div className="bubble wide">
          <p>{m.text}</p>
          <div className="rows">
            {m.rows.map((r) => (
              <button key={r.id} className="row" onClick={() => onAct(r.id, r.label)}>
                <span className="row-ico">{r.icon}</span>
                <span className="row-txt">
                  {r.label}
                  {r.sub && <small>{r.sub}</small>}
                </span>
                <span className="chev">›</span>
              </button>
            ))}
          </div>
          <Time m={m} />
        </div>
      );

    case 'carousel':
      return (
        <>
          <div className="bubble">
            <p>{m.text}</p>
            <Time m={m} />
          </div>
          <div className="carousel">
            {m.cards.map((c) => (
              <div key={c.id} className="cardlet">
                <span className="brand-ico" style={{ background: c.tint }}>{c.icon}</span>
                <b>{c.name}</b>
                <button className="cta-btn" onClick={() => onAct('view:' + c.id, c.name)}>View</button>
              </div>
            ))}
          </div>
        </>
      );

    case 'banner':
      return (
        <div className="bubble banner">
          <div className="banner-art">
            <span>🎁</span>
            <b>{m.headline}</b>
          </div>
          <p>{m.body}</p>
          <small className="sponsored">Marketing message from Gyftr</small>
          <button className="cta-btn full" onClick={() => onAct('claim', m.label)}>{m.label}</button>
          <Time m={m} />
        </div>
      );

    case 'flowButton':
      return (
        <div className="bubble">
          <p>{m.text}</p>
          <Time m={m} />
          <button className="cta-btn full flow" onClick={() => onOpenFlow(m.brandId)}>
            <span>🧾</span> {m.label}
          </button>
        </div>
      );

    case 'cta':
      return (
        <div className="bubble">
          <p>{m.text}</p>
          {m.linkText && (
            <button className="link" onClick={() => onOpenPay(m.orderId)}>{m.linkText}</button>
          )}
          <Time m={m} />
          {m.label && (
            <button className="cta-btn full flow" onClick={() => onOpenPay(m.orderId)}>
              <span>↗</span> {m.label}
            </button>
          )}
        </div>
      );

    case 'order':
      return order ? (
        <>
          <div className="bubble wide">
            <p>{m.text}</p>
            <OrderCard order={order} />
            <p className="note">{m.note}</p>
            <Time m={m} />
          </div>
          {order.status === 'pending_payment' && <Pills buttons={m.buttons} onAct={onAct} />}
        </>
      ) : null;

    case 'orderStatus':
      return order ? (
        <>
          <div className="bubble wide">
            <b>
              Order {order.id}, {STATUS_LABEL[order.status]}
            </b>
            <p>
              {brandById(order.brandId).name}, {fmt(order.denom)} × {order.qty}
            </p>
            <ol className="tl">
              {timeline(order.status).map((s) => (
                <li key={s.label} className={s.done ? 'done' : ''}>{s.label}</li>
              ))}
              {order.status === 'cancelled' && <li className="bad">Order cancelled</li>}
            </ol>
            {order.codes?.length > 0 && (
              <div className="codes">
                {order.codes.map((c) => (
                  <div key={c} className="code"><code>{c}</code><CopyBtn code={c} /></div>
                ))}
              </div>
            )}
            <Time m={m} />
          </div>
          {order.status === 'pending_payment' && (
            <Pills buttons={[{ id: 'pay:' + order.id, label: 'Pay now' }]} onAct={onAct} />
          )}
        </>
      ) : null;

    case 'balance':
      return (
        <>
          <div className="bubble wide">
            <p>Your points balance</p>
            <div className="balance">
              <b>{m.points.toLocaleString('en-IN')}</b>
              <span>pts</span>
            </div>
            <p className="note">Worth {fmt(m.points)}. Use points when you pay for a voucher.</p>
            <Time m={m} />
          </div>
          <Pills buttons={m.buttons} onAct={onAct} />
        </>
      );

    case 'voucher': {
      if (!order) return null;
      const b = brandById(order.brandId);
      return (
        <div className="bubble wide">
          <p>Your voucher is ready! 🎉</p>
          <div className="card voucher">
            <div className="card-head">
              <span className="brand-ico sm" style={{ background: b.tint }}>{b.icon}</span>
              <div>
                <b>{b.name}</b>
                <small>{fmt(order.denom)} gift voucher</small>
              </div>
            </div>
            {m.codes.map((c) => (
              <div key={c} className="code"><code>{c}</code><CopyBtn code={c} /></div>
            ))}
            <small className="note">
              {order.gift ? `Sent to ${order.gift.name} (+91 ${order.gift.phone}). ` : 'Also sent by SMS and email. '}
              Valid for 12 months. Terms apply.
            </small>
          </div>
          <Time m={m} />
        </div>
      );
    }

    case 'upiRequest':
      return (
        <div className="bubble wide">
          <b>UPI payment request</b>
          <div className="card">
            <Row k="Amount" v={fmt(m.amount)} />
            <Row k="To pay from" v={m.vpa} />
            {m.saved > 0 && (
              <Row k={m.offerKind === 'cashback' ? 'Cashback later' : 'Offer saving'} v={fmt(m.saved)} good />
            )}
            <p className={'upi-state ' + m.state}>
              {m.state === 'pending' && 'Open your UPI app and approve the request. It expires in 5 minutes.'}
              {m.state === 'approved' && 'Approved ✅'}
              {m.state === 'declined' && 'Declined ✕'}
            </p>
          </div>
          {m.state === 'pending' && (
            <div className="demo">
              <small>Demo only: act as the customer</small>
              <div>
                <button onClick={() => onUpiResult(m.orderId, true)}>Approve in UPI app</button>
                <button onClick={() => onUpiResult(m.orderId, false)}>Decline</button>
                <button onClick={() => onOpenPay(m.orderId)}>Change method</button>
              </div>
            </div>
          )}
          <Time m={m} />
        </div>
      );

    default:
      return null;
  }
}

export default function Chat({ messages, typing, orders, onAct, onOpenFlow, onOpenPay, onUpiResult, onText }) {
  const [draft, setDraft] = useState('');
  const end = useRef(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typing]);

  const send = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onText(draft);
    setDraft('');
  };

  return (
    <>
      <div className="chat">
        {messages.map((m) => (
          <div key={m.id} className={'msg ' + (m.from === 'user' ? 'out' : 'in')}>
            <Message
              m={m}
              orders={orders}
              onAct={onAct}
              onOpenFlow={onOpenFlow}
              onOpenPay={onOpenPay}
              onUpiResult={onUpiResult}
            />
          </div>
        ))}
        {typing && (
          <div className="msg in">
            <div className="bubble typing"><i /><i /><i /></div>
          </div>
        )}
        <div ref={end} />
      </div>
      <form className="composer" onSubmit={send}>
        <div className="field">
          <span>☺</span>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message" />
          <span>📎</span>
        </div>
        <button className="send" type="submit" aria-label="Send">
          {draft.trim() ? '➤' : '🎤'}
        </button>
      </form>
    </>
  );
}
