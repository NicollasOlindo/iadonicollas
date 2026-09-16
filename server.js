require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require("@google/genai");

const app = express();
app.use(express.json());
app.use(cors());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/chat', async (req, res) => {
    try {
        const { pergunta } = req.body;
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(pergunta);
        res.json({ resposta: result.response.text() });
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: "Falha na conexão com a rede neural." });
    }
});

app.listen(process.env.PORT || 3000, () => console.log("S.A.N. online."));