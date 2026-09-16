const chatBox = document.getElementById("caixa-chat");
const campoTexto = document.getElementById("campoTexto");
const btnEnviar = document.getElementById("btnEnviar");
const btnLimpar = document.getElementById("btnLimpar");

function addMsg(txt, tipo, isMarkdown = false) {
    const div = document.createElement("div");
    div.className = `mensagem ${tipo === 'ia' ? 'msg-ia' : 'msg-user'}`;
    if (isMarkdown) {
        div.innerHTML = marked.parse(txt);
    } else {
        div.innerText = txt;
    }
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function enviar() {
    const msg = campoTexto.value;
    if (!msg) return;

    addMsg(msg, "user");
    campoTexto.value = "";
    
    const loading = document.createElement("div");
    loading.className = "mensagem spinner";
    loading.innerText = "S.A.N. processando...";
    chatBox.appendChild(loading);
    
    try {
        const res = await fetch("https://t1-p1-a5-o-despertar-da-ia.onrender.com/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pergunta: msg })
        });
        const data = await res.json();
        loading.remove();
        addMsg(data.resposta || data.erro, "ia", true);
    } catch (e) {
        loading.innerText = "Erro na conexão neural.";
    }
}

btnEnviar.addEventListener("click", enviar);
campoTexto.addEventListener("keypress", (e) => e.key === "Enter" && enviar());
btnLimpar.addEventListener("click", () => chatBox.innerHTML = "");