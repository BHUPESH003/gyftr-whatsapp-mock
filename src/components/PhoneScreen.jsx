import { useState } from 'react';
import { useBot } from '../useBot';
import { fmt } from '../data';
import Chat, { Composer } from './Chat';
import FlowSheet from './FlowSheet';
import CartSheet from './CartSheet';
import ListSheet from './ListSheet';
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
  const [cartOpen, setCartOpen] = useState(null);
  const [upiOpen, setUpiOpen] = useState(false);

  const pendingUpi = bot.messages.find((m) => m.kind === 'upiRequest' && m.state === 'pending');
  const payOrder = bot.overlay?.type === 'pay' ? bot.orders.find((o) => o.id === bot.overlay.orderId) : null;

  return (
    <div className={'wa ' + (device ? 'wa--device' : 'wa--full')}>
      <div className="wa-top">
        {device && <StatusBar />}
        <header className="wa-head">
          <span className="back"><ChevronLeft size={30} /></span>
          <span className="avatar">G</span>
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
        <button className="fab-cart" onClick={() => setCartOpen(bot.cart)} aria-label={`Cart, ${bot.cart.qty} item`}>
          <CartIcon size={24} />
          <span className="fab-badge">{bot.cart.qty}</span>
        </button>
      )}
      {cartOpen && <CartSheet cart={cartOpen} onClose={() => setCartOpen(null)} />}
      {bot.overlay?.type === 'flow' && (
        <FlowSheet
          brandId={bot.overlay.brandId}
          promo={bot.overlay.promo}
          cart={bot.overlay.cart}
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
          vpa={pendingUpi.vpa}
          onClose={() => setUpiOpen(false)}
          onDecline={() => { setUpiOpen(false); bot.onUpiResult(pendingUpi.orderId, false); }}
          onApprove={() => { setUpiOpen(false); bot.onUpiResult(pendingUpi.orderId, true); }}
        />
      )}
    </div>
  );
}
