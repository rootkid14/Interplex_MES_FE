/** Prevent accidental numeric value changes via mouse wheel or arrow up/down.
 * Deliberately leaves text + inputMode=decimal inputs untouched: they already
 * do not offer native spin/wheel increment. No change to application validation.
 */
export const installKeyboardOnlyNumericInputs = () => {
  const onWheel = (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type === 'number'
        && !target.disabled && document.activeElement === target) {
      event.preventDefault(); // blocks number change, no silent blur/state commit
    }
  };
  const onKeyDown = (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type === 'number'
        && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
    }
  };
  document.addEventListener('wheel', onWheel, { capture: true, passive: false });
  document.addEventListener('keydown', onKeyDown, true);
  return () => {
    document.removeEventListener('wheel', onWheel, true);
    document.removeEventListener('keydown', onKeyDown, true);
  };
};
