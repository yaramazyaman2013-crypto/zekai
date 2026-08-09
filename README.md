# ZekAI

Tek pencereli bir yapay zeka atölyesi: yaz ya da konuş, ZekAI ne istediğini
anlayıp sohbet eder, görsel/logo üretir, yüklediğin fotoğrafı düzenler ya da
senin için kod yazar.

## Kullanılan servisler

| İş | Servis | Ücret |
|---|---|---|
| Sohbet / yönlendirme / kod yazma | Google Gemini (metin) | Kalıcı ücretsiz kota — **anahtar zorunlu** |
| Görsel, logo, fotoğraf düzenleme | Pollinations.ai (Flux/Kontext) | Anonim, sınırsız ücretsiz — **anahtar gerekmez** |
| Sesli okuma | Tarayıcının kendi Web Speech API'si | Ücretsiz, sunucu gerektirmez |
| Mikrofon (konuşmayı yazıya çevirme) | Tarayıcının kendi Web Speech API'si | Ücretsiz |

**Tek gereken anahtar `GOOGLE_API_KEY`.** Pollinations'a KASITLI olarak
anahtar göndermiyoruz: görsel üretimi onların belgelerinde "anonim, sınırsız,
her zaman ücretsiz" olarak garanti ediliyor, ama bir hesap anahtarıyla istek
atarsan bu "Pollen" adında tükenen bir krediye bağlanıyor ve bakiye biterse
durur. Anonim kalmak burada daha güvenilir.

Video ve müzik üretimi şu an yok — ücretsiz/kartsız güvenilir bir servis
bulunmadı. ZekAI bunu istendiğinde kullanıcıya dürüstçe söyler.

## Mobilden yayına alma (GitHub + Vercel)

1. Bu klasörü GitHub'da bir repoya yükle (veya Claude ile push ettir).
2. aistudio.google.com/apikey → ücretsiz `GOOGLE_API_KEY` al.
3. vercel.com → "Add New Project" → repoyu seç.
4. Deploy etmeden **Environment Variables** kısmına `GOOGLE_API_KEY`'i gir.
5. "Deploy" de. Tamamlanınca `*.vercel.app` linki gelir — site bu.

Ortam değişkenini sonradan eklersen/değiştirirsen: Settings → Environment
Variables → güncelle → Deployments → son deploy → **Redeploy**. Değişken
eklemek otomatik uygulanmaz, redeploy şart.

## Notlar

- Görsel üretiminde anonim hız sınırı var (~15 saniyede bir istek) — normal
  kullanım için yeterli, ama art arda çok hızlı denersen kısa bir bekleme
  görebilirsin, bu normal.
- Ses tamamen cihazın kendi hoparlöründen okunuyor, hiçbir zaman "kota
  bitti" diye bozulmaz.
- Hiçbir servise kredi kartı gerekmiyor.
