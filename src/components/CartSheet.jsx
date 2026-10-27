import { brandById, fmt, itemsSubtotal } from '../data';
import BrandArt from './BrandArt';
import { Close } from './icons';

/** The cart. From "View sent cart" it is read only; from the floating icon you can change it. */
export default function CartSheet({ items, readOnly, onChange, onCheckout, onClose }) {
  const setQty = (i, d) => onChange(items.map((x, k) => (k === i ? { ...x, qty: Math.min(10, x.qty + d) } : x)).filter((x) => x.qty > 0));
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet list-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Cart">
        <div className="grab" />
        <div className="sheet-head">
          <button className="hbtn" onClick={onClose} aria-label="Close"><Close size={22} /></button>
          <b>Cart</b>
          <span className="hbtn" />
        </div>
        <div className="sheet-body">
          {items.map((it, i) => {
            const b = brandById(it.brandId);
            return (
              <div key={it.brandId + it.denom} className="cart-row line">
                <BrandArt brand={b} logo className="cart-thumb" />
                <div className="cart-info">
                  <b>{b.name} gift voucher</b>
                  <span>{fmt(it.denom)}{readOnly ? ` · Qty ${it.qty}` : ''}</span>
                  {!readOnly && (
                    <div className="stepper sm">
                      <button onClick={() => setQty(i, -1)} aria-label={it.qty === 1 ? 'Remove' : 'Decrease'}>{it.qty === 1 ? '🗑' : '−'}</button>
                      <b>{it.qty}</b>
                      <button onClick={() => setQty(i, 1)} disabled={it.qty >= 10} aria-label="Increase">+</button>
                    </div>
                  )}
                </div>
                <b>{fmt(it.denom * it.qty)}</b>
              </div>
            );
          })}
          <div className="review-total"><span>Estimated total</span><b>{fmt(itemsSubtotal(items))}</b></div>
        </div>
        {!readOnly && (
          <div className="sheet-foot">
            <button className="wa-primary" onClick={onCheckout}>Place My Order</button>
          </div>
        )}
      </div>
    </div>
  );
}
