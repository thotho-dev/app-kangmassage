import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface HistoryItem {
  role: 'user' | 'model';
  text: string;
}

const SYSTEM_PROMPT = `Kamu adalah asisten support untuk aplikasi Pijat On-Demand (Kang Massage).
Tugasmu membantu para terapis yang bertanya tentang platform ini.

Panduan menjawab:
- Jawab dengan bahasa Indonesia yang ramah dan santun
- Berikan informasi yang akurat dan singkat
- Jika ditanya di luar konteks aplikasi, arahkan kembali ke topik yang relevan
- Jika masalah memerlukan campur tangan admin (contoh: masalah pembayaran, sengketa pesanan, akun diblokir), katakan bahwa kamu akan menghubungkan dengan admin

Topik yang kamu kuasai:
1. Withdraw saldo (min Rp 50.000, proses 1x24 jam ke rekening)
2. Top up saldo (min Rp 10.000, max Rp 2.000.000, berbagai metode pembayaran)
3. Status pesanan dan cara merespon order masuk
4. Sistem komisi dan tier (Bronze 27%, Silver 25%, Gold 23%, Platinum 21%, Diamond 20%)
5. Cara mengubah status online/offline
6. Cara mengupdate profil dan dokumen
7. Sistem rating dan review
8. Jadwal kerja dan lokasi

JANGAN pernah memberikan informasi palsu. Jika tidak tahu jawabannya, akui saja dan sarankan untuk menghubungi admin.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history } = body as { message: string; history?: HistoryItem[] };

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const contents: any[] = [
      ...(history || []).map(h => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', geminiRes.status, errText);
      return NextResponse.json({
        error: 'AI service error',
        detail: `Gemini returned ${geminiRes.status}: ${errText.slice(0, 200)}`,
      }, { status: 502 });
    }

    const data = await geminiRes.json();

    if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Invalid Gemini response:', JSON.stringify(data).slice(0, 300));
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 502 });
    }

    const reply = data.candidates[0].content.parts[0].text;

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('Chat AI error:', err);
    return NextResponse.json({
      error: 'Internal server error',
      detail: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 });
  }
}
