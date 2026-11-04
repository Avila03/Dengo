# Dengo

Um lugar para cuidar da vida a dois. Next.js App Router, React, TypeScript e Supabase.

## Entrega 1.5 — Compras, Nossos lugares e refinamento para iPhone

- **Compras em um só fluxo:** a lista agora registra um valor previsto opcional para cada item, sem confundir estimativa com despesa paga. Toque na carteira do item para registrar diretamente valor efetivo, data, pagador, divisão entre o casal e se já foi pago. O backend vincula o gasto à compra e marca o item como comprado na mesma operação.
- **Status financeiro claro:** A comprar, Comprado sem gasto registrado, Pagamento pendente ou Pago. Itens pagos aparecem no extrato e entram no saldo devido entre as pessoas. Itens não pagos não entram no saldo até o pagamento; no extrato é possível marcar como pago, alterar percentual de divisão ou registrar um acerto.
- **Compras** mantém as abas Lista de compras e Extrato e acertos, sem página independente de Finanças. O resumo separa gastos pagos neste mês das estimativas de compras ainda pendentes.
- **Nossos lugares com coleções:** sugestões iniciais Encontros, Cafés, Viagens e Ideias, e liberdade para digitar novos nomes de coleções (até 40 caracteres) ao cadastrar ou editar. As coleções ficam compartilhadas como atributos dos lugares salvos; coleções vazias e não predefinidas deixam de aparecer nos filtros.
- **Favoritos e visitas:** cada lugar permite favoritar com um toque, filtrar favoritos, alternar Entre Queremos conhecer / Já fomos / Todos, salvar data de visita e filtrar por coleção. O link do TikTok ou Google Maps continua opcional e é preservado.
- **iPhone:** controles com áreas de toque adequadas, formulários com fonte de 16 px para evitar zoom involuntário do Safari, conteúdo com espaço para a barra inferior e áreas seguras, chips de coleção com rolagem horizontal, cartões em coluna única e modais com rolagem confortável.
- Alterações usam os campos JSONB existentes, sem migração SQL. Testes automatizados cobrindo estados financeiros e filtros de lugares.

## Entrega 1.4 — experiências do calendário

- **1. Visualização rápida**: toque no título do evento na agenda completa ou em Nosso dia para abrir os detalhes em uma janela compacta, sem sair da página; inclui edição, exclusão, vínculos e preparativos.
- **3. Contagem regressiva**: Nosso dia destaca a próxima data recorrente especial com dias restantes, respeitando mêsversários, aniversários e seus contadores. Não usa notificações push.
- **4. Início e término**: um evento pode ter data/hora de início e data/hora de término, incluindo viagens de vários dias. As cores aparecem em cada dia abrangido, e a exportação para Google Agenda/ICS respeita o período.
- **5. Recorrências flexíveis**: editar/excluir somente uma ocorrência, esta e as próximas, ou toda a série. Uma data individual remarcada não move as outras. O split da série cria outro registro; em caso de falha entre operações, o aplicativo alerta para verificar duplicações.
- **6. Filtro por tópicos**: seleção de cor/assunto tanto na agenda completa quanto no calendário compacto de Nosso dia.
- **7. Links internos**: ao criar ou editar um evento, vincular um lugar ou filme/série já existente no Dengo. Exibir o vínculo nos detalhes e oferecer um acesso à aba de origem.
- **8. Preparativos vinculados**: adicionar tarefas e compras dentro dos detalhes do evento, com responsáveis, prazos opcionais para tarefas e conclusão rápida. Continuam visíveis também nas abas de Compromissos e Compras; cada ocorrência recorrente tem sua própria lista.
- Persistência existente em JSONB de entries.data; não precisa de migração. Os eventos de demonstração não têm prioridade de preservação, mas os registros antigos continuam legíveis.

## Ajuste 1.3.1 — quanto tempo estamos juntos?

- Eventos mensais e anuais agora podem mostrar automaticamente a duração desde a data real de início, sem refazer a contagem manualmente.
- Ao criar um evento com repetição, aparece **Como mostrar o tempo desde a data inicial?** com: **Tempo juntos**, **Tempo decorrido**, **Idade** ou **Não mostrar contagem**.
- Para o mêsversário, usar a data real de início do namoro; por padrão, a opção mensal sugere *Tempo juntos* (ex.: **2 anos e 3 meses juntos**). A escolha anual sugere *Idade* para aniversários, desde que a data cadastrada inclua o ano de nascimento verdadeiro.
- As ocorrências projetadas guardam a data-base apenas na memória, para calcular a contagem corretamente em eventos futuros, incluindo fevereiro. No calendário e na visão Nosso dia, a contagem aparece junto ao evento, sem alterar as bolinhas de cada dia.
- O contador continua vinculado à série original; edições e exclusões de eventos recorrentes mantêm o funcionamento anterior.

