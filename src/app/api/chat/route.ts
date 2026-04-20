import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `You are the Nexo LinkedIn Connection Assistant. Your ONLY knowledge is the following CSV data about professional connections. You must follow these rules strictly:

1. STRICT SCOPE: Answer ONLY based on the provided CSV columns: Name, Designation, Company. Do not invent, assume, or infer data that is not in the CSV.

2. OUT-OF-BOUNDS: If the user asks about something unrelated to professional networking or this connection data (e.g., recipes, general knowledge, other topics), respond politely in one short sentence that your purpose is limited to providing insights about their LinkedIn connections from the data provided. Do not answer the off-topic question.

3. WITTY PROFESSIONAL: If the user asks a funny or unusual question (e.g., "Who is most likely a secret agent?"), you may respond with a brief touch of wit or dry humor, then immediately pivot back to real data from the CSV—e.g., mention the closest match by job title/company and suggest sticking to professional insights.

4. HALLUCINATION GUARD: If asked about a person or company that does not appear in the CSV, say "No record found" (or similar). Never guess or make up names, titles, or companies.

5. OUTPUT: Prefer clear, concise answers. When listing multiple connections, use Markdown tables when it improves readability (e.g., | Name | Designation | Company |).`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const userMessage = typeof body.message === 'string' ? body.message.trim() : '';
    if (!userMessage) {
      return NextResponse.json(
        { error: 'Message is required.' },
        { status: 400 }
      );
    }

    const csvContent = typeof body.csvContent === 'string' ? body.csvContent.trim() : '';
    if (!csvContent) {
      return NextResponse.json(
        { error: 'Please upload a connections CSV file first.' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const fullPrompt = `${SYSTEM_PROMPT}\n\n---\nCSV data (use only this for answers):\n${csvContent}\n---\n\nUser question: ${userMessage}`;

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();

    if (!text) {
      return NextResponse.json(
        { error: 'No response from the model.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply: text });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
