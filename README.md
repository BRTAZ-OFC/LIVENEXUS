# Live Nexus Connect

<!-- Explicação/documentação desta parte do projeto: Aplicação React com Vite, React Router e Node.js/Express. As rotas do frontend ficam declaradas em ` -->
Aplicação React com Vite, React Router e Node.js/Express. As rotas do frontend ficam declaradas em `dashboard/App.tsx`; a API e a persistência JSON são executadas pelo servidor em `server.js`. Esta versão não usa TanStack Start nem gera `routeTree.gen.ts`.

## Desenvolvimento

<!-- Explicação/documentação desta parte do projeto: Requer Node.js compatível com a versão do Vite usada no projeto. -->
Requer Node.js compatível com a versão do Vite usada no projeto.

<!-- Explicação/documentação desta parte do projeto: ```bash -->
```bash
<!-- Explicação/documentação desta parte do projeto: npm install -->
npm install
<!-- Explicação/documentação desta parte do projeto: npm run dev -->
npm run dev
<!-- Explicação/documentação desta parte do projeto: ``` -->
```

<!-- Explicação/documentação desta parte do projeto: O Vite serve a interface na porta 3000 e encaminha as chamadas `/api/*` para o Express na porta 3001 -->
O Vite serve a interface na porta 3000 e encaminha as chamadas `/api/*` para o Express na porta 3001.

## Produção

<!-- Explicação/documentação desta parte do projeto: ```bash -->
```bash
<!-- Explicação/documentação desta parte do projeto: npm install -->
npm install
<!-- Explicação/documentação desta parte do projeto: npm run build -->
npm run build
<!-- Explicação/documentação desta parte do projeto: npm start -->
npm start
<!-- Explicação/documentação desta parte do projeto: ``` -->
```

<!-- Explicação/documentação desta parte do projeto: O Express atende a API e serve o frontend compilado a partir de `dist`. A hospedagem deve iniciar `n -->
O Express atende a API e serve o frontend compilado a partir de `dist`. A hospedagem deve iniciar `npm start` e encaminhar a porta definida em `PORT`.

## Arquivos JSON

<!-- Explicação/documentação desta parte do projeto: - Usuários: `dashboard/admin/banco/json/usuario.json` -->
- Usuários: `dashboard/admin/banco/json/usuario.json`
<!-- Explicação/documentação desta parte do projeto: - Avaliações: `dashboard/admin/banco/json/avaliacao.json` -->
- Avaliações: `dashboard/admin/banco/json/avaliacao.json`

<!-- Explicação/documentação desta parte do projeto: Os arquivos JSON são lidos e gravados pelo servidor, não pelo navegador. O ambiente de hospedagem pr -->
Os arquivos JSON são lidos e gravados pelo servidor, não pelo navegador. O ambiente de hospedagem precisa permitir escrita nesse diretório e preservar os arquivos entre reinicializações. A troca do roteador elimina o gerador de rotas, mas não concede permissões de escrita ao sistema de arquivos.

<!-- Explicação/documentação desta parte do projeto: Configure `SESSION_SECRET` como variável de ambiente com pelo menos 32 caracteres para manter sessõe -->
Configure `SESSION_SECRET` como variável de ambiente com pelo menos 32 caracteres para manter sessões consistentes entre reinicializações. Sem essa variável, o servidor cria um segredo temporário ao iniciar.
