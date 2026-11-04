"use client";
import Link from "next/link";
import { ArrowRight, ArrowLeftRight } from "lucide-react";
import { balance, money } from "@/lib/finance";
import { useDengo } from "./provider";

export function CoupleBalance() {
  const { entries, names } = useDengo();
  const amount = balance(entries);
  return <Link href="/compras?aba=gastos" className="couple-balance">
    <ArrowLeftRight size={19} />
    <span><small>Saldo entre vocês · todo o histórico</small>
      <strong>{amount === 0 ? "Tudo equilibrado" : `${names[amount > 0 ? 1 : 0]} deve a ${names[amount > 0 ? 0 : 1]}`}</strong>
      <small>Considera apenas despesas pagas e acertos.</small>
    </span>
    <b>{money(Math.abs(amount))}</b><ArrowRight size={17} />
  </Link>;
}
