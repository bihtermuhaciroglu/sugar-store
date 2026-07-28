# 🍬 Sugar Store — Barkod & Stok Sistemi

Bayan giyim mağazası "Sugar Store" için stok takibi, fiyat etiketi basımı
(Zebra/ZPL), satış/kasa ekranı — hem mağazadan hem online satış ofisinden
aynı stok verisine erişecek şekilde bulutta çalışır.

## Mimari

```
                    ┌─────────────────────────────┐
                    │   Render.com (ücretsiz)      │
                    │  Express: API + React build  │
                    │  ↳ Turso (libSQL, ücretsiz)   │
                    └───────────────┬───────────────┘
                                     │ internet (HTTPS)
           ┌─────────────────────────┼─────────────────────────┐
           │                                                    │
   Mağaza PC (tarayıcı)                              Online satış ofisi (tarayıcı)
   + yerel "print-agent"
   (sadece Zebra yazıcı için,
    localhost:4200)
```

Üç ayrı parça:

- **backend/** — Express API + React build'i servis eder, veriyi
  Turso'da (bulut SQLite) tutar. Render'a deploy edilir, hem mağaza hem
  online ofis aynı URL'yi tarayıcıda açar.
- **frontend/** — React arayüzü, backend tarafından build edilip servis
  edilir (ayrıca deploy edilmesi gerekmez).
- **print-agent/** — sadece mağazadaki bilgisayarda çalışan küçük bir
  servis; Zebra yazıcı fiziksel olarak sadece oraya bağlı olduğu için
  yazdırma isteğini yerelden karşılar.

## Kurulum (geliştirme)

```bash
cd backend && npm install
cd ../frontend && npm install
cd ../print-agent && npm install
```

`backend/.env` (örnek: `backend/.env.example`):

```
PORT=4100
DB_URL=file:./data/store.db   # geliştirme: yerel dosya, Turso hesabı gerekmez
DB_AUTH_TOKEN=
APP_PASSWORD=sugar123          # uygulamaya giriş şifresi
```

`frontend/.env` (örnek: `frontend/.env.example`):

```
VITE_OWNER_WHATSAPP=905xxxxxxxxx     # Zuhal Hanım'ın WhatsApp numarası
VITE_PRINT_AGENT_URL=http://localhost:4200
VITE_PRINT_AGENT_TOKEN=dev-token     # print-agent/.env içindeki ile aynı olmalı
```

`print-agent/.env` (örnek: `print-agent/.env.example`):

```
PORT=4200
PRINTER_NAME=<Windows'ta yüklü Zebra yazıcının tam adı>
PRINT_AGENT_TOKEN=dev-token
```

Üç terminalde ayrı ayrı çalıştırın:

```bash
cd backend && npm run dev        # http://localhost:4100
cd frontend && npm run dev       # http://localhost:5173 (backend'e proxy eder)
cd print-agent && npm run dev    # http://localhost:4200 (sadece etiket basarken gerekli)
```

## Buluta deploy etmek (asıl kullanım)

Bu adımlar hesap açmayı gerektirdiği için sizin yapmanız gerekiyor:

### 1. Turso (veritabanı)

1. [turso.tech](https://turso.tech) üzerinden ücretsiz hesap açın, `turso` CLI'ı kurun.
2. `turso db create sugar-store` ile bir veritabanı oluşturun.
3. `turso db show sugar-store --url` ile `DB_URL` değerini (`libsql://...`) alın.
4. `turso db tokens create sugar-store` ile `DB_AUTH_TOKEN` değerini alın.

### 2. Render.com (backend + arayüz)

1. Bu projeyi bir GitHub reposuna push'layın.
2. [render.com](https://render.com) üzerinden ücretsiz hesap açın, "New Web Service" ile repoyu bağlayın.
3. **Root Directory**: `backend`
4. **Build Command**: `npm install && npm run build --prefix ../frontend`
5. **Start Command**: `npm start`
6. Ortam değişkenlerini Render panelinden girin:
   - `DB_URL`, `DB_AUTH_TOKEN` (Turso'dan)
   - `APP_PASSWORD` (mağaza + online ofis için ortak şifre)
   - Build sırasında frontend'in okuması için: `VITE_OWNER_WHATSAPP`,
     `VITE_PRINT_AGENT_URL` (yine `http://localhost:4200` — bu değer
     her zaman kullanıcının kendi bilgisayarına işaret eder, mağaza
     bilgisayarında localhost'ta çalışan print-agent'a gider),
     `VITE_PRINT_AGENT_TOKEN`
7. Deploy tamamlanınca Render size bir URL verir (ör.
   `https://sugar-store.onrender.com`). Bu URL'yi hem mağazada hem online
   ofiste tarayıcıdan açıp `APP_PASSWORD` ile giriş yapın.

Not: Render'ın ücretsiz katmanı 15 dakika boyunca istek gelmezse "uykuya
dalar"; sonraki istek birkaç saniye gecikebilir. Küçük bir mağaza için
kabul edilebilir bir gecikmedir.

### 3. Mağazada print-agent'ı çalışır bırakmak

`print-agent` klasörünü mağazadaki Windows PC'ye kopyalayın, `npm install`
yapın, `.env` dosyasını doldurun (gerçek Zebra yazıcı adı ve
`PRINT_AGENT_TOKEN` — Render'daki `VITE_PRINT_AGENT_TOKEN` ile aynı
olmalı), sonra `npm start`. PC her açıldığında otomatik başlaması için bir
Windows Görev Zamanlayıcı (Task Scheduler) girdisi veya başlangıç klasörüne
bir `.bat` dosyası ekleyebilirsiniz (ör. `npm start --prefix
C:\sugar-store\print-agent`).

## Windows uyumluluğu

Proje macOS'ta geliştirildi ama tamamen platform bağımsız bir yığın
kullanır (Node.js + Express + React + libSQL). `print-agent`'taki tek
native modül (`@thiagoelg/node-printer`) win32 için önceden derlenmiş
binary indirir; kurulum başarısız olsa bile sistem "dry-run" moduna geçer
(ZPL sadece loglanır), çökmez.

## Barkod okuyucu

USB barkod okuyucular klavye gibi davranır (HID). Kasa ekranındaki barkod
kutusuna tıklamadan da okutabilirsiniz; `useBarcodeScanner` hook'u hızlı
tuş vuruşlarını yakalar. Online satış ofisinde fiziksel okuyucu yoksa,
kasa ekranındaki **ürün arama** kutusundan isimle arayıp tıklayarak da
sepete ekleme yapılabilir.

## Etiket yazdırma

`backend/src/routes/labels.js` sadece ZPL metnini üretir
(`POST /api/labels/build`). Yazdırma işini `print-agent` yapar: frontend
üretilen ZPL'i `http://localhost:4200/print` adresine gönderir. Ajan
mağazadaki bilgisayarda çalışmıyorsa (ör. online ofisten deneniyorsa)
arayüzde "Etiket yazıcısı bu bilgisayarda bulunamadı" hatası gösterilir,
ZPL önizlemesi yine de görünür.

## Ürün fotoğrafları

Ürünler ekranında her ürüne bir fotoğraf eklenebilir (ekleme formunda
"Fotoğraf seç", ya da mevcut bir ürünün küçük resmine tıklayarak
değiştirilebilir). Fotoğraf tarayıcıda otomatik olarak küçültülüp
sıkıştırılır (`frontend/src/imageResize.js`, maks. 600px genişlik, JPEG
%70 kalite) ve doğrudan veritabanında (`products.image` sütunu, base64)
saklanır — ayrı bir görsel depolama servisi gerekmez. Kasa ekranındaki
ürün arama sonuçlarında ve sepette de küçük resim olarak gösterilir,
online ofisteki personelin barkodu olmayan bir ürünü görsel olarak teyit
etmesine yardımcı olur. Standart formatların (jpg, png, webp) yanında
iPhone'ların varsayılan **HEIC** formatı da desteklenir — `heic2any`
paketiyle tarayıcıda otomatik olarak jpg'ye çevrilir, ekstra bir şey
yapmanız gerekmez.

**Fotoğraftan ürün tanıma (ileride)**: Kullanıcı, bir ürünün fotoğrafını
çekip sistemin bunu otomatik olarak stoktaki hangi ürün olduğunu
bulmasını istiyor (ör. online ofiste barkod yokken). Bu, görsel benzerlik
araması (embedding tabanlı) gerektiren ayrı bir AI özelliği — şimdilik
kapsam dışı bırakıldı, WhatsApp AI faziyle birlikte değerlendirilecek.

## Şifre koruması

Sistem artık internete açık olduğu için basit ortak bir şifre var
(`APP_PASSWORD`). Tarayıcı ilk açıldığında şifre sorulur, doğrulandıktan
sonra `localStorage`'da saklanır ve her istekte otomatik gönderilir.
Şifreyi değiştirmek isterseniz Render'daki `APP_PASSWORD` ortam
değişkenini güncelleyip herkesin yeni şifreyle tekrar giriş yapmasını
sağlamanız yeterli.

## Zuhal'in yorumları ve uyarılar

- **Karşılama bandı**: Uygulama her açıldığında saat dilimine göre
  Zuhal'e samimi bir mesaj gösterir (`frontend/src/components/GreetingBanner.jsx`).
- **Düşük stok uyarısı**: Stoğu 5 adet ve altına düşen ürünler için
  ("Zuhal, stok tükeniyor...") bir bant çıkar (`LowStockBanner.jsx`,
  eşik `frontend/src/config.js` içindeki `LOW_STOCK_THRESHOLD`), dakikada
  bir otomatik yenilenir.
- **Günlük ciro / Zuhal Hanım'a WhatsApp**: Kasa ekranında her zaman
  görünen bir bant "Zuhal Hanım'a Gönder" bağlantısı sunar
  (`DailyRevenueBanner.jsx`) — saatle sınırlı değildir, kapanışı kim ne
  zaman yaparsa yapsın kullanılabilir. **Ciro tutarı ekranda gösterilmez**,
  sadece gönderilen WhatsApp mesajının içine konur — böylece mağazada
  çalışan herkes cirosunu Zuhal Hanım'a bildirebilir ama rakamı ekrandan
  göremez. Bağlantı `wa.me` click-to-chat linkidir — tamamen ücretsiz ve
  resmi, tıklanınca WhatsApp Web/masaüstü uygulamasında mesaj hazır halde
  açılır, tek tıkla gönderilir.
- **Sticker'lar**: Kullanıcının paylaştığı chibi sticker seti henüz
  eklenmedi — sohbete yapıştırılan görsel doğrudan dosya olarak
  alınamadığı için, görsellerin bir dosya yoluna kaydedilip paylaşılması
  bekleniyor. Gelince `frontend/public/stickers/` altına eklenip
  banner'larda kullanılacak.

## Faz 3 (kapsam dışı, ileride)

- WhatsApp Business API üzerinden AI destekli stok sorgulama / sipariş
  alma. Mevcut `/api/products` uçları bu faz tarafından doğrudan yeniden
  kullanılacak şekilde tasarlandı.
- Fotoğraftan ürün tanıma (yukarıdaki "Ürün fotoğrafları" bölümüne bakın).
