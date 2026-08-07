# ZekAI

Tek pencereli bir yapay zeka atölyesi: yaz ya da konuş, ZekAI ne istediğini
anlayıp sohbet eder, görsel/logo üretir ya da yüklediğin fotoğrafı düzenler.

## Kullanılan servisler

| İş | Servis | Ücret |
|---|---|---|
| Anlama / yönlendirme / sohbet | Google Gemini | Ücretsiz kota (`GOOGLE_API_KEY` gerekli) |
| Görsel, logo, fotoğraf düzenleme | Pollinations.ai | Tamamen ücretsiz, key gerekmiyor |
| Sesli okuma (TTS) | Pollinations.ai | Tamamen ücretsiz, key gerekmiyor |
| Mikrofon (konuşmayı yazıya çevirme) | Tarayıcının kendi Web Speech API'si | Ücretsiz |

Video ve müzik üretimi şu an yok — ücretsiz/kartsız güvenilir bir servis
bulunmadı. ZekAI bunu istendiğinde kullanıcıya dürüstçe söyler.

## Mobilden yayına alma (GitHub + Vercel)

1. Bu klasörü GitHub'da bir repoya yükle (veya Claude ile push ettir).
2. vercel.com → "Add New Project" → repoyu seç → "Deploy".
3. Deploy etmeden **Environment Variables** kısmına `.env.example`'daki
   `GOOGLE_API_KEY`'i gerçek değeriyle gir.
4. Deploy tamamlanınca `*.vercel.app` linki gelir — site bu.

Ortam değişkenini sonradan değiştirirsen: Settings → Environment Variables →
güncelle → Deployments → son deploy → **Redeploy**. Değişken eklemek/değiştirmek
otomatik uygulanmaz, redeploy şart.

## Notlar

- Pollinations.ai anonim kullanımda hafif hız sınırlaması uygular (~15
  saniyede bir istek). 7-8 kişilik kullanım için yeterli olmalı; darboğaz
  yaşanırsa ücretsiz bir Pollinations hesabı açıp key eklemek limiti artırır.
- Hiçbir servise kredi kartı veya ödeme gerekmiyor.
