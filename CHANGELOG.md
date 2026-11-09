# Histórico de versões — Dengo

As versões mais recentes aparecem primeiro. O README descreve o estado atual do aplicativo.

## Dengo 2.8.1 — menos peso a cada atualização

- **Foto do casal sob demanda:** o resumo do casal, buscado a cada atualização do app, deixa de trazer a foto (até ~400 KB; hoje 21 KB, o dobro de todos os registros). Ele traz só a versão da foto, e o app a busca com `couple_photo()` quando ela muda. Um gatilho impede que apps antigos ainda abertos apaguem a foto ao salvar outras preferências; remover a foto exige o marcador `photo_removed`, enviado pelo botão **Remover foto**. Banco: `supabase/couple-photo.sql`; testes em `tests/couple-photo.sql`.
- **Histórico do agendador limitado:** limpeza diária de `cron.job_run_details`, mantendo 7 dias (`supabase/cron-log-cleanup.sql`). Eram ~1.500 linhas novas por dia, sem limite.
- **Banco:** removido um espaço vazio e sem membros, criado na configuração inicial.

## Dengo 2.8 — sair do casal e aviso sem internet

- **Sair do casal:** em Configurações → Conta e privacidade ou no lobby. Quem sai perde o acesso; os registros ficam com quem permanece. A última pessoa só sai digitando o nome do espaço, o que apaga o espaço e todos os registros.
- **Convite pelo lugar vago:** quem permanece pode convidar, mesmo sem ter criado o espaço. A pessoa que entra ocupa o lugar livre (0 ou 1); responsabilidades e pagamentos em nome de quem saiu passam a ser dela, e a tela de convite avisa antes.
- **Banco:** `supabase/leave-couple.sql` adiciona `leave_couple` e atualiza `create_couple`, `create_couple_invite` e `join_couple` (mesma assinatura e permissões). A exclusão do espaço apaga primeiro os registros para não violar a chave de `push_changes`. “Nós dois” passa a ser recusado também no banco.
- **Sem internet:** faixa de aviso, gravações recusadas com mensagem clara e, ao abrir sem conexão, um aviso estático do service worker em vez do erro do Safari. Nada é guardado em cache; o service worker passa a ser registrado para todos, não só ao ativar notificações.
- **Testes:** `tests/leave-couple.sql` (saída, convite por quem ficou, lugar vago, nomes, exclusão confirmada, isolamento), testes unitários das mensagens e da conexão e um teste de ponta a ponta do aviso offline.

## 2.7.1 — base técnica

- **Testes no iPhone:** suíte Playwright no modo demonstração (iPhone 13, iPhone SE e desktop) cobrindo navegação, rolagem lateral, alvos de toque, zoom de campos no Safari e o ciclo de uma responsabilidade. O CI gera capturas das sete telas nos 13 temas como artefato `capturas-iphone`.
- **Sincronização incremental:** ao abrir, voltar à aba ou receber uma alteração do par, o app baixa só a assinatura dos registros (id e datas) e busca por inteiro apenas os novos ou alterados. O carregamento completo continua sendo usado na primeira abertura e quando quase tudo mudou. O saldo do casal segue considerando todo o histórico.
- **Nome reservado:** “Nós dois” passa a ser uma constante única (`TOGETHER`) e não pode mais ser usado como nome de uma pessoa, no lobby nem nas configurações, evitando que tarefas pessoais se misturem com as do casal.
- **Documentação:** histórico de versões movido do README para este arquivo.

## Dengo 2.7 — passos, compras detalhadas, metas e avisos

