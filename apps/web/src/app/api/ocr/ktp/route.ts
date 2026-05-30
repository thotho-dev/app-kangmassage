import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'buffer';
import { createAdminClient } from '@/lib/supabase/server';

export const maxDuration = 60;

const KTP_PROMPT = `Anda adalah sistem OCR untuk KTP Indonesia. Output HANYA objek JSON, tidak boleh ada teks lain, tidak boleh markdown, tidak boleh penjelasan.

Contoh output yang benar:
{"nik":"1234567890123456","full_name":"NAMA","address":"ALAMAT","rt_rw":"000/000","kelurahan":"KELURAHAN","district":"KECAMATAN","city":"KOTA","province":"PROVINSI","gender":"Laki-laki","birth_place":"TEMPAT LAHIR","birth_date":"DD-MM-YYYY","marital_status":"Belum Kawin"}

WAJIB:
- NIK: 16 digit angka saja
- full_name: huruf kapital sesuai KTP
- gender: "Laki-laki" atau "Perempuan"
- birth_date: format DD-MM-YYYY
- marital_status: "Kawin", "Belum Kawin", "Cerai Hidup", atau "Cerai Mati"
- Jika field tidak terbaca, isi ""
- JANGAN MARKDOWN, JANGAN backtick, JANGAN "\`\`\`json", JANGAN teks lain. HANYA JSON mentah.`;

// ── Gemini Vision (primary) ──────────────────────────────────────────────────
async function ocrWithGemini(base64: string, mimeType: string): Promise<Record<string, string>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: KTP_PROMPT },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 2048 },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  console.log(`[OCR] 📝 Teks mentah Gemini:`, text.slice(0, 500));
  return parseAiJson(text);
}

// ── Puter AI Vision (fallback) ─────────────────────────────────────────────
async function ocrWithPuter(base64: string, mimeType: string, token: string, model: string): Promise<Record<string, string>> {
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const res = await fetch('https://api.puter.com/drivers/call', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;actually=json' },
    body: JSON.stringify({
      interface: 'puter-chat-completion',
      driver: 'ai-chat',
      method: 'complete',
      args: {
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: KTP_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        }],
        max_tokens: 2048,
        temperature: 0,
      },
      auth_token: token,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Puter error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text: string = data?.result?.message?.content ?? '';
  console.log(`[OCR] 📝 Teks mentah Puter:`, text.slice(0, 500));
  return parseAiJson(text);
}

// ── JSON parser helper ────────────────────────────────────────────────────────
function parseAiJson(text: string): Record<string, string> {
  // Coba ambil JSON dari markdown code block dulu
  let jsonStr = text;
  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) jsonStr = codeMatch[1];

  // Coba ambil objek JSON {...}
  const objMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch {
      // fallthrough ke regex
    }
  }

  // Fallback: ekstrak key-value pairs dari teks non-JSON
  const result: Record<string, string> = {};
  const fields = ['nik', 'full_name', 'address', 'rt_rw', 'kelurahan', 'district', 'city', 'province', 'gender', 'birth_place', 'birth_date', 'marital_status'];
  for (const f of fields) {
    const re = new RegExp(`["\`']?${f}["\`']?\\s*[:=\\s->]+\\s*["\`']?([^"'\`\\n,}]+)`, 'i');
    const m = text.match(re);
    result[f] = m ? m[1].trim() : '';
  }
  // Validasi NIK: harus 16 digit
  const nikDigits = result.nik.replace(/\D/g, '');
  if (nikDigits.length !== 16) result.nik = '';
  return result;
}

// ── Sanitize & format fields ─────────────────────────────────────────────────
function sanitize(extracted: Record<string, string>) {
  let nik = (extracted.nik ?? '').replace(/\D/g, '');
  if (nik.length !== 16) nik = '';

  let rt_rw = (extracted.rt_rw ?? '').replace(/\s/g, '');
  if (rt_rw && !/\//.test(rt_rw) && rt_rw.length >= 3) {
    const mid = Math.floor(rt_rw.length / 2);
    rt_rw = rt_rw.slice(0, mid) + '/' + rt_rw.slice(mid);
  }

  let gender = (extracted.gender ?? '').toLowerCase();
  if (gender.includes('laki')) gender = 'male';
  else if (gender.includes('perempuan')) gender = 'female';
  else gender = '';

  return {
    nik,
    full_name: extracted.full_name ?? '',
    address: extracted.address ?? '',
    rt_rw,
    kelurahan: extracted.kelurahan ?? '',
    district: extracted.district ?? '',
    city: extracted.city ?? '',
    province: extracted.province ?? '',
    gender,
    birth_place: extracted.birth_place ?? '',
    birth_date: extracted.birth_date ?? '',
    marital_status: extracted.marital_status ?? '',
  };
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData() as any;
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    // Ambil settings dari database untuk Puter fallback (token + model dinamis)
    let puterToken = '';
    let puterModel = 'z-ai/glm-4.5-air:free';
    try {
      const adminClient = createAdminClient();
      const { data: settings } = await adminClient
        .from('app_settings')
        .select('puter_auth_token, puter_ocr_model_name')
        .limit(1)
        .single();
      puterToken = settings?.puter_auth_token || process.env.PUTER_AUTH_TOKEN || '';
      puterModel = settings?.puter_ocr_model_name || 'z-ai/glm-4.5-air:free';
    } catch {
      puterToken = process.env.PUTER_AUTH_TOKEN || '';
    }

    let extracted: Record<string, string> = {};

    // Coba Gemini dulu, fallback ke Puter jika gagal
    if (process.env.GEMINI_API_KEY) {
      try {
        extracted = await ocrWithGemini(base64, mimeType);
        console.log(`[OCR] ✅ Gemini sukses`);
      } catch (geminiErr) {
        console.warn(`[OCR] ❌ Gemini gagal, fallback ke Puter (${puterModel}):`, geminiErr);
        if (puterToken) {
          extracted = await ocrWithPuter(base64, mimeType, puterToken, puterModel);
          console.log(`[OCR] ✅ Puter (${puterModel}) sukses`);
        } else {
          throw new Error('Gemini gagal dan PUTER_AUTH_TOKEN tidak dikonfigurasi');
        }
      }
    } else {
      if (puterToken) {
        extracted = await ocrWithPuter(base64, mimeType, puterToken, puterModel);
        console.log(`[OCR] ✅ Puter (${puterModel}) sukses`);
      } else {
        return NextResponse.json({ error: 'GEMINI_API_KEY atau PUTER_AUTH_TOKEN diperlukan' }, { status: 500 });
      }
    }

    const result = sanitize(extracted);
    if (!result.nik) {
      console.warn('[OCR] ❌ NIK tidak terbaca, data mentah:', JSON.stringify(extracted));
      return NextResponse.json({ error: 'Tidak dapat membaca NIK dari foto. Pastikan foto KTP jelas dan tidak terhalang.' }, { status: 422 });
    }
    console.log(`[OCR] ✅ NIK ${result.nik} terekstrak`);
    return NextResponse.json(result);

  } catch (err: any) {
    console.error('[OCR] Error:', err);
    return NextResponse.json({ error: err.message || 'OCR failed' }, { status: 500 });
  }
}
