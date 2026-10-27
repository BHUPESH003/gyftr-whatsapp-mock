import { useState } from 'react';
import { DENOMS, brandById, fmt, offersForItems } from '../data';
import BrandArt from './BrandArt';
import { Close, Dots } from './icons';

const HOW = ['Open the voucher message in this chat.', 'Copy the code and enter it at checkout, online or in store.', 'The balance is used up in one go, so pick the amount you need.'];

/** Product details page for one voucher. Opens from the product card. */
export default function ProductSheet({ brandId, onClose, onAdd }) {
  const brand = brandById(brandId);
  const [denom, setDenom] = useState(DENOMS[0]);
  const [qty, setQty] = useState(1);
  const offers = offersForItems([{ brandId }]);

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet flow" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`${brand.name} gift voucher`}>
        <div className="grab" />
        <div className="sheet-head">
          <button className="hbtn" onClick={onClose} aria-label="Close"><Close size={22} /></button>
          <b>Voucher details</b>
          <span className="hbtn muted"><Dots size={22} /></span>
        </div>

        <div className="sheet-body flow-body">
          <BrandArt brand={brand} className="flow-img" />
          <h2>{brand.name} gift voucher</h2>
          <p className="cap">Valid for 12 months. Delivered instantly on WhatsApp.</p>

          <div className="group-label">Choose amount</div>
          <div className="chips" role="radiogroup" aria-label="Amount">
            {DENOMS.map((d) => (
              <button key={d} className={'chip ' + (d === denom ? 'on' : '')} role="radio" aria-checked={d === denom} onClick={() => setDenom(d)}>
                {fmt(d)}
              </button>
            ))}
          </div>

          <div className="group-label">Quantity</div>
          <div className="stepper">
            <button onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1} aria-label="Decrease">−</button>
            <b>{qty}</b>
            <button onClick={() => setQty(Math.min(10, qty + 1))} disabled={qty >= 10} aria-label="Increase">+</button>
          </div>

          <div className="group-label">Offers</div>
          {offers.map((o) => (
            <p key={o.code} className="cap"><b>{o.code}</b>: {o.label}. {o.note}</p>
          ))}

          <div className="group-label">How to redeem</div>
          <ol className="how">{HOW.map((h) => <li key={h}>{h}</li>)}</ol>

          <div className="group-label">Terms</div>
          <p className="cap">Non-refundable and not exchangeable for cash. Valid for 12 months from purchase. Terms of {brand.name} apply.</p>
        </div>

        <div className="sheet-foot">
          <button className="wa-primary" onClick={() => onAdd(brandId, denom, qty)}>Add to cart · {fmt(denom * qty)}</button>
          <p className="managed">Managed by the business. <span>Learn more</span></p>
        </div>
      </div>
    </div>
  );
}
