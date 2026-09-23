# S.A.N. - Chat com documentos

Aplicação de chat com Google Gemini e modo RAG para responder perguntas usando um documento PDF ou TXT.

## Executar localmente

1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env` e preencha `GEMINI_API_KEY`, `JWT_SECRET`, `SAN_USER`, `SAN_PASSWORD` e `MONGO_URI`.
3. Inicie com `npm start` e abra `http://localhost:3000`.
4. Entre com `SAN_USER` e `SAN_PASSWORD`, selecione um PDF ou TXT, habilite **Conversar com documento** e faça sua pergunta.

O servidor se conecta ao MongoDB ao iniciar e o endpoint `/api/health` informa se o banco está conectado. Configure as mesmas variáveis de ambiente no serviço de hospedagem. Não publique `.env` nem as credenciais.

## Rota de documentos

`POST /api/chat/documento` exige `Authorization: Bearer <token>` obtido em `POST /api/auth/login` com usuário e senha configurados no servidor. Envie `multipart/form-data` com os campos `documento` (PDF ou TXT) e `pergunta`.

O upload usa `multer.memoryStorage()`, aceita até 10 MB e não grava o arquivo no disco. O texto é extraído em memória e enviado ao Gemini com instruções para responder apenas a partir do documento. O conteúdo é descartado ao fim da requisição; armazenamento de sessões no MongoDB é um desafio opcional da atividade e ainda não está implementado.
