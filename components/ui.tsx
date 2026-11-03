"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
export function DeleteButton({
  label,
  onDelete,
  disabled,
}: {
  label: string;
  onDelete: () => void;
  disabled: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <div className="delete-confirm">
      <span>Excluir este registro?</span>
      <button
        className="danger"
        disabled={disabled}
        onClick={() => {
          onDelete();
          setConfirm(false);
        }}
      >
        Excluir
      </button>
      <button onClick={() => setConfirm(false)}>Cancelar</button>
    </div>
  ) : (
    <button
      className="icon-btn"
      aria-label={`Excluir ${label}`}
      disabled={disabled}
      onClick={() => setConfirm(true)}
    >
      <Trash2 size={18} />
    </button>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>
          {title}
          <span className="rose">.</span>
        </h1>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}
