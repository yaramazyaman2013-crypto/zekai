# ZekAI

Tek pencereli bir yapay zeka atölyesi: yaz ya da konuş, ZekAI ne istediğini
anlayıp sohbet eder, görsel/logo üretir, yüklediğin fotoğrafı düzenler ya da
senin için kod yazar.

## Kullanılan servisler

| İş | Servis | Ücret |
|---|---|---|
| Sohbet / yönlendirme / kod yazma | Google Gemini (metin) | Kalıcı ücretsiz kota — anahtar zorunlu |
| Görsel, logo, fotoğraf düzenleme | Pollinations.ai (Flux/Kontext) | Her zaman sınırsız ücretsiz — anahtar zorunlu |
| Sesli okuma | Tarayıcının kendi Web Speech API'si | Ücretsiz, sunucu gerektirmez |
| Mikrofon (konuşmayı yazıya çevirme) | Tarayıcının kendi Web Speech API'si | Ücretsiz |

**Neden Pollinations'ın metin modelleri değil de Gemini?** Pollinations'ın
metin/sohbet modelleri "Pollen" adında tükenen bir kredi sistemine bağlı —
hesap bakiyesi biterse sohbet durur. Bu kalıcı bir çözüm değil. Gemini'nin
METİN kotası ise gerçekten her gün sıfırlanan, kart istemeyen, kalıcı bir
ücretsiz kotadır. Görsel tarafında ise Pollinations'ın Flux/Kontext modelleri
kendi belgelerinde "her zaman, sınırsız ücretsiz" olarak garanti ediliyor,
o yüzden orada kalmaya devam ediyor.

Video ve müzik üretimi şu an yok — ücretsiz/kartsız güvenilir bir servis
bulunmadı. ZekAI bunu istendiğinde kullanıcıya dürüstçe söyler.

## Mobilden yayına alma (GitHub + Vercel)

1. Bu klasörü GitHub'da bir repoya yükle (veya Claude ile push ettir).
2. aistudio.google.com/apikey → ücretsiz `GOOGLE_API_KEY` al.
3. enter.pollinations.ai → ücretsiz `POLLINATIONS_API_KEY` al.
4. vercel.com → "Add New Project" → repoyu seç.
5. Deploy etmeden **Environment Variables** kısmına ikisini de gir.
6. "Deploy" de. Tamamlanınca `*.vercel.app` linki gelir — site bu.

Ortam değişkenini sonradan eklersen/değiştirirsen: Settings → Environment
Variables → güncelle → Deployments → son deploy → **Redeploy**. Değişken
eklemek otomatik uygulanmaz, redeploy şart.

## Notlar

- Hiçbir servise kredi kartı gerekmiyor — sadece iki ücretsiz kayıt/anahtar.
- Ses tamamen cihazın kendi hoparlöründen okunuyor, bu yüzden internetsiz de
  çalışır ve hiçbir zaman "kota bitti" diye bozulmaz.
