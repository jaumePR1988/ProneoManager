import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY, { apiVersion: "v1" });

/**
 * Convierte un archivo File a Base64 para enviarlo a Gemini
 */
const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: {
            data: await base64EncodedDataPromise as string,
            mimeType: file.type
        },
    };
};

export const analyzeContractPDF = async (file: File, isNew: boolean = false) => {
    if (!API_KEY) {
        throw new Error("Falta la API Key de Gemini. Por favor, añádela al archivo .env como VITE_GEMINI_API_KEY");
    }

    try {
        console.log("--- INTENTO DE ANÁLISIS BUILD_V8 (FLASH-8B + V1) ---");
        console.log("Clave detectada:", API_KEY.substring(0, 5) + "...");
        // Usamos el modelo 8B que es el más básico de la familia 1.5
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });

        const prompt = isNew
            ? "Analiza este contrato de un jugador de fútbol y extrae los siguientes datos en formato JSON: { firstName, lastName1, lastName2, position, birthDate, club, endDate, clause }. Si no encuentras algún dato, deja el campo vacío. IMPORTANTE: Devuelve SOLO el objeto JSON."
            : "Analiza este contrato de un jugador de fútbol y extrae los datos de actualización en formato JSON: { endDate, clause, bonuses, commission }. Si no encuentras algún dato, deja el campo vacío. IMPORTANTE: Devuelve SOLO el objeto JSON.";

        const filePart = await fileToGenerativePart(file);

        const result = await model.generateContent([prompt, filePart]);
        const response = await result.response;
        const text = response.text();

        // Limpiar el texto para parsear el JSON (Gemini a veces devuelve markdown ```json ...)
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Error analizando con Gemini:", error);
        throw error;
    }
};
