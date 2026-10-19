# Live Nexus Connect

Aplicação React com Vite, React Router e Node.js/Express. As rotas do frontend ficam declaradas em `dashboard/App.tsx`; a API e a persistência JSON são executadas pelo servidor em `server.js`. Esta versão não usa TanStack Start nem gera `routeTree.gen.ts`.

## Desenvolvimento

Requer Node.js compatível com a versão do Vite usada no projeto.

```bash
npm install
npm run dev
```

O Vite serve a interface na porta 3000 e encaminha as chamadas `/api/*` para o Express na porta 3001.

## Produção

```bash
npm install
npm run build
npm start
```

O Express atende a API e serve o frontend compilado a partir de `dist`. A hospedagem deve iniciar `npm start` e encaminhar a porta definida em `PORT`.

## Arquivos JSON

- Usuários: `dashboard/admin/banco/json/usuario.json`
- Avaliações: `dashboard/admin/banco/json/avaliacao.json`

Os arquivos JSON são lidos e gravados pelo servidor, não pelo navegador. O ambiente de hospedagem precisa permitir escrita nesse diretório e preservar os arquivos entre reinicializações. A troca do roteador elimina o gerador de rotas, mas não concede permissões de escrita ao sistema de arquivos.

Configure `SESSION_SECRET` como variável de ambiente com pelo menos 32 caracteres para manter sessões consistentes entre reinicializações. Sem essa variável, o servidor cria um segredo temporário ao iniciar.
