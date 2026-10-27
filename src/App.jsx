import { Suspense, lazy, useState } from 'react';
import PhoneScreen from './components/PhoneScreen';
import { DEMO_OTP } from './data';

// three.js is only downloaded when the 3D view is used
const Device3D = lazy(() => import('./components/Device3D'));

function Seg({ label, value, onChange, options }) {
  return (
    <div className="ctl">
      <span className="ctl-label">{label}</span>
      <div className="seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} className={o.value === value ? 'on' : ''} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function initialView() {
  const q = new URLSearchParams(window.location.search).get('view');
  if (q === 'full' || q === 'device') return q;
  return window.matchMedia('(max-width: 700px)').matches ? 'full' : 'device';
}

export default function App() {
  const [view, setView] = useState(initialView);
  const [entry, setEntry] = useState('user');
  const [mode, setMode] = useState('flow');
  const [points, setPoints] = useState(2500);
  const [run, setRun] = useState(0);
  const [open, setOpen] = useState(false);

  const changeView = (v) => {
    setView(v);
    const url = new URL(window.location.href);
    url.searchParams.set('view', v);
    window.history.replaceState(null, '', url);
  };
  const screenKey = `${entry}-${mode}-${points}-${run}`;

  return (
    <div className="app">
      <header className="topbar">
        <b className="tb-title">Gyftr voucher journey</b>
        <div className="seg tb-seg" role="group" aria-label="View">
          <button className={view === 'device' ? 'on' : ''} aria-pressed={view === 'device'} onClick={() => changeView('device')}>3D phone</button>
          <button className={view === 'full' ? 'on' : ''} aria-pressed={view === 'full'} onClick={() => changeView('full')}>Full screen</button>
        </div>
        <button className="tb-btn" onClick={() => setOpen(true)}>Settings</button>
      </header>

      <main className={'stage ' + view}>
        {view === 'device' ? (
          <Suspense fallback={<p className="loading">Loading 3D phone…</p>}>
            <Device3D entry={entry} mode={mode} startPoints={points} screenKey={screenKey} />
          </Suspense>
        ) : (
          <div className="full-wrap">
            <PhoneScreen key={screenKey} entry={entry} mode={mode} startPoints={points} device={false} />
          </div>
        )}
      </main>

      {open && (
        <div className="drawer-scrim" onClick={() => setOpen(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Demo settings">
            <div className="drawer-head">
              <h1>Demo settings</h1>
              <button className="tb-btn" onClick={() => setOpen(false)}>Done</button>
            </div>
            <p className="lead">Changing an option restarts the chat.</p>

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
            <button className="restart" onClick={() => { setRun(run + 1); setOpen(false); }}>Restart chat</button>

            <h2>Demo notes</h2>
            <ul>
              <li>Points OTP: <code>{DEMO_OTP}</code></li>
              <li>UPI: enter any name@bank. A notification from a demo UPI app drops in at the top, tap it to approve</li>
              <li>Card and netbanking go to a fake bank page</li>
              <li>150 points shows the Points + online split</li>
              <li>Menu mode: type numbers like a real chat, and 0 for the menu</li>
              <li>Share the full-screen view on a phone with <code>?view=full</code></li>
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
}
