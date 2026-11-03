# Dengo

Um lugar para cuidar da vida a dois. Next.js App Router, React, TypeScript e Supabase.

## Entrega 0.2

- **Nosso dia:** resumo real das compras e tarefas, próximos encontros e atalhos.
- **Compras:** adicionar, editar, concluir, reabrir e excluir. Transformar em despesa preserva a descrição e impede lançamento duplicado.
- **Responsabilidades:** responsável, prazo, edição, busca e filtros. Repetições diárias, semanais e mensais com alternância opcional. Concluir cria a próxima ocorrência; reabrir e concluir de novo não duplica a próxima.
- **Finanças:** despesas pagas ou pendentes, categorias, divisão percentual (50/50 por padrão), saldo a acertar, registro de reembolsos, contas mensais e orçamento por categoria. Valores inteiros em centavos. O centavo indivisível da divisão fica na parcela da primeira pessoa. O saldo considera todo o histórico pago, enquanto o resumo e o orçamento usam o mês selecionado.
- **Calendário:** visão mensal e agenda do dia, compromissos editáveis, tarefas e contas com prazo, exportação .ics e botão de adicionar ao Google Agenda. Horários em Brasília. Filmes e lugares podem virar compromissos.
- **Filmes e séries:** busca preparada para TMDB, cadastro manual, interesses de cada pessoa, filtro de interesse em comum, sorteio entre títulos em comum, assistidos e notas individuais. O catálogo só funciona após configurar um token TMDB válido. Dados normalizados são exibidos com créditos ao fornecedor.
- **Lugares:** endereço, categoria, orçamento previsto, observação e lembrança da visita; planejados e visitados; abrir no Google Maps e agendar visita. Não há mapa embutido nem busca automática de estabelecimentos.
- **Nosso espaço:** nomes, foto comprimida para JPEG, data do relacionamento, limites mensais e exportação JSON dos registros e personalização.
- **Compartilhamento:** login privado, RLS por espaço, Realtime e atualização ao voltar para a janela. Há botão manual Atualizar como alternativa. O carregamento percorre todas as páginas do banco para não cortar o histórico financeiro em 1.000 registros.
- **Celular:** navegação de cinco destinos: Nosso dia, Finanças, Calendário, Compras e Mais. Mais dá acesso a tarefas, filmes, lugares e configurações. Áreas seguras do iPhone e campos com tamanho adequado para evitar zoom automático.

## Rodar localmente

Node.js 22 ou superior.

```sh
npm ci
npm run dev
```

Sem variáveis de Supabase, o desenvolvimento usa uma demonstração local explícita. Os registros da versão 0.1 são preservados no mesmo armazenamento. Não há migração automática da demonstração para o banco.

Para usar o banco real:

```sh
cp .env.example .env.local
npm run dev
```

O exemplo já contém a URL e a chave **publicável** do projeto exclusivo do Dengo. Esses valores são públicos; não permitem ler os dados sem login e membership. Nunca colocar uma chave secret ou service_role em NEXT_PUBLIC_. Em produção sem configuração, o site não abre os dados: mostra uma mensagem de configuração pendente.

```sh
npm run typecheck
npm test
npm run build
```

## Banco existente do Dengo

Projeto: `jgntmeifdaghykiodfee`, região São Paulo, separado do Mesa Marcada.

A estrutura e as políticas já foram aplicadas nesse projeto. **Não executar setup.sql novamente nele.** O arquivo é uma referência para inicialização de outro banco vazio. Há um espaço vazio criado, ainda sem contas reais vinculadas.

Para ativar o uso do casal:

1. Em Supabase Authentication > Users, criar e confirmar manualmente duas contas com e-mail e senha. Desabilitar cadastro público no painel. Mesmo antes disso, uma conta sem membership não pode acessar dados do casal.
2. Preencher os dois e-mails e o nome da segunda pessoa em `supabase/connect_accounts.sql` e executar no SQL Editor. Não colocar senhas em SQL nem no repositório.
3. Configurar as variáveis de `.env.example` na hospedagem, mantendo `NEXT_PUBLIC_DEMO_MODE=false`.
4. Entrar com ambas as contas, em navegadores diferentes, e conferir o compartilhamento.

As políticas foram verificadas com usuários temporários em transação revertida: acesso dos dois membros, bloqueio de usuário externo, bloqueio de alteração de membership pelo cliente, recorrência sem duplicidade e conversão atômica de compra em despesa. O advisor de segurança não apontou problemas. Isso não substitui o teste final de login e navegador com as contas reais.

## Ativar o catálogo TMDB

Criar uma credencial em https://www.themoviedb.org/settings/api e configurar **TMDB_READ_ACCESS_TOKEN** somente no servidor. É o API Read Access Token (Bearer), não a chave v3 simples. A rota `/api/movies` limita os parâmetros, consulta só o domínio TMDB, exige sessão de um membro no modo conectado e não entrega a credencial ao navegador. Sem token, responde com uma mensagem de configuração e o cadastro manual continua disponível.

O uso é pessoal e não comercial. Os créditos e o logo oficial do TMDB estão na página de filmes. O token e o catálogo real ainda precisam de ativação e teste com uma conta TMDB.

## Publicar na Vercel

Importar `Avila03/Dengo` com o preset Next.js e configurar as variáveis acima. O deploy não foi realizado nesta entrega. Não é necessário domínio pago.

## Limites conhecidos

- Google Agenda recebe uma **cópia confirmada pela pessoa**, por link ou .ics. Não há OAuth, leitura da agenda pessoal ou sincronização bidirecional nesta entrega.
- Google Maps abre em outra aba/aplicativo, sem API paga ou mapa embutido.
- Recorrências criam a próxima ocorrência ao concluir/pagar a atual. Não executam em background. Meses curtos preservam o dia original para os meses seguintes. Editar uma ocorrência não modifica as próximas já criadas; excluir uma ocorrência não exclui as futuras.
- Registrar uma despesa recorrente já paga cria a próxima pendente. A compra que originou a primeira despesa não é vinculada às repetições seguintes.
- Ao atualizar o nome de alguém, os responsáveis com o nome anterior são atualizados. Os campos de pagador e a divisão financeira usam índices estáveis.
- O orçamento do lugar é estimativo e não vira gasto automaticamente. Não há reserva de estabelecimento, pagamento, integração bancária, receita, meta de poupança, envio de mensagens ou upload de fotos dos passeios.
- A exportação JSON é uma cópia manual. Importação e backup automático ainda não estão disponíveis. Recuperação de senha é administrativa nesta versão.
- O plano gratuito tem cotas e pode pausar por pouca atividade. Teste visual e end-to-end no navegador ainda pendente: a prévia gerenciada não aceitou os argumentos do servidor Next.js.
