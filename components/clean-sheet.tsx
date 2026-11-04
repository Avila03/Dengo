"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Reutiliza os formulários originais sem mudar suas regras de gravação.
 * Modal com foco contido, Escape e rolagem interna no iPhone.
 */
export function CleanSheet({
  title, children, onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    const previous = document.activeElement instanceof HTMLElement
      ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const buttons = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),summary,input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      ) || []).filter((element) => element.getClientRects().length > 0 && element.tabIndex >= 0);
      if (!buttons?.length) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [mounted]);

  if (!mounted) return null;
  return createPortal(
    <div className="clean-sheet-backdrop" onMouseDown={(event) => {
      if (event.currentTarget === event.target) closeRef.current();
    }}>
      <section ref={panelRef} className="clean-sheet" role="dialog"
        aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="clean-sheet-head">
          <span className="clean-sheet-handle" aria-hidden="true" />
          <strong id={titleId}>{title}</strong>
          <button type="button" className="icon-btn clean-sheet-close"
            aria-label="Fechar formulário" onClick={() => closeRef.current()}>
            <X size={20} />
          </button>
        </div>
        <div className="clean-sheet-body">
          {children}
        </div>
      </section>
    </div>,
    document.body
  );
}
