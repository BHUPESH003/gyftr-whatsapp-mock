import { useState } from 'react';
import { BRANDS, CATEGORIES, brandById, fmt, itemsSubtotal } from '../data';
import BrandArt from './BrandArt';
import { Close } from './icons';

/**
 * WhatsApp's catalog view.
 *  - Browse (no items): every brand, with category chips. Tapping one opens its product page.
 *  - Items (a multi-product message): only those items, added to a WhatsApp cart that is then sent.
 */
export default function CatalogSheet({ items, onPick, onSend, onClose }) {
  const [cat, setCat] = useState('all');
  const [qty, setQty] = useState(() => Object.fromEntries((items || []).map((i, k) => [k, 0])));

  if (items) {
    const chosen = items.map((i, k) => ({ ...i, qty: qty[k] })).filter((i) => i.qty > 0);
    const n = chosen.reduce((a, i) => a + i.qty, 0);
    const set = (k, d) => setQty({ ...qty, [k]: Math.max(0, Math.min(10, qty[k] + d)) });
    return (
      <div className="scrim" onClick={onClose}>
        <div className="sheet list-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Items">
          <div className="grab" />
          <div className="sheet-head">
            <button className="hbtn" onClick={onClose} aria-label="Close"><Close size={22} /></button>
            <b>Your selected items</b>
            <span className="hbtn" />
          </div>
          <div className="sheet-body">
            {items.map((it, k) => {
              const b = brandById(it.brandId);
              return (
                <div key={k} className="cart-row line">
                  <BrandArt brand={b} logo className="cart-thumb" />
                  <div className="cart-info">
                    <b>{b.name} gift voucher</b>
                    <span>{fmt(it.denom)}</span>
                    <div className="stepper sm">
                      <button onClick={() => set(k, -1)} disabled={!qty[k]} aria-label="Decrease">−</button>
                      <b>{qty[k]}</b>
                      <button onClick={() => set(k, 1)} aria-label="Increase">+</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="sheet-foot">
            <button className="wa-primary" disabled={!n} onClick={() => onSend(chosen)}>
              {n ? `Send cart · ${n} item${n > 1 ? 's' : ''} · ${fmt(itemsSubtotal(chosen))}` : 'Add items to your cart'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const list = BRANDS.filter((b) => cat === 'all' || b.cat === cat);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet list-sheet tall" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Catalogue">
        <div className="grab" />
        <div className="sheet-head">
          <button className="hbtn" onClick={onClose} aria-label="Close"><Close size={22} /></button>
          <b>Gyftr catalogue</b>
          <span className="hbtn" />
        </div>
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
      </div>
    </div>
  );
}
