import { useEffect, useId, useRef, useState } from 'react';

// Every numeric param gets both a range slider and an editable number box,
// kept in sync in both directions. The number box keeps its own local text
// state so mid-edit keystrokes (an empty field, a trailing ".", "-") aren't
// clobbered by the formatted value coming back down as a prop -- it only
// resyncs from `value` while the field isn't focused.
export default function NumberSlider({
  label, value, min, max, step = 0.01, decimals = 2, unit = '', onChange, disabled = false,
}) {
  const [text, setText] = useState(() => value.toFixed(decimals));
  const focused = useRef(false);
  const numberId = useId();

  useEffect(() => {
    if (!focused.current) setText(value.toFixed(decimals));
  }, [value, decimals]);

  function commit(raw) {
    const v = parseFloat(raw);
    if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
  }

  return (
    <div className="row">
      <label htmlFor={numberId} title={unit || undefined}>{label}</label>
      <input
        aria-label={`${label} slider`}
        type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <input
        id={numberId}
        type="number" className="numbox" min={min} max={max} step={step} value={text} disabled={disabled}
        title={unit || undefined}
        onFocus={() => { focused.current = true; }}
        onChange={(e) => { setText(e.target.value); commit(e.target.value); }}
        onBlur={() => { focused.current = false; setText(value.toFixed(decimals)); }}
      />
    </div>
  );
}
