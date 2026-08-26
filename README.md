# FitIntel

> **AI tabanlı beslenme & supplement zekâ platformu — startup tarzı MVP**

Tek kullanıcılı, yerel-öncelikli mobil uygulama. Kullanıcının BMR/TDEE'sini ve makro hedeflerini hesaplar, günlük öğün planı üretir, tartı / bel / su / uyum log'larını tutar ve kalite + fiyat/performans skorlu bir supplement vitrini sunar.

```
FitIntel/
├── backend/         Express + PostgreSQL REST API (port 5000)
└── frontend/        Expo React Native + TypeScript + NativeWind
```

---

## Bu doküman seni şuraya götürür

1. [Ne lazım](#1-ön-koşullar)
2. [PostgreSQL kurulum](#2-postgresql-kurulumu-windows)
3. [Backend ayağa kalkar](#4-backend-kurulumu)
4. [Windows IP'sini öğrenir](#5-windows-pcnin-lan-ipsini-öğren)
5. [Frontend ayağa kalkar](#6-frontend-kurulumu)
6. [iPhone'da uygulamayı görür](#9-iphoneda-uygulamayı-aç)

> **Not**: Tüm komutlar Windows PowerShell içindir. macOS / Linux için aynı mantık geçerli, sadece kabuk komutları (`copy` → `cp`, `notepad` → `nano`) değişir.

---

## 1. Ön koşullar

| Yazılım          | Versiyon            | Link                                                                        |
|------------------|---------------------|-----------------------------------------------------------------------------|
| Node.js          | LTS (20.x veya üstü)| https://nodejs.org/en/download                                              |
| PostgreSQL       | 16.x                | https://www.postgresql.org/download/windows/                                |
| Git              | son sürüm           | https://git-scm.com/download/win  *(opsiyonel)*                              |
| VS Code          | son sürüm           | https://code.visualstudio.com/  *(opsiyonel)*                                |
| **Expo Go iOS**  | App Store son sürüm | https://apps.apple.com/app/expo-go/id982107779                              |

### Kurulum sırası
1. Node.js installer'ı indir → kurarken **"Add to PATH"** işaretli kalsın.
2. PostgreSQL installer'ı indir → süperkullanıcı (`postgres`) için **`admin`** şifresini ver. *(Bu doküman `admin` varsayar; başka bir şifre kullanırsan `backend\.env`'i güncelleyeceksin.)*
   - Kurulumda **pgAdmin 4** ve **Command Line Tools** seçili kalsın.
   - Varsayılan port `5432` olsun.
3. iPhone'a App Store'dan **Expo Go** uygulamasını indir.

### Doğrulama (yeni PowerShell penceresi)

```powershell
node --version       # v20.x.x veya üstü
npm --version        # 10.x veya üstü
psql --version       # 16.x
```

> `psql` komutu bulunamazsa: `C:\Program Files\PostgreSQL\16\bin` PATH'e ekli değil demektir. PowerShell'de:
> ```powershell
> setx PATH "$Env:PATH;C:\Program Files\PostgreSQL\16\bin"
> ```
> Komuttan sonra **terminali kapat ve yeniden aç**.

---

## 2. PostgreSQL kurulumu (Windows)

PostgreSQL Windows servisi olarak otomatik başlar (yeniden başlatma gerekmez).

PowerShell aç ve `postgres` kullanıcısı ile bağlan:

```powershell
psql -U postgres -h localhost -p 5432
# Password for user postgres: admin
```

Açılan `postgres=#` promptunda:

```sql
DROP DATABASE IF EXISTS fitintel;
CREATE DATABASE fitintel;
\l                       -- listele, fitintel görünmeli
\q                       -- çık
```

Test:

```powershell
psql -U postgres -d fitintel -c "SELECT current_database(), version();"
```

---

## 3. Projeyi yerine yerleştir

Aşağıdaki gibi bir yapıda olmalı:

```
C:\Users\<kullaniciadi>\Projects\FitIntel\
├── backend\
│   ├── package.json
│   ├── .env.example       ← .env'e kopyalanacak
│   ├── scripts\
│   │   └── db-reset.js
│   ├── sql\
│   │   ├── schema.sql
│   │   └── seed.sql
│   └── src\
│       ├── index.js
│       ├── db.js
│       ├── services\nutrition.js
│       └── routes\
│           ├── onboarding.js
│           ├── dashboard.js
│           ├── mealPlan.js
│           ├── dailyLog.js
│           └── supplements.js
└── frontend\
    ├── App.tsx
    ├── index.ts
    ├── package.json
    ├── app.json
    ├── babel.config.js
    ├── metro.config.js
    ├── tailwind.config.js
    ├── global.css
    ├── tsconfig.json
    ├── nativewind-env.d.ts
    ├── .env.example       ← .env'e kopyalanacak
    ├── assets\            ← icon.png, splash.png, adaptive-icon.png
    └── src\
        ├── api\           client.ts, queries.ts
        ├── store\         userStore.ts (Zustand + AsyncStorage)
        ├── theme\         colors.ts
        ├── utils\         turkish.ts
        ├── navigation\    RootNavigator.tsx, TabNavigator.tsx
        ├── components\    13 reusable component
        └── screens\       6 ekran (Onboarding + 5 tab + ProductDetail)
```

> ZIP'ten açtıysan `node_modules` yok — sonraki adımda `npm install` ile gelecek. **Kopyalama yaparken `node_modules` ve `.expo` klasörlerini taşıma**, yeniden kurulacak.

---

## 4. Backend kurulumu

### 4.1 .env oluştur

```powershell
cd C:\Users\<kullaniciadi>\Projects\FitIntel\backend
copy .env.example .env
notepad .env
```

`.env` içeriği şu olmalı:

```ini
PORT=5000
DATABASE_URL=postgres://postgres:admin@localhost:5432/fitintel
NODE_ENV=development
```

> PostgreSQL'i farklı şifreyle kurduysan `admin` yerine kendi şifreni yaz.

### 4.2 Bağımlılıkları kur

```powershell
npm install
# ~120 paket, 30 sn
```

### 4.3 Şema + seed verisini yükle

```powershell
npm run db:reset
```

Çıktı:
```
> Loading schema.sql …
> Loading seed.sql …
✓ Done. meals=12  supplements=6
```

> Bu komut Node tabanlı bir script (`scripts/db-reset.js`) çalıştırır — `psql` PATH'te olmasa bile çalışır.

### 4.4 Backend'i başlat

```powershell
npm run dev
# > FitIntel API listening on http://localhost:5000
```

Yeni bir PowerShell penceresinde sanity test:

```powershell
curl http://localhost:5000/health
# {"ok":true,"service":"fitintel-api"}

curl http://localhost:5000/supplements
# [{"id":1,"brand":"Optimum Nutrition", ...}]
```

---

## 5. Windows PC'nin LAN IP'sini öğren

Yeni bir PowerShell penceresinde:

```powershell
ipconfig | findstr IPv4
```

Çıktıdaki **kablosuz adaptörün** (`Wireless LAN adapter Wi-Fi`) IPv4 adresini al. Örnek:

```
IPv4 Address. . . . . . . . . . . : 192.168.1.45
```

**Bu IP'yi not al.** İkisi yere yazılacak:
- `frontend\.env` içine
- `frontend\app.json` içine

> iPhone "localhost"u kendi cihazıdır — backend'e ulaşamaz. **Mutlaka Windows'un LAN IP'sini kullan.**

---

## 6. Frontend kurulumu

### 6.1 .env oluştur

```powershell
cd C:\Users\<kullaniciadi>\Projects\FitIntel\frontend
copy .env.example .env
notepad .env
```

`.env` içeriği (5. adımdaki IP ile):

```ini
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.45:5000
```

### 6.2 app.json'da extra.API_BASE_URL'ı da güncelle

```powershell
notepad app.json
```

`"extra"` bloğunu kendi IP'nle değiştir:

```json
"extra": {
  "API_BASE_URL": "http://192.168.1.45:5000"
}
```

### 6.3 Bağımlılıkları kur

```powershell
npm install
# ~770 paket, 1-3 dakika
```

> 4 moderate severity vulnerability uyarısı normal — tümü transitive Expo bağımlılıklarından, MVP için engel değil.

---

## 7. Asset dosyaları (ikon / splash)

`frontend\assets\` klasörü içinde 3 PNG olmalı:
- `icon.png` (1024×1024) — uygulama ikonu
- `splash.png` (1242×1242) — açılış ekranı
- `adaptive-icon.png` (1024×1024) — Android için

ZIP'ten açtıysan zaten içinde **mor/lacivert düz renk placeholder PNG'ler** var.

Kendi tasarımını yapana kadar bu yeterli. Sonra Photoshop / Figma'da export edip aynı isimlerle değiştir.

---

## 8. Expo'yu başlat ve QR ile bağlan

```powershell
cd C:\Users\<kullaniciadi>\Projects\FitIntel\frontend
npx expo start --lan
```

Terminalde şunları göreceksin:
- ASCII QR code
- `Metro waiting on exp://192.168.1.45:8081`
- `›  Press s │ switch to development build`
- `›  Press a │ open Android`
- `›  Press i │ open iOS simulator`
- `›  Press w │ open web`

> Windows Firewall ilk çalıştırmada **"Allow Node.js to communicate"** popup'ı atabilir → **"Private networks"** ve **"Public networks"** ikisini de işaretleyip Allow.

---

## 9. iPhone'da uygulamayı aç

1. iPhone'un **Windows ile aynı Wi-Fi'de** olduğundan emin ol.
2. iPhone'da **Kamera uygulamasını** aç (Expo Go'yu değil!).
3. Windows ekranındaki **QR**'a kamerayı doğrult.
4. Yukarıda sarı bildirim çıkacak: **"exp://... aç"** — dokun.
5. Expo Go açılır, ilk açılışta JS bundle'ını indirir (~30-60 sn).
6. Onboarding ekranı açılır → 5 adımı doldur → "Planımı Oluştur" → ana ekrana düşer.

---

## 10. Geliştirme döngüsü

İki PowerShell penceresi:

```powershell
# Terminal 1: backend (port 5000)
cd backend
npm run dev

# Terminal 2: frontend (Metro port 8081)
cd frontend
npx expo start --lan
```

- **Backend**: nodemon kod değişikliğinde otomatik yeniden başlatır.
- **Frontend**: Metro Fast Refresh ile iPhone'da anında güncellenir.
- **Değişiklik takılırsa**: iPhone'u salla → "Reload" veya Expo Go'dan FitIntel'i kapatıp yeniden gir.
- **`.env` değişirse**: Metro'yu Ctrl+C ile durdurup `npx expo start --lan --clear` ile aç.

---

## 11. Özellikler ve ekranlar

### Onboarding (5 adım)
- Ad / yaş / cinsiyet
- Kilo / boy
- Aktivite seviyesi (5 seçenek: Hareketsiz → Çok Aktif)
- Hedef (Yağ Kaybı / Kas Kazanımı / Vücut Yenileme)
- Bütçe + sevmediğin yiyecekler

Backend Mifflin-St Jeor formülüyle anında BMR + TDEE + makro hedefleri hesaplar.

### Ana Sayfa
- Saat bazlı selamlama ("Günaydın, Emre 👋")
- Bildirim çanı
- Günlük Özet kartı: kalori ringi (1.890/2.350 kcal) + makro çubukları
- Mini stats: Su / Adım / Uyku
- AI insight kartı (7 günlük trende dayalı Türkçe yorum)
- Bugünkü öğünler timeline

### Plan
- Sub-tab: Planım / Öğün Değiştir / Alışveriş
- "Kalori Hedefin 2.350 kcal" büyük kartı + progress bar
- Makro pill'leri (Protein/Karbonhidrat/Yağ)
- Bugünkü öğünler — dokunulabilir tik daireleri (öğün tamamlandı işaretle)
- "Planı Güncelle" CTA — yeni plan üretir

### Takip
- Hafta / Ay / 3 Ay / Yıl tab'ları
- Kilo Değişimi + Bel Çevresi metric kartları (renk delta'ya göre)
- Kilo line chart
- Uyum Skoru ringi (%82) + 4 alt çubuk: Beslenme / Antrenman / Su / Uyku
- AI Yorumum kartı
- Günlük Kontrol — 4 renkli daire ikon (Kilo/Uyku/Adım/Su)
- "Bugünü Logla" formu

### Supplement
- Search 🔍
- Kategori chip'leri (Tümü / Whey / İzolat / Vegan / Kreatin)
- "Öne Çıkan Ürünler" — kalite skor rozeti (yeşil/turuncu/kırmızı)
- "Kategorilere Göre" — büyük dairesel ikon grid
- "Supplement Güven Skoru Nedir?" eğitsel kart 🛡️
- Karta dokun → Ürün Detay

### Ürün Detay (yeni)
- Hero: ürün foto + marka + isim + ⭐ rating + KALİTE SKORU rozeti
- Tab: Genel Bakış / İçerik / Yorumlar / Fiyatlar
- Skor Dağılımı — 5 alt metrik (İçerik / Fiyat-Performans / Memnuniyet / Sindirim / Aroma)
- Fake Yorum Riski
- AI Özeti
- Fiyat Karşılaştırma (ProteinOcean / Supplementler / Trendyol / Hepsiburada)
- Sticky alt bar: **Fiyat Alarmı Kur** + **En Ucuza Git · ₺X.XXX**

### Profil
- Hedeflerin (kalori/protein/karbonhidrat/yağ/BMR/TDEE)
- Profil bilgileri (yaş/cinsiyet/kilo/boy/aktivite/hedef)
- Tercihler (bütçe/sevmedikleri)
- Sıfırla & Yeniden Başla

---

## 12. REST API uçları

| Method | Path                      | Amaç                                            |
|-------:|---------------------------|-------------------------------------------------|
| `GET`  | `/health`                 | Liveness probe                                  |
| `POST` | `/onboarding`             | Kullanıcı oluştur + BMR/TDEE/makro hesapla      |
| `GET`  | `/dashboard/:userId`      | Kullanıcı + bugünkü totaller + 7g trend + AI    |
| `GET`  | `/meal-plan/:userId`      | Bugünkü plan (yoksa otomatik üretir)            |
| `POST` | `/daily-log`              | Bugünkü log'u upsert (kilo/bel/su/kalori)       |
| `GET`  | `/supplements`            | Supplement listesi; `?category=whey&max_price=2000` |

### Örnek istekler

```powershell
# Onboarding
curl -X POST http://localhost:5000/onboarding `
  -H "Content-Type: application/json" `
  -d '{"name":"Emre","age":28,"gender":"male","weight_kg":78,"height_cm":178,"activity_level":"moderate","goal":"fat_loss","budget":1500,"disliked_foods":["mantar"]}'

# Dashboard
curl http://localhost:5000/dashboard/1

# Meal plan
curl http://localhost:5000/meal-plan/1

# Daily log
curl -X POST http://localhost:5000/daily-log `
  -H "Content-Type: application/json" `
  -d '{"user_id":1,"weight_kg":77.8,"waist_cm":83,"water_ml":2500,"calories_eaten":1890,"protein_eaten":142}'
```

---

## 13. Tasarım sistemi

| Token            | Hex        | Kullanım                       |
|------------------|-----------:|--------------------------------|
| `bg`             | `#0B0F1A`  | Uygulama arka planı            |
| `surface`        | `#121826`  | Kartlar                        |
| `surface2`       | `#171F30`  | Input / iç içe yüzey           |
| `border`         | `#1F2A40`  | Hairline ayraçlar              |
| `primary`        | `#7C4DFF`  | Aksiyon / vurgu                |
| `primaryDim`     | `#5A36C8`  | Gradient end                   |
| `success`        | `#22C55E`  | Uyum / pozitif trend           |
| `warning`        | `#F59E0B`  | Dikkat                         |
| `danger`         | `#EF4444`  | Negatif / silme                |
| `textHi`         | `#F5F7FA`  | Birincil metin                 |
| `textMid`        | `#B6BECF`  | İkincil metin                  |
| `textLow`        | `#6F7891`  | Caption / etiket               |

- 24/20/18 köşe yuvarlamaları, kartlarda yumuşak gölge
- iOS'ta cam efektli (BlurView) yüzen tab bar
- Sistem fontu (premium ve native his) + tracked uppercase eyebrow yazılar

Tüm değerler [tailwind.config.js](frontend/tailwind.config.js) ve [src/theme/colors.ts](frontend/src/theme/colors.ts)'den.

---

## 14. Tech stack

### Backend
- **Node.js** + **Express 4**
- **PostgreSQL 16** (`pg` client)
- **morgan** (request logger), **cors**, **dotenv**

### Frontend
- **Expo SDK 54** + **React Native 0.81** + **TypeScript**
- **React Navigation 7** (native-stack + bottom-tabs)
- **NativeWind v4** (Tailwind CSS for RN)
- **TanStack React Query 5** + **Axios**
- **Zustand** + **AsyncStorage** (yerel kullanıcı oturumu)
- **react-native-svg** (progress ring + sparkline)
- **expo-linear-gradient**, **expo-blur**, **expo-haptics** (cilalama)

---

## 15. Sık karşılaşılan sorunlar

### Backend

**`Error: listen EADDRINUSE: :::5000`**
- Port dolu. Bul ve durdur:
  ```powershell
  netstat -ano | findstr :5000
  taskkill /PID <pid> /F
  ```
- Veya `backend\.env`'de `PORT=5050` yap, frontend `.env`'i de güncelle.

**`error: password authentication failed for user "postgres"`**
- `backend\.env`'deki `DATABASE_URL` içindeki şifre yanlış. `admin` değilse kendi şifreni yaz.
- Şifreyi unuttuysan **pgAdmin → Login/Group Roles → postgres → Properties → Definition → yeni şifre**.

**`error: database "fitintel" does not exist`**
- Yapmadın: `psql -U postgres -c "CREATE DATABASE fitintel;"`

**`npm run db:reset` "Cannot find module 'pg'"**
- `npm install`'i unutmuşsun → `cd backend && npm install`

### Frontend

**Expo Go: "Project is incompatible with this version of Expo Go"**
- Expo Go'yu App Store'dan güncelle (proje SDK 54).
- Gerekirse projeyi de güncelle:
  ```powershell
  npx expo install expo@^54.0.0
  npx expo install --fix
  ```

**iPhone "Network request failed"**
- `frontend\.env`'deki IP **localhost** değil, **Windows LAN IP'si** mi? `ipconfig` ile teyit et.
- Backend çalışıyor mu? `curl http://localhost:5000/health`
- Backend Windows'tan ulaşılabilir mi? PowerShell'den `curl http://192.168.1.45:5000/health` (kendi IP'ni yaz).
- iPhone aynı Wi-Fi'de mi? Mobile data kapalı olsun.
- Windows Firewall Node.js'e izin verdi mi? Ayarlar → Network & Internet → Windows Firewall → Allow an app → Node.js'i Private + Public işaretle.

**iPhone hiç bağlanamıyor (timeout)**
- LAN ile sorun var. Tunnel mode'a düş — internet üzerinden gider:
  ```powershell
  npx expo start --tunnel
  # ilk seferde ngrok-style bağımlılıklarını indirir, ~30 sn
  ```

**Metro "Bundling failed: SyntaxError"**
- Bir TS dosyasında hata var. Terminal log'unda dosya + satır gösterilir, düzelt, kaydet, Fast Refresh tetiklenir.
- Cache sorunsa: `npx expo start --clear`

**`.env` değişikliği yansımıyor**
- `EXPO_PUBLIC_*` değişkenleri **build-time** okunuyor. Metro'yu durdurup `--clear` ile başlat.

---

## 16. Ortak operasyonlar

```powershell
# DB'yi sıfırla + yeniden seed et
cd backend
npm run db:reset

# TypeScript kontrolü
cd frontend
npm run typecheck

# Expo cache temizle + başlat
cd frontend
npx expo start --clear

# Belirli bir simülatörde aç
npx expo run:ios --device "iPhone 15 Pro"     # macOS only

# Tunnel mode (farklı ağ / kurumsal Wi-Fi için)
npx expo start --tunnel
```

---

## 17. MVP'de bilerek YAPILMAYAN şeyler

- Authentication / multi-user — tek cihaz-bağımlı kullanıcı
- Ödeme, sosyal, sohbet, akıllı saat senkronu
- Gerçek supplement scraping — DB'de seed var
- Gerçek LLM çağrısı — "AI insight" 7 günlük trend üzerinde deterministik bir kural motoru. Gerçek bir Claude çağrısına swap edilmeye hazır: [`backend/src/routes/dashboard.js`](backend/src/routes/dashboard.js) içindeki `buildInsight()` fonksiyonunu Anthropic API çağrısıyla değiştir.

---

## 18. Production'a doğru adımlar (gelecek)

- [ ] Authentication (Apple Sign In + Email Magic Link)
- [ ] Apple HealthKit entegrasyonu (kilo, adım, uyku otomatik)
- [ ] Gerçek supplement scraping — Trendyol/Hepsiburada/ProteinOcean fiyat takibi
- [ ] Anthropic API ile gerçek AI insight + öğün önerisi
- [ ] Push notification (öğün hatırlatma, tartı zamanı)
- [ ] Apple StoreKit ile abonelik (premium plan)
- [ ] Supabase / Postgres-on-Render ile cloud DB

---

## 19. Lisans

MVP / dahili. Lisans dosyası eklenmedi.

---

## 20. Hızlı referans

| Servis            | Komut                     | URL                            |
|-------------------|---------------------------|--------------------------------|
| PostgreSQL        | (Windows servisi)          | `localhost:5432`               |
| Backend (lokal)   | `npm run dev` (backend)    | http://localhost:5000          |
| Backend (LAN)     | —                          | http://`<windows-ip>`:5000     |
| Metro (LAN)       | `npx expo start --lan`     | exp://`<windows-ip>`:8081      |
| Metro (tunnel)    | `npx expo start --tunnel`  | exp://`<random>.exp.direct`    |
| DB sıfırla        | `npm run db:reset`         | schema.sql + seed.sql          |
| TS kontrolü       | `npm run typecheck`        | —                              |
