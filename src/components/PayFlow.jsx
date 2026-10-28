import { useState } from 'react';
import { OFFERS, brandById, fmt, itemsSubtotal, lineItems, offerValue } from '../data';
import BrandArt from './BrandArt';
import UpiApp from './UpiApp';
import WebView from './WebView';
import { ChevronLeft, Close, Dots } from './icons';

const WA_UPI_ID = 'gyftr@wabank';
const BUSINESS_PHONE = '+91 96508 55800';

const expiryText = () => {
  const d = new Date(Date.now() + 5 * 60000);
  const date = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `This order expires on ${date} at ${time}.`;
};
// Rows of WhatsApp's "Choose payment method" sheet. `app` is what the demo UPI app shows.
const METHODS = [
  { id: 'wa', label: 'Pay on WhatsApp', badge: '💬', tint: '#25d366', app: 'WhatsApp' },
  { id: 'gpay', label: 'Google Pay', badge: 'G', tint: '#4285f4', app: 'Google Pay' },
  { id: 'phonepe', label: 'PhonePe', badge: 'पे', tint: '#5f259f', app: 'PhonePe' },
  { id: 'paytm', label: 'Paytm', badge: 'P', tint: '#00b9f1', app: 'Paytm' },
  { id: 'more', label: 'More UPI apps', badge: '⋯', tint: '#e07a1f', app: 'your UPI app' },
  { id: 'other', label: 'Other payment methods', badge: '💳', tint: '#6b7780', sub: 'Cards, NetBanking and more' },
];

function Receipt({ order, paid }) {
  const items = lineItems(order);
  return (
    <div className="pf-receipt">
      {paid && (
        <div className="pf-banner">
          <span className="pf-check">✓</span>
          <span><b>Payment completed</b><small>Your order status will be updated.</small></span>
        </div>
      )}
      <div className="pf-merchant">
        <img src="/gyftr-icon.png" alt="Gyftr" />
        <b className="pf-phone">{BUSINESS_PHONE}</b>
        <small>ORDER #{order.id}</small>
        <span className="pf-chip">Order pending</span>
      </div>
      {items.map((i) => {
        const b = brandById(i.brandId);
        return (
          <div key={i.brandId + i.denom} className="pf-item">
            <BrandArt brand={b} logo className="cart-thumb" />
            <span className="pf-iname">{b.name} gift voucher, {fmt(i.denom)}<small>Quantity {i.qty}</small></span>
            <b>{fmt(i.denom * i.qty)}</b>
          </div>
        );
      })}
      <div className="pf-lines">
        <div><span>Subtotal</span><span>{fmt(itemsSubtotal(items))}</span></div>
        {order.promoDiscount > 0 && <div><span>Discount ({order.promo.code})</span><span>-{fmt(order.promoDiscount)}</span></div>}
        {order.pointsUsed > 0 && <div><span>Paid with points</span><span>-{fmt(order.pointsUsed)}</span></div>}
        <div className="pf-total"><span>Total</span><b>{fmt(order.onlineDue)}</b></div>
      </div>
      {paid && (
        <div className="pf-paid">
          <span className="pf-rupee">₹</span>
          <span>Payment details<small>Completed on {new Date().toLocaleDateString('en-GB')}</small></span>
        </div>
      )}
      <p className="pf-help">Contact merchant for help. <span>Gyftr</span></p>
    </div>
  );
}

/**
 * WhatsApp's in-chat payment, opened from "Review and pay":
 * Order details, then the payment method sheet, then either a Review payment sheet
 * (Pay on WhatsApp), the customer's UPI app, or the gateway page for cards and net banking.
 */
