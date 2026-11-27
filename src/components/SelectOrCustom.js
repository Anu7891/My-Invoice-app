import React, { useEffect, useRef, useState } from 'react';
import { num } from '../utils/invoice';

/**
 * Dropdown of common values + "Custom…" to type anything else.
 * Used for Price (₹300–₹900) and for From / To locations.
 */
const SelectOrCustom = ({ value, options, onChange, placeholder, format = (o) => o, numeric = false, emptyLabel = 'Select…' }) => {
  const str = String(value ?? '').trim();
  const match = (o) => (numeric ? o === num(str) : String(o).toLowerCase() === str.toLowerCase());
  const found = str !== '' ? options.find(match) : undefined;
  const inList = found !== undefined;
  const [custom, setCustom] = useState(!inList && str !== '');
  const typedRef = useRef(null);
  // If the value was changed from outside (not typed here) and is in the list, show it in the dropdown
  useEffect(() => {
    if (value !== typedRef.current && inList && custom) setCustom(false);
    // eslint-disable-next-line
  }, [value]);
  const showInput = custom || (!inList && str !== '') || options.length === 0;

  return (
    <div className="select-or-custom">
      {options.length > 0 && (
        <select
          value={showInput ? '__custom' : inList ? String(found) : ''}
          onChange={(e) => {
            if (e.target.value === '__custom') {
              setCustom(true);
              if (inList) onChange('');
            } else {
              setCustom(false);
              onChange(e.target.value);
            }
          }}
        >
          <option value="">{emptyLabel}</option>
          {options.map((o) => (
            <option key={o} value={String(o)}>{format(o)}</option>
          ))}
          <option value="__custom">Custom…</option>
        </select>
      )}
      {showInput && (
        <input
          type="text"
          inputMode={numeric ? 'decimal' : undefined}
          autoFocus={custom && str === ''}
          value={value}
          onChange={(e) => {
            typedRef.current = e.target.value;
            onChange(e.target.value);
          }}
          placeholder={placeholder}
        />
      )}
    </div>
  );
};


export default SelectOrCustom;
