const chatBox = document.getElementById("caixa-chat");
const campoTexto = document.getElementById("campoTexto");
const btnEnviar = document.getElementById("btnEnviar");
const btnLimpar = document.getElementById("btnLimpar");

function addMsg(txt, tipo, isMarkdown = false) {
    const div = document.createElement("div");
    div.className = `mensagem ${tipo === 'ia' ? 'msg-ia' : 'msg-user'}`;
    div.innerHTML = isMarkdown ? marked.parse(txt) : txt;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function enviar() {
    const msg = campoTexto.value;
    if (!msg) return;
    addMsg(msg, "user");
    campoTexto.value = "";
    
    try {
        const res = await fetch("https://t1-p1-a5-o-despertar-da-ia.onrender.com/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pergunta: msg })
        });
        const data = await res.json();
        addMsg(data.resposta || data.erro, "ia", true);
    } catch (e) { addMsg("Erro de conexão.", "ia"); }
}

// Monitor de Saúde
async function checarSaude() {
    const luz = document.getElementById("status-luz");
    try {
        const res = await fetch("https://t1-p1-a5-o-despertar-da-ia.onrender.com/api/health");
        luz.style.background = res.ok ? "#00ff9d" : "#ff4d4d";
    } catch (e) { luz.style.background = "#ff4d4d"; }
}

btnEnviar.addEventListener("click", enviar);
campoTexto.addEventListener("keypress", (e) => e.key === "Enter" && enviar());
btnLimpar.addEventListener("click", () => chatBox.innerHTML = "");

checarSaude();
setInterval(checarSaude, 30000);