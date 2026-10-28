import { useEffect, useState } from 'react';
import { BANKS, OFFERS, UPI_APPS, brandById, fmt, lineItems, offerValue } from '../data';
import { ChevronLeft, ChevronRight, Close, Compass, Dots, Lock, Reload, Share } from './icons';

const METHOD_NAME = { upi: 'UPI', card: 'Card', netbanking: 'Netbanking' };

/**
 * Stands in for the in-app browser WhatsApp opens from a "View offers and pay" button.
 *  - UPI: closes and the chat gets a UPI request message.
 *  - Card or netbanking: goes straight to the bank or gateway page, then back to the chat.
 */
export default function WebView({ order, onUpi, onGateway, onClose }) {
  const [stage, setStage] = useState('offers'); // offers | redirecting | gateway | done
  const locked = Boolean(order.payMethod); // chosen earlier in the checkout Flow
  const [method, setMethod] = useState(order.payMethod || 'upi');
  const [app, setApp] = useState(UPI_APPS[0]);
  const [bank, setBank] = useState(BANKS[0]);
  const [err, setErr] = useState('');

  const items = lineItems(order);
  const due = order.onlineDue;
  const offer = OFFERS.find((o) => o.method === method);
  const value = offerValue(offer, due);
  const payable = offer.kind === 'instant' ? due - value : due;

  useEffect(() => {
    if (stage !== 'redirecting') return undefined;
    const t = setTimeout(() => setStage('gateway'), 1200);
    return () => clearTimeout(t);
  }, [stage]);

  const page =
    stage === 'offers'
      ? { host: 'pay.gyftr.example', title: 'Pay for your voucher' }
      : stage === 'redirecting'
      ? { host: 'pay.gyftr.example', title: 'Redirecting' }
      : method === 'netbanking'
      ? { host: 'netbanking.bank-a.example', title: `${bank} Netbanking` }
      : { host: 'secure.pg-demo.example', title: 'Secure card payment' };

  const submit = () => {
    if (method === 'upi') {
      onUpi({ orderId: order.id, app, payable, saved: value, kind: offer.kind });
      return;
    }
    setStage('redirecting');
  };

  const finish = (ok) => {
    const result = { orderId: order.id, ok, method: METHOD_NAME[method], saved: ok ? value : 0 };
    if (!ok) return onGateway(result);
    setStage('done');
    return setTimeout(() => onGateway(result), 900);
  };

  return (
    <div className="webview">
      <div className="wv-top">
        <button className="hbtn" onClick={onClose} aria-label="Close"><Close size={22} /></button>
        <div className="wv-title">
          <b>{page.title}</b>
          <span><Lock size={11} /> {page.host}</span>
        </div>
        <span className="hbtn muted"><Dots size={22} /></span>
      </div>

      <div className="wv-body">
        {stage === 'offers' && (
          <>
            <div className="pg-head">
              <img className="pg-logo" src="/gyftr-logo.png" alt="Gyftr" />
              <small>Order {order.id}</small>
              <h1>Pay {fmt(due)}</h1>
              <p>{locked ? 'Review your order and complete the payment.' : 'Pick how you want to pay. Offers are applied for you.'}</p>
            </div>

            <div className="pg-order">
              <h3>Order details</h3>
              {items.map((it) => (
                <div key={it.brandId + it.denom} className="rrow">
                  <span>{brandById(it.brandId).name}, {fmt(it.denom)} × {it.qty}</span>
                  <b>{fmt(it.denom * it.qty)}</b>
                </div>
              ))}
              {order.promoDiscount > 0 && <div className="rrow"><span>Offer {order.promo.code}</span><b className="good">-{fmt(order.promoDiscount)}</b></div>}
              {order.pointsUsed > 0 && <div className="rrow"><span>Paid with points</span><b>-{fmt(order.pointsUsed)}</b></div>}
              <div className="rrow"><span>To pay</span><b>{fmt(due)}</b></div>
            </div>

            <div className="pg-methods" role="radiogroup" aria-label="Payment method">
              {OFFERS.filter((o) => !locked || o.method === method).map((o) => {
                const v = offerValue(o, due);
                const on = o.method === method;
                return (
                  <div key={o.id} className={'pg-method ' + (on ? 'on' : '')}>
                    <button
                      className="pg-mhead"
                      role="radio"
                      aria-checked={on}
                      disabled={locked}
                      onClick={() => { setMethod(o.method); setErr(''); }}
                    >
                      <span className="pg-ico">{o.icon}</span>
                      <span className="pg-mtxt">
                        <b>{o.label}</b>
                        <small className={v ? 'good' : ''}>
                          {v ? `${o.title}. You save ${fmt(v)}` : `${o.title}. Add ${fmt(o.min - due)} more to unlock`}
                        </small>
                      </span>
                      <span className={'pg-radio ' + (on ? 'on' : '')} />
                    </button>

                    {on && o.method === 'upi' && (
                      <div className="pg-extra">
                        <div className="pg-apps" role="radiogroup" aria-label="UPI app">
                          {UPI_APPS.map((n) => (
                            <button key={n} className="pg-app" role="radio" aria-checked={n === app} onClick={() => setApp(n)}>
                              <span>{n}</span>
                              <span className={'pg-radio ' + (n === app ? 'on' : '')} />
                            </button>
                          ))}
                        </div>
                        <small>We will send a payment request to the app you pick.</small>
                      </div>
                    )}
                    {on && o.method === 'netbanking' && (
                      <div className="pg-extra">
                        <label>
                          Choose your bank
                          <select value={bank} onChange={(e) => setBank(e.target.value)}>
                            {BANKS.map((b) => <option key={b}>{b}</option>)}
                          </select>
                        </label>
                        <small>You will go to your bank's website to log in.</small>
                      </div>
                    )}
                    {on && o.method === 'card' && (
                      <div className="pg-extra">
                        <small>You will go to the secure payment page to enter card details.</small>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {err && <p className="pg-err">{err}</p>}
            <div className="pg-foot">
              <div className="pg-sum">
                <span>
                  {offer.kind === 'instant' && value
                    ? `After ${fmt(value)} off`
                    : value
                    ? `${fmt(value)} cashback after payment`
                    : 'No offer applied'}
                </span>
                <b>{fmt(payable)}</b>
              </div>
              <button className="pg-primary" onClick={submit}>
                {method === 'upi' ? 'Send UPI request' : `Pay ${fmt(payable)}`}
              </button>
            </div>
          </>
        )}

        {stage === 'redirecting' && (
          <div className="pg-center">
            <div className="spinner" />
            <p>Taking you to {method === 'netbanking' ? bank : 'the secure payment page'}…</p>
          </div>
        )}

        {stage === 'gateway' && (
          <div className="gw">
            <div className="gw-card">
              <img className="pg-logo" src="/gyftr-logo.png" alt="Gyftr" />
              <h2>{method === 'netbanking' ? `${bank} Netbanking` : 'Card verification'}</h2>
              <div className="rrow"><span>Merchant</span><b>GYFTR DEMO</b></div>
              <div className="rrow"><span>Amount</span><b>{fmt(payable)}</b></div>
              <p className="demo-note">Demo page. Never enter real bank or card details here.</p>
              <button className="pg-primary" onClick={() => finish(true)}>Authorize payment</button>
              <button className="pg-ghost" onClick={() => finish(false)}>Cancel</button>
            </div>
          </div>
        )}

        {stage === 'done' && (
          <div className="pg-center">
            <div className="tick">✓</div>
            <p>Payment successful. Returning to WhatsApp…</p>
          </div>
        )}
      </div>

      <div className="wv-tools">
        <ChevronLeft size={24} />
        <ChevronRight size={24} />
        <Reload size={22} />
        <Share size={22} />
        <Compass size={23} />
      </div>
    </div>
  );
}
