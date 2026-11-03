"use client";
import { Download, ShieldCheck, Heart, Cloud, Monitor } from "lucide-react";
import { Shell } from "./shell";
import { useDengo } from "./provider";
export function Settings() {
  const { entries, demo, names } = useDengo();
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          { version: 1, exported_at: new Date().toISOString(), entries },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dengo-dados.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Shell>
      <section className="page-heading">
        <div>
          <span className="eyebrow">FEITO PARA VOCÊS</span>
          <h1>
            Nosso espaço<span className="rose">.</span>
          </h1>
          <p>Um cantinho só de vocês, com cuidado em cada detalhe.</p>
        </div>
        <Heart className="rose" size={35} />
      </section>
      <div className="two-columns">
        <section className="panel">
          <div className="stat-icon sage">
            <ShieldCheck />
          </div>
          <h2>
            {demo ? "Conhecendo o Dengo" : "Privacidade em primeiro lugar"}
          </h2>
          <p>
            {demo
              ? "Esta é uma demonstração. Os registros ficam neste navegador e não são compartilhados com outra pessoa ou dispositivo. Não use esta prévia como único arquivo de dados importantes."
              : "Os registros pertencem ao espaço do casal. O banco permite acesso apenas às contas vinculadas, mesmo que alguém conheça o endereço do site."}
          </p>
          <span className="tag">
            {demo ? <Monitor size={14} /> : <Cloud size={14} />}{" "}
            {demo ? "Armazenamento local" : "Dados compartilhados"}
          </span>
        </section>
        <section className="panel">
          <h2>Uma cópia dos nossos cuidados</h2>
          <p>
            Baixe os registros carregados neste espaço em um arquivo JSON.
            Guarde em um lugar seguro. A importação de arquivos ainda não está
            disponível.
          </p>
          <button className="secondary" onClick={download}>
            <Download size={17} />
            Exportar meus dados
          </button>
        </section>
      </div>
      <section className="panel setup-note">
        <h2>
          {demo ? "Para usar de verdade, juntos" : "As pessoas deste espaço"}
        </h2>
        <p>
          {demo
            ? "O próximo passo é conectar um projeto Supabase exclusivo do Dengo e autorizar as duas contas. O repositório contém as instruções e o SQL de configuração. Até lá, esta prévia continua funcionando apenas neste navegador."
            : names.join(" e ")}
        </p>
        <p>
          Filmes, lugares, calendário, finanças e tarefas recorrentes entram nas
          próximas etapas. Nenhum serviço externo está conectado nesta versão.
        </p>
      </section>
    </Shell>
  );
}
