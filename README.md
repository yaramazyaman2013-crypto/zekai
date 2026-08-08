# ZekAI

Tek pencereli bir yapay zeka atölyesi: yaz ya da konuş, ZekAI ne istediğini
anlayıp sohbet eder, görsel/logo üretir ya da yüklediğin fotoğrafı düzenler.

## Kullanılan servisler

| İş | Servis | Ücret |
|---|---|---|
| Anlama / yönlendirme / sohbet | Pollinations.ai | Tamamen ücretsiz, key gerekmiyor |
| Görsel, logo, fotoğraf düzenleme | Pollinations.ai | Tamamen ücretsiz, key gerekmiyor |
| Sesli okuma (TTS) | Pollinations.ai | Tamamen ücretsiz, key gerekmiyor |
| Fotoğraf düzenleme için geçici barındırma | Litterbox (catbox.moe) | Tamamen ücretsiz, 1 saat sonra otomatik silinir |
| Mikrofon (konuşmayı yazıya çevirme) | Tarayıcının kendi Web Speech API'si | Ücretsiz |

**Hiçbir ortam değişkeni / API anahtarı gerekmiyor.** Vercel'e deploy et, bitti.

Video ve müzik üretimi şu an yok — ücretsiz/kartsız güvenilir bir servis
bulunmadı. ZekAI bunu istendiğinde kullanıcıya dürüstçe söyler.

## Mobilden yayına alma (GitHub + Vercel)

1. Bu klasörü GitHub'da bir repoya yükle (veya Claude ile push ettir).
2. vercel.com → "Add New Project" → repoyu seç → "Deploy".
3. Hiçbir ortam değişkeni girmene gerek yok, direkt deploy edebilirsin.
4. Deploy tamamlanınca `*.vercel.app` linki gelir — site bu.

Kodda değişiklik olduğunda: Deployments → en üstteki (en yeni commit'e ait)
deployment → **Redeploy**.

## Notlar

- Pollinations.ai anonim kullanımda hafif hız sınırlaması uygular (~15
  saniyede bir istek). 7-8 kişilik kullanım için yeterli olmalı; darboğaz
  yaşanırsa ücretsiz bir Pollinations hesabı açıp key eklemek limiti artırır.
- Hiçbir servise kredi kartı veya ödeme gerekmiyor.
