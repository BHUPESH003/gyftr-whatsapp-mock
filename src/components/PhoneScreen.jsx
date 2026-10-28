import { useState } from 'react';
import { useBot } from '../useBot';
import { fmt, itemCount } from '../data';
import Chat, { Composer } from './Chat';
import FlowSheet from './FlowSheet';
import CartSheet from './CartSheet';
import CatalogSheet from './CatalogSheet';
import ListSheet from './ListSheet';
import ProductSheet from './ProductSheet';
import UpiApp from './UpiApp';
import WebView from './WebView';
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
  const [cartOpen, setCartOpen] = useState(null); // { items, readOnly }
  const [productId, setProductId] = useState(null);
  const [catalog, setCatalog] = useState(null); // { items? }
  const [upiOpen, setUpiOpen] = useState(false);

  const pendingUpi = bot.messages.find((m) => m.kind === 'upiRequest' && m.state === 'pending');
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
        onOpenProduct={setProductId}
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
      {bot.cart && (
        <button className="fab-cart" onClick={() => setCartOpen({ items: bot.cart })} aria-label={`Cart, ${itemCount(bot.cart)} items`}>
          <CartIcon size={24} />
          <span className="fab-badge">{itemCount(bot.cart)}</span>
        </button>
      )}
      {cartOpen && (
        <CartSheet
          items={cartOpen.readOnly ? cartOpen.items : bot.cart || []}
          readOnly={cartOpen.readOnly}
          onChange={(items) => { bot.setCartItems(items); if (!items.length) setCartOpen(null); }}
          onCheckout={() => { setCartOpen(null); bot.openFlow(); }}
          onClose={() => setCartOpen(null)}
        />
      )}
      {catalog && (
        <CatalogSheet
          items={catalog.items}
          onClose={() => setCatalog(null)}
          onPick={(id) => { setCatalog(null); setProductId(id); }}
          onSend={(sent) => { setCatalog(null); bot.addItemsToCart(sent); }}
        />
      )}
      {productId && (
        <ProductSheet
          brandId={productId}
          onClose={() => setProductId(null)}
          onAdd={(id, denom, qty) => { setProductId(null); bot.addToCart(id, denom, qty); }}
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
      {payOrder && (
        <WebView order={payOrder} onUpi={bot.onUpiPay} onGateway={bot.onGatewayDone} onClose={bot.closeOverlay} />
      )}

      {pendingUpi && !upiOpen && (
        <button className="notif" onClick={() => setUpiOpen(true)}>
          <span className="notif-app">₹</span>
          <span className="notif-txt">
            <span className="notif-top"><b>Pay Demo</b><small>now</small></span>
            <span className="notif-title">Payment request</span>
            <span className="notif-body">GYFTR DEMO is requesting {fmt(pendingUpi.amount)}. Tap to review.</span>
          </span>
        </button>
      )}
      {pendingUpi && upiOpen && (
        <UpiApp
          amount={pendingUpi.amount}
          app={pendingUpi.app}
          onClose={() => setUpiOpen(false)}
          onDecline={() => { setUpiOpen(false); bot.onUpiResult(pendingUpi.orderId, false); }}
          onApprove={() => { setUpiOpen(false); bot.onUpiResult(pendingUpi.orderId, true); }}
        />
      )}
    </div>
  );
}
