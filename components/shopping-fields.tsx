"use client";
import {useState} from "react";
import type {Entry} from "@/lib/model";
import {money,parseMoney} from "@/lib/finance";
import {SHOPPING_UNITS,parseQuantity,shoppingItemTotal} from "@/lib/shopping";

export function ShoppingFields({initial}:{initial:Entry|null}) {
  const [quantity,setQuantity]=useState(String((initial?.data?.quantityMilli??1000)/1000).replace(".",","));
  const [unit,setUnit]=useState(initial?.data?.unit||"un");
  const [price,setPrice]=useState(initial?.data?.unitPrice!==undefined
    ? (initial.data.unitPrice/100).toFixed(2).replace(".",",")
    : initial?.data?.budget?(initial.data.budget/100).toFixed(2).replace(".",","):"");
  let total:number|null=null;
  try {const q=parseQuantity(quantity);if(price.trim())total=shoppingItemTotal(q,/^0([,.]0{1,2})?$/.test(price.trim())?0:parseMoney(price));}catch{}
  return <div className="shopping-item-fields full">
    <label>Quantidade<input name="quantity" required inputMode="decimal" value={quantity}
      onChange={event=>setQuantity(event.target.value)} placeholder="Ex.: 2 ou 1,5" /></label>
    <label>Unidade<select name="unit" value={unit} onChange={event=>setUnit(event.target.value)}>
      {SHOPPING_UNITS.map(([value,label])=><option key={value} value={value}>{label}</option>)}
    </select></label>
    <label>Preço por {unit==="un"?"unidade":unit==="l"?"litro":unit==="ml"?"mL":unit} (R$)
      <input name="unitPrice" inputMode="decimal" value={price} onChange={event=>setPrice(event.target.value)} placeholder="Ex.: 4,90" />
    </label>
    <div className="shopping-item-preview" aria-live="polite"><span>Total previsto do item</span><strong>{total===null?"Sem preço definido":money(total)}</strong></div>
  </div>;
}
