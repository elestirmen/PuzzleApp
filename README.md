# PuzzleApp

PuzzleApp, Apache Cordova ile gelistirilmis Android odakli bir mobil yapboz oyunudur.

Kisa ozet: resmini sec, parcala, karistir, rekorunu kir.

## Neler Var?

- Hazir gorsel secimi ve galeriden ozel resim yukleme
- 3x3, 4x4, 5x5, 6x6 zorluk seviyeleri
- Hamle sayaci ve sure takibi
- Kazaninca kutlama animasyonu ve ses efektleri
- `slicer.html` uzerinden Puzzle Studio ekrani (parcalama stratejileri + onizleme)
- `platforms/android` kaynaklari repoda takip edilir

## Teknoloji

- Apache Cordova
- Cordova Android `14.x`
- Vanilla JavaScript, HTML, CSS
- Node test runner (`node --test`)

## Hizli Baslangic

Gereksinimler:

- Node.js 20+
- npm
- Java 17+
- Android SDK
- Cordova CLI (`npm i -g cordova`)

Kurulum ve test:

```bash
npm install
npm test
```

Android icin calistirma:

```bash
npx cordova prepare android
npx cordova run android
```

Alternatif olarak, Android debug APK derlemek icin:

```bash
cd platforms/android
./tools/gradlew assembleDebug
```

Windows PowerShell:

```powershell
cd platforms/android
.\tools\gradlew.bat assembleDebug
```

## Proje Yapisi

- `www/`: Oyunun web arayuzu ve ana mantik
- `www/puzzle.js`: Oyun akisi (hamle, timer, kazanma kontrolu)
- `www/puzzle-logic.js`: Test edilen saf mantik fonksiyonlari
- `www/slicer.js`: Puzzle Studio parcalama/uretme akisi
- `platforms/android/`: Android platform kaynaklari
- `test/puzzle-logic.test.js`: Birim testleri

## Gelistirme Notlari

- Mobilde Cordova ile calisir, tarayicida da temel UI denenebilir.
- Buyuk lokal arac dosyalari (`.tools/`) git disinda tutulur.
- Android build/cache dosyalari `platforms/android/.gitignore` ile dislanir.

## Lisans

Apache-2.0