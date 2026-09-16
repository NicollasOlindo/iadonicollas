require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenAI } = require("@google/genai");

const app = express();
app.use(express.json());
app.use(cors());

// Servir arquivos estáticos (CSS, JS, HTML)
app.use(express.static(path.join(__dirname, '/')));

// Rota para a página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ROTA DE HEALTH CHECK
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/chat', async (req, res) => {
    try {
        const { pergunta } = req.body;
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(pergunta);
        res.json({ resposta: result.response.text() });
    } catch (e) {
        res.status(500).json({ erro: "Erro na IA" });
    }
});

app.listen(process.env.PORT || 3000, () => console.log("Servidor rodando!"));