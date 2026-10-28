import { useEffect, useRef, useState } from 'react';
import { fmt } from '../data';
import { ChevronLeft } from './icons';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

/** A stand-in for the customer's own UPI app, so the collect request can be approved in the demo. */
export default function UpiApp({ amount, app, startAtPin, onApprove, onDecline, onClose }) {
  const [stage, setStage] = useState(startAtPin ? 'pin' : 'request'); // request | pin | processing | done
  const [pin, setPin] = useState('');
  const approve = useRef(onApprove);
  approve.current = onApprove;

  useEffect(() => {
    if (stage === 'pin' && pin.length === 4) {
      setStage('processing');
    }
  }, [stage, pin]);

  useEffect(() => {
    if (stage === 'processing') {
      const t = setTimeout(() => setStage('done'), 1000);
      return () => clearTimeout(t);
    }
    if (stage === 'done') {
      const t = setTimeout(() => approve.current(), 900);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [stage]);

  const press = (k) => {
    if (k === '⌫') setPin(pin.slice(0, -1));
    else if (k && pin.length < 4) setPin(pin + k);
  };

  return (
    <div className="upiapp">
      <div className="upi-top">
        {stage === 'request' || stage === 'pin' ? (
          <button className="hbtn" onClick={stage === 'pin' && !startAtPin ? () => { setPin(''); setStage('request'); } : onClose} aria-label="Back">
            <ChevronLeft size={24} />
          </button>
        ) : <span className="hbtn" />}
        <b>Pay Demo</b>
        <span className="hbtn" />
      </div>

      {stage === 'request' && (
        <div className="upi-body">
          <small>Payment request from</small>
          <h2>GYFTR DEMO</h2>
          <div className="upi-amt">{fmt(amount)}</div>
          <p className="upi-from">Pay using <b>{app}</b></p>
          <div className="upi-actions">
            <button className="upi-primary" onClick={() => setStage('pin')}>Pay {fmt(amount)}</button>
            <button className="upi-ghost" onClick={onDecline}>Decline</button>
          </div>
        </div>
      )}

      {stage === 'pin' && (
        <div className="upi-body">
          <small>Enter your UPI PIN</small>
          <div className="pin-dots">
            {[0, 1, 2, 3].map((i) => <i key={i} className={i < pin.length ? 'on' : ''} />)}
          </div>
          <p className="upi-from">Demo only. Any 4 digits work.</p>
          <div className="keypad">
            {KEYS.map((k, i) => (
              <button key={i} onClick={() => press(k)} disabled={!k} aria-label={k === '⌫' ? 'Delete' : k || undefined}>{k}</button>
            ))}
          </div>
        </div>
      )}

      {stage === 'processing' && (
        <div className="upi-center"><div className="spinner" /><p>Processing payment…</p></div>
      )}
      {stage === 'done' && (
        <div className="upi-center"><div className="tick">✓</div><p>{fmt(amount)} paid</p></div>
      )}
    </div>
  );
}