- **Subtarefas nas responsabilidades:** ao abrir uma responsabilidade, é possível adicionar, editar, concluir e excluir passos. A lista principal mostra o progresso. Cada passo é um registro independente e auditado, evitando sobrescrever o checklist do par. Concluir o pai conclui os passos; repetições recebem uma cópia com passos abertos. Excluir o pai remove seus passos.
- **Histórico no sininho:** duas áreas, **Avisos** e **Preferências**, com todos/não lidos, marcação individual/em lote e carregamento de avisos anteriores. Os próximos avisos passam a ser registrados por conta mesmo sem celular inscrito ou quando a entrega push falhar. O conteúdo do histórico é acessível apenas pela conta destinatária no casal; a privacidade da tela bloqueada continua aplicada ao push. Avisos anteriores a essa implementação não são reconstruídos retroativamente.
- **Compras com quantidade, unidade e preço:** quantidades com até três casas decimais, unidades usuais, preço por unidade e total do item calculado em centavos. O total previsto da lista considera o que falta comprar e indica itens sem preço. Estimativas antigas permanecem válidas; ao editar, são apresentadas como uma unidade pelo valor anterior. Registrar gasto continua permitindo informar o valor efetivamente pago.
- **Metas financeiras:** em **Financeiro → Pagamentos → Metas do casal**, definir valor desejado e prazo, registrar aportes por pessoa e consultar progresso, total reservado e restante. Aportes são registros próprios associados à meta; não entram em despesas ou acertos do casal. A exclusão da meta avisa que também remove seu histórico de aportes.
- **Divisão personalizada:** compras, despesas avulsas, assinaturas, contas e parcelamentos têm escolhas rápidas e porcentagem livre (inclusive 60/40 e casas decimais). A prévia mostra o valor de cada pessoa antes de salvar, conservando todos os centavos. Parcelamentos mostram a divisão do valor total, e as parcelas mantêm a proporção.
- **Banco e sincronização:** `supabase/couple-planning.sql` amplia os tipos da tabela de registros sob as regras de casal existentes, valida pais/metas/preços, cria cascatas e disponibiliza o histórico com RLS. Somente a coluna de leitura dos avisos pode ser atualizada pelo destinatário. A função Edge salva o histórico independentemente do aparelho e preserva a deduplicação dos pushes já entregues.
- **Verificação:** testes de quantidades e arredondamento, percentuais, totais da lista, separação entre reservas e gastos, ciclo de subtarefas, navegação do histórico e integração SQL com rollback. A integração confere o papel autenticado, clonagem em recorrências, cascatas e bloqueio de alterações ao conteúdo dos avisos.
- A prévia gerenciada disponível neste ambiente continua incompatível com as flags do Next.js; a conferência visual no iPhone permanece pendente.

## Dengo 2.6 — Web Push funcional

- A tela do sininho permite **Ativar neste aparelho**, **Enviar teste** e **Desativar neste aparelho**. No iPhone, instrui a instalação pela tela inicial; a permissão é solicitada diretamente após o toque do usuário.
- Service worker recebe notificações com o Dengo fechado e abre a tela correspondente ao toque. O worker não guarda páginas nem sessões em cache.
- Os oito tipos aprovados estão ligados a `lib/push-planner.ts`: eventos próximos e alterados/cancelados; novas responsabilidades; vencimentos; atrasos; conclusões pelo par; novos filmes/séries/lugares; resumo diário.
- Agendamento via Supabase Cron a cada minuto, com função Edge `dengo-push`. Avisos por ação chegam na próxima verificação; não são alarmes de precisão garantida. Eventos sem horário usam 9h de Brasília para o lembrete.
- Respeita destinatários, preferências individuais, horário de silêncio, privacidade, pagamentos concluídos e ocorrências recorrentes. O resumo não é enviado em dias sem itens. Lembretes são recalculados com os dados atuais, sem armazenar cópias futuras desatualizadas.
- Inscrições por aparelho e conta, até oito aparelhos por login. Sair da conta remove a inscrição deste aparelho; uma troca de identidade também encerra a inscrição anterior. Endpoints expirados são removidos após resposta 404/410.
- Assinatura e criptografia Web Push com VAPID; chaves privadas e autenticação do agendador ficam no Supabase Vault. Nenhum segredo no frontend ou no repositório.
- Função Edge verifica a identidade dos usuários para inscrição, teste e exclusão. O caminho do agendador exige assinatura HMAC com validade de cinco minutos e nonce de uso único; valida destinos de push, origem, tamanho e conteúdo da inscrição. Tabelas operacionais têm RLS e acesso de servidor, sem expor registros de outros usuários.
- Entregas usam chave única por aparelho/aviso, reserva atômica e até cinco tentativas em caso de falha. A tag estável também permite ao sistema agrupar reenvios. Histórico operacional limitado a 35 dias e alterações a três dias.
- Banco: `supabase/push.sql`, `supabase/push-lockdown.sql` e `supabase/push-signed-dispatch.sql`. A fila do agendador contém somente assinaturas de curta duração; não armazena o segredo reutilizável. A configuração privada é provisionada fora do Git. O agendamento está em `supabase/push-schedule.sql`; não executar novamente os scripts de criação em um banco já configurado.
- Testes cobrem fuso, silêncio, destinatários, privacidade, pagamentos/parcelas, recorrências e conclusões, os quatro avisos por ação, vencimentos e resumo diário.
- Recebimento físico no iPhone depende da permissão concedida pelo próprio usuário. A verificação do sistema não substitui o teste no aparelho após ativação.

