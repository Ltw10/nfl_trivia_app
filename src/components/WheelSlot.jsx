import { useState, useEffect, useRef } from 'react';
import './WheelSlot.css';

const ITEM_HEIGHT = 140;

export default function WheelSlot({ items, onComplete, isSpinning, displayValue, getLogoUrl }) {
  const stripRef = useRef(null);
  const prevSpinningRef = useRef(false);
  const itemHeight = ITEM_HEIGHT;

  const displayIndex = items?.length && displayValue != null && displayValue !== ''
    ? items.indexOf(displayValue)
    : -1;
  const initialPosition = displayIndex >= 0 ? displayIndex * itemHeight : 0;
  const initialSelected = displayIndex >= 0 ? displayValue : null;

  const [position, setPosition] = useState(initialPosition);
  const [selectedItem, setSelectedItem] = useState(initialSelected);

  // When returning to spin screen, show where the last spin landed.
  useEffect(() => {
    if (!isSpinning && displayIndex >= 0 && stripRef.current) {
      const off = displayIndex * itemHeight;
      setPosition(off);
      setSelectedItem(displayValue);
      stripRef.current.style.transform = `translate3d(0, -${off}px, 0)`;
    }
  }, [isSpinning, displayValue, displayIndex, itemHeight]);

  // Spin: update strip transform via ref (no React re-renders during animation) for smooth mobile.
  useEffect(() => {
    if (!items?.length || !stripRef.current) return;
    const justStarted = isSpinning && !prevSpinningRef.current;
    prevSpinningRef.current = isSpinning;

    if (!justStarted) return;

    setSelectedItem(null);
    const selectedIndex = Math.floor(Math.random() * items.length);
    const duration = 2000 + Math.random() * 1000;
    const totalItems = items.length;
    const cycleHeight = totalItems * itemHeight;
    const extraSpins = 4 * totalItems;
    const finalLogicalPosition = extraSpins * itemHeight + selectedIndex * itemHeight;

    let start = null;
    const animate = (timestamp) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const logicalPosition = easeOut * finalLogicalPosition;
      const offset = logicalPosition % cycleHeight;
      stripRef.current.style.transform = `translate3d(0, -${offset}px, 0)`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        const chosen = items[selectedIndex];
        const finalOffset = selectedIndex * itemHeight;
        setPosition(finalOffset);
        setSelectedItem(chosen);
        stripRef.current.style.transform = `translate3d(0, -${finalOffset}px, 0)`;
        onComplete(chosen);
      }
    };
    requestAnimationFrame(animate);
  }, [isSpinning, items, onComplete, itemHeight]);

  if (!items?.length) return <div className="wheel-slot">—</div>;

  const offset = position % (items.length * itemHeight);

  return (
    <div className="wheel-slot">
      <div className="wheel-viewport">
        <div
          ref={stripRef}
          className="wheel-strip"
          style={{ transform: `translate3d(0, -${offset}px, 0)` }}
        >
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