## Entrega 1.3 — datas especiais que se repetem

- Em **Agenda completa → Novo compromisso**, o campo **Repetir esta data** oferece Não repetir, Todo mês (mêsversário de namoro) e Todo ano (aniversários).
- Os registros com repetição aparecem automaticamente em **Nosso dia**, nos indicadores coloridos do calendário semanal e mensal, no calendário completo e na seção **Vem por aí**.
- Mensalidades preservam a data de origem (31/01 → 28/02 → 31/03), usando o último dia de meses mais curtos. Aniversários em 29 de fevereiro caem em 28/02 nos anos comuns e voltam a 29/02 nos bissextos.
- Somente a série original é salva no banco (metadado eventRepeat na coluna JSONB data), sem criar inúmeros registros. Para editar ou excluir uma ocorrência futura, o aplicativo identifica o registro original e deixa claro que a mudança vale para **toda a série**.
- As exportações para Google Agenda e arquivo .ics continuam exportando apenas a ocorrência selecionada; a repetição automática funciona dentro do Dengo.
- Não é necessária migração SQL. A recorrência de tarefas e contas mantém suas regras atuais separadas.

## Ajuste 1.2.1 — todos os indicadores do calendário

- Removido o limite de três pontos por dia: cada compromisso, tarefa ou conta com data exibe uma bolinha própria, preservando a cor de seu tópico.
- As bolinhas se distribuem em linhas adicionais nas visões semanal, mensal e na agenda completa, sem ocultar registros e mantendo a leitura possível em telas pequenas.
- Removido o limite arbitrário de 16 tópicos; permanece uma verificação de tamanho máximo do conjunto de preferências, para evitar dados excessivos no banco.

## Entrega 1.2 — tópicos coloridos e compromissos organizados

- Cinco tópicos iniciais: Janta, Filmes, Passeio, Viagem e Outros. O casal pode criar, renomear, escolher cores ou excluir tópicos, com até 16 opções compartilhadas.
- A agenda completa permite editar tópicos e atribuir um tópico a cada evento. A cor é exibida nos calendários semanal e mensal de Nosso dia e no calendário completo.
- Cada registro do dia gera seu próprio ponto colorido (até três, seguido de +N se houver mais). Tarefas e contas têm cores fixas e continuam aparecendo.
- Compromissos ganha filtros por responsável (Todos, Comigo, Meu par, Nós dois), organização por data e destaque dos atrasados.
- Cores e nomes dos tópicos são armazenados nas preferências do casal, sem migração SQL.

## Entrega 1.1 — Nosso dia compacto com calendário integrado

- **Calendário removido do menu** lateral e da barra inferior. No celular, quatro destinos: Nosso dia, Compromissos, Compras e Mais.
- **Nosso dia** tem resumo enxuto do dia atual e uma visão semanal com indicadores de datas marcadas; tocando em uma data, mostra até três registros desse dia com expansão opcional.
- **Ver mês** abre uma grade mensal embutida, sem sair da tela inicial. Os dias marcados recebem indicador visual.
- **Agenda completa** abre a antiga rota /calendario, preservada para criação/edição, links existentes e planejamento originado de lugares ou filmes. Os atalhos passam a data selecionada; **Adicionar** já abre o formulário nessa data.
- A tela principal prioriza celular, leitura rápida e botões tocáveis, sem duplicar listas de compras ou compromissos na página inicial.
- Nenhum registro existente foi alterado ou apagado.

## Entrega 1.0 — navegação reorganizada

- **Nosso dia** agora é uma agenda exclusivamente do dia atual: compromissos do calendário, tarefas com data e despesas com vencimento hoje, ordenados por horário, mostrando pendentes e concluídos.
- **Calendário** mantém eventos adicionados na agenda e exibe também tarefas com data e contas com vencimento.
- **Compromissos** substitui o rótulo Responsabilidades (mesma lista de tarefas, responsáveis, prazos e repetições) no novo endereço /compromissos; /tarefas redireciona para manter favoritos.
- **Compras** reúne duas abas: Lista de compras (itens pendentes e comprados) e Gastos e acertos (todos os registros e funções financeiras existentes). Links antigos /financas redirecionam para /compras?aba=gastos, preservando a referência compra quando válida.
- **Nossos lugares** e **Filmes e séries** mantidos, nessa ordem. Configurações continuam em Nosso espaço.
- No celular, os quatro primeiros destinos aparecem na barra inferior e os demais em Mais; os seis destinos e Configurações ficam disponíveis no menu lateral do desktop.
- A estrutura de dados financeira e tarefas não foi apagada nem migrada; a mudança é de apresentação e rotas.

