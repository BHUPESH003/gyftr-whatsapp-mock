import { brandById, fmt, itemsSubtotal } from '../data';
import BrandArt from './BrandArt';
import { Close } from './icons';

/**
 * WhatsApp's cart. From "View sent cart" it is read only. For the customer's own cart
 * (onSend given) quantities can be changed and the cart is sent to the business.
 */
export default function CartSheet({ items, onChange, onSend, onClose }) {
  const edit = Boolean(onSend);
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
                  <span>{fmt(it.denom)}{edit ? '' : ` · Qty ${it.qty}`}</span>
                  {edit && (
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
        {edit && (
          <div className="sheet-foot">
            <button className="wa-primary" onClick={onSend}>Send cart</button>
          </div>
        )}
      </div>
    </div>
  );
}
