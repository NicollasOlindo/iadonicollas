const chatBox = document.getElementById('caixa-chat');
const campoTexto = document.getElementById('campoTexto');
const btnEnviar = document.getElementById('btnEnviar');
const btnLimpar = document.getElementById('btnLimpar');
const btnLogin = document.getElementById('btnLogin');
const statusAuth = document.getElementById('authStatus');
const modoDocumento = document.getElementById('modoDocumento');
const documentOptions = document.getElementById('documentOptions');
const docUpload = document.getElementById('docUpload');
const arquivoSelecionado = document.getElementById('arquivoSelecionado');
const tokenKey = 'san-jwt';
const apiBase = document.querySelector('meta[name="api-base-url"]')?.content.trim()
    || (['5500', '5501', '5502'].includes(window.location.port) ? 'http://localhost:3000' : '');
let socket = null;

async function respostaJson(res) {
    const corpo = await res.text();
    try {
        return corpo ? JSON.parse(corpo) : {};
    } catch (_error) {
        throw new Error('A API não respondeu corretamente. Abra o projeto em http://localhost:3000 após executar npm start.');
    }
}

function addMsg(txt, tipo, isMarkdown = false, nome = null) {
    document.getElementById('emptyState')?.remove();
    const div = document.createElement('div');
    div.className = `mensagem ${tipo === 'user' ? 'msg-user' : 'msg-ia'}`;
    const meta = document.createElement('div');
    const body = document.createElement('div');
    meta.className = 'mensagem__meta';
    body.className = 'mensagem__body';
    meta.textContent = nome || (tipo === 'ia' ? 'S.A.N.' : tipo === 'moderador' ? '🤖 Moderador Gemini' : 'Você');
    if (isMarkdown && window.marked) body.innerHTML = window.marked.parse(txt || '');
    else body.textContent = txt || '';
    div.append(meta, body);
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
}

function addRespondendo() {
    document.getElementById('emptyState')?.remove();
    const div = document.createElement('div');
    div.className = 'mensagem msg-ia';
    div.setAttribute('role', 'status');
    div.innerHTML = '<div class="mensagem__meta">S.A.N.</div><div class="thinking-message"><span>Respondendo</span><span class="thinking-dots" aria-hidden="true"><span></span><span></span><span></span></span></div>';
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
}

function mostrarEstadoVazio() {
    chatBox.innerHTML = '<div class="empty-state" id="emptyState"><span class="empty-state__mark">S</span><div><strong>Como posso ajudar?</strong><p>Envie uma mensagem ou ative o documento para fazer perguntas sobre um arquivo.</p></div></div>';
}

function atualizarModoDocumento() {
    const ativo = modoDocumento.checked;
    documentOptions.hidden = !ativo;
    campoTexto.placeholder = ativo ? 'Pergunte sobre o documento...' : 'Envie uma mensagem...';
}

function atualizarAuth() {
    const autenticado = Boolean(sessionStorage.getItem(tokenKey));
    statusAuth.textContent = autenticado ? 'Conectando à sala…' : 'Entre para acessar a sala';
    btnLogin.textContent = autenticado ? 'SAIR' : 'ENTRAR';
}

function atualizarConexaoSala(conectado, usuario = '') {
    if (conectado) statusAuth.textContent = `Na sala como ${usuario}`;
    else if (sessionStorage.getItem(tokenKey)) statusAuth.textContent = 'Reconectando à sala…';
    else statusAuth.textContent = 'Entre para acessar a sala';
}

function conectarSala() {
    const token = sessionStorage.getItem(tokenKey);
    if (!token || !window.io) return;
    socket?.disconnect();
    socket = window.io(apiBase || window.location.origin, { auth: { token } });
    socket.on('connect', () => atualizarConexaoSala(true));
    socket.on('sessaoAtiva', ({ usuario }) => atualizarConexaoSala(true, usuario));
    socket.on('usuariosOnline', (quantidade) => {
        document.getElementById('usuariosOnline').textContent = `${quantidade} ${quantidade === 1 ? 'usuário' : 'usuários'} online`;
    });
    socket.on('mensagemRecebida', (mensagem) => {
        const tipo = mensagem.tipo === 'moderador' ? 'moderador' : 'user';
        addMsg(mensagem.texto, tipo, false, mensagem.usuario);
    });
    socket.on('erroChat', ({ erro }) => addMsg(erro, 'ia'));
    socket.on('connect_error', (error) => {
        atualizarConexaoSala(false);
        if (/Token JWT inválido|expirado/i.test(error.message)) {
            socket.disconnect();
            sessionStorage.removeItem(tokenKey);
            atualizarAuth();
        }
    });
    socket.on('disconnect', () => atualizarConexaoSala(false));
}