## Entrega 0.9 — cadastro direto de locais e links

- **Nossos lugares simplificado:** retirei a busca automática e as chamadas de consulta a estabelecimentos. A tela agora serve exclusivamente para cadastrar, editar e organizar locais do casal.
- Mantidos: nome, endereço/cidade, categoria, orçamento em reais, "por que queremos ir?", "já conhecemos" e lembrança/avaliação.
- **Novo campo de link opcional:** cole uma URL HTTPS completa do TikTok, Google Maps ou outro site. O link é salvo como referência e pode ser aberto novamente no cartão do lugar. Não tentamos extrair automaticamente dados da página compartilhada.
- Os registros antigos continuam visíveis e os mapas anteriormente vinculados por OSM ou Place ID permanecem acessíveis, quando suas integrações estiverem disponíveis.
- **Não precisa de API de mapas:** o botão de endereço usa um link externo do Google Maps, sem integrar uma API.
- A validação rejeita links que não usam HTTPS e não mostra URLs de registros antigos que sejam potencialmente inseguros.

## Entrega 0.8 — locais específicos para encontros

- Busca por nome, cidade e categoria: Restaurantes, Cafés, Bares, Hamburguerias, Pizzarias e Padarias.
- Photon filtra estabelecimentos pelas categorias do OpenStreetMap. Quando não houver resultados e a cidade estiver informada, tenta Overpass, restrito ao município.
- Se a pesquisa gratuita não encontrar um local, um link abre a busca já preenchida no Google Maps, sem chave ou contratação de API.
- Lugares encontrados continuam com mapa e marcador, notas, orçamento, status de visita e calendário.
- Photon e Overpass são serviços públicos de melhor esforço; cobertura incompleta, limites de frequência e indisponibilidades podem ocorrer.

## Entrega 0.7 — alternativa gratuita de lugares

- **Sem criar contas externas:** caso não exista chave GOOGLE_PLACES_API_KEY na hospedagem, o Dengo usa o Photon (dados do OpenStreetMap) para pesquisar estabelecimentos por nome e cidade.
- **Mapa interno gratuito:** ao selecionar um resultado, o marcador aparece em um mapa incorporado do OpenStreetMap. As coordenadas e a identificação OSM são salvas junto com os dados próprios do casal; ao reabrir, o mapa continua disponível.
- **Rota no Google Maps:** o link externo abre a posição por coordenadas, sem precisar da API paga.
- **Preserva:** cadastro manual, histórico do casal, orçamento, avaliações, marcar visitado, calendário e locais salvos anteriormente.
- **Limites:** Photon é uma demonstração pública com uso razoável, sem garantia de disponibilidade e sujeito a limitação de tráfego. A busca acontece somente ao clicar em Pesquisar, inclui limitação básica de frequência e cache de pesquisas. A cobertura pode ser inferior à do Google. Para alto volume de usuários será necessário contratar ou hospedar serviço próprio.
- Créditos: © OpenStreetMap contributors; dados OpenStreetMap/ODbL. Evitar inserir dados pessoais ou confidenciais na busca externa.

## Entrega 0.6 — encontrar lugares no Google Maps

- **Busca por nome:** digitar o estabelecimento, opcionalmente informar cidade/região, e selecionar um dos endereços apresentados pela Places API (New).
- **Mapa:** a seleção preserva o Place ID e pode mostrar o marcador dentro do Dengo com a Maps Embed API; o mesmo lugar fica localizável posteriormente pelo link exato do Google Maps.
- **Dados do casal:** salvar nome, endereço, categoria, orçamento, planos, visitado e avaliação no Supabase como antes. A pesquisa identifica registros já vinculados pelo mesmo Place ID para edição.
- **Configuração:** habilitar Places API (New) e Maps Embed API no Google Cloud com faturamento ativado. Criar uma chave de servidor para GOOGLE_PLACES_API_KEY (restrita à Places API, variável Sensitive na Vercel) e uma chave de navegador para NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY (restrita à Maps Embed API e aos domínios do Dengo).
- **Custos:** a pesquisa só chama a API quando o usuário aperta Pesquisar, no máximo oito resultados por chamada; defina também cotas e alerta de orçamento no Google Cloud para evitar cobranças.
- **Sem integração:** o cadastro manual e o link de localização do Google Maps continuam funcionando, mas pesquisa online e mapa embutido ficam indisponíveis até configurar as chaves.
- Os dados de buscas são atribuídos ao Google Maps. O Place ID pode ser guardado; o nome e endereço passam pelo formulário editável e são confirmados ao salvar.

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