## Dengo 2.5 — preferências individuais de notificações

- Sininho ao lado da engrenagem no cabeçalho, no computador e no celular, abre a tela própria **Notificações** em `/notificacoes`.
- Oito tipos escolhidos por Bruno: compromisso chegando; compromisso alterado/cancelado; nova responsabilidade; pagamento próximo do vencimento; pendência atrasada; conclusão pelo par; novo filme/série/lugar; resumo do dia. O aviso de responsabilidade no dia do prazo não faz parte da seleção.
- Controles individuais para antecedência do compromisso, antecedência dos pagamentos, aviso no vencimento, pagamentos próprios ou de todo o casal e horário do resumo. Os controles aparecem conforme os avisos selecionados.
- Horário de silêncio e privacidade da tela bloqueada ficam em um painel recolhido. Horários usam Brasília; pagamentos próprios são o padrão.
- Preferências salvas no login em `user_metadata.dengo_notifications_v1`, sem alterar as configurações compartilhadas do casal. Cache separado por usuário e modo demonstração separado; validação e erros preservam o formulário para tentar novamente.
- Esta entrega implementa **a tela e a persistência das escolhas**. O envio Web Push, inscrição de aparelhos, service worker e processo de disparo ainda não estão ativos; a própria tela informa esse estado e não solicita permissão ao sistema antes de haver entrega funcional.
- Controles acessíveis por teclado, botões tocáveis, campos em coluna no celular e cores dos temas individuais preservadas.

## Dengo 2.4 — formulários e rotina mais claros

- Navegação: **Responsabilidades** e **Financeiro**, com os endereços existentes preservados.
- Todos os rótulos e placeholders deixam de exibir a palavra “opcional”; as regras de obrigatoriedade permanecem iguais.
- O cabeçalho mostra o **nome do lobby uma única vez**. Nome, participantes e convite ficam em **Configurações do casal**; o lobby de entrada dá acesso a essa área.
- Criação e edição de eventos compartilham os mesmos campos. Título, data, horário e categoria aparecem primeiro; repetição revela a frequência, duração revela a data de término, e participantes/local/observação ficam em um bloco expansível.
- Frequências do calendário: não repetir, toda semana, todo mês e todo ano. Contagens antigas continuam disponíveis em uma opção recolhida; os nomes de aniversários deixam de fazer parte das frequências.
- Removidos o horário final e o seletor combinado de lugar/filme/série do formulário. **Local** seleciona lugares já salvos; vínculos históricos de filmes continuam preservados nos registros.
- Categorias do calendário podem ser criadas e gerenciadas no final da aba.
- Toque no título de uma responsabilidade, compra ou movimentação para abrir detalhes, editar, concluir/pagar ou excluir. Eventos usam a mesma folha acessível, com conclusão independente por ocorrência.
- Responsabilidades: filtros visíveis **Todas, Minhas, Da outra pessoa e Dos dois**, organização por prazo e destaque de atrasadas.
- Financeiro mantém lista de compras e pagamentos separados e exibe saldo entre os dois junto ao resumo mensal e próximos vencimentos. Apenas despesas pagas e acertos entram no saldo.
- Formulários de responsabilidades, despesas, planos, compras e locais revelam detalhes progressivamente. Datas, horários e botões usam o mesmo padrão, uma coluna no celular e as cores do tema individual.
- Convites reutilizam a RPC existente, de uso único e sete dias. Não há migração nem alteração dos dados existentes para esta versão.
- Validação: testes automatizados cobrem projeção semanal, datas remarcadas, conclusão e reabertura por ocorrência, duração, divisão de série e seleção de lugar com preservação do vínculo histórico. TypeScript e compilação são conferidos antes da publicação.
- Limite de verificação: a prévia gerenciada acrescenta flags de Vite incompatíveis com Next.js; a inspeção visual interativa desta versão não foi concluída nesse ambiente.

