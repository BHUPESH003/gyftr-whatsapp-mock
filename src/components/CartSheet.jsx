import { brandById, fmt, itemsSubtotal } from '../data';
import BrandArt from './BrandArt';
import { Close } from './icons';

/** What WhatsApp opens for "View sent cart". Read only, it shows the cart the customer sent. */
export default function CartSheet({ items, onClose }) {
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
          <div className="review-total"><span>Estimated total</span><b>{fmt(itemsSubtotal(items))}</b></div>
        </div>
      </div>
    </div>
  );
}
