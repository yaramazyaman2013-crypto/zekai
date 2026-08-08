# ZekAI

Tek pencereli bir yapay zeka atölyesi: yaz ya da konuş, ZekAI ne istediğini
anlayıp sohbet eder, görsel/logo üretir, yüklediğin fotoğrafı düzenler ya da
senin için kod yazar.

## Kullanılan servisler

| İş | Servis | Ücret |
|---|---|---|
| Anlama / yönlendirme / sohbet | Pollinations.ai | Tamamen ücretsiz, key gerekmiyor |
| Görsel, logo, fotoğraf düzenleme | Pollinations.ai | Tamamen ücretsiz, key gerekmiyor |
| Sesli okuma (TTS) | Pollinations.ai | Tamamen ücretsiz, key gerekmiyor |
| Fotoğraf düzenleme için geçici barındırma | Litterbox (catbox.moe) | Tamamen ücretsiz, 1 saat sonra otomatik silinir |
| **Kod yazma** | **Google Gemini** | Ücretsiz kota (`GOOGLE_API_KEY` gerekli) |
| Mikrofon (konuşmayı yazıya çevirme) | Tarayıcının kendi Web Speech API'si | Ücretsiz |

Sadece kod yazma özelliği `GOOGLE_API_KEY` istiyor — girmezsen uygulamanın
geri kalanı (sohbet, görsel, logo, fotoğraf düzenleme, ses) yine sorunsuz
çalışır, sadece kod isteklerinde nazikçe uyarı verir.

Video ve müzik üretimi şu an yok — ücretsiz/kartsız güvenilir bir servis
bulunmadı. ZekAI bunu istendiğinde kullanıcıya dürüstçe söyler.

## Mobilden yayına alma (GitHub + Vercel)

1. Bu klasörü GitHub'da bir repoya yükle (veya Claude ile push ettir).
2. vercel.com → "Add New Project" → repoyu seç → "Deploy".
3. (İsteğe bağlı) Kod yazma özelliği için **Environment Variables** kısmına
   `.env.example`'daki `GOOGLE_API_KEY`'i gerçek değeriyle gir.
4. Deploy tamamlanınca `*.vercel.app` linki gelir — site bu.

Ortam değişkenini sonradan eklersen/değiştirirsen: Settings → Environment
Variables → güncelle → Deployments → son deploy → **Redeploy**. Değişken
eklemek otomatik uygulanmaz, redeploy şart.

## Notlar

- Pollinations.ai anonim kullanımda hafif hız sınırlaması uygular (~15
  saniyede bir istek). 7-8 kişilik kullanım için yeterli olmalı.
- Görsel/logo/fotoğraf düzenleme/ses/sohbet servislerine kredi kartı
  gerekmiyor. Kod yazma için Google'ın ücretsiz kotası kullanılıyor.
