/**
 * SISTEMA N.E.O.N. - ENGINE DE INTERFACE (JS) FINAL
 * Versão: 2.3 - Sincronização e Diagnóstico de Erros
 */

// 1. MAPEAMENTO DE SENSORES (ELEMENTOS DA INTERFACE)
const chatBox = document.getElementById("caixa-chat");
const campoTexto = document.getElementById("campoTexto");
const btnEnviar = document.getElementById("btnEnviar");
const seletorVersao = document.getElementById("seletor-versao");

// Estado global para evitar sobrecarga no link neural
let estaProcessando = false;

// ====================================================================
// CONFIGURAÇÃO DE CONEXÃO (Escolha qual servidor deseja consumir)
// ====================================================================
// Para testar localmente no seu computador (com o Node.js rodando no terminal)
const URL_LOCAL = "http://localhost:3000";

// Para usar a API que você publicou no Render
const URL_NUVEM = "https://t1-p1-a5-o-despertar-da-ia.onrender.com";

// --- SELECIONE A URL ATIVA ---
const URL_ATIVA = URL_NUVEM; // Altere para URL_LOCAL se estiver rodando localmente
// ====================================================================

/**
 * Função Mestra de Renderização
 * Adiciona mensagens à tela convertendo Markdown básico para HTML.
 */
function adicionarMensagem(remetente, texto) {
    const div = document.createElement("div");
    div.classList.add("mensagem", remetente === "usuario" ? "msg-usuario" : "msg-ia");
    
    // Tratamento de Texto: Converte quebras de linha (\n) e Negritos (**)
    const textoFormatado = texto
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

    div.innerHTML = textoFormatado;
    chatBox.appendChild(div);

    // Scroll Suave para a última entrada de dados
    chatBox.scrollTo({
        top: chatBox.scrollHeight,
        behavior: 'smooth'
    });
}

/**
 * Sinalizador Visual de Processamento
 * Cria os pontinhos pulsantes de sincronização.
 */
function mostrarLoading() {
    const loadingDiv = document.createElement("div");
    loadingDiv.classList.add("mensagem", "msg-ia");
    loadingDiv.id = "loading-neon";
    loadingDiv.innerHTML = `
        <span class="pulso">.</span>
        <span class="pulso" style="animation-delay: 0.2s">.</span>
        <span class="pulso" style="animation-delay: 0.4s">.</span>
    `;
    chatBox.appendChild(loadingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

/**
 * Remove o sinalizador de processamento da interface.
 */
function removerLoading() {
    const loading = document.getElementById("loading-neon");
    if (loading) loading.remove();
}

/**
 * Fluxo de Comunicação Neural
 * Captura dados, envia para o Back-end e gerencia a resposta.
 */
async function processarEnvioIA() {
    const mensagem = campoTexto.value.trim();
    const versaoModelo = seletorVersao ? seletorVersao.value : "gemini-2.5-flash";

    // Validação de entrada e estado do sistema
    if (mensagem === "" || estaProcessando) return;

    try {
        // Bloqueio de segurança da interface
        estaProcessando = true;
        btnEnviar.disabled = true;
        btnEnviar.style.opacity = "0.5";

        // Feedback Visual do Operador
        adicionarMensagem("usuario", mensagem);
        campoTexto.value = ""; 
        mostrarLoading();

        // Conecta ao endpoint correto (/api/chat)
        const respostaServidor = await fetch(`${URL_ATIVA}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                pergunta: mensagem, 
                modelo: versaoModelo 
            })
        });

        if (!respostaServidor.ok) {
            // Tenta ler o JSON de erro do backend para diagnosticar na interface
            const dadosErro = await respostaServidor.json().catch(() => ({}));
            throw new Error(dadosErro.erro || "Falha no link neural.");
        }

        const dados = await respostaServidor.json();

        // Exibição do resultado obtido da nuvem
        removerLoading();
        adicionarMensagem("ia", dados.resposta);

    } catch (erro) {
        removerLoading();
        console.error("Falha Crítica:", erro);
        
        let msgErro = erro.message || "⚠️ FALHA NO NÚCLEO: Link neural interrompido. Verifique o servidor Node.js no terminal.";
        if (erro.name === 'TimeoutError') msgErro = "⚠️ TIMEOUT: O sinal demorou muito a retornar da nuvem.";
        
        adicionarMensagem("ia", `<span style="color: #ff5555">${msgErro}</span>`);
    } finally {
        // Liberação dos controles do Operador
        estaProcessando = false;
        btnEnviar.disabled = false;
        btnEnviar.style.opacity = "1";
        campoTexto.focus(); 
    }
}

// GATILHOS DE COMANDO
btnEnviar.addEventListener("click", processarEnvioIA);

campoTexto.addEventListener("keypress", (e) => {
    if (e.key === "Enter") processarEnvioIA();
});

// ESTILIZAÇÃO DINÂMICA (Para o pulso do loading)
const styleNode = document.createElement('style');
styleNode.innerHTML = `
    .pulso {
        animation: pulsoAnim 1.4s infinite;
        font-size: 26px;
        font-weight: bold;
        display: inline-block;
        color: #00e5ff;
    }
    @keyframes pulsoAnim {
        0%, 100% { opacity: 0.2; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.3); }
    }
`;
document.head.appendChild(styleNode);

console.log("💠 Sistemas N.E.O.N. operando em carga total. Aguardando comandos, Operador.");

// ====================================================================
// [DESAFIO HACKER] - ROTINA DE ANOSMIA FORÇADA (LIMPEZA DO MONGODB)
// ====================================================================
const btnLimparMemoria = document.getElementById("btnLimpar");

btnLimparMemoria.addEventListener("click", async () => {
    const confirmacao = confirm("⚠️ ALERTA HACKER: Deseja apagar todo o Banco de Dados MongoDb? Isso matará as memórias de Longo Prazo do N.E.O.N. !");
    
    if (confirmacao) {
        try {
            adicionarMensagem("ia", `<span style="color: #ffcc00">⚠️ Solicitando limpeza do MongoDB na Cloud...</span>`);
            btnLimparMemoria.disabled = true;

            const rotaLimpeza = await fetch(`${URL_ATIVA}/api/chat/limpar`, {
                method: 'DELETE'
            });

            if (rotaLimpeza.ok) {
                chatBox.innerHTML += `<div class="mensagem msg-ia" style="background-color: #330000; border-color: red; color: white;">🔥 FIREWALL BYPASS: Coleção limpa no Atlas. FORMAT realizado!</div>`;
                chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
                console.log("Banco Dropado Com Sucesso.");
            } else {
                const erroResposta = await rotaLimpeza.json().catch(() => ({}));
                throw new Error(erroResposta.erro || "Erro HTTP na rota de limpeza.");
            }
        } catch (erroDelete) {
            adicionarMensagem("ia", `<span style="color: #ff5555">⚠️ FORMAT FALHOU: ${erroDelete.message}</span>`);
        } finally {
            btnLimparMemoria.disabled = false;
            campoTexto.focus();
        }
    }
});