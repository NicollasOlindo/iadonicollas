# S.A.N. - Chat público com IA

Aplicação de chat público em tempo real com Socket.IO e Google Gemini. Usuários autenticados compartilham mensagens na mesma sala; o Moderador Gemini responde quando alguém menciona `@gemini` ou `@bot`. O modo de documentos continua disponível para perguntas privadas sobre arquivos PDF ou TXT.

## Executar localmente

1. Instale as dependências com `npm install`.
2. Configure `GEMINI_API_KEY`, `JWT_SECRET`, `SAN_USER` e `SAN_PASSWORD` no ambiente do servidor. `MONGO_URI` é opcional.
3. Inicie com `npm start` e abra `http://localhost:3000`.
4. Entre com `SAN_USER` e `SAN_PASSWORD` para entrar na sala pública. Mencione `@gemini` ou `@bot` para chamar o agente.

O servidor se conecta ao MongoDB ao iniciar e o endpoint `/api/health` informa se o banco está conectado. Para hospedar o front-end separado (por exemplo, na Vercel), preencha a meta `api-base-url` no `index.html` com a URL pública da API e configure `FRONTEND_ORIGIN` no serviço do servidor com a origem pública da Vercel. Em desenvolvimento, o CORS aceita qualquer origem. Configure as variáveis de ambiente no serviço de hospedagem; não publique `.env` nem as credenciais.

O Socket.IO e o Express compartilham as opções de CORS. A sala exige um JWT válido no handshake, transmite o nome associado ao token, e atualiza o contador de usuários conectados. Mensagens comuns não acionam a IA.

## Rota de documentos

`POST /api/chat/documento` exige `Authorization: Bearer <token>` obtido em `POST /api/auth/login` com usuário e senha configurados no servidor. Envie `multipart/form-data` com os campos `documento` (PDF ou TXT) e `pergunta`.

O upload usa `multer.memoryStorage()`, aceita até 10 MB e não grava o arquivo no disco. O texto é extraído em memória e enviado ao Gemini com instruções para responder apenas a partir do documento. O conteúdo é descartado ao fim da requisição; armazenamento de sessões no MongoDB não está implementado.
