import { useState, useEffect, useRef } from 'react';
import './WheelSlot.css';

export default function WheelSlot({ items, onComplete, isSpinning, displayValue, getLogoUrl }) {
  const itemHeight = 140;
  const ref = useRef(null);
  const prevSpinningRef = useRef(false);

  const displayIndex = items?.length && displayValue != null && displayValue !== ''
    ? items.indexOf(displayValue)
    : -1;
  const initialPosition = displayIndex >= 0 ? displayIndex * itemHeight : 0;
  const initialSelected = displayIndex >= 0 ? displayValue : null;

  const [position, setPosition] = useState(initialPosition);
  const [selectedItem, setSelectedItem] = useState(initialSelected);

  // When returning to spin screen, show where the last spin landed.
  useEffect(() => {
    if (!isSpinning && displayIndex >= 0) {
      setPosition(displayIndex * itemHeight);
      setSelectedItem(displayValue);
    }
  }, [isSpinning, displayValue, displayIndex]);

  // Only run the spin when isSpinning transitions false -> true, so the result is fixed until next spin.
  useEffect(() => {
    if (!items?.length) return;
    const justStarted = isSpinning && !prevSpinningRef.current;
    prevSpinningRef.current = isSpinning;

    if (!justStarted) return;

    setSelectedItem(null);
    const selectedIndex = Math.floor(Math.random() * items.length);
    const duration = 2000 + Math.random() * 1000;
    const totalItems = items.length;
    const extraSpins = 4 * totalItems;
    const finalOffset = extraSpins * itemHeight + selectedIndex * itemHeight;

    let start = null;
    const animate = (timestamp) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setPosition(easeOut * finalOffset);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        const chosen = items[selectedIndex];
        setSelectedItem(chosen);
        onComplete(chosen);
      }
    };
    requestAnimationFrame(animate);
  }, [isSpinning, items, onComplete]);

  if (!items?.length) return <div className="wheel-slot">—</div>;

  const offset = position % (items.length * itemHeight);
  const stripStyle = {
    transform: `translateY(-${offset}px)`,
  };

  return (
    <div className="wheel-slot" ref={ref}>
      <div className="wheel-viewport">
        <div className="wheel-strip" style={stripStyle}>
          {[...items, ...items, ...items].map((item, i) => (
            <div key={i} className="wheel-item">
              {getLogoUrl ? (
                <>
                  <img
                    src={getLogoUrl(item)}
                    alt=""
                    className="wheel-item-logo"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span className="wheel-item-label">{item}</span>
                </>
              ) : (
                item
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
