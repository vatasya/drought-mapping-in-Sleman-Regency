
<h1 align="center">WebGIS Tingkat Kekeringan Lahan Kabupaten Sleman</h1>

<p align="center">
  Pemetaan tingkat kekeringan lahan berbasis <b>TVDI (Temperature Vegetation Dryness Index)</b><br>
  dari citra <b>Landsat 8 OLI/TIRS Collection 2 Level 2</b> tahun <b>2023 dan 2024</b> menggunakan <b>Google Earth Engine</b>
</p>

<p align="center">
  <a href="https://briliant2709.users.earthengine.app/view/NAMA-APP"><b>🌐 Buka WebGIS</b></a>
</p>

---

## Daftar Isi

- [Tentang](#tentang)
- [Wilayah Kajian](#wilayah-kajian)
- [Fitur](#fitur)
- [Data](#data)
- [Metodologi](#metodologi)
- [Klasifikasi](#klasifikasi)
- [Cara Menjalankan](#cara-menjalankan)
- [Parameter Script](#parameter-script)
- [Struktur Repositori](#struktur-repositori)
- [Keterbatasan](#keterbatasan)
- [Referensi](#referensi)
- [Penyusun](#penyusun)

---

## Tentang

WebGIS ini memetakan **sebaran dan tingkat kekeringan lahan di Kabupaten Sleman, Daerah Istimewa Yogyakarta** pada tahun 2023 dan 2024. Indeks utama yang digunakan adalah **TVDI**, yaitu indeks kekeringan yang dibangun dari hubungan antara suhu permukaan lahan (LST) dan kerapatan vegetasi (NDVI) dalam ruang segitiga NDVI–LST.

Hasil TVDI dilengkapi tiga indeks pendukung:

| Indeks | Fungsi |
|---|---|
| **LST** (terkoreksi elevasi) | Suhu permukaan lahan |
| **NDVI** | Kerapatan vegetasi |
| **NDMI** | Kelembapan vegetasi/tanah |

Analisis dapat dilakukan untuk seluruh kabupaten maupun **per kecamatan**, dan kedua tahun dapat dibandingkan untuk melihat **perubahan tingkat kekeringan**. Tahun 2023 menarik dibandingkan karena bertepatan dengan fenomena **El Niño** yang memperpanjang musim kemarau.

## Wilayah Kajian

**Kabupaten Sleman** terletak di bagian utara Daerah Istimewa Yogyakarta dan terdiri atas **17 kecamatan**. Ketinggiannya bervariasi dari dataran rendah di selatan hingga **lereng Gunung Merapi** di utara. Perbedaan ketinggian ini memengaruhi suhu permukaan, sehingga nilai LST dalam WebGIS ini **dikoreksi terhadap elevasi** sebelum menghitung TVDI. Tanpa koreksi tersebut, lereng Merapi akan terbaca "basah" hanya karena suhunya lebih rendah akibat ketinggian.

## Fitur

### 🗺️ Peta Interaktif
- Pilihan **tahun** (2023 / 2024) dan **periode komposit**: kemarau (Jun–Sep), puncak kemarau (Agu–Okt), atau setahun penuh.
- **10 layer peta**:
  - TVDI kelas dan kontinu
  - **Perubahan TVDI 2023 → 2024**
  - LST, NDVI, dan NDMI (masing-masing kelas dan kontinu)
  - Citra *true color*
- **Mode bandingkan 2 tahun** dengan pembatas peta yang dapat digeser (*split panel*).
- **Klik peta** untuk melihat nilai piksel TVDI, LST, NDVI, NDMI, elevasi, kecamatan, dan perubahan TVDI antartahun.
- Pengaturan **transparansi layer** dan legenda otomatis.

### 🏘️ Analisis Per Kecamatan
- Garis **batas kecamatan** di peta.
- Pilih kecamatan untuk **zoom** dan menampilkan statistiknya:
  - TVDI rata-rata
  - Luas area kering
  - LST, NDVI, NDMI
  - Peringkat kekeringan
- **Peringkat kecamatan terkering dan terbasah**.
- Opsi menampilkan layer hanya di kecamatan terpilih.

### 📊 Statistik & Analisis
- **Panel statistik**: TVDI rata-rata dan simpangan baku, luas kelas kering + sangat kering, persamaan *dry edge* dan *wet edge*, serta diagram komposisi kelas.
- Tab **Analisis**:
  1. **TVDI & segitiga NDVI–LST**: *scatter plot* piksel beserta garis *dry edge* dan *wet edge*, luas kelas TVDI, dan grafik TVDI per kecamatan.
  2. **Dinamika bulanan**: grafik LST, NDVI, NDMI, dan jumlah scene setiap bulan.
  3. **Perbandingan 2023–2024**: tabel parameter, luas perubahan kelas (makin kering / tetap / makin basah), serta luas kelas TVDI dan NDMI per tahun.
- Tab **Keterangan Kelas** dan **Metodologi**.

## Data

| Data | Sumber | Keterangan |
|---|---|---|
| Landsat 8 OLI/TIRS C2 L2 | `LANDSAT/LC08/C02/T1_L2` (USGS) | Reflektansi permukaan & suhu permukaan, resolusi 30 m |
| DEM SRTM | `USGS/SRTMGL1_003` | Koreksi elevasi LST, resolusi 30 m |
| Batas Kabupaten Sleman | Asset `projects/ee-briliant2709/assets/KabupatenSleman` | Batas wilayah kajian |
| Batas kecamatan | Asset batas wilayah atau geoBoundaries ADM3 (`WM/geoLab/geoBoundaries/600/ADM3`) | Analisis per kecamatan |

## Metodologi

```
Landsat 8 C2 L2 (2023, 2024)
        │
        ▼
Masking awan, bayangan awan, cirrus, saturasi (QA_PIXEL, QA_RADSAT)
        │
        ▼
Konversi faktor skala → reflektansi permukaan & LST (°C)
        │
        ▼
NDVI, NDMI, MNDWI ──► komposit median per periode
        │
        ▼
Koreksi elevasi LST (DEM SRTM)
        │
        ▼
Ruang segitiga NDVI–LST → dry edge & wet edge (regresi linear)
        │
        ▼
TVDI → klasifikasi 5 kelas → statistik, per kecamatan, perubahan antartahun
```

### 1. Pra-pengolahan
- Masking piksel awan, bayangan awan, *dilated cloud*, cirrus (bit 1–4 `QA_PIXEL`), dan piksel saturasi (`QA_RADSAT`).
- Reflektansi permukaan: `SR × 0,0000275 − 0,2`
- Suhu permukaan: `LST (°C) = ST_B10 × 0,00341802 + 149,0 − 273,15`

### 2. Indeks Spektral

| Indeks | Rumus (Landsat 8) |
|---|---|
| NDVI | (B5 − B4) / (B5 + B4) |
| NDMI | (B5 − B6) / (B5 + B6) |
| MNDWI | (B3 − B6) / (B3 + B6) → badan air (MNDWI ≥ 0) dikeluarkan dari TVDI |

### 3. Koreksi Elevasi LST

```
LSTc = LST + 0,0065 × (elevasi − elevasi terendah Kabupaten Sleman)
```

Angka 0,0065 °C/m adalah *lapse rate* standar atmosfer.

### 4. TVDI

Nilai NDVI dibagi ke dalam interval 0,02 (rentang 0,15–0,85). Pada setiap interval diambil LST maksimum dan minimum, lalu diregresikan terhadap NDVI:

```
Dry edge :  LSTmax = a₁ + b₁ × NDVI
Wet edge :  LSTmin = a₂ + b₂ × NDVI

TVDI = (LST − LSTmin) / (LSTmax − LSTmin)
```

Nilai TVDI berkisar **0 (sangat basah)** sampai **1 (sangat kering)**. *Dry edge* dan *wet edge* dihitung terpisah untuk setiap tahun dan periode.

## Klasifikasi

Ambang kelas dibuat **tetap untuk semua tahun** agar hasil 2023 dan 2024 dapat dibandingkan secara konsisten.

### TVDI — Tingkat Kekeringan

| Kelas | Rentang TVDI | Kondisi umum |
|---|---|---|
| 🟦 Sangat basah | 0 – 0,2 | Sawah tergenang/irigasi teknis, vegetasi rapat sempadan sungai |
| 🩵 Basah | 0,2 – 0,4 | Sawah irigasi, kebun campuran, hutan lereng Merapi |
| 🟨 Normal | 0,4 – 0,6 | Tegalan, pekarangan, sawah fase akhir |
| 🟧 Kering | 0,6 – 0,8 | Lahan kering/tadah hujan, sawah bera, permukiman bervegetasi |
| 🟥 Sangat kering | 0,8 – 1 | Lahan terbuka, endapan pasir/material Merapi, lahan terbangun padat |

### Indeks Pendukung

| Kelas | LST terkoreksi | NDVI | NDMI |
|---|---|---|---|
| 1 | < 26 °C (sangat rendah) | < 0,1 (sangat rendah) | < −0,2 (sangat kering) |
| 2 | 26 – 30 °C (rendah) | 0,1 – 0,2 (rendah) | −0,2 – 0 (kering) |
| 3 | 30 – 34 °C (sedang) | 0,2 – 0,4 (sedang) | 0 – 0,2 (sedang) |
| 4 | 34 – 38 °C (tinggi) | 0,4 – 0,6 (tinggi) | 0,2 – 0,4 (lembap) |
| 5 | ≥ 38 °C (sangat tinggi) | ≥ 0,6 (sangat tinggi) | ≥ 0,4 (sangat lembap) |

## Cara Menjalankan

1. Buka [Google Earth Engine Code Editor](https://code.earthengine.google.com/).
2. Buat script baru, lalu salin isi file [`webgis_kekeringan_sleman.js`](webgis_kekeringan_sleman.js).
3. Pastikan asset batas wilayah dapat diakses. Jika memakai asset sendiri, ganti nilai `AOI_ASSET`.
4. Klik **Run**. Antarmuka WebGIS akan tampil menggantikan Code Editor.
5. Untuk mempublikasikan: **Apps → New App**, pilih *Current contents of editor*, lalu **Publish**.

> **Catatan:** agar WebGIS dapat dibuka orang lain, bagikan asset batas wilayah dengan opsi **"Anyone can read"** (tab *Assets* → *Share*).

## Parameter Script

Parameter utama terdapat di bagian awal script:

| Parameter | Nilai bawaan | Fungsi |
|---|---|---|
| `AOI_ASSET` | `projects/ee-briliant2709/assets/KabupatenSleman` | Batas wilayah kajian (`null` = FAO GAUL) |
| `KEC_ASSET` | `null` | Batas kecamatan khusus (`null` = otomatis) |
| `KEC_NAME_FIELD` | `null` | Nama kolom kecamatan (`null` = dideteksi otomatis) |
| `YEARS` | `[2023, 2024]` | Tahun analisis (isi satu tahun saja untuk menyembunyikan fitur perbandingan) |
| `PERIODS` | Kemarau, puncak kemarau, setahun | Pilihan periode komposit |
| `MAX_CLOUD` | `70` | Batas tutupan awan scene (%) |
| `USE_LAPSE` / `LAPSE` | `true` / `0.0065` | Koreksi elevasi LST |
| `BIN`, `NDVI_FIT_MIN`, `NDVI_FIT_MAX` | `0.02`, `0.15`, `0.85` | Penentuan *dry edge* dan *wet edge* |

## Struktur Repositori

```
├── README.md
├── webgis_kekeringan_sleman.js   # Script Google Earth Engine
└── assets/
    └── logo.png                  # Logo WebGIS
```

## Keterbatasan

- Band termal Landsat 8 memiliki resolusi asli 100 m dan diresampling menjadi 30 m.
- TVDI bersifat **relatif** terhadap kondisi wilayah dan periode yang sama, bukan ukuran lengas tanah absolut.
- Lahan terbangun, lahan terbuka, dan endapan material Merapi cenderung terbaca kering karena suhunya tinggi dan vegetasinya minim.
- Tutupan awan, terutama di lereng Merapi, dapat mengurangi jumlah piksel valid.
- Hasil sebaiknya divalidasi dengan data lapangan atau data curah hujan.

## Referensi

- Sandholt, I., Rasmussen, K., & Andersen, J. (2002). A simple interpretation of the surface temperature/vegetation index space for assessment of surface moisture status. *Remote Sensing of Environment*, 79(2–3), 213–224.
- U.S. Geological Survey. *Landsat 8–9 Collection 2 Level-2 Science Product Guide*.
- Gorelick, N., Hancher, M., Dixon, M., Ilyushchenko, S., Thau, D., & Moore, R. (2017). Google Earth Engine: Planetary-scale geospatial analysis for everyone. *Remote Sensing of Environment*, 202, 18–27.

## Penyusun
Briliant Natasya Nivani
Kartografi dan Penginderaan Jauh
