require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require("@google/genai");
const mongoose = require('mongoose');
 
const app = express();
app.use(express.json());
app.use(cors());
 
// Memória de contingência caso o MongoDB esteja offline ou indisponível
let memoriaContingencia = [];
 
// Conexão com o Banco de Dados
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('📦 BANCO DE DADOS ATIVO!'))
  .catch((err) => console.error('❌ ERRO MONGO (Entrando em Modo de Contingência Local):', err.message));
 
// Modelo da Memória
const MensagemSchema = new mongoose.Schema({
    role: String,
    parts: [{ text: String }],
    dataHora: { type: Date, default: Date.now }
});
const MensagemDbModel = mongoose.model('MemoriaSessao', MensagemSchema);
 
// ====================================================================
// NOVO SDK: @google/genai (o antigo @google/generative-ai foi descontinuado
// pelo Google e os modelos "gemini-1.5-flash" / "gemini-2.0-flash" já foram
// desligados — por isso o erro 404 que você via na interface).
// ====================================================================
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
 
// Modelo padrão caso o front-end não envie nenhum
const MODELO_PADRAO = "gemini-2.5-flash";
 
// ====================================================================
// FERRAMENTAS LOCAIS (AÇÕES)
// ====================================================================
 
async function buscarClimaTempoReal(cidade) {
    try {
        const apiKey = process.env.WEATHER_API_KEY;
        if (!apiKey) {
            return { erro: "Chave de API do clima (WEATHER_API_KEY) não configurada no servidor." };
        }
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cidade)}&units=metric&lang=pt_br&appid=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) {
            return { erro: `Cidade '${cidade}' não localizada.` };
        }
        const data = await response.json();
        return {
            cidade: data.name,
            temperatura: `${Math.round(data.main.temp)}°C`,
            sensacaoTermica: `${Math.round(data.main.feels_like)}°C`,
            clima: data.weather[0].description,
            umidade: `${data.main.humidity}%`
        };
    } catch (error) {
        return { erro: `Falha na requisição de clima: ${error.message}` };
    }
}
 
async function converterMoedas(valor, de, para) {
    try {
        const from = de.toUpperCase();
        const to = para.toUpperCase();
        if (from === to) return { valorOriginal: valor, moedaOrigem: from, moedaDestino: to, valorConvertido: valor };
 
        const url = `https://api.frankfurter.app/latest?amount=${valor}&from=${from}&to=${to}`;
        const response = await fetch(url);
        if (!response.ok) return { erro: `Falha ao converter moedas de ${from} para ${to}.` };
 
        const data = await response.json();
        const resultado = data.rates[to];
        return {
            valorOriginal: valor,
            moedaOrigem: from,
            moedaDestino: to,
            valorConvertido: resultado.toFixed(2),
            dataCotacao: data.date
        };
    } catch (error) {
        return { erro: `Erro na conversão: ${error.message}` };
    }
}
 
// ====================================================================
// DECLARAÇÃO DAS FERRAMENTAS (SCHEMAS)
// No novo SDK o schema é JSON Schema puro (parametersJsonSchema),
// então usamos "object"/"string"/"number" em minúsculas.
// ====================================================================
 
const declaracaoClima = {
    name: "buscarClimaTempoReal",
    description: "Obtém a temperatura exata e o clima atual de uma cidade. Use sempre que o usuário perguntar sobre o tempo ou temperatura.",
    parametersJsonSchema: {
        type: "object",
        properties: {
            cidade: {
                type: "string",
                description: "O nome da cidade. Ex: Assis Chateaubriand, Curitiba, Tokyo."
            }
        },
        required: ["cidade"]
    }
};
 
const declaracaoMoeda = {
    name: "converterMoedas",
    description: "Converte valores financeiros entre moedas internacionais. Use sempre que o usuário solicitar conversão ou cotação de moedas.",
    parametersJsonSchema: {
        type: "object",
        properties: {
            valor: { type: "number", description: "O valor numérico. Ex: 150." },
            de: { type: "string", description: "Moeda de origem com 3 letras. Ex: USD, EUR, BRL." },
            para: { type: "string", description: "Moeda de destino com 3 letras. Ex: BRL, USD, EUR." }
        },
        required: ["valor", "de", "para"]
    }
};
 
// ====================================================================
// ROTAS HTTP
// ====================================================================
 
