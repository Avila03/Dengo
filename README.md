# Dengo

Um lugar para cuidar da vida a dois. Next.js App Router, React, TypeScript e Supabase.

## Entrega 0.5 — catálogo e descoberta de filmes e séries

- **Explorar:** as abas Em alta (semana) e Populares, pesquisa por título em português e seleção de Filme ou Série. Busca paginada com botão Ver mais títulos.
- **Cartões:** pôster, título, ano de lançamento, sinopse e avaliação comunitária do TMDB (não confundir com as notas individuais do casal).
- **Adicionar à lista:** um toque salva o título no espaço compartilhado, marca o interesse de quem adicionou e não oferece adicionar novamente o mesmo TMDB ID. Interesses e notas podem ser editados depois.
- **Segurança:** a API consulta apenas endpoints fixos do TMDB, exige login e participação no espaço, não expõe o token e limita o número de páginas. O catálogo online só funciona após ativar TMDB_READ_ACCESS_TOKEN na Vercel; cadastro manual segue disponível.
- **Ativação:** em https://www.themoviedb.org/settings/api, obter **API Read Access Token**, configurar a variável **TMDB_READ_ACCESS_TOKEN** nas variáveis de ambiente da Vercel para Production (e Preview, se desejar). Faça isso no painel, sem enviar o token no chat. Efetuar novo deploy após salvar e então testar a busca em /filmes.
- O TMDB disponibiliza a API gratuitamente para uso não comercial com atribuição; os créditos estão na página.

## Entrega 0.4 — cadastro imediato e recuperação de acesso

- **Cadastro sem confirmação:** confirmação de e-mail desativada manualmente no Supabase Auth. Ao criar uma conta nova, o Supabase fornece uma sessão para acesso direto ao lobby. Caso não receba sessão, o aplicativo apresenta erro sem orientar a confirmar e-mail.

- **Esqueci minha senha:** solicitação de link por e-mail, tela dedicada para definir e confirmar nova senha e retorno ao login. O link depende da configuração de Redirect URLs do Supabase e da entrega de e-mails do projeto; não exige chave privada no navegador.
- **Separação:** senha é individual, redefinir a senha não troca a pessoa de casal nem apaga registros.

## Entrega 0.3 — lobby do casal

- **Login individual:** cadastro e entrada com e-mail/senha. Cada pessoa tem sua própria conta. O projeto está com cadastro habilitado e confirmação de e-mail desativada no Supabase; cada pessoa entra sem aguardar mensagem de confirmação.
- **Lobby do casal:** após entrar na conta, criar um espaço com nome próprio ou aceitar convite. Depois, escolher entrar no espaço. Quem já pertence a um casal vê o cartão do casal; uma conta pertence a um único espaço nesta versão.
- **Convite privado:** criado somente pela primeira pessoa, uso único, validade de sete dias, regeneração invalida o anterior e limite obrigatório de duas pessoas. Copiar o link não envia mensagem automaticamente. Após sair do lobby, é possível gerar outro convite; o token anterior não é guardado em texto no banco.
- **Autoria:** o banco registra criador, última pessoa que alterou e data de alteração, separados do responsável e pagador. Os metadados não podem ser falsificados pelo cliente. Registros anteriores à atualização não recebem autoria inventada. A interface mostra o autor e os detalhes da última alteração, não um histórico completo de versões.
- **Nosso dia:** resumo real das compras e tarefas, próximos encontros e atalhos.
- **Compras:** adicionar, editar, concluir, reabrir e excluir. Transformar em despesa preserva a descrição e impede lançamento duplicado.
- **Responsabilidades:** responsável, prazo, edição, busca e filtros. Repetições diárias, semanais e mensais com alternância opcional. Concluir cria a próxima ocorrência; reabrir e concluir de novo não duplica a próxima.
- **Finanças:** despesas pagas ou pendentes, categorias, divisão percentual (50/50 por padrão), saldo a acertar, registro de reembolsos, contas mensais e orçamento por categoria. Valores inteiros em centavos. O centavo indivisível da divisão fica na parcela da primeira pessoa. O saldo considera todo o histórico pago, enquanto o resumo e o orçamento usam o mês selecionado.
- **Calendário:** visão mensal e agenda do dia, compromissos editáveis, tarefas e contas com prazo, exportação .ics e botão de adicionar ao Google Agenda. Horários em Brasília. Filmes e lugares podem virar compromissos.
- **Filmes e séries:** exploração de títulos em alta e populares, pesquisa no TMDB, cadastro manual, interesses de cada pessoa, filtro de interesse em comum, sorteio, assistidos e notas individuais. O catálogo online requer token TMDB válido na Vercel. Créditos ao fornecedor na página.
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

A estrutura e as políticas de `setup.sql` e `lobby.sql` já foram aplicadas nesse projeto. **Não executar esses scripts novamente nele.** Para outro banco vazio, executar `setup.sql` e depois `lobby.sql`.

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
- Não há saída, troca ou exclusão de casal pelo app nesta versão. Uma conta fica vinculada a um espaço; o administrador pode auxiliar na recuperação.
- A exportação JSON é uma cópia manual. Importação e backup automático ainda não estão disponíveis. A recuperação de senha por e-mail foi adicionada na versão 0.4 e depende da configuração de redirecionamento e envio de e-mails do Supabase.
- O plano gratuito tem cotas e pode pausar por pouca atividade. Teste visual e end-to-end no navegador ainda pendente: a prévia gerenciada não aceitou os argumentos do servidor Next.js.
