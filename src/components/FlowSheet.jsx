import { useState } from 'react';
import { MODE_LABEL, brandById, fmt, itemsSubtotal, offersForItems, payModeOptions, priceOrder, promoValue, validatePromo, eligibleSubtotal } from '../data';
import BrandArt from './BrandArt';
import { ChevronDown, ChevronLeft, Close, Dots } from './icons';

const TITLES = ['Your cart', 'Coupons & offers', 'Payment', 'Review order'];

function Field({ label, error, children }) {
  return (
    <label className={'ofield ' + (error ? 'bad' : '')}>
      <span className="ofield-label">{label}</span>
      {children}
      {error && <em>{error}</em>}
    </label>
  );
}

/**
 * A WhatsApp Flow. Uses the components Flows really have: heading, body text,
 * radio buttons, dropdown, opt-in checkbox, text inputs and a footer button.
 */
export default function FlowSheet({ items, promo: startPromo, points, onClose, onSubmit }) {
  const [step, setStep] = useState(0);
  const [gift, setGift] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [payMode, setPayMode] = useState(null);
  const [showErrors, setShowErrors] = useState(false);

  const [picked, setPicked] = useState(startPromo || null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const subtotal = itemsSubtotal(items);
  const offers = offersForItems(items);
  // A selected coupon only counts while the cart meets its minimum
  const promo = picked && eligibleSubtotal(picked, items) >= (picked.min || 0) ? picked : null;
  const base = priceOrder({ items, promo, payMode: 'online', points });
  const options = payModeOptions(base.total, points);
  const mode = options.find((o) => o.id === payMode && o.ok) ? payMode : null;
  const price = priceOrder({ items, promo, payMode: mode || 'online', points });

  const pickOffer = (p) => {
    setPicked(p);
    setCode('');
    setCodeError('');
  };

  const nameOk = name.trim().length > 1;
  const phoneOk = /^[6-9]\d{9}$/.test(phone);
  const detailsOk = !gift || (nameOk && phoneOk);

  const next = () => {
    if (step === 0) {
      setShowErrors(true);
      return detailsOk ? setStep(1) : undefined;
    }
    if (step === 1) {
      if (code.trim()) {
        const r = validatePromo(code, items);
        if (!r.ok) return setCodeError(r.error);
        setPicked(r.promo);
        setCode('');
      }
      return setStep(2);
    }
    if (step === 2) return mode ? setStep(3) : undefined;
    return onSubmit({
      items,
      gift: gift ? { name: name.trim(), phone } : null,
      message: gift ? message.trim() : '',
      payMode: mode,
      promo,
    });
  };
  const back = () => (step === 0 ? onClose() : setStep(step - 1));
  const disabled = step === 2 && !mode;

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet flow" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Buy Voucher">
        <div className="grab" />
        <div className="sheet-head">
          <button className="hbtn" onClick={back} aria-label={step === 0 ? 'Close' : 'Back'}>
            {step === 0 ? <Close size={22} /> : <ChevronLeft size={24} />}
          </button>
          <b>{TITLES[step]}</b>
          <span className="hbtn muted"><Dots size={22} /></span>
        </div>

        <div className="sheet-body flow-body">
          {step === 0 && (
            <>
              <h2>Your cart</h2>
              {items.map((it) => {
                const b = brandById(it.brandId);
                return (
                  <div key={it.brandId + it.denom} className="cart-row line">
                    <BrandArt brand={b} logo className="cart-thumb" />
                    <div className="cart-info">
                      <b>{b.name} gift voucher</b>
                      <span>{fmt(it.denom)} · Qty {it.qty}</span>
                    </div>
                    <b>{fmt(it.denom * it.qty)}</b>
                  </div>
                );
              })}
              {promo && <p className="cap good">{promo.code} applied: {promo.label}</p>}

              <label className="optin">
                <input type="checkbox" checked={gift} onChange={(e) => setGift(e.target.checked)} />
                <span className="box" />
                <span>Send this voucher as a gift</span>
              </label>

              {gift && (
                <>
                  <Field label="Recipient name" error={showErrors && !nameOk && "Enter the recipient's name"}>
                    <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
                  </Field>
                  <Field label="Mobile number" error={showErrors && !phoneOk && 'Enter a 10-digit Indian mobile number'}>
                    <input
                      value={phone}
                      inputMode="numeric"
                      maxLength={10}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    />
                  </Field>
                  <Field label="Message (optional)">
                    <textarea value={message} maxLength={200} onChange={(e) => setMessage(e.target.value)} rows={3} />
                    <small className="count">{message.length}/200</small>
                  </Field>
                </>
              )}

              <p className="body total-line">
                Total <b>{fmt(base.total)}</b>
                {base.promoDiscount > 0 && <span className="good"> (includes {fmt(base.promoDiscount)} off)</span>}
              </p>
            </>
          )}

          {step === 1 && (
            <>
              <h2>Coupons &amp; offers</h2>
              <p className="cap">Cart total {fmt(subtotal)}</p>
              <div className="group" role="radiogroup" aria-label="Offers">
                <button className="opt" role="radio" aria-checked={!promo} onClick={() => pickOffer(null)}>
                  <span className="opt-txt"><b>No offer</b></span>
                  <span className={'radio ' + (!promo ? 'on' : '')} />
                </button>
                {offers.map((o) => {
                  const sub = eligibleSubtotal(o, items);
                  const ok = sub >= (o.min || 0);
                  return (
                    <button key={o.code} className="opt" role="radio" aria-checked={promo?.code === o.code} disabled={!ok} onClick={() => pickOffer(o)}>
                      <span className="opt-txt">
                        <b>{o.code}: {o.label}</b>
                        <small>{ok ? o.note : `Add ${fmt(o.min - sub)} more to use this`}</small>
                      </span>
                      <span className={'radio ' + (promo?.code === o.code ? 'on' : '')} />
                    </button>
                  );
                })}
              </div>
              <Field label="Promo code" error={codeError}>
                <input
                  value={code}
                  onChange={(e) => { setCode(e.target.value.toUpperCase()); setCodeError(''); }}
                  placeholder="Have a code? Enter it here"
                  autoCapitalize="characters"
                  autoComplete="off"
                />
              </Field>
              <p className="cap">
                {promo ? `${promo.code} applied, you save ${fmt(promoValue(promo, items))}.` : 'A code you enter is checked when you tap Continue.'}
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <h2>How do you want to pay?</h2>
              <p className="cap">Total {fmt(base.total)}</p>
              <div className="group" role="radiogroup" aria-label="Payment mode">
                {options.map((o) => (
                  <button
                    key={o.id}
                    className="opt"
                    role="radio"
                    aria-checked={o.id === mode}
                    disabled={!o.ok}
                    onClick={() => setPayMode(o.id)}
                  >
                    <span className="opt-txt">
                      <b>{o.title}</b>
                      <small>{o.note}</small>
                    </span>
                    <span className={'radio ' + (o.id === mode ? 'on' : '')} />
                  </button>
                ))}
              </div>
              <p className="cap">
                You will get an order message in the chat. Tap Review and pay there to choose UPI, card or net banking. Points need an OTP in the chat.
              </p>
            </>
          )}

          {step === 3 && (
            <>
              <h2>Review your order</h2>
              <div className="review">
                {items.map((it) => (
                  <Row key={it.brandId + it.denom} k={`${brandById(it.brandId).name}, ${fmt(it.denom)}`} v={`× ${it.qty}`} />
                ))}
                <Row k="For" v={gift ? `${name.trim()}, +91 ${phone}` : 'Me'} />
                {gift && message.trim() && <Row k="Message" v={message.trim()} />}
                <Row k="Payment" v={MODE_LABEL[mode]} />
                {price.promoDiscount > 0 && <Row k={`Offer ${promo.code}`} v={'-' + fmt(price.promoDiscount)} good />}
                {price.pointsUsed > 0 && <Row k="Points used" v={fmt(price.pointsUsed)} />}
                {price.onlineDue > 0 && <Row k="To pay online" v={fmt(price.onlineDue)} />}
                <div className="review-total"><span>Total</span><b>{fmt(price.total)}</b></div>
              </div>
            </>
          )}
        </div>

        <div className="sheet-foot">
          <button className="wa-primary" onClick={next} disabled={disabled}>
            {step === 3 ? 'Confirm order' : 'Continue'}
          </button>
          <p className="managed">Managed by the business. <span>Learn more</span></p>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, good }) {
  return (
    <div className="rrow">
      <span>{k}</span>
      <b className={good ? 'good' : ''}>{v}</b>
    </div>
  );
}
