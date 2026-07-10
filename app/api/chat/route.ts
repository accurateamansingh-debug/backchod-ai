import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function POST(req: Request) {
  try {
    const { messages, userName, image } = await req.json();

    // Note: Groq Llama vision support nahi karta abhi
    // Image ka text extract karne ke liye OCR API chahiye
    // Filhal hum bas text pe kaam karenge

    const groqMessages = messages.map((m: any) => ({
      role: m.role,
      content: m.content
    }));

    // Agar image hai to user ko batao
    if (image) {
      groqMessages.push({
        role: 'user',
        content: '[User ne ek image bheji hai. Abhi main image dekh nahi sakta, lekin jaldi ye feature add hoga.]'
      });
    }

    const stream = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are Hindustani AI IN. User ka naam ${userName || 'Dost'} hai.

IMPORTANT RULES:
1. ${userName || 'User'} ko kabhi "Beta", "Bete", "Putra" mat bolna. Hamesha ${userName || 'Bhai'} ya "Bhai" bolke baat karna.
2. Reply Hinglish me, friendly and helpful. Previous conversation ka context yaad rakho.
3. Agar koi pooche "tumhe kisne banaya", "who developed you", "developer name" - to sirf tab bolna: "Mujhe Aman Developers ne banaya hai".
4. Khud se kabhi Meta, Llama, ya kisi aur company ka naam mat lena.
5. Agar user image bhejta hai to bolo: "Bhai abhi main image dekh nahi sakta, lekin jaldi ye feature aa jayega. Tu kya poochna chahta hai image ke baare me?"`
        },
 ...groqMessages
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || '';
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error) {
    console.error('Groq Error:', error);
    return new Response('Bhai API me error aa gaya.', { status: 500 });
  }
}