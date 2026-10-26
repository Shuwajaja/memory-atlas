import { useEffect, useRef, type ReactNode } from 'react';

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

function focusable(node: HTMLElement): HTMLElement[] {
  return [...node.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
    (element) => !element.hasAttribute('disabled'),
  );
}

export function Dialog({ title, onClose, children }: DialogProps) {
  const panel = useRef<HTMLDivElement>(null);
  const previous = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    previous.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = panel.current;
    focusable(node ?? document.body)[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !node) return;
      const items = focusable(node);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous.current?.focus();
    };
  }, []);

  return (
    <div className="dialog-backdrop">
      <div ref={panel} className="dialog stack" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <h2 id="dialog-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}
