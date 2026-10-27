import { brandById, fmt } from '../data';
import BrandArt from './BrandArt';
import { Close } from './icons';

/** What WhatsApp opens when you tap "View sent cart". Read only. */
export default function CartSheet({ cart, onClose }) {
  const b = brandById(cart.brandId);
  const total = cart.denom * cart.qty;
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
          <div className="cart-row line">
            <BrandArt brand={b} logo className="cart-thumb" />
            <div className="cart-info">
              <b>{b.name} gift voucher</b>
              <span>{fmt(cart.denom)} · Qty {cart.qty}</span>
            </div>
            <b>{fmt(total)}</b>
          </div>
          <div className="review-total"><span>Estimated total</span><b>{fmt(total)}</b></div>
        </div>
      </div>
    </div>
  );
}