## Dengo 2.3.1 — identidade aprovada

- Logo escolhida por Bruno: **variação 2 do monograma D com coração/faixa em curvas**, em azul-escuro e coral/rosa.
- A mesma identidade aparece no login, recuperação de senha, lobby, navegação desktop e cabeçalho do celular.
- Ícones preparados a partir da arte aprovada: favicon, PNGs 32/192/512 e Apple Touch Icon RGB de 180 × 180, sem a moldura clara da prancha de apresentação.
- Metadados Apple identificam o aplicativo como Dengo; o manifesto permite abertura em modo standalone ao adicionar à tela inicial.
- A cor do nome acompanha o contraste dos temas individuais; o símbolo mantém as cores aprovadas.
- Atalhos já instalados podem manter o ícone em cache: nesse caso, remover o atalho e adicionar novamente pelo Safari.

## Dengo 2.3 — Dengo Studio · Personalização individual

- **13 temas confirmados:** Dengo Original, Noite a Dois, Lavanda, Jardim da Sálvia, Íris Azul, Grafite Minimal, Floresta Secreta, Ametista Profunda, Cobalto Elétrico, Vermelho Atelier, Fúcsia Pop, Neon Arcade e Preto & Branco. Paletas claras, escuras e vibrantes.
- **Aparência** em **Nosso espaço**: uma seção compacta com a escolha dos 13 temas e um painel de personalizações extras. O seletor antigo de seis temas foi substituído; os botões e opções não aparecem duplicados.
- **Cartões:** Clássico, Minimalista, Vidro (com transparência e blur) e Editorial (bordas de destaque).
- **Fundos:** Cor sólida, Degradê, Geométrico e Aura; todos baseados na identidade visual do tema escolhido.
- **Tipografia:** Clássica, Moderna e Editorial. Sem download de fontes extras; mantém o desempenho do iPhone.
- **Ícones:** Lineares, Preenchidos e Arredondados; variações nos ícones de navegação, sem alterar rotas ou funções.
- **Preferência individual:** combinações ficam salvas por usuário, em \`supabase.auth.updateUser({data:{dengo_appearance}})\`, e em cache local separado por ID de conta. No modo demonstração, ficam apenas no navegador. Não são salvas nas preferências compartilhadas nem exigem migração de banco.
- **Migração suave:** ao primeiro acesso, recupera temas antigos da conta quando não houver configuração nova; \`inverno\` vira Cobalto Elétrico e \`ouro\` vira Grafite Minimal, os equivalentes disponíveis na seleção atual.
- **Aplicação imediata:** qualquer mudança de aparência atualiza a interface, é salva automaticamente e pode ser revertida pelo botão **Restaurar Original**.
- **Acessibilidade:** tipografia legível, contraste mínimo AA nas superfícies e nos botões dos 13 temas; mudanças em fundos e cartões não escondem comandos nem dados.
- **Regressão:** testes automatizados verificam a coleção, as cinco dimensões, a sincronização por login, os estilos e a migração. Nenhum registro do casal foi alterado.

## Dengo 2.2 — seis temas de personalidade própria

Temas aprovados: **Dengo Original**, **Noite a Dois**, **Lavanda**, **Jardim da Sálvia**, **Céu de Inverno** e **Preto & Ouro**.

- Diferenciação forte, não apenas alterações pastel: Noite a Dois é grafite escuro com fúcsia vibrante; Lavanda é fundo lilás claro com roxo profundo; Jardim da Sálvia é verde-floresta escuro com detalhes lima; Céu de Inverno usa branco/gelo e azul-cobalto; Preto & Ouro é preto profundo com ouro acetinado; Original mantém o rosé/off-white.
- **Nosso espaço → Aparência** apresenta as seis miniaturas. Ao tocar numa delas, a aparência do site inteiro muda como **prévia ao vivo**. O botão **Aplicar tema** grava a escolha; se sair sem salvar, volta ao tema anterior. Há também **Restaurar Original**.
- A escolha é **individual**, por pessoa autenticada. Ela fica em **Supabase Auth user_metadata.dengo_theme** (dado de aparência sem efeito em autorizações) e cache local por ID da conta. A outra pessoa pode usar uma paleta diferente sem qualquer alteração em preferências compartilhadas ou nos registros do casal.
- No modo demonstração a preferência fica apenas no navegador.
- Um novo arquivo CSS é carregado por último e substitui tokens e componentes necessários (fundos, painéis, botões, cabeçalhos, inputs, navegação inferior, formulários e menus). Temas escuros recebem superfícies, texto e bordas realmente escuros.
- A cor da barra do navegador acompanha a seleção quando suportada. Opções e dados não são removidos.
- Testes novos verificam as seis IDs, persistência por usuário, prévia, sincronização e contraste WCAG AA entre texto/superfície e texto dos botões.

## Dengo 2.1 — Compras simplificadas

- Compras agora tem **duas escolhas claras**: **Lista de compras** e **Pagamentos**. A aba de pagamentos deixou de ter cinco subabas horizontais confusas.
- No resumo de pagamentos, um único valor **Falta pagar** apresenta o mês, com **Previsto** e **Já pago** recolhidos em **Ver valores do mês**.
- **Próximos vencimentos** aparece em uma lista curta de até quatro registros, que pode ser expandida. Alertas só aparecem quando existem.
- **Organizar pagamentos** apresenta quatro linhas simples, com acesso às coleções **Assinaturas**, **Compras parceladas**, **Contas fixas** e **Extrato e acertos**. Cada área abre uma tela interna com botão **Voltar aos pagamentos**; seus cadastros e ações existentes continuam funcionando.
- Em vez de três botões simultâneos, há um único **Adicionar**, que apresenta a escolha entre assinatura, compra parcelada e conta fixa somente quando solicitado.
- A **Lista de compras** mantém o botão único **Adicionar item**, filtros condicionais e registro de compra/gasto, sem duplicar o cabeçalho.
- Endereços antigos como \`/compras?aba=gastos\` e \`/compras?aba=pagamentos&sec=parcelas\` seguem funcionando.
- Alteração **apenas de apresentação e navegação**. Nenhum registro financeiro, modelo de recorrência, cálculo de parcelamento ou banco de dados foi alterado.
- Testes de interface de fonte verificam as duas escolhas, criação progressiva, projeção mensal, lista expansível e todos os destinos financeiros.

## Correção 2.0.1 — telas realmente enxutas no iPhone

- A auditoria com capturas reais revelou **botões duplicados** na lista vazia, excesso de filtros e busca sempre à mostra, e o nome **Compromissos** quebrando no menu inferior.
- **Compromissos:** somente um botão **Nova tarefa**, no cabeçalho. Quando não há tarefas, desaparecem os três filtros, busca e seleção de responsável, substituídos por uma mensagem compacta, sem outro botão de criar. Com registros, aparecem só três filtros de status; busca e responsável são abertos sob demanda.
- **Compras:** somente um botão **Adicionar item**, sem segundo título grande **Nossa lista de compras**; listas vazias e sem itens faltando são compactas, e os filtros aparecem somente quando há itens. O resumo financeiro completo fica na seção Pagamentos, sempre acessível.
- **Lugares:** nenhum filtro quando o casal ainda não tem lugares salvos; coleções ficam num painel recolhível; estado vazio compacto, sem operações redundantes.
- **Filmes e séries:** ocultados contadores e filtros vazios; catálogo de descoberta expande automaticamente quando a lista está vazia; mensagem vazia simplificada.
- **Menu inferior:** **Tarefas** é o nome curto no celular para a aba **Compromissos** (mesma rota e funcionalidade), evitando letras quebradas; ícones e cinco destinos continuam. O botão de atualizar sai do cabeçalho no celular, mas permanece acessível em **Nosso espaço → Atualizar registros**.
- Mudança exclusivamente de apresentação e acesso aos controles; os registros, vínculos financeiros, permissões e regras de negócio foram mantidos. A nova camada \`app/clarity.css\` refina o design visual sem apagar CSS legado.
- Testes estáticos de regressão cobrem estados vazios, CTA única, filtros progressivos, link da navegação e o carregamento da folha de estilo.

## Dengo 2.0 Clean — redesign integral, funcionalidades preservadas

- **Identidade preservada**: off-white, rosa queimado, tipografia serifada, ícones e cinco destinos inferiores continuam; a nova camada \`app/clean.css\` centraliza o sistema visual sem reescrever as regras de negócio.
- **Navegação e apresentação**: cabeçalho discreto, espaçamentos e tipografia consistentes, menos bordas coloridas, cartões mais leves, menos textos decorativos e rodapé repetitivo removido.
- **Nosso dia**: mantém a semana, os pontos de cores ilimitados, o calendário mensal, o resumo das tarefas e as datas especiais. Removido o segundo resumo de três chips; filtros e personalização dos tópicos disponíveis em um único bloco expansível.
- **Compromissos e lista de compras**: cada registro prioriza o nome, o responsável, o status e a ação de concluir. Editar/excluir ficam em **Opções**, e registrar gasto permanece um botão visível.
- **Compras e pagamentos**: resumo inicial destaca só o número de compras pendentes e o valor a pagar. Todos os outros indicadores ficam disponíveis em **Ver resumo financeiro completo**; extrato, assinaturas, parcelas, contas fixas, avisos e filtros seguem intactos. Dados e comandos avançados dos planos ficam dentro de **Detalhes e opções**.
- **Nossos lugares**: título, endereço, coleção, favorito e botões de visita/agendamento aparecem primeiro. Orçamento, memórias, link de TikTok/Maps, mapa, edição e exclusão continuam em **Detalhes e links**.
- **Filmes e séries**: contadores compactos abrem a lista salva. Status, temporada/episódio e feedback seguem visíveis; ações administrativas ficam em **Avaliação e opções**; catálogo TMDB só expande quando escolhido.
- **Calendário e Nosso espaço**: legenda, eventos futuros, ajuda de exportação e orçamentos por categoria ficam em painéis expansíveis. Gerenciamento de cores, eventos recorrentes, aniversários e fotos não muda.
- **Formulários**: componente reutilizável \`CleanSheet\` move criação/edição de tarefas, compras, locais, filmes, eventos, gastos e planos para uma janela central no desktop e uma folha inferior no iPhone, com rolagem interna, foco de teclado, Escape e botão para fechar.
- **Mobile-first**: controles tocáveis, safe areas do iOS, bar inferior de 5 ícones, largura limitada, sem rolagem horizontal desnecessária, campos grandes o bastante para Safari não dar zoom involuntário.
- **Dados**: nenhum registro foi apagado e nenhuma migração Supabase foi necessária; apenas layout, visibilidade e organização dos comandos foram alterados. Testes de domínio e compilação permanecem obrigatórios.

## Entrega 1.8 — pagamentos do casal, assinaturas e parcelamentos

- **Compras** agora tem dois destinos principais: **Lista de compras** e **Pagamentos**. Em Pagamentos, atalhos internos compactos para Vencimentos, Assinaturas, Parcelas, Contas fixas e Extrato e acertos. O caminho antigo \`/compras?aba=gastos\` continua abrindo o extrato.
- **Assinaturas**: registrar nome, valor, data do primeiro vencimento, ciclo mensal ou anual, quem paga, divisão, forma de pagamento, categoria e aviso de 0, 1, 3 ou 7 dias. Pausar, cancelar e reativar afetam cobranças futuras sem apagar pagamentos já contabilizados.
- **Parcelamentos**: cadastrar o valor total (não apenas a parcela), de 2 a 240 parcelas mensais, início e responsável. Valores são divididos em centavos com eventual diferença distribuída entre parcelas, de forma que somem exatamente o total. Progresso mostra quantas parcelas foram pagas e quantas faltam.
- **Contas fixas**: renovação mensal, inclusive com valor previsto opcional/variável. No pagamento de cada mês, informar o valor efetivo antes de registrar. Gastos pagos e pendentes ficam claramente separados.
- **Próximos vencimentos** e **avisos internos**: Painel Vencimentos exibe contas atrasadas dos últimos 60 dias e até 45 dias à frente, com prazo e ação para registrar ou marcar como pago. Avisos configuráveis aparecem no Dengo e em Nosso dia, sem prometer notificações push.
- **Previsão mensal**: valores previstos, pagos e ainda pendentes, com mês selecionável. As projeções de assinaturas, parcelas e contas fixas não contam como despesas pagas e não duplicam parcelas já registradas. Contas avulsas entram na previsão, e o saldo do casal só considera valores efetivamente pagos.
- **Formas de pagamento**: Pix, cartão de crédito/débito, boleto, dinheiro, transferência e outros, tanto nos planos quanto em despesas avulsas e compras da lista.
- **Calendário integrado**: vencimentos projetados aparecem em Nosso dia e na Agenda, com botão de registro que leva ao painel de Pagamentos; marcar um vencimento como pago cria/atualiza uma despesa real e retira a previsão daquele dia sem duplicá-la.
- **Dados**: os modelos são armazenados como entradas financeiras não pagas (\`kind=expense\`, \`data.paymentPlanType\`) no JSONB já existente do Supabase. As parcelas e os ciclos são projetados em memória; somente cobranças efetivamente registradas geram uma despesa. Não exige migração nem serviços pagos adicionais.
- **Limites atuais**: os avisos aparecem quando o aplicativo é aberto (não são push automáticos); a divisão é entre as duas pessoas e cada parcela possui um pagamento registrado, sem pagamentos parciais. Pausar/cancelar interrompe novos vencimentos projetados e mantém os anteriores já registrados.

## Ajuste 1.7.1 — configurações mais objetivas

- Removidas de **Nosso espaço** as seções **Uma cópia da nossa história / Exportar meus dados** e **Conexões externas**, que não são necessárias no cotidiano. A importação de backups ainda não existe.
- Mantidas **Nossa identidade**, foto, nomes, início do relacionamento, limites mensais e uma seção enxuta de **Conta e privacidade** com Sair da conta.
- As integrações com Google Maps, Google Agenda e TMDB seguem disponíveis nas respectivas abas; os dados do casal não foram apagados.

## Entrega 1.7 — cinco abas fixas e configuração na engrenagem

- Navegação inferior em cinco destinos no celular: **Nosso dia**, **Compromissos**, **Compras**, **Lugares** e **Filmes**.
- A seção **Nosso espaço** deixa de ocupar um destino de navegação e passa a ser aberta por um botão de engrenagem no cabeçalho, tanto no celular quanto no desktop.
- A rota antiga **/mais** redireciona para a tela inicial; o conteúdo de Lugares, Filmes e Configurações segue acessível nas rotas originais.
- Barra inferior em cinco colunas com rótulos compactos, ícones centralizados, área de toque e espaço para a zona segura inferior do iPhone. A engrenagem tem estado de seleção e rótulo acessível.
- Nenhuma informação ou registro do casal é alterado.

## Entrega 1.6 — Filmes e séries, a lista em primeiro lugar

- A seção **Nossa lista** aparece antes do catálogo TMDB: os títulos do casal ficam visíveis logo ao abrir Filmes e séries.
- Os contadores **Na lista**, **Assistindo** e **Assistidos** são botões acessíveis que mudam o filtro e levam à lista salva.
- Três status para filmes e séries: **Não assistiu**, **Assistindo** e **Assistido**, editáveis diretamente no cartão sem abrir o formulário. As entradas antigas que utilizavam apenas \`done\` continuam compatíveis.
- Séries em andamento podem registrar **temporada e episódio atuais** em um formulário compacto dentro do cartão, sem perder a informação ao alternar status.
- Depois de assistir, o casal pode registrar notas individuais (1 a 10) e um **feedback compartilhado** de até 800 caracteres.
- O botão **Editar / avaliar** abre os detalhes completos, e o botão de agendar continua conectando o título ao calendário.
- A lista tem filtros para **Na lista**, **Assistindo**, **Não assistiu**, **Assistidos**, **Interesse dos dois** e **Todos**, com a descoberta de novos títulos em uma seção separada.
- Os cartões salvos foram reduzidos para melhor aproveitamento de espaço, inclusive no iPhone, e o catálogo de descoberta continua usando TMDB.
- Os novos campos ficam no JSONB de entries.data, sem migração SQL.

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
