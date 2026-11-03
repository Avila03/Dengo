# Dengo

Um lugar para cuidar da vida a dois. Primeira entrega em Next.js App Router, React e TypeScript, pronta para conectar um projeto Supabase próprio.

## O que funciona

- Páginas separadas: Nosso dia, Compras, Responsabilidades e Nosso espaço.
- Adicionar compras com quantidade/observação e responsável; concluir, reabrir e excluir com confirmação.
- Tarefas com responsável, prazo opcional e destaque de atraso.
- Filtros, busca, resumo e exportação JSON dos registros carregados.
- Layout para celular com navegação inferior e áreas seguras do iPhone.
- Prévia local explícita; login por senha e persistência compartilhada quando o Supabase estiver configurado.

Não há dados fictícios disfarçados de registros reais. Filmes, mapas, calendário, financeiro, edição de registros e recorrência ficam para próximas entregas. Não há sincronização automática em tempo real: após mudanças no outro dispositivo, use Atualizar ou reabra a página.

## Rodar

Requer Node.js 22 ou superior.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Em desenvolvimento sem Supabase, a demonstração fica habilitada. Ela salva somente no navegador, sem login e sem compartilhar com outro aparelho. Não use para informações sensíveis. Os dados da demonstração não são migrados automaticamente para o banco.

```sh
npm run typecheck
npm test
npm run build
```

## Ativar o espaço privado

1. Criar um projeto Supabase **exclusivo do Dengo**. Não reutilizar o banco do Mesa Marcada.
2. Executar `supabase/setup.sql` no SQL Editor do projeto novo (uma única vez).
3. Em Authentication, desabilitar cadastro público. Criar as duas contas manualmente com e-mail e senha e confirmar os usuários pelo painel.
4. Preencher e executar o exemplo comentado no final do SQL, com os dois UUIDs e nomes reais. Memberships e nomes são gerenciados somente pelo administrador.
5. Configurar `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` na hospedagem. **Nunca** usar service_role ou secret key no navegador.
6. Manter `NEXT_PUBLIC_DEMO_MODE=false` e reconstruir o site. Sem configuração válida, a produção mostra uma tela de configuração, sem expor dados locais.
7. Testar com as duas contas autorizadas e uma terceira sem vínculo. Testar no banco/API que um usuário fora do espaço não consegue consultar nem alterar registros. As políticas RLS estão implementadas no script, mas ainda precisam dessa validação no projeto real.

## Publicar na Vercel

Importar Avila03/Dengo, selecionar Next.js e configurar as variáveis acima antes do deploy. Não é necessário domínio pago. Para uma prévia sem banco, é possível definir `NEXT_PUBLIC_DEMO_MODE=true`, sabendo que cada navegador terá registros independentes e que isso não é o modo privado compartilhado.

## Segurança e conservação dos dados

O banco restringe o acesso pelas memberships e RLS, sem permitir que o cliente altere os vínculos. A chave publicável não concede acesso aos registros sem uma sessão autorizada. Nenhum registro privado é renderizado no servidor. Senhas são tratadas pelo Supabase Auth. O conteúdo livre é renderizado como texto pelo React. As duas pessoas podem gerenciar os registros do espaço.

A exportação JSON é uma cópia manual, não um sistema de backup automático. O plano gratuito tem limites e pode pausar com pouca atividade. Senhas esquecidas são redefinidas pelo administrador nesta versão; recuperação por e-mail fica para uma etapa posterior.
