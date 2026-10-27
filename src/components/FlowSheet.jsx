import { useState } from 'react';
import { DENOMS, MODE_LABEL, brandById, fmt, payModeOptions, priceOrder } from '../data';

const STEPS = ['Details', 'Payment', 'Summary'];

function Steps({ current }) {
  return (
    <div className="steps">
      {STEPS.map((label, i) => (
        <div key={label} className={'step ' + (i < current ? 'done' : i === current ? 'now' : '')}>
          <span className="dot">{i < current ? '✓' : ''}</span>
          <span className="lbl">{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function FlowSheet({ brandId, promo, points, onClose, onSubmit }) {
  const brand = brandById(brandId);
  const [step, setStep] = useState(0);
  const [denom, setDenom] = useState(DENOMS[0]);
  const [qty, setQty] = useState(1);
  const [gift, setGift] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [payMode, setPayMode] = useState(null);
  const [showErrors, setShowErrors] = useState(false);

  const base = priceOrder({ denom, qty, promo, payMode: 'online', points });
  const options = payModeOptions(base.total, points);
  const mode = options.find((o) => o.id === payMode && o.ok) ? payMode : null;
  const price = priceOrder({ denom, qty, promo, payMode: mode || 'online', points });

  const nameOk = name.trim().length > 1;
  const phoneOk = /^[6-9]\d{9}$/.test(phone);
  const detailsOk = !gift || (nameOk && phoneOk);

  const next = () => {
    if (step === 0) {
      if (!detailsOk) return setShowErrors(true);
      return setStep(1);
    }
    if (step === 1) {
      if (!mode) return;
      return setStep(2);
    }
    return onSubmit({
      brandId,
      denom,
      qty,
      gift: gift ? { name: name.trim(), phone } : null,
      message: gift ? message.trim() : '',
      payMode: mode,
      promo,
    });
  };

  const back = () => (step === 0 ? onClose() : setStep(step - 1));
  const cta = step === 2 ? 'Confirm order' : 'Continue';
  const disabled = step === 1 && !mode;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        <div className="sheet-head">
          <button className="icon-btn" onClick={back} aria-label={step === 0 ? 'Close' : 'Back'}>
            {step === 0 ? '✕' : '‹'}
          </button>
          <b>Buy Voucher</b>
          <span className="icon-btn muted">⋮</span>
        </div>
        <Steps current={step} />

        <div className="sheet-body">
          <div className="brand-row">
            <span className="brand-ico" style={{ background: brand.tint }}>{brand.icon}</span>
            <div>
              <b>{brand.name}</b>
              <small>Gift voucher</small>
            </div>
            {promo && <span className="promo-chip">{promo.code} applied</span>}
          </div>

          {step === 0 && (
            <>
              <h4>Select denomination</h4>
              <div className="chips">
                {DENOMS.map((d) => (
                  <button key={d} className={'chip ' + (d === denom ? 'on' : '')} onClick={() => setDenom(d)}>
                    {fmt(d)}
                  </button>
                ))}
              </div>

              <h4>Quantity</h4>
              <div className="stepper">
                <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Fewer">−</button>
                <span>{qty}</span>
                <button onClick={() => setQty(Math.min(10, qty + 1))} aria-label="More">+</button>
              </div>

              <div className="toggle-row">
                <div>
                  <h4>Gift to someone?</h4>
                  <small>Send this voucher to a friend or family member.</small>
                </div>
                <button className={'switch ' + (gift ? 'on' : '')} onClick={() => setGift(!gift)} role="switch" aria-checked={gift}>
                  <i />
                </button>
              </div>

              {gift && (
                <div className="fields">
                  <label>
                    Recipient name
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rahul Sharma" />
                    {showErrors && !nameOk && <em>Enter the recipient's name.</em>}
                  </label>
                  <label>
                    Mobile number
                    <div className="phone-row">
                      <span>+91</span>
                      <input
                        value={phone}
                        inputMode="numeric"
                        maxLength={10}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="98765 43210"
                      />
                    </div>
                    {showErrors && !phoneOk && <em>Enter a 10-digit Indian mobile number.</em>}
                  </label>
                  <label>
                    Message (optional)
                    <textarea
                      value={message}
                      maxLength={200}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Here's a little something for you!"
                    />
                    <small className="count">{message.length}/200</small>
                  </label>
                </div>
              )}

              <div className="pay-bar">
                <span>You'll pay</span>
                <b>{fmt(base.total)}</b>
              </div>
              {promo && base.promoDiscount > 0 && <small className="saving">Includes {fmt(base.promoDiscount)} off with {promo.code}</small>}
            </>
          )}

          {step === 1 && (
            <>
              <h4>Payment mode</h4>
              <div className="modes">
                {options.map((o) => (
                  <button
                    key={o.id}
                    className={'mode ' + (o.id === mode ? 'on' : '')}
                    disabled={!o.ok}
                    onClick={() => setPayMode(o.id)}
                  >
                    <span className="mode-ico">{o.icon}</span>
                    <span className="mode-txt">
                      <b>{o.title}</b>
                      <small>{o.note}</small>
                    </span>
                    <span className="radio" />
                  </button>
                ))}
              </div>
              <p className="hint">
                Online payments open a page with all offers. Points need an OTP in the chat.
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <h4>Order summary</h4>
              <div className="sum">
                <Line k="Denomination" v={fmt(denom)} />
                <Line k="Quantity" v={qty} />
                <Line k="For" v={gift ? `${name.trim()}, +91 ${phone}` : 'Me'} />
                {gift && message.trim() && <Line k="Message" v={message.trim()} />}
                <Line k="Payment" v={MODE_LABEL[mode]} />
                {price.promoDiscount > 0 && <Line k={`Offer ${promo.code}`} v={'-' + fmt(price.promoDiscount)} good />}
                {price.pointsUsed > 0 && <Line k="Points used" v={fmt(price.pointsUsed)} />}
                {price.onlineDue > 0 && <Line k="To pay online" v={fmt(price.onlineDue)} />}
                <div className="total">
                  <span>Total amount</span>
                  <b>{fmt(price.total)}</b>
                </div>
              </div>
            </>
          )}
        </div>

        <button className="primary" onClick={next} disabled={disabled}>
          {cta}
        </button>
      </div>
    </div>
  );
}

function Line({ k, v, good }) {
  return (
    <div className="line">
      <span>{k}</span>
      <b className={good ? 'good' : ''}>{v}</b>
    </div>
  );
}
