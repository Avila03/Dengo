# Dengo

O caderno de vocês dois: um lugar para cuidar da vida a dois, com agenda, responsabilidades, finanças, lugares e filmes de um casal, com login individual e dados compartilhados. Feito para o iPhone (instalável na tela inicial), funciona também no computador.

**Versão atual:** 2.9 · [Histórico de versões](CHANGELOG.md)

## O que o Dengo faz

- **Nosso dia:** a foto de vocês, os bilhetes do casal, semana e calendário mensal com tópicos coloridos, compromissos que se repetem, datas especiais com contagem regressiva e quanto tempo o casal está junto.
- **Combinados:** responsabilidades com responsável (cada pessoa ou “Nós dois”), prazo, repetição com alternância, subtarefas e filtros por pessoa.
- **Caderneta:** lista de compras com quantidade e preço, despesas com divisão personalizada, assinaturas, parcelamentos, contas fixas, vencimentos, metas do casal e saldo entre os dois.
- **Nossos lugares e Sessão a dois:** coleções, favoritos e visitas; filmes e séries com status, episódio atual, notas e catálogo TMDB.
- **Avisos:** oito tipos de notificação Web Push com preferências por pessoa, horário de silêncio e histórico no sininho.
- **Aparência:** o Caderno de dia e o Caderno à noite; cada pessoa escolhe o seu. Cada um tem sua “caneta”: a primeira pessoa em azul-tinta, a segunda em verde e o casal em vermelho.
- **Casal:** login individual, convite por link e saída do casal; os registros ficam com quem permanece.

## Como é feito

Next.js (App Router), React e TypeScript no front; Supabase (Auth, PostgreSQL com RLS, Realtime, Edge Function e Cron) no back. Os registros do casal ficam numa única tabela `entries`, diferenciada por `kind`, com detalhes em JSONB (`lib/model.ts`). Recorrências, parcelas e assinaturas são projetadas em memória; só pagamentos efetivos viram despesas.

| Pasta | Conteúdo |
| --- | --- |
| `app/` | Rotas, estilos globais e temas |
| `components/` | Telas e componentes |
| `lib/` | Regras de negócio puras, testadas em `tests/` |
| `supabase/` | Scripts SQL e a função Edge `dengo-push` |
| `e2e/` | Testes de ponta a ponta no iPhone |

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

## Testes no iPhone (ponta a ponta)

A pasta `e2e/` tem testes Playwright que abrem o Dengo no **modo demonstração**, sem Supabase e sem contas reais, com dados de exemplo gravados no navegador. Rodam no tamanho do iPhone 13 e do iPhone SE (WebKit, o motor do Safari) e no desktop:

- as sete telas abrem sem erros de JavaScript e sem rolagem lateral;
- a barra inferior cabe na tela, leva às cinco abas e tem alvos de toque de pelo menos 44 px;
- campos de formulário têm fonte de 16 px ou mais (evita o zoom automático do Safari);
- criar, concluir, reabrir, filtrar e abrir os detalhes de uma responsabilidade.

O GitHub Actions (`.github/workflows/e2e.yml`) roda a suíte a cada push e PR e publica o artefato **capturas-iphone**, com as sete telas e alguns estados (formulário, detalhes, pagamentos, calendário) nos dois cadernos. Em branches `redesign/**`, o workflow **Capturas para revisão visual** grava essas imagens na branch `capturas-<branch>`. Compare as capturas de dois PRs para revisar mudanças visuais.

Para rodar localmente:

```sh
npm install --no-save @playwright/test@1.63.0
npx playwright install webkit chromium
npm run e2e:build   # build sem Supabase, em modo demonstração
npm run e2e
npm run e2e:capturas
```

`e2e:build` substitui o build em `.next/`; rode `npm run build` de novo antes de publicar.

## Banco existente do Dengo

Projeto: `jgntmeifdaghykiodfee`, região São Paulo, separado do Mesa Marcada.

A estrutura e as políticas de `setup.sql` e `lobby.sql` já foram aplicadas nesse projeto. **Não executar esses scripts novamente nele.** Para outro banco vazio, executar `setup.sql` e depois `lobby.sql`; em seguida `couple-planning.sql` os scripts de push (`push.sql`, `push-lockdown.sql`, `push-signed-dispatch.sql` e `push-schedule.sql`), `cron-log-cleanup.sql`, `leave-couple.sql`, `couple-photo.sql` e, por último, `notes.sql`. Os detalhes de cada script estão no [histórico de versões](CHANGELOG.md).

Para ativar o uso do casal:

1. Configurar as variáveis de `.env.example` na hospedagem, mantendo `NEXT_PUBLIC_DEMO_MODE=false`.
2. Em Supabase Auth > URL Configuration, configurar o endereço publicado como Site URL e Redirect URL. Manter cadastro por e-mail habilitado se for usar a tela Criar minha conta. Manter **Confirm Email** desativado no provedor Email para permitir entrar sem clicar em links de confirmação.
3. Adicionar https://SEU-DOMINIO/redefinir-senha à lista de Redirect URLs no Supabase Auth, além do domínio do aplicativo. O remetente padrão pode limitar envio; configurar SMTP se necessário.
4. Cada pessoa cria sua conta individual no Dengo e entra imediatamente, sem confirmação por e-mail.
5. A primeira pessoa escolhe Criar nosso espaço e gera o convite no lobby.
6. A segunda pessoa entra na própria conta e aceita o convite por link ou código.
7. Ambas abrem o cartão do casal e acessam o mesmo espaço, com registros identificados por autoria.

