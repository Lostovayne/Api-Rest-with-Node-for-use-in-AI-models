import { Request, Response } from 'express';
import { textToSpeech } from '../services/geminiService';

export const ttsController = async (req: Request, res: Response) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: "El texto es requerido" });
        }

        const { audioBase64, mimeType } = await textToSpeech(text);
        res.json({ audioBase64, mimeType });
    } catch (error) {
        req.log.error(error);
        res.status(500).json({ error: "Error al generar el audio" });
    }
};