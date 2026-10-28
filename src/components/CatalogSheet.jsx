import { useState } from 'react';
import { BRANDS, CATEGORIES, brandById, fmt, itemCount, itemsSubtotal } from '../data';
import BrandArt from './BrandArt';
import { CartIcon, Close } from './icons';

/**
 * WhatsApp's catalog view, with the customer's WhatsApp cart.
 *  - Browse (no items): every brand, with category chips. Tapping one opens its product page.
 *  - Items (a multi-product message): only those items, added straight to the cart.
 * The cart icon and the "View cart" bar open the cart, where it is sent to the business.
 */
export default function CatalogSheet({ items, cart, onPick, onChange, onViewCart, onClose }) {
  const [cat, setCat] = useState('all');
  const n = itemCount(cart);
  const qtyOf = (it) => cart.find((x) => x.brandId === it.brandId && x.denom === it.denom)?.qty || 0;

  const head = (title) => (
    <div className="sheet-head cat-head">
      <button className="hbtn" onClick={onClose} aria-label="Close"><Close size={22} /></button>
      <b>{title}</b>
      <button className="hbtn cart-btn" onClick={onViewCart} disabled={!n} aria-label={`Cart, ${n} items`}>
        <CartIcon size={22} />
        {n > 0 && <span className="fab-badge">{n}</span>}
      </button>
    </div>
  );
  const bar = n > 0 && (
    <div className="sheet-foot">
      <button className="wa-primary" onClick={onViewCart}>View cart · {n} item{n > 1 ? 's' : ''} · {fmt(itemsSubtotal(cart))}</button>
    </div>
  );

  if (items) {
    return (
      <div className="scrim" onClick={onClose}>
        <div className="sheet list-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Items">
          <div className="grab" />
          {head('Your selected items')}
          <div className="sheet-body">
            {items.map((it, k) => {
              const b = brandById(it.brandId);
              const q = qtyOf(it);
              return (
                <div key={k} className="cart-row line">
                  <BrandArt brand={b} logo className="cart-thumb" />
                  <div className="cart-info">
                    <b>{b.name} gift voucher</b>
                    <span>{fmt(it.denom)}</span>
                    <div className="stepper sm">
                      <button onClick={() => onChange(it, -1)} disabled={!q} aria-label="Decrease">−</button>
                      <b>{q}</b>
                      <button onClick={() => onChange(it, 1)} aria-label="Increase">+</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {bar}
        </div>
      </div>
    );
  }

  const list = BRANDS.filter((b) => cat === 'all' || b.cat === cat);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet list-sheet tall" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Catalogue">
        <div className="grab" />
        {head('Gyftr catalogue')}
        <div className="chips cat-chips" role="tablist">
          {[{ id: 'all', label: 'All' }, ...CATEGORIES].map((c) => (
            <button key={c.id} role="tab" aria-selected={cat === c.id} className={'chip ' + (cat === c.id ? 'on' : '')} onClick={() => setCat(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="sheet-body cat-list">
          {list.map((b) => (
            <button key={b.id} className="cart-row line cat-item" onClick={() => onPick(b.id)}>
              <BrandArt brand={b} logo className="cart-thumb" />
              <div className="cart-info">
                <b>{b.name}</b>
                <span>Gift voucher · from {fmt(250)}</span>
              </div>
            </button>
          ))}
        </div>
        {bar}
      </div>
    </div>
  );
}
