import { useState } from 'react';
import { useBot } from '../useBot';
import { addItem, itemCount } from '../data';
import Chat, { Composer } from './Chat';
import FlowSheet from './FlowSheet';
import CartSheet from './CartSheet';
import CatalogSheet from './CatalogSheet';
import ListSheet from './ListSheet';
import ProductSheet from './ProductSheet';
import PayFlow from './PayFlow';
import { BatteryIcon, CartIcon, ChevronLeft, Phone, SignalIcon, Verified, WifiIcon } from './icons';

function StatusBar() {
  return (
    <div className="statusbar" aria-hidden="true">
      <span className="sb-time">9:41</span>
      <span className="island" />
      <span className="sb-icons"><SignalIcon /><WifiIcon /><BatteryIcon /></span>
    </div>
  );
}

/**
 * The WhatsApp chat itself. `device` adds the iOS status bar and home indicator
 * (for the 3D phone); without it the app fills a real phone's own screen.
 */
export default function PhoneScreen({ entry, mode, startPoints, device }) {
  const bot = useBot({ entry, mode, startPoints });
  const [list, setList] = useState(null);
  const [cartOpen, setCartOpen] = useState(null); // read-only "View sent cart": { items }
  const [product, setProduct] = useState(null); // { id, src: 'bot' | 'catalog' }
  const [catalog, setCatalog] = useState(null); // { items? }
  // The customer's own WhatsApp cart, built in the catalogue. The bot cart is separate and lives in messages.
  const [wa, setWa] = useState([]);
  const [waOpen, setWaOpen] = useState(false);

  const changeWa = (it, d) =>
    setWa((w) => {
      const hit = w.find((x) => x.brandId === it.brandId && x.denom === it.denom);
      const qty = (hit?.qty || 0) + d;
      if (qty <= 0) return w.filter((x) => x !== hit);
      return hit ? w.map((x) => (x === hit ? { ...x, qty: Math.min(10, qty) } : x)) : [...w, { ...it, qty }];
    });
  const sendWa = () => {
    const sent = wa;
    setWa([]);
    setWaOpen(false);
    setCatalog(null);
    bot.addItemsToCart(sent);
  };

  const payOrder = bot.overlay?.type === 'pay' ? bot.orders.find((o) => o.id === bot.overlay.orderId) : null;

  return (
    <div className={'wa ' + (device ? 'wa--device' : 'wa--full')}>
      <div className="wa-top">
        {device && <StatusBar />}
        <header className="wa-head">
          <span className="back"><ChevronLeft size={30} /></span>
          <img className="avatar" src="/gyftr-icon.png" alt="Gyftr" />
          <div className="who">
            <b>Gyftr <Verified size={15} /></b>
            <small className={bot.typing ? 'typing' : ''}>{bot.typing ? 'typing…' : 'Business Account'}</small>
          </div>
          <span className="head-ico"><Phone size={24} /></span>
        </header>
      </div>

      <Chat
        messages={bot.messages}
        orders={bot.orders}
        onAct={bot.act}
        onOpenFlow={bot.openFlow}
        onOpenPay={bot.openPay}
        onOpenList={setList}
        onOpenCart={setCartOpen}
        onOpenProduct={(id) => setProduct({ id, src: 'bot' })}
        onPay={bot.startPayment}
        onOpenCatalog={(items) => setCatalog({ items })}
      />
      <Composer onText={bot.onText} />
      {device && <div className="home-ind" aria-hidden="true" />}

      {list && (
        <ListSheet
          title={list.title}
          rows={list.rows}
          onClose={() => setList(null)}
          onSend={(row) => {
            setList(null);
            bot.act(row.id, row.label);
          }}
        />
      )}
      {cartOpen && <CartSheet items={cartOpen.items} onClose={() => setCartOpen(null)} />}
      {catalog && (
        <CatalogSheet
          items={catalog.items}
          cart={wa}
          onClose={() => setCatalog(null)}
          onPick={(id) => setProduct({ id, src: 'catalog' })}
          onChange={changeWa}
          onViewCart={() => setWaOpen(true)}
        />
      )}
      {product && (
        <ProductSheet
          brandId={product.id}
          onClose={() => setProduct(null)}
          onAdd={(id, denom, qty) => {
            setProduct(null);
            if (product.src === 'catalog') setWa((w) => addItem(w, { brandId: id, denom, qty }));
            else bot.addToCart(id, denom, qty);
          }}
        />
      )}
      {wa.length > 0 && !catalog && (
        <button className="fab-cart" onClick={() => setWaOpen(true)} aria-label={`Cart, ${itemCount(wa)} items`}>
          <CartIcon size={24} />
          <span className="fab-badge">{itemCount(wa)}</span>
        </button>
      )}
      {waOpen && (
        <CartSheet
          items={wa}
          onChange={(items) => { setWa(items); if (!items.length) setWaOpen(false); }}
          onSend={sendWa}
          onClose={() => setWaOpen(false)}
        />
      )}
      {bot.overlay?.type === 'flow' && (
        <FlowSheet
          items={bot.overlay.items}
          promo={bot.overlay.promo}
          points={bot.points}
          onClose={bot.closeOverlay}
          onSubmit={bot.onFlowSubmit}
        />
      )}
      {payOrder && <PayFlow order={payOrder} onPayment={bot.onPayment} onClose={bot.closeOverlay} />}
    </div>
  );
}