Não é mais necessário vincular contas por SQL no fluxo normal. `connect_accounts.sql` fica apenas como referência de recuperação administrativa. O cadastro não dá acesso a nenhum casal existente: somente criar seu próprio espaço ou aceitar um convite válido concede vínculo.

Os métodos privilegiados de onboarding ficam no schema não exposto `dengo_private`, com search_path vazio, verificação explícita de auth.uid(), travas transacionais, permissões limitadas e wrappers públicos invoker. Convites ficam apenas como hash SHA-256 e não são consultáveis pelos clientes. As demais gravações continuam sob RLS. `Referrer-Policy: no-referrer` evita encaminhar o link de convite como referenciador a sites externos.

As políticas foram verificadas com usuários temporários em transação revertida: acesso dos dois membros, bloqueio de usuário externo, bloqueio de alteração de membership pelo cliente, recorrência sem duplicidade e conversão atômica de compra em despesa. O advisor de segurança não apontou problemas. Também foram testados criação do lobby, rotação/expiração/uso único de convite, rejeição de terceira pessoa e proteção contra falsificar autoria. Os testes SQL estão em `tests/database.sql` e `tests/lobby.sql` e revertem todas as fixtures. Isso não substitui o teste final de login e navegador com as contas reais.

### Sair do casal

Em **Configurações → Conta e privacidade** (ou no lobby), cada pessoa pode sair do casal com `leave_couple` (`supabase/leave-couple.sql`):

- quem sai perde o acesso na hora, em todos os aparelhos; os registros ficam com quem permanece, e o histórico de avisos de quem saiu é apagado;
- quem permanece pode gerar um convite, mesmo que não tenha criado o espaço. Quem entrar ocupa o lugar vago: responsabilidades e pagamentos em nome de quem saiu passam a ser dessa pessoa (a tela de convite avisa);
- a última pessoa só sai digitando o nome do espaço, e isso apaga o espaço e todos os registros;
- “Nós dois” é recusado como nome de pessoa também no banco.

Testes em `tests/leave-couple.sql`, no mesmo formato de `tests/lobby.sql` (transação revertida).

Todos os testes SQL rodam no GitHub Actions (`.github/workflows/sql.yml`) num Postgres 16 descartável, com uma simulação mínima do Supabase (`tests/supabase-shim.sql`). Localmente: `PGHOST=… PGUSER=… npm run test:sql`.

## Bilhetes

Recados curtos de um para o outro (até 280 caracteres), em `public.notes` (`supabase/notes.sql`). O mais recente aparece como post-it no **Nosso dia**; os anteriores ficam logo abaixo. Só o casal lê e escreve, a autoria e o lugar vêm da sessão, ninguém edita um bilhete colado e cada um só tira os próprios. Chegam em tempo real ao par. Testes em `tests/notes.sql`.

## Sem internet

O Dengo não guarda registros nem páginas no aparelho. Sem conexão, uma faixa avisa que a tela mostra apenas o que já estava aberto, e qualquer gravação é recusada com uma mensagem clara, sem perder o que foi digitado. Ao abrir o app sem internet, o service worker (`public/sw.js`) mostra um aviso estático com **Tentar de novo** no lugar da página de erro do Safari; quando a conexão volta, a página recarrega sozinha e busca o que o par alterou.

## Ativar o catálogo TMDB

Criar uma credencial em https://www.themoviedb.org/settings/api e configurar **TMDB_READ_ACCESS_TOKEN** somente no servidor. É o API Read Access Token (Bearer), não a chave v3 simples. A rota `/api/movies` limita os parâmetros, consulta só o domínio TMDB, exige sessão de um membro no modo conectado e não entrega a credencial ao navegador. Sem token, responde com uma mensagem de configuração e o cadastro manual continua disponível.

O uso é pessoal e não comercial. Os créditos e o logo oficial do TMDB estão na página de filmes. O token e o catálogo real ainda precisam de ativação e teste com uma conta TMDB.

## Publicar na Vercel

Importar `Avila03/Dengo` com o preset Next.js e configurar as variáveis acima. Não é necessário domínio pago.

## Limites conhecidos

- Google Agenda recebe uma **cópia confirmada pela pessoa**, por link ou .ics. Não há OAuth, leitura da agenda pessoal ou sincronização bidirecional nesta entrega.
- Google Maps abre em outra aba/aplicativo, sem API paga ou mapa embutido.
- Recorrências criam a próxima ocorrência ao concluir/pagar a atual. Não executam em background. Meses curtos preservam o dia original para os meses seguintes. Editar uma ocorrência não modifica as próximas já criadas; excluir uma ocorrência não exclui as futuras.
- Registrar uma despesa recorrente já paga cria a próxima pendente. A compra que originou a primeira despesa não é vinculada às repetições seguintes.
- Ao atualizar o nome de alguém, os responsáveis com o nome anterior são atualizados. Os campos de pagador e a divisão financeira usam índices estáveis. “Nós dois” é reservado para tarefas do casal e não pode ser nome de uma pessoa.
- O orçamento do lugar é estimativo e não vira gasto automaticamente. Não há reserva de estabelecimento, pagamento, integração bancária, receita, envio de mensagens ou upload de fotos dos passeios.
- Uma conta pertence a um espaço por vez. Para trocar, é preciso sair do casal atual antes de criar ou aceitar outro.
- Não há exportação nem restauração de dados pelo app. A recuperação de senha por e-mail foi adicionada na versão 0.4 e depende da configuração de redirecionamento e envio de e-mails do Supabase.
- O plano gratuito tem cotas e pode pausar por pouca atividade. Os testes de ponta a ponta usam o modo demonstração; login, convite, Realtime e push reais ainda precisam de conferência com as contas e os aparelhos do casal.
