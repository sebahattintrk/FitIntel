# FitIntel — Windows kurulum

Bu doküman, projeyi **Windows 10/11** üzerinde geliştirip iPhone (aynı Wi-Fi'de) ile test etmek içindir.

> Geliştirme: Windows  •  Test cihazı: iPhone (Expo Go)  •  Veritabanı: yerel PostgreSQL  •  Backend: yerel Express :5000

---

## 1. Gerekli yazılımlar

İndir + kur:

1. **Node.js LTS (20.x veya üstü)** → https://nodejs.org/en/download/
   - Kurulumda "Add to PATH" işaretli olsun.
2. **PostgreSQL 16 (Windows installer, EDB tarafından)** → https://www.postgresql.org/download/windows/
   - Kurulum sırasında `postgres` kullanıcısına bir şifre ver. **Bu doküman `admin` varsayıyor.**
   - "pgAdmin" ve "Command Line Tools"u işaretli bırak.
   - Varsayılan port: `5432`
3. **Git for Windows** → https://git-scm.com/download/win  *(opsiyonel ama tavsiye)*
4. **VS Code** → https://code.visualstudio.com/  *(opsiyonel)*

Telefonda:

5. **Expo Go** (App Store) → https://apps.apple.com/app/expo-go/id982107779

Kurulum sonrası PowerShell aç ve doğrula:

```powershell
node --version          # v20+ olmalı
npm --version
psql --version          # PostgreSQL 16.x
```

> `psql` bulunmazsa PATH'e ekle: `C:\Program Files\PostgreSQL\16\bin`
> PowerShell'de: `setx PATH "$Env:PATH;C:\Program Files\PostgreSQL\16\bin"` (yeni terminal aç)

---

## 2. Projeyi Windows'a taşı

Mac'teki `FitIntel/` klasörünü Windows'a kopyala. **`node_modules` ve `.expo` klasörlerini kopyalama**, onlar yeniden kurulacak. Önerilen yöntemler:

- **AirDrop / USB** → bilgisayar transferi
- **Git** → projeyi Mac'te `git init && git add . && git commit -m init` yap, GitHub/Drive'a koy, Windows'ta clone et
- **Cloud** → Google Drive / Dropbox ile FitIntel klasörünü senkronla

Sonuçta Windows'ta şuna benzer bir yapı olacak:

```
C:\Users\<sen>\Projects\FitIntel\
  ├── backend\
  ├── frontend\
  ├── README.md
  └── SETUP_WINDOWS.md  ← bu dosya
```

---

## 3. PostgreSQL: veritabanı + kullanıcı

PowerShell aç:

```powershell
# postgres süperkullanıcısı olarak bağlan (şifre: admin)
psql -U postgres -h localhost -p 5432
```

Açılan `postgres=#` promptunda:

```sql
DROP DATABASE IF EXISTS fitintel;
CREATE DATABASE fitintel;
\q
```

> PostgreSQL'i farklı bir şifreyle kurduysan `backend\.env` dosyasındaki `DATABASE_URL`'ı buna göre güncelle.

---

## 4. Backend

```powershell
cd C:\Users\<sen>\Projects\FitIntel\backend

# .env dosyasını oluştur
copy .env.example .env
notepad .env
```

`.env` içeriği şöyle olmalı (Windows için **port 5432**, Mac'teki 5433 değil):

```
PORT=5000
DATABASE_URL=postgres://postgres:admin@localhost:5432/fitintel
NODE_ENV=development
```

Bağımlılıkları kur ve şemayı + seed verisini yükle:

```powershell
npm install
npm run db:reset          # cross-platform Node script kullanır
```

Çıktı:
```
> Loading schema.sql …
> Loading seed.sql …
✓ Done. meals=12  supplements=6
```

Backend'i başlat:

```powershell
npm run dev
# > FitIntel API listening on http://localhost:5000
```

Yeni bir PowerShell penceresinde sanity test:

```powershell
curl http://localhost:5000/health
curl http://localhost:5000/supplements
```

---

## 5. Windows PC'nin LAN IP'sini öğren

Yeni bir PowerShell penceresinde:

```powershell
ipconfig | findstr IPv4
```

Çıktıdaki **kablosuz ağ adaptörünün** IPv4 adresini al (`192.168.x.x` veya `10.0.x.x` ile başlar). Örnek:

```
IPv4 Address. . . . . . . . . . . : 192.168.1.45
```

**Bu IP'yi not al** — hem `frontend\.env`, hem `frontend\app.json`, hem iPhone bu IP'ye bağlanacak.

---

## 6. Frontend

```powershell
cd C:\Users\<sen>\Projects\FitIntel\frontend

# .env dosyasını oluştur (kendi IP'nle değiştir)
copy .env.example .env
notepad .env
```

`.env` (5. adımdaki IP'yi yaz):

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.45:5000
```

Aynı IP'yi `app.json`'da da güncelle (`extra.API_BASE_URL`):

```powershell
notepad app.json
```

Bağımlılıkları kur:

```powershell
npm install
```

> Bu adım 1-3 dakika sürebilir (Expo SDK 54 + RN 0.81 + ~600 paket).

---

## 7. Asset dosyaları (icon / splash)

Mac tarafından taşıdıysan `frontend\assets\` içinde 3 PNG zaten var (icon.png, splash.png, adaptive-icon.png). Yoksa Windows'ta üretmek için:

```powershell
# Python varsa (PowerShell'de):
python -c "import zlib, struct; \
o=lambda p,s,c:open(p,'wb').write(b'\x89PNG\r\n\x1a\n' + \
(lambda data,typ: (lambda CRC: struct.pack('>I',len(data))+typ+data+struct.pack('>I',CRC(typ+data)&0xffffffff))(zlib.crc32))(struct.pack('>IIBBBBB',s,s,8,6,0,0,0),b'IHDR') + \
(lambda data,typ: (lambda CRC: struct.pack('>I',len(data))+typ+data+struct.pack('>I',CRC(typ+data)&0xffffffff))(zlib.crc32))(zlib.compress(b''.join(b'\x00'+bytes(c)*s for _ in range(s)),9),b'IDAT') + \
(lambda data,typ: (lambda CRC: struct.pack('>I',len(data))+typ+data+struct.pack('>I',CRC(typ+data)&0xffffffff))(zlib.crc32))(b'',b'IEND')); \
o('assets/icon.png',1024,(124,77,255,255)); \
o('assets/splash.png',1242,(11,15,26,255)); \
o('assets/adaptive-icon.png',1024,(124,77,255,255))"
```

Veya manuel olarak herhangi bir 1024×1024 PNG'yi 3 isimle kaydet (Paint'te tek tıkla yapılır). Dev ortamı için işlevsel — production'da kendi tasarımını koyacaksın.

---

## 8. Expo'yu başlat

```powershell
cd C:\Users\<sen>\Projects\FitIntel\frontend
npx expo start --lan
```

Terminalde QR code görünecek + altta `Metro waiting on exp://192.168.1.45:8081`

Windows Firewall ilk çalıştırmada **"Allow Node.js"** popup'ı atabilir → **Private networks**'e izin ver.

---

## 9. iPhone'da aç

1. iPhone'un **aynı Wi-Fi**'de olduğundan emin ol.
2. **iPhone Kamera** uygulamasını aç (Expo Go'yu değil).
3. Windows ekranındaki QR'a doğrult.
4. Sarı bildirim → **"Expo Go'da Aç"**a dokun.
5. İlk bundle ~60 sn sürer — sonra Onboarding ekranı açılır.

---

## 10. Geliştirme döngüsü

```powershell
# Terminal 1: backend
cd backend
npm run dev

# Terminal 2: frontend
cd frontend
npx expo start --lan
```

- **Backend kodu** değiştirirsen nodemon otomatik yeniden başlatır.
- **Frontend kodu** değiştirirsen Metro Fast Refresh ile iPhone'da anında güncellenir.
- iPhone'da takılırsan **cihazı salla → "Reload"** veya Expo Go'yu kapatıp yeniden gir.

---

## Sık karşılaşılan sorunlar

**`psql` komutu bulunamıyor**
- `C:\Program Files\PostgreSQL\16\bin`'i PATH'e ekle, yeni terminal aç.

**Backend `EADDRINUSE :::5000`**
- 5000 portu dolu. `netstat -ano | findstr :5000` ile bulup `taskkill /PID <pid> /F` ile durdur, ya da `.env`'de `PORT=5050` yapıp `frontend\.env`'i ona göre değiştir.

**iPhone "Network response timed out"**
- Windows ile iPhone aynı Wi-Fi'de mi? Hotspot/farklı SSID'de olmasınlar.
- Windows Firewall Node.js'e izin verdi mi? Ayarlar → Firewall → Allowed apps → Node.js'i Private + Public işaretle.
- Hâlâ çalışmıyorsa `npx expo start --tunnel` — internet üzerinden gider, ağ uyuşmazlığını atlatır.

**iPhone "Network request failed" backend'e**
- `frontend\.env`'deki `EXPO_PUBLIC_API_BASE_URL` Windows'un GERÇEK LAN IP'sini içeriyor mu? (`localhost` değil — iPhone'un localhost'u kendi cihazıdır!)
- `ipconfig` ile teyit et, .env'i güncelle, **Metro'yu yeniden başlat** (env değişiklikleri yalnızca restart sonrası alınır).

**`psql -U postgres` "password authentication failed"**
- PostgreSQL kurulumunda verdiğin şifreyi gir. Unuttuysan: pgAdmin'i aç → Login/Group Roles → postgres → Properties → Definition → yeni şifre.

**Expo Go "Project is incompatible with this version of Expo Go"**
- Expo Go'yu App Store'dan güncelle (proje SDK 54). Olmuyorsa proje SDK'sını sabitle:
  ```powershell
  npx expo install expo@^54.0.0
  npx expo install --fix
  ```

---

## Hızlı referans

| Servis            | Komut                     | URL                            |
|-------------------|---------------------------|--------------------------------|
| PostgreSQL        | (Windows servisi)          | localhost:5432                 |
| Backend           | `npm run dev` (backend)    | http://localhost:5000          |
| Backend (LAN)     | —                          | http://<windows-ip>:5000       |
| Metro             | `npx expo start --lan`     | exp://<windows-ip>:8081        |
| DB reset          | `npm run db:reset`         | schema.sql + seed.sql          |
| TypeScript check  | `npm run typecheck`        | —                              |