app.post('/api/chat', async (req, res) => {
    try {
        const { pergunta, modelo } = req.body;
        if (!pergunta) return res.status(400).json({ erro: "Envie uma pergunta." });
 
        const modeloAtivo = modelo || MODELO_PADRAO;
 
        // 1. SISTEMA DE CONTINGÊNCIA: Busca o histórico do MongoDB ou recorre à RAM local
        let docs = [];
        let usandoBanco = false;
 
        if (mongoose.connection.readyState === 1) {
            try {
                docs = await MensagemDbModel.find().sort({ dataHora: 1 }).limit(10).lean();
                usandoBanco = true;
            } catch (dbErr) {
                console.warn("⚠️ Banco conectado mas falhou na busca. Usando memória temporária.");
                docs = memoriaContingencia.slice(-10);
            }
        } else {
            console.warn("⚠️ MongoDB offline. Usando memória local temporária.");
            docs = memoriaContingencia.slice(-10);
        }
 
        // 2. Limpeza segura das mensagens antigas
        const historicoSeguro = docs.map(d => ({
            role: d.role === "model" ? "model" : "user",
            parts: [{ text: d.parts?.[0]?.text || "" }]
        }));
 
        // 3. Inicializa a sessão de chat com as ferramentas
        const chatSession = ai.chats.create({
            model: modeloAtivo,
            history: historicoSeguro,
            config: {
                systemInstruction: "Você é o N.E.O.N. Um assistente cibernético avançado. Responda de forma curta. Use sempre as ferramentas para obter dados reais antes de responder.",
                tools: [{ functionDeclarations: [declaracaoClima, declaracaoMoeda] }]
            }
        });
 
        // 4. Processamento da Mensagem (com suporte a Function Calling)
        let result = await chatSession.sendMessage({ message: pergunta });
        let functionCalls = result.functionCalls;
 
        while (functionCalls && functionCalls.length > 0) {
            const { name, args } = functionCalls[0];
            console.log(`🤖 Ferramenta solicitada: ${name} com args:`, args);
 
            let functionResult = {};
            if (name === "buscarClimaTempoReal") {
                functionResult = await buscarClimaTempoReal(args.cidade);
            } else if (name === "converterMoedas") {
                functionResult = await converterMoedas(args.valor, args.de, args.para);
            }
 
            result = await chatSession.sendMessage({
                message: [
                    {
                        functionResponse: {
                            name: name,
                            response: { result: functionResult }
                        }
                    }
                ]
            });
 
            functionCalls = result.functionCalls;
        }
 
        const respostaTexto = result.text;
 
        // 5. Salva a nova interação no MongoDB ou, alternativamente, na RAM de contingência
        if (usandoBanco && mongoose.connection.readyState === 1) {
            try {
                await MensagemDbModel.create({ role: "user", parts: [{ text: pergunta }] });
                await MensagemDbModel.create({ role: "model", parts: [{ text: respostaTexto }] });
            } catch (saveErr) {
                console.error("❌ Erro ao salvar no MongoDB:", saveErr.message);
            }
        } else {
            memoriaContingencia.push({ role: "user", parts: [{ text: pergunta }] });
            memoriaContingencia.push({ role: "model", parts: [{ text: respostaTexto }] });
        }
 
        return res.status(200).json({ sucesso: true, resposta: respostaTexto });
 
   } catch (erro) {
        console.error("❌ ERRO INTERNO DO PROCESSO:", erro.message);
        return res.status(500).json({
            sucesso: false,
            erro: `Falha no Servidor: ${erro.message}` // Devolve o erro real gerado pelo backend
        });
    }
 
});
 
// Rota de Limpeza com contingência
app.delete('/api/chat/limpar', async (req, res) => {
    try {
        memoriaContingencia = []; // Limpa contingência local
        if (mongoose.connection.readyState === 1) {
            await MensagemDbModel.deleteMany({});
        }
        res.json({ sucesso: true });
    } catch (e) {
        res.status(500).json({ erro: "Erro ao limpar registros: " + e.message });
    }
});
 
const PORTA = process.env.PORT || 3000;
 
app.listen(PORTA, () => {
    console.log(`🚀 SERVIDOR OPERACIONAL`);
    console.log(`📡 LOCAL: http://localhost:${PORTA}`);
    console.log(`☁️ NUVEM: Pronto para conexão via PaaS (Render)`);
});