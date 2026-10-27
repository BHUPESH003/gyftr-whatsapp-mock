import { useState } from 'react';
import { useBot } from './useBot';
import Chat from './components/Chat';
import FlowSheet from './components/FlowSheet';
import WebView from './components/WebView';
import { DEMO_OTP } from './data';

function Phone({ entry, mode, startPoints }) {
  const bot = useBot({ entry, mode, startPoints });
  const order = bot.overlay?.type === 'pay' ? bot.orders.find((o) => o.id === bot.overlay.orderId) : null;

  return (
    <div className="phone">
      <div className="notch" />
      <div className="screen">
        <header className="wa-head">
          <span className="back">‹</span>
          <span className="avatar">🤖</span>
          <div className="who">
            <b>Voucher Bot</b>
            <small>Business Account</small>
          </div>
          <span className="head-ico">📞</span>
          <span className="head-ico">⋮</span>
        </header>

        <Chat
          messages={bot.messages}
          typing={bot.typing}
          orders={bot.orders}
          onAct={bot.act}
          onText={bot.onText}
          onOpenFlow={bot.openFlow}
          onOpenPay={bot.openPay}
          onUpiResult={bot.onUpiResult}
        />

        {bot.overlay?.type === 'flow' && (
          <FlowSheet
            brandId={bot.overlay.brandId}
            promo={bot.overlay.promo}
            points={bot.points}
            onClose={bot.closeOverlay}
            onSubmit={bot.onFlowSubmit}
          />
        )}
        {order && (
          <WebView order={order} onUpi={bot.onUpiPay} onGateway={bot.onGatewayDone} onClose={bot.closeOverlay} />
        )}
      </div>
    </div>
  );
}

function Seg({ label, value, onChange, options }) {
  return (
    <div className="ctl">
      <span>{label}</span>
      <div className="seg">
        {options.map((o) => (
          <button key={o.value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [entry, setEntry] = useState('user');
  const [mode, setMode] = useState('flow');
  const [points, setPoints] = useState(2500);
  const [run, setRun] = useState(0);

  return (
    <div className="stage">
      <aside className="panel">
        <h1>Gyftr voucher journey</h1>
        <p className="lead">A clickable mock of the WhatsApp bot. Changing any option restarts the chat.</p>

        <Seg
          label="How the customer arrives"
          value={entry}
          onChange={setEntry}
          options={[
            { value: 'user', label: 'User starts chat' },
            { value: 'marketing', label: 'Marketing banner' },
          ]}
        />
        <Seg
          label="Experience"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'flow', label: 'Buttons + Flow' },
            { value: 'menu', label: 'Menu fallback' },
          ]}
        />
        <Seg
          label="Points balance"
          value={points}
          onChange={setPoints}
          options={[
            { value: 2500, label: '2,500' },
            { value: 150, label: '150' },
            { value: 0, label: '0' },
          ]}
        />

        <button className="restart" onClick={() => setRun(run + 1)}>Restart chat</button>

        <div className="tips">
          <h2>Demo notes</h2>
          <ul>
            <li>Points OTP: <code>{DEMO_OTP}</code></li>
            <li>UPI ID: any name@bank, then approve from the demo buttons in the chat</li>
            <li>Card and netbanking go to a fake bank page</li>
            <li>150 points shows the Points + online split</li>
            <li>In menu mode, type numbers like a real chat. Type 0 for the menu</li>
          </ul>
        </div>
      </aside>

      <main className="phone-wrap">
        <Phone key={`${entry}-${mode}-${points}-${run}`} entry={entry} mode={mode} startPoints={points} />
      </main>
    </div>
  );
}
