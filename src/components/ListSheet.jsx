import { useState } from 'react';
import { Close } from './icons';

/** What WhatsApp opens when you tap the button of a list message. */
export default function ListSheet({ title, rows, onClose, onSend }) {
  const [sel, setSel] = useState(null);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet list-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="grab" />
        <div className="sheet-head">
          <button className="hbtn" onClick={onClose} aria-label="Close"><Close size={22} /></button>
          <b>{title}</b>
          <span className="hbtn" />
        </div>
        <div className="sheet-body">
          {rows.map((r) => (
            <button key={r.id} className="opt" onClick={() => setSel(r)} role="radio" aria-checked={sel?.id === r.id}>
              <span className="opt-txt">
                <b>{r.label}</b>
                {r.sub && <small>{r.sub}</small>}
              </span>
              <span className={'radio ' + (sel?.id === r.id ? 'on' : '')} />
            </button>
          ))}
        </div>
        <div className="sheet-foot">
          <button className="wa-primary" disabled={!sel} onClick={() => onSend(sel)}>Send</button>
        </div>
      </div>
    </div>
  );
}
