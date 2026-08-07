# ZekAI

Beş aletli bir yapay zeka atölyesi: sohbet, görsel üretimi, logo tasarımı,
fotoğraf düzenleme, sesli sohbet.

## Kullanılan servisler

| Alet | Servis | Ortam değişkeni |
|---|---|---|
| Konuş | Google Gemini | `GOOGLE_API_KEY` |
| Çiz / Marka | Replicate (Flux) | `REPLICATE_API_TOKEN` |
| Rötuş | Replicate (Flux Kontext) | `REPLICATE_API_TOKEN` |
| Dinle | ElevenLabs (ses) + tarayıcı (mikrofon) | `ELEVENLABS_API_KEY` |

## Mobilden yayına alma (GitHub + Vercel)

1. Bu klasörü GitHub'da yeni bir repo olarak yükle.
2. vercel.com → "Add New Project" → bu repoyu seç → "Deploy".
3. Deploy bitmeden **Environment Variables** kısmına `.env.example`
   dosyasındaki üç anahtarı gerçek değerleriyle gir.
4. Deploy tamamlanınca Vercel sana bir `*.vercel.app` linki verir — site bu.

Ortam değişkenlerini sonradan değiştirirsen: Project → Settings →
Environment Variables → değeri güncelle → Deployments sekmesinden
son deploy'u "Redeploy" et.

## Notlar

- Video ve müzik üretimi bu sürümde yok (ücretsiz/güvenilir bir API key
  henüz eklenmedi).
- 7-8 kişilik eşzamanlı kullanım için servislerin ücretsiz kotaları
  yeterli olabilir, ama kota bitince ilgili alet hata mesajı gösterir —
  o servisin panelinden kota/plan yükseltmen gerekir.