export default function PayFlow({ order, view = 'pay', onPayment, onClose }) {
  // details (View order) | confirm (Pay now) | method (Change) | upi | other | receipt
  const [stage, setStage] = useState(view === 'details' ? 'details' : 'confirm');
  const [sel, setSel] = useState('phonepe');
  const [expiry] = useState(expiryText);
  const due = order.onlineDue;
  const upiOffer = OFFERS.find((o) => o.method === 'upi');
  const upiSave = offerValue(upiOffer, due);
  const method = METHODS.find((m) => m.id === sel);

  // UPI offers are cashback, so the amount charged stays the same.
  const paidUpi = () => {
    onPayment({ orderId: order.id, ok: true, method: 'UPI', saved: upiSave, payable: due, kind: 'cashback' });
    setStage('receipt');
  };
  const fail = () => onPayment({ orderId: order.id, ok: false });

  if (stage === 'upi') {
    return (
      <UpiApp
        amount={due}
        app={method.app}
        startAtPin={sel === 'wa'}
        onClose={() => setStage('confirm')}
        onDecline={fail}
        onApprove={paidUpi}
      />
    );
  }
  if (stage === 'other') {
    return (
      <WebView
        order={order}
        onClose={() => setStage('confirm')}
        onGateway={(r) => {
          if (!r.ok) return fail();
          onPayment({ orderId: order.id, ok: true, method: r.method, saved: r.saved, payable: due - r.saved, kind: 'instant' });
          return setStage('receipt');
        }}
      />
    );
  }

  const receipt = stage === 'receipt';
  return (
    <div className="payflow">
      <div className="pf-top">
        <button className="hbtn light" onClick={onClose} aria-label="Back"><ChevronLeft size={24} /></button>
        <b>Order details</b>
        <span className="hbtn light"><Dots size={22} /></span>
      </div>
      <div className="pf-body"><Receipt order={order} paid={receipt} /></div>
      {stage === 'details' && (
        <div className="pf-foot">
          <button className="wa-primary" onClick={() => setStage('confirm')}>Continue</button>
          <p className="pf-expiry">{expiry}</p>
        </div>
      )}

      {stage === 'method' && (
        <div className="pf-scrim">
          <div className="sheet pf-sheet" role="dialog" aria-label="Choose payment method">
            <div className="sheet-head left">
              <button className="hbtn" onClick={() => setStage('confirm')} aria-label="Close"><Close size={22} /></button>
              <b>Choose payment method</b>
            </div>
            <div className="sheet-body">
              {METHODS.map((m) => (
                <button key={m.id} className="opt pf-method" role="radio" aria-checked={sel === m.id} onClick={() => setSel(m.id)}>
                  <span className="pf-badge" style={{ background: m.tint }}>{m.badge}</span>
                  <span className="opt-txt">
                    <b>{m.label}</b>
                    {m.sub && <small>{m.sub}</small>}
                    {m.id === 'gpay' && upiSave > 0 && <small className="good">{upiOffer.title}. You save {fmt(upiSave)}</small>}
                  </span>
                  <span className={'radio ' + (sel === m.id ? 'on' : '')} />
                </button>
              ))}
            </div>
            <div className="sheet-foot">
              <button className="wa-primary" onClick={() => setStage('confirm')}>Continue</button>
              <p className="pf-upi">UPI · Payments powered by the payment gateway</p>
            </div>
          </div>
        </div>
      )}

      {stage === 'confirm' && (
        <div className="pf-scrim">
          <div className="sheet pf-sheet" role="dialog" aria-label="Confirm payment">
            <div className="sheet-head left">
              <button className="hbtn" onClick={onClose} aria-label="Close"><Close size={22} /></button>
              <b>Confirm payment</b>
            </div>
            <div className="sheet-body">
              <div className="pf-to">
                <img src="/gyftr-icon.png" alt="" />
                <span><small>Send to</small><b>Gyftr</b><small>UPI ID: {WA_UPI_ID}</small></span>
              </div>
              <div className="pf-to row">
                <span className="pf-badge" style={{ background: method.tint }}>{method.badge}</span>
                <span><small>Using</small><b>{method.id === 'wa' ? 'Bank ••1234' : method.label}</b></span>
                <button className="pf-change" onClick={() => setStage('method')}>Change</button>
              </div>
              {upiSave > 0 && sel !== 'other' && <p className="cap good">{upiOffer.title}. You save {fmt(upiSave)}</p>}
              <div className="review-total"><span>Total</span><b>{fmt(due)}</b></div>
            </div>
            <div className="sheet-foot">
              <button className="wa-primary" onClick={() => setStage(sel === 'other' ? 'other' : 'upi')}>
                {sel === 'other' ? 'Continue' : sel === 'wa' ? 'Pay' : `Pay with ${method.label}`}
              </button>
              <p className="pf-upi">UPI · Payments powered by the payment gateway</p>
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="pf-foot"><button className="wa-primary" onClick={onClose}>Done</button></div>
      )}
    </div>
  );
}
