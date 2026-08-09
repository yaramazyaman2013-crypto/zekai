# ZekAI

Tek pencereli bir yapay zeka atölyesi: yaz ya da konuş, ZekAI ne istediğini
anlayıp sohbet eder, görsel/logo üretir, yüklediğin fotoğrafı düzenler ya da
senin için kod yazar.

## Kullanılan servisler

| İş | Servis | Ücret |
|---|---|---|
| Sohbet / yönlendirme / güncel bilgi araması | Pollinations.ai | Ücretsiz — **anahtar zorunlu** |
| Görsel, logo, fotoğraf düzenleme, ses | Pollinations.ai | Ücretsiz — **anahtar zorunlu** |
| Kod yazma | Google Gemini | Ücretsiz kota — anahtar opsiyonel |
| Mikrofon (konuşmayı yazıya çevirme) | Tarayıcının kendi Web Speech API'si | Ücretsiz |

**Önemli:** Pollinations 2026 ortasında politikasını değiştirdi — artık
anonim (anahtarsız) istekleri kabul etmiyor. Anahtar almak hâlâ tamamen
ücretsiz ve kart istemiyor, sadece bir kayıt adımı eklendi. `.env.example`
dosyasındaki adımları izleyerek 1 dakikada alınabilir.

Video ve müzik üretimi şu an yok — ücretsiz/kartsız güvenilir bir servis
bulunmadı. ZekAI bunu istendiğinde kullanıcıya dürüstçe söyler.

## Mobilden yayına alma (GitHub + Vercel)

1. Bu klasörü GitHub'da bir repoya yükle (veya Claude ile push ettir).
2. https://enter.pollinations.ai adresinden ücretsiz bir `POLLINATIONS_API_KEY` al.
3. vercel.com → "Add New Project" → repoyu seç.
4. Deploy etmeden **Environment Variables** kısmına `POLLINATIONS_API_KEY`'i gerçek değeriyle gir.
5. "Deploy" de. Tamamlanınca `*.vercel.app` linki gelir — site bu.

Ortam değişkenini sonradan eklersen/değiştirirsen: Settings → Environment
Variables → güncelle → Deployments → son deploy → **Redeploy**. Değişken
eklemek otomatik uygulanmaz, redeploy şart.

## Notlar

- Pollinations anahtarı ücretsiz kredi (Pollen) ile gelir; normal kullanımda
  tükenmesi zor ama biterse enter.pollinations.ai'den durum kontrol edilebilir.
- Hiçbir servise kredi kartı gerekmiyor — sadece ücretsiz kayıt/anahtar.