async function autenticar() {
    if (sessionStorage.getItem(tokenKey)) {
        socket?.disconnect();
        socket = null;
        sessionStorage.removeItem(tokenKey);
        atualizarAuth();
        return;
    }
    try {
        const res = await fetch(`${apiBase}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario: document.getElementById('usuario').value,
                senha: document.getElementById('senha').value
            })
        });
        const data = await respostaJson(res);
        if (!res.ok) throw new Error(data.erro || 'Não foi possível entrar.');
        sessionStorage.setItem(tokenKey, data.token);
        document.getElementById('senha').value = '';
        atualizarAuth();
        conectarSala();
    } catch (error) {
        addMsg(error.message, 'ia');
    }
}

async function enviar() {
    const pergunta = campoTexto.value.trim();
    if (!pergunta) return;
    const documento = docUpload.files[0];
    if (modoDocumento.checked && !documento) {
        addMsg('Selecione um arquivo PDF ou TXT antes de perguntar.', 'ia');
        return;
    }
    if (modoDocumento.checked && !sessionStorage.getItem(tokenKey)) {
        addMsg('Entre com sua conta antes de conversar com documentos.', 'ia');
        return;
    }

    if (!modoDocumento.checked) {
        if (!sessionStorage.getItem(tokenKey)) {
            addMsg('Entre com sua conta para participar da sala pública.', 'ia');
            return;
        }
        if (!socket?.connected) {
            addMsg('A sala está reconectando. Tente enviar novamente em instantes.', 'ia');
            return;
        }
        campoTexto.value = '';
        btnEnviar.disabled = true;
        socket.timeout(5000).emit('novaMensagem', { texto: pergunta }, (erro, resultado) => {
            btnEnviar.disabled = false;
            if (erro) {
                addMsg('O servidor demorou para confirmar. Verifique a conexão e tente novamente.', 'ia');
                return;
            }
            if (!resultado?.ok) addMsg(resultado?.erro || 'Não foi possível enviar a mensagem.', 'ia');
        });
        return;
    }

    addMsg(pergunta, 'user');
    campoTexto.value = '';
    btnEnviar.disabled = true;
    chatBox.setAttribute('aria-busy', 'true');
    const respondendo = addRespondendo();
    try {
        let res;
        if (modoDocumento.checked) {
            const form = new FormData();
            form.append('documento', documento);
            form.append('pergunta', pergunta);
            res = await fetch(`${apiBase}/api/chat/documento`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${sessionStorage.getItem(tokenKey)}` },
                body: form
            });
        } else {
            res = await fetch(`${apiBase}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pergunta })
            });
        }
        const data = await respostaJson(res);
        if (!res.ok) {
            if (res.status === 401) {
                sessionStorage.removeItem(tokenKey);
                atualizarAuth();
            }
            throw new Error(data.erro || 'Não foi possível obter uma resposta.');
        }
        addMsg(data.resposta, 'ia', true);
    } catch (error) {
        addMsg(error.message || 'Erro de conexão.', 'ia');
    } finally {
        respondendo.remove();
        chatBox.removeAttribute('aria-busy');
        btnEnviar.disabled = false;
    }
}

async function checarSaude() {
    const luz = document.getElementById('status-luz');
    try {
        const res = await fetch(`${apiBase}/api/health`);
        luz.style.background = res.ok ? '#00ff9d' : '#ff4d4d';
    } catch (_error) {
        luz.style.background = '#ff4d4d';
    }
}

btnEnviar.addEventListener('click', enviar);
campoTexto.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') enviar();
});
btnLogin.addEventListener('click', autenticar);
btnLimpar.addEventListener('click', mostrarEstadoVazio);
modoDocumento.addEventListener('change', atualizarModoDocumento);
docUpload.addEventListener('change', () => {
    arquivoSelecionado.textContent = docUpload.files[0]?.name || 'Nenhum arquivo selecionado';
});

atualizarAuth();
atualizarModoDocumento();
if (sessionStorage.getItem(tokenKey)) conectarSala();
checarSaude();
setInterval(checarSaude, 30000);
