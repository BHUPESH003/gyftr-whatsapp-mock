import { useEffect, useState } from 'react';
import { BANKS, OFFERS, fmt, offerValue } from '../data';

const METHOD_NAME = { upi: 'UPI', card: 'Card', netbanking: 'Netbanking' };

/**
 * Stands in for the in-app browser WhatsApp opens from a "View offers and pay" button.
 *  - UPI: closes and the chat gets a UPI request message.
 *  - Card or netbanking: goes straight to the bank or gateway page, then returns to chat.
 */
export default function WebView({ order, onUpi, onGateway, onClose }) {
  const [stage, setStage] = useState('offers'); // offers | redirecting | gateway | done
  const [method, setMethod] = useState('upi');
  const [vpa, setVpa] = useState('');
  const [bank, setBank] = useState(BANKS[0]);
  const [err, setErr] = useState('');

  const due = order.onlineDue;
  const offer = OFFERS.find((o) => o.method === method);
  const value = offerValue(offer, due);
  const payable = offer.kind === 'instant' ? due - value : due;

  useEffect(() => {
    if (stage !== 'redirecting') return undefined;
    const t = setTimeout(() => setStage('gateway'), 1200);
    return () => clearTimeout(t);
  }, [stage]);

  const url =
    stage === 'offers'
      ? 'pay.gyftr.example/offers'
      : stage === 'redirecting'
      ? 'pay.gyftr.example/redirect'
      : method === 'netbanking'
      ? 'netbanking.bank-a.example/login'
      : 'secure.pg-demo.example/verify';

  const submit = () => {
    if (method === 'upi') {
      if (!/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(vpa.trim())) {
        setErr('Enter a valid UPI ID, like name@bank');
        return;
      }
      onUpi({ orderId: order.id, vpa: vpa.trim(), payable, saved: value, kind: offer.kind });
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
      <div className="wv-bar">
        <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        <div className="wv-url">
          <span>🔒</span> {url}
        </div>
        <span className="icon-btn muted">⋮</span>
      </div>

      <div className="wv-body">
        {stage === 'offers' && (
          <>
            <div className="wv-head">
              <small>Order {order.id}</small>
              <h3>Pay {fmt(due)}</h3>
              <p>Pick how you want to pay. Offers are applied for you.</p>
            </div>

            <div className="methods">
              {OFFERS.map((o) => {
                const v = offerValue(o, due);
                const on = o.method === method;
                return (
                  <div key={o.id} className={'method ' + (on ? 'on' : '')}>
                    <button className="method-head" onClick={() => { setMethod(o.method); setErr(''); }}>
                      <span className="m-ico">{o.icon}</span>
                      <span className="m-txt">
                        <b>{o.label}</b>
                        <small className={v ? 'good' : ''}>
                          {v ? `${o.title}. You save ${fmt(v)}` : `${o.title}. Add ${fmt(o.min - due)} more to unlock`}
                        </small>
                      </span>
                      <span className="radio" />
                    </button>

                    {on && o.method === 'upi' && (
                      <div className="m-extra">
                        <label>
                          UPI ID
                          <input value={vpa} onChange={(e) => { setVpa(e.target.value); setErr(''); }} placeholder="name@bank" />
                        </label>
                        <small>We will send a payment request to your UPI app in WhatsApp.</small>
                      </div>
                    )}
                    {on && o.method === 'netbanking' && (
                      <div className="m-extra">
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
                      <div className="m-extra">
                        <small>You will go to the secure payment page to enter card details.</small>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {err && <p className="err">{err}</p>}
            <div className="wv-foot">
              <div className="wv-sum">
                <span>{offer.kind === 'instant' && value ? `After ${fmt(value)} off` : value ? `${fmt(value)} cashback after payment` : 'No offer applied'}</span>
                <b>{fmt(payable)}</b>
              </div>
              <button className="primary" onClick={submit}>
                {method === 'upi' ? 'Send UPI request' : `Pay ${fmt(payable)}`}
              </button>
            </div>
          </>
        )}

        {stage === 'redirecting' && (
          <div className="wv-center">
            <div className="spinner" />
            <p>Taking you to {method === 'netbanking' ? bank : 'the secure payment page'}…</p>
          </div>
        )}

        {stage === 'gateway' && (
          <div className="gw">
            <div className="gw-card">
              <h3>{method === 'netbanking' ? `${bank} Netbanking` : 'Card verification'}</h3>
              <div className="line"><span>Merchant</span><b>GYFTR DEMO</b></div>
              <div className="line"><span>Amount</span><b>{fmt(payable)}</b></div>
              <p className="demo-note">Demo page. Never enter real bank or card details here.</p>
              <button className="primary" onClick={() => finish(true)}>Authorize payment</button>
              <button className="ghost" onClick={() => finish(false)}>Cancel</button>
            </div>
          </div>
        )}

        {stage === 'done' && (
          <div className="wv-center">
            <div className="tick">✓</div>
            <p>Payment successful. Returning to WhatsApp…</p>
          </div>
        )}
      </div>
    </div>
  );
}
