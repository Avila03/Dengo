"use client";
import { useId } from "react";

type Frequency = "none" | "daily" | "weekly" | "monthly";
export function RepeatFields({ value, onChange, task = false, alternate = false }: {
  value: Frequency;
  onChange: (value: Frequency) => void;
  task?: boolean;
  alternate?: boolean;
}) {
  const id = useId();
  return <section className="form-repetition full">
    <label className="checkbox-label">
      <input type="checkbox" checked={value !== "none"} aria-controls={id}
        onChange={(e) => onChange(e.target.checked ? task ? "weekly" : "monthly" : "none")} />
      Repetir
    </label>
    {value === "none" ? <input type="hidden" name="recurrence" value="none" />
      : <div className="form-revealed" id={id}>
        <label>Frequência
          <select name="recurrence" value={value} onChange={(e) => onChange(e.target.value as Frequency)}>
            {task ? <><option value="daily">Todo dia</option><option value="weekly">Toda semana</option></> : null}
            <option value="monthly">Todo mês</option>
          </select>
        </label>
        {task ? <label className="checkbox-label">
          <input type="checkbox" name="alternate" defaultChecked={alternate} />
          Alternar responsável a cada repetição
        </label> : null}
        <p className="helper">{task
          ? "Ao concluir, a próxima responsabilidade é criada. Para alternar, escolha uma das duas pessoas como responsável."
          : "Ao marcar como paga, a próxima conta é criada como pendente."}</p>
      </div>}
  </section>;
}
