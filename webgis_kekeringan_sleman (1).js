var AOI_ASSET = 'projects/ee-briliant2709/assets/KabupatenSleman';

var KEC_ASSET = null;
var KEC_DEFAULT_ASSET = 'WM/geoLab/geoBoundaries/600/ADM3';
var KEC_NAME_FIELD = null;
var KEC_FIELD_CANDIDATES = ['WADMKC', 'KECAMATAN', 'Kecamatan', 'kecamatan', 'NAMA_KEC', 'Nama_Kec',
  'NAMKEC', 'nama_kec', 'nm_kec', 'KEC', 'NAME_3', 'shapeName'];

var YEARS = [2023, 2024];

var PERIODS = [
  {name: 'Kemarau (Jun–Sep)', m: [6, 9]},
  {name: 'Puncak kemarau (Agu–Okt)', m: [8, 10]},
  {name: 'Setahun penuh (Jan–Des)', m: [1, 12]}
];
var DEFAULT_PERIOD = 0;
var MAX_CLOUD = 70;
var MAX_CLOUD_MONTHLY = 90;

var USE_LAPSE = true;
var LAPSE = 0.0065;

var BIN = 0.02;
var NDVI_FIT_MIN = 0.15;
var NDVI_FIT_MAX = 0.85;
var MIN_BIN_PX = 30;

var SCALE_STATS = 30;
var N_SAMPLE = 2000;
var SEED = 42;

var PENYUSUN = 'Briliant Natasya Nivani — Kartografi dan Penginderaan Jauh';

var yearStr = YEARS.map(String);
var MULTI = YEARS.length > 1;
var Y0 = YEARS[0], Y1 = YEARS[YEARS.length - 1];

var aoiFc = AOI_ASSET ? ee.FeatureCollection(AOI_ASSET)
  : ee.FeatureCollection('FAO/GAUL/2015/level2')
      .filter(ee.Filter.eq('ADM0_NAME', 'Indonesia'))
      .filter(ee.Filter.eq('ADM2_NAME', 'Sleman'));
var aoi = aoiFc.union(1).geometry();
var aoiOutline = aoiFc.union(1).style({color: '000000', fillColor: '00000000', width: 2});

var L8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2');
var DEM = ee.Image('USGS/SRTMGL1_003').select('elevation');
var ELEV_REF = ee.Number(DEM.reduceRegion({reducer: ee.Reducer.min(), geometry: aoi,
  scale: 30, maxPixels: 1e10}).get('elevation'));

var LEVEL5 = ['Sangat rendah', 'Rendah', 'Sedang', 'Tinggi', 'Sangat tinggi'];

var CLASS_DEF = {
  TVDI: {
    title: 'TVDI — tingkat kekeringan lahan', band: 'TVDI', unit: '', dec: 2,
    about: 'TVDI = (LST − LSTmin) / (LSTmax − LSTmin), dengan LSTmax = a₁ + b₁·NDVI (dry edge) dan ' +
           'LSTmin = a₂ + b₂·NDVI (wet edge) dari ruang segitiga NDVI–LST. 0 = sangat basah, 1 = sangat kering ' +
           '(Sandholt dkk., 2002).',
    breaks: [0.2, 0.4, 0.6, 0.8],
    names: ['Sangat basah', 'Basah', 'Normal', 'Kering', 'Sangat kering'],
    ranges: ['0 – 0,2', '0,2 – 0,4', '0,4 – 0,6', '0,6 – 0,8', '0,8 – 1'],
    colors: ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c'],
    desc: [
      'Lengas tanah sangat tinggi: sawah tergenang/irigasi teknis, vegetasi rapat di sempadan sungai.',
      'Lengas tinggi: sawah irigasi, kebun campuran, hutan lereng Merapi.',
      'Lengas sedang: tegalan, pekarangan, sawah fase akhir.',
      'Lengas rendah: lahan kering/tadah hujan, sawah bera, permukiman bervegetasi.',
      'Lengas sangat rendah: lahan terbuka, endapan pasir/material Merapi, lahan terbangun padat.'
    ]
  },
  LST: {
    title: USE_LAPSE ? 'LST terkoreksi elevasi' : 'Land Surface Temperature (LST)',
    band: 'LSTc', unit: ' °C', dec: 1,
    about: 'LST (°C) = ST_B10 × 0,00341802 + 149,0 − 273,15 (produk Surface Temperature Landsat C2 L2).' +
           (USE_LAPSE ? ' Dikoreksi elevasi: LSTc = LST + ' + String(LAPSE).replace('.', ',') +
           ' × (elevasi − elevasi terendah Sleman), DEM SRTM 30 m.' : ''),
    breaks: [26, 30, 34, 38],
    names: LEVEL5,
    ranges: ['< 26 °C', '26 – 30 °C', '30 – 34 °C', '34 – 38 °C', '≥ 38 °C'],
    colors: ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c'],
    desc: [
      'Sangat sejuk: hutan rapat, sawah tergenang, badan air.',
      'Sejuk: sawah irigasi, kebun campuran.',
      'Sedang: tegalan, permukiman bervegetasi.',
      'Panas: permukiman padat, lahan kering terbuka.',
      'Sangat panas: lahan terbuka/pasir, atap logam dan beton luas.'
    ]
  },
  NDVI: {
    title: 'NDVI — kerapatan vegetasi', band: 'NDVI', unit: '', dec: 3,
    about: 'NDVI = (NIR − Red) / (NIR + Red) = (B5 − B4) / (B5 + B4).',
    breaks: [0.1, 0.2, 0.4, 0.6],
    names: LEVEL5,
    ranges: ['< 0,1', '0,1 – 0,2', '0,2 – 0,4', '0,4 – 0,6', '≥ 0,6'],
    colors: ['#a50026', '#f46d43', '#fee08b', '#a6d96a', '#1a9850'],
    desc: [
      'Non-vegetasi: badan air, lahan terbangun, lahan terbuka/pasir.',
      'Vegetasi sangat jarang: permukiman padat, lahan bera.',
      'Vegetasi jarang–sedang: tegalan, sawah fase awal, pekarangan.',
      'Vegetasi rapat: sawah fase vegetatif, kebun campuran.',
      'Vegetasi sangat rapat: hutan, kebun salak, sawah puncak vegetatif.'
    ]
  },
  NDMI: {
    title: 'NDMI — kelembapan vegetasi', band: 'NDMI', unit: '', dec: 3,
    about: 'NDMI = (NIR − SWIR1) / (NIR + SWIR1) = (B5 − B6) / (B5 + B6). Semakin tinggi, kandungan air ' +
           'vegetasi/tanah semakin tinggi (kebalikan arah TVDI).',
    breaks: [-0.2, 0, 0.2, 0.4],
    names: ['Sangat kering', 'Kering', 'Sedang', 'Lembap', 'Sangat lembap'],
    ranges: ['< −0,2', '−0,2 – 0', '0 – 0,2', '0,2 – 0,4', '≥ 0,4'],
    colors: ['#8c510a', '#d8b365', '#f6e8c3', '#5ab4ac', '#01665e'],
    desc: [
      'Sangat kering: lahan terbuka, pasir, lahan terbangun.',
      'Kering: vegetasi stres air, lahan bera.',
      'Sedang: tegalan, vegetasi campuran.',
      'Lembap: sawah irigasi, kebun rapat.',
      'Sangat lembap: hutan rapat, sawah tergenang.'
    ]
  }
};
var CLASS_KEYS = ['TVDI', 'LST', 'NDVI', 'NDMI'];

var INTERPRETASI = {
  TVDI: 'Tuliskan interpretasi sebaran kekeringan di sini, misalnya kecamatan dengan kelas kering–sangat kering ' +
        'terluas, kaitannya dengan lahan tadah hujan, endapan material Merapi, dan jaringan irigasi.',
  BULANAN: 'Tuliskan interpretasi dinamika bulanan di sini, misalnya bulan dengan LST tertinggi dan NDMI terendah ' +
           'sebagai puncak kekeringan.',
  BANDING: 'Tuliskan interpretasi perbandingan antartahun di sini, misalnya pengaruh El Niño 2023 terhadap ' +
           'perluasan kelas kering dibandingkan 2024.'
};

function prepL8(img) {
  var qa = img.select('QA_PIXEL'), radsat = img.select('QA_RADSAT');
  var mask = qa.bitwiseAnd(30).eq(0)
    .and(radsat.eq(0));
  var sr = img.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6']).multiply(0.0000275).add(-0.2);
  var lst = img.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15).rename('LST');
  var ndvi = sr.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
  var ndmi = sr.normalizedDifference(['SR_B5', 'SR_B6']).rename('NDMI');
  var mndwi = sr.normalizedDifference(['SR_B3', 'SR_B6']).rename('MNDWI');
  return ee.Image.cat([lst, ndvi, ndmi, mndwi, sr.select(['SR_B4', 'SR_B3', 'SR_B2'])])
    .updateMask(mask)
    .copyProperties(img, ['system:time_start']);
}

function filteredCol(yr, m0, m1, maxCloud) {
  return L8.filterBounds(aoi)
    .filterDate(yr + '-01-01', (yr + 1) + '-01-01')
    .filter(ee.Filter.calendarRange(m0, m1, 'month'))
    .filter(ee.Filter.lt('CLOUD_COVER', maxCloud));
}

function addLSTc(img) {
  var lstc = USE_LAPSE
    ? img.select('LST').add(DEM.subtract(ELEV_REF).multiply(LAPSE))
    : img.select('LST');
  return img.addBands(lstc.rename('LSTc'));
}

function composite(yr, pi) {
  var m = PERIODS[pi].m;
  var col = filteredCol(yr, m[0], m[1], MAX_CLOUD);
  return addLSTc(col.map(prepL8).median()).clip(aoi).set({year: yr, n_scenes: col.size()});
}

function tvdiEdges(img) {
  var nd = img.select('NDVI');
  var bin = nd.divide(BIN).floor().int().rename('bin');
  var st = img.select('LSTc').addBands(bin)
    .updateMask(nd.gte(NDVI_FIT_MIN).and(nd.lte(NDVI_FIT_MAX)).and(img.select('MNDWI').lt(0)));
  var groups = ee.List(st.reduceRegion({
    reducer: ee.Reducer.minMax().combine(ee.Reducer.count(), null, true)
      .group({groupField: 1, groupName: 'bin'}),
    geometry: aoi, scale: SCALE_STATS, maxPixels: 1e13, bestEffort: true, tileScale: 4
  }).get('groups'));
  var pts = ee.FeatureCollection(groups.map(function (g) {
    g = ee.Dictionary(g);
    return ee.Feature(null, {
      x: ee.Number(g.get('bin')).multiply(BIN).add(BIN / 2),
      tmax: g.get('max'), tmin: g.get('min'), n: g.get('count')
    });
  })).filter(ee.Filter.gte('n', MIN_BIN_PX));
  var fit = function (y) {
    return ee.Dictionary(pts.reduceColumns(
      ee.Reducer.linearFit().combine(ee.Reducer.pearsonsCorrelation(), null, true), ['x', y]));
  };
  var dry = fit('tmax'), wet = fit('tmin');
  return ee.Dictionary({
    a_dry: dry.get('offset'), b_dry: dry.get('scale'), r_dry: dry.get('correlation'),
    a_wet: wet.get('offset'), b_wet: wet.get('scale'), r_wet: wet.get('correlation'),
    n_bins: pts.size()
  });
}

function tvdiImage(img, e) {
  e = ee.Dictionary(e);
  var nd = img.select('NDVI');
  var tmax = nd.multiply(ee.Number(e.get('b_dry'))).add(ee.Number(e.get('a_dry')));
  var tmin = nd.multiply(ee.Number(e.get('b_wet'))).add(ee.Number(e.get('a_wet')));
  return img.select('LSTc').subtract(tmin).divide(tmax.subtract(tmin))
    .clamp(0, 1)
    .updateMask(img.select('MNDWI').lt(0))
    .rename('TVDI');
}

var DATA = {};
function getData(yr, pi) {
  var k = yr + '_' + pi;
  if (!DATA[k]) {
    var img = composite(yr, pi);
    var e = tvdiEdges(img);
    DATA[k] = {img: img, edges: e, tvdi: tvdiImage(img, e)};
  }
  return DATA[k];
}
function getBand(key, d) { return key === 'TVDI' ? d.tvdi : d.img.select(CLASS_DEF[key].band); }

function classify(img, def) {
  var out = ee.Image(1);
  def.breaks.forEach(function (b, i) { out = out.where(img.gte(b), i + 2); });
  return out.updateMask(img.mask()).rename('kelas');
}
function classIndex(v, def) {
  var k = 0;
  def.breaks.forEach(function (b) { if (v >= b) { k++; } });
  return k;
}

function merge(a, b) {
  var o = {}, k;
  for (k in a) { o[k] = a[k]; }
  for (k in b) { o[k] = b[k]; }
  return o;
}
var REDUCE = {geometry: aoi, scale: SCALE_STATS, maxPixels: 1e13, bestEffort: true, tileScale: 4};
function rr(img, reducer, geom) {
  return img.reduceRegion(merge(REDUCE, geom ? {reducer: reducer, geometry: geom} : {reducer: reducer}));
}
function classAreas(clsImg, geom) {
  return rr(ee.Image.pixelArea().divide(1e6).addBands(clsImg),
    ee.Reducer.sum().group({groupField: 1, groupName: 'kelas'}), geom).get('groups');
}
function groupsToArr(groups) {
  var a = [0, 0, 0, 0, 0];
  (groups || []).forEach(function (g) { a[g.kelas - 1] = Number(g.sum.toFixed(2)); });
  return a;
}
function sum(arr) { var t = 0; arr.forEach(function (v) { t += v; }); return t; }

var STATS = {}, PENDING = {};
function withStats(yr, pi, cb) {
  var k = yr + '_' + pi;
  if (STATS[k]) { cb(STATS[k]); return; }
  if (PENDING[k]) { PENDING[k].push(cb); return; }
  PENDING[k] = [cb];
  var d = getData(yr, pi);
  var img = d.img.select(['LST', 'LSTc', 'NDVI', 'NDMI']).addBands(d.tvdi);
  ee.Dictionary(rr(img, ee.Reducer.mean()))
    .set('TVDI_std', rr(d.tvdi, ee.Reducer.stdDev()).get('TVDI'))
    .set('n_scenes', d.img.get('n_scenes'))
    .set('edges', d.edges)
    .set('areas', classAreas(classify(d.tvdi, CLASS_DEF.TVDI)))
    .evaluate(function (s, err) {
      var cbs = PENDING[k];
      delete PENDING[k];
      if (err || !s) {
        s = {error: 'Gagal menghitung statistik ' + yr + ' (' + (err || 'tidak ada data') +
          '). Kemungkinan tidak ada scene bebas awan pada periode ini — coba periode lain.'};
      } else {
        s.year = yr;
        s.areas = groupsToArr(s.areas);
        s.area_total = sum(s.areas);
        s.pct_kering = s.area_total ? (s.areas[3] + s.areas[4]) / s.area_total * 100 : null;
        STATS[k] = s;
      }
      cbs.forEach(function (c) { c(s); });
    });
}
function withAllStats(pi, cb) {
  var res = {}, left = YEARS.length;
  YEARS.forEach(function (yr) {
    withStats(yr, pi, function (s) { res[yr] = s; left--; if (left === 0) { cb(res); } });
  });
}

var visCont = {
  TVDI: {min: 0, max: 1, palette: CLASS_DEF.TVDI.colors},
  LST: {min: 24, max: 42, palette: CLASS_DEF.LST.colors},
  NDVI: {min: -0.2, max: 0.8, palette: CLASS_DEF.NDVI.colors},
  NDMI: {min: -0.3, max: 0.5, palette: CLASS_DEF.NDMI.colors}
};
var visDiff = {min: -0.4, max: 0.4, palette: ['#1a9641', '#a6d96a', '#ffffbf', '#fdae61', '#d7191c']};

var LAYERS = [
  {name: 'TVDI – kelas kekeringan', kind: 'class', key: 'TVDI',
   info: 'Tingkat kekeringan lahan dalam 5 kelas (lihat tab Keterangan Kelas).'},
  {name: 'TVDI – kontinu (0–1)', kind: 'cont', key: 'TVDI',
   info: 'Nilai TVDI: 0 = sangat basah, 1 = sangat kering.'}
];
if (MULTI) {
  LAYERS.push({name: 'Perubahan TVDI ' + Y0 + ' → ' + Y1, kind: 'diff',
    info: 'Selisih TVDI ' + Y1 + ' − ' + Y0 + ' pada periode yang sama. Merah = makin kering, hijau = makin basah.'});
}
LAYERS = LAYERS.concat([
  {name: 'LST – kelas', kind: 'class', key: 'LST', info: 'Kelas suhu permukaan (terkoreksi elevasi).'},
  {name: 'LST – kontinu (°C)', kind: 'cont', key: 'LST', info: 'Suhu permukaan median periode terpilih (°C).'},
  {name: 'NDVI – kelas', kind: 'class', key: 'NDVI', info: 'Kelas kerapatan vegetasi.'},
  {name: 'NDVI – kontinu', kind: 'cont', key: 'NDVI', info: 'Nilai NDVI (−1 s.d. 1).'},
  {name: 'NDMI – kelas', kind: 'class', key: 'NDMI', info: 'Kelas kelembapan vegetasi/tanah.'},
  {name: 'NDMI – kontinu', kind: 'cont', key: 'NDMI', info: 'Nilai NDMI (−1 s.d. 1).'},
  {name: 'Citra true color (median)', kind: 'rgb', info: 'Komposit median warna asli (B4-B3-B2) sebagai acuan visual.'}
]);
function layerIndex(name) {
  for (var i = 0; i < LAYERS.length; i++) { if (LAYERS[i].name === name) { return i; } }
  return 0;
}

function buildLayer(L, yr) {
  var d = getData(yr, state.period);
  if (L.kind === 'class') {
    return {image: classify(getBand(L.key, d), CLASS_DEF[L.key]),
            vis: {min: 1, max: 5, palette: CLASS_DEF[L.key].colors}};
  }
  if (L.kind === 'cont') { return {image: getBand(L.key, d), vis: visCont[L.key]}; }
  if (L.kind === 'diff') {
    return {image: getData(Y1, state.period).tvdi.subtract(getData(Y0, state.period).tvdi).rename('dTVDI'),
            vis: visDiff};
  }
  return {image: d.img.select(['SR_B4', 'SR_B3', 'SR_B2']), vis: {min: 0, max: 0.3, gamma: 1.2}};
}

var C = {primary: '#8c510a', text: '#2b2b2b', muted: '#6b6b6b', border: '#e6d3b3'};
var RP_ORANGE = '#fff4e5', RP_BLUE = '#eaf3fb', RP_GREEN = '#eef7ee', RP_GREY = '#f4f4f4', RP_YELLOW = '#fffbe6';
var NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'];
var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function fmt(v, d) {
  if (v === null || v === undefined || isNaN(v)) { return '–'; }
  return Number(v).toFixed(d === undefined ? 2 : d).replace('.', ',');
}
function signed(v, d) { return (v > 0 ? '+' : '') + fmt(v, d); }
function title(t) { return ui.Label(t, {fontSize: '16px', fontWeight: 'bold', color: C.primary, margin: '14px 10px 4px 10px'}); }
function subtitle(t) { return ui.Label(t, {fontSize: '13px', fontWeight: 'bold', color: C.text, margin: '12px 10px 2px 10px'}); }
function para(t) { return ui.Label(t, {fontSize: '12px', color: C.text, margin: '3px 10px', whiteSpace: 'pre-wrap'}); }
function note(t) { return ui.Label(t, {fontSize: '11px', color: C.muted, margin: '2px 10px', whiteSpace: 'pre-wrap'}); }
function loadingLabel(t) { return ui.Label('⏳ ' + (t || 'Memuat…'), {fontSize: '12px', color: C.muted, margin: '6px 10px'}); }
function card(ws) {
  return ui.Panel(ws, ui.Panel.Layout.flow('vertical'), {border: '1px solid ' + C.border, padding: '4px', margin: '6px 10px'});
}
function chip(color) {
  return ui.Label('', {backgroundColor: color, padding: '7px', margin: '2px 6px 2px 0', border: '1px solid #888'});
}
function rpLabel(t, bg, st) {
  return ui.Label(t, merge({fontSize: '12px', color: C.text, backgroundColor: bg, margin: '2px 4px', whiteSpace: 'pre-wrap'}, st || {}));
}
function rpSection(t, bg, widgets) {
  return ui.Panel([ui.Label(t, {fontWeight: 'bold', fontSize: '13px', color: C.primary, backgroundColor: bg,
      margin: '2px 4px 6px 4px'})].concat(widgets),
    ui.Panel.Layout.flow('vertical'),
    {backgroundColor: bg, border: '1px solid ' + C.border, padding: '6px', margin: '8px 8px 4px 8px'});
}
function rpRow(k, v, bg, color) {
  return ui.Panel([
    rpLabel(k, bg, {color: C.muted, width: '150px'}),
    rpLabel(v, bg, {fontWeight: 'bold', color: color || C.text})
  ], ui.Panel.Layout.flow('horizontal'), {backgroundColor: bg});
}
function edgeEq(a, b, lbl) {
  return lbl + ' = ' + fmt(a, 2) + (b >= 0 ? ' + ' : ' − ') + fmt(Math.abs(b), 2) + ' × NDVI';
}
function pieChart(key, areas, ttl) {
  var d = CLASS_DEF[key];
  var rows = d.names.map(function (n, i) { return [n, areas[i]]; });
  return ui.Chart([['Kelas', 'Luas (km²)']].concat(rows), 'PieChart', {
    title: ttl, colors: d.colors, pieHole: 0.4, legend: {position: 'right'}, height: 220, sliceVisibilityThreshold: 0});
}
function goBtn(label, layerName) {
  return ui.Button({label: label, style: {margin: '4px 10px'}, onClick: function () {
    state.layer = layerIndex(layerName);
    layerSelect.setValue(layerName, false);
    showTab('Peta');
    refresh();
  }});
}

var state = {year: Y1, yearB: Y0, period: DEFAULT_PERIOD, layer: 0, opacity: 0.85,
             compare: false, showKec: true, kec: null, clipKec: false,
             clickPt: null, inspectKey: null, dataLayers: [], toggleBtns: []};

var kecFc = null, kecOutline = null, KEC_NAMES = [], KEC_SOURCE_LABEL = null;
function kecGeom(name) { return kecFc.filter(ee.Filter.eq('nama', name)).geometry(); }

var mainMap = ui.Map(), leftMap = ui.Map(), rightMap = ui.Map();
[mainMap, leftMap, rightMap].forEach(function (m) {
  m.setOptions('HYBRID');
  m.setControlVisibility({layerList: true, zoomControl: true, mapTypeControl: true, fullscreenControl: true});
  m.style().set('cursor', 'crosshair');
  m.centerObject(aoi, 11);
});
mainMap.style().set('stretch', 'both');
ui.Map.Linker([leftMap, rightMap]);
var split = ui.SplitPanel({firstPanel: leftMap, secondPanel: rightMap,
  orientation: 'horizontal', wipe: true, style: {stretch: 'both'}});

function gradientBar(palette) {
  return ui.Thumbnail({
    image: ee.Image.pixelLonLat().select(0),
    params: {bbox: [0, 0, 1, 0.1], dimensions: '220x12', format: 'png', min: 0, max: 1, palette: palette},
    style: {stretch: 'horizontal', margin: '0', maxHeight: '14px'}
  });
}
function threeLabels(a, b, c) {
  return ui.Panel([
    ui.Label(a, {fontSize: '11px', margin: '2px 0'}),
    ui.Label(b, {fontSize: '11px', margin: '2px 0', stretch: 'horizontal', textAlign: 'center'}),
    ui.Label(c, {fontSize: '11px', margin: '2px 0'})
  ], ui.Panel.Layout.flow('horizontal'));
}
function makeLegend(L, yr) {
  var p = ui.Panel({style: {position: 'bottom-left', padding: '8px 10px', backgroundColor: 'rgba(255,255,255,0.92)'}});
  var head = L.kind === 'diff' ? L.name : L.name + ' · ' + yr;
  p.add(ui.Label(head, {fontWeight: 'bold', fontSize: '13px', margin: '0 0 2px 0'}));
  p.add(ui.Label(PERIODS[state.period].name, {fontSize: '11px', color: C.muted, margin: '0 0 6px 0'}));
  if (L.kind === 'class') {
    var d = CLASS_DEF[L.key];
    d.names.forEach(function (n, i) {
      p.add(ui.Panel([chip(d.colors[i]), ui.Label(n + '  (' + d.ranges[i] + ')', {fontSize: '12px', margin: '3px 0'})],
        ui.Panel.Layout.flow('horizontal')));
    });
  } else if (L.kind === 'cont') {
    var v = visCont[L.key], u = CLASS_DEF[L.key].unit;
    p.add(gradientBar(v.palette));
    p.add(threeLabels(fmt(v.min, 1) + u, fmt((v.min + v.max) / 2, 1) + u, fmt(v.max, 1) + u));
  } else if (L.kind === 'diff') {
    p.add(gradientBar(visDiff.palette));
    p.add(threeLabels('≤ −0,4\nmakin basah', 'tetap', '≥ +0,4\nmakin kering'));
  } else {
    p.add(ui.Label('Komposit median B4-B3-B2', {fontSize: '11px', margin: '0'}));
  }
  return p;
}

var inspector = ui.Panel({style: {position: 'bottom-right', width: '320px', padding: '8px',
  backgroundColor: 'rgba(255,255,255,0.96)', shown: false}});
var markerLayer = null;
mainMap.add(inspector);

function clearMap(map) {
  var i, items = [];
  for (i = 0; i < map.layers().length(); i++) { items.push(map.layers().get(i)); }
  for (i = 0; i < map.widgets().length(); i++) { items.push(map.widgets().get(i)); }
  items.forEach(function (it) { if (it !== inspector) { map.remove(it); } });
}

function drawMap(map, yr, badge, withToggle) {
  var L = LAYERS[state.layer];
  clearMap(map);
  var lyr = buildLayer(L, yr);
  if (kecFc && state.kec && state.clipKec) { lyr.image = lyr.image.clip(kecGeom(state.kec)); }
  var layer = ui.Map.Layer(lyr.image, lyr.vis, L.name + (L.kind === 'diff' ? '' : ' ' + yr), true, state.opacity);
  map.layers().add(layer);
  state.dataLayers.push(layer);
  map.addLayer(aoiOutline, {}, 'Batas Kab. Sleman');
  if (kecOutline && state.showKec) { map.addLayer(kecOutline, {}, 'Batas kecamatan'); }
  if (kecFc && state.kec) {
    map.addLayer(kecFc.filter(ee.Filter.eq('nama', state.kec))
      .style({color: 'FFFF00', fillColor: '00000000', width: 3}), {}, 'Kecamatan ' + state.kec);
  }
  map.add(makeLegend(L, yr));
  if (withToggle) {
    var tb = ui.Button({label: rightPanel.style().get('shown') ? 'Sembunyikan statistik ▶' : '◀ Statistik',
      onClick: toggleRight, style: {position: 'middle-right', margin: '0', padding: '0'}});
    state.toggleBtns.push(tb);
    map.add(tb);
  }
  if (badge) {
    map.add(ui.Label(badge, {position: 'top-center', fontWeight: 'bold', fontSize: '16px',
      padding: '4px 12px', backgroundColor: 'rgba(255,255,255,0.92)'}));
  }
}

function valueRow(key, val, label) {
  var d = CLASS_DEF[key], idx = classIndex(val, d);
  return ui.Panel([chip(d.colors[idx]),
    ui.Label((label || key) + ': ' + fmt(val, d.dec) + d.unit + '  →  ' + d.names[idx], {fontSize: '12px', margin: '3px 0'})],
    ui.Panel.Layout.flow('horizontal'));
}

function inspect(lon, lat) {
  var yr = state.year, pi = state.period;
  state.inspectKey = yr + '_' + pi;
  inspector.clear();
  inspector.style().set('shown', true);
  inspector.add(ui.Panel([
    ui.Label('Nilai piksel · ' + yr, {fontWeight: 'bold', fontSize: '13px', margin: '6px 0', stretch: 'horizontal'}),
    ui.Button({label: '✕', style: {margin: '0', padding: '0'}, onClick: function () {
      inspector.style().set('shown', false);
      state.clickPt = null;
      if (markerLayer) { mainMap.layers().remove(markerLayer); markerLayer = null; }
    }})], ui.Panel.Layout.flow('horizontal')));
  inspector.add(ui.Label(PERIODS[pi].name + ' · Lat ' + lat.toFixed(5) + ', Lon ' + lon.toFixed(5),
    {fontSize: '11px', color: C.muted, margin: '0 0 4px 0'}));
  var kecRow = ui.Panel();
  inspector.add(kecRow);
  var body = ui.Panel([loadingLabel('Membaca nilai…')]);
  inspector.add(body);

  var pt = ee.Geometry.Point([lon, lat]);
  if (kecFc) {
    kecFc.filterBounds(pt).aggregate_array('nama').evaluate(function (names) {
      if (!names || !names.length) { return; }
      var nm = String(names[0]);
      kecRow.add(ui.Panel([
        ui.Label('📍 Kecamatan ' + nm, {fontSize: '12px', fontWeight: 'bold', margin: '6px 0', stretch: 'horizontal'}),
        ui.Button({label: 'Fokus', style: {margin: '0', padding: '0'}, onClick: function () { focusKec(nm); }})
      ], ui.Panel.Layout.flow('horizontal')));
    });
  }
  var d = getData(yr, pi);
  var img = d.img.select(['LST', 'LSTc', 'NDVI', 'NDMI']).addBands(d.tvdi).addBands(DEM.rename('ELEV'));
  YEARS.forEach(function (y) { img = img.addBands(getData(y, pi).tvdi.rename('TVDI_' + y)); });
  img.reduceRegion({reducer: ee.Reducer.first(), geometry: pt, scale: 30}).evaluate(function (v, err) {
    body.clear();
    if (err || !v || v.LST === null || v.LST === undefined) {
      body.add(ui.Label('Tidak ada data (di luar wilayah, badan air, atau tertutup awan).', {fontSize: '12px'}));
      return;
    }
    if (v.TVDI !== null && v.TVDI !== undefined) { body.add(valueRow('TVDI', v.TVDI, 'TVDI (kekeringan)')); }
    body.add(valueRow('LST', v.LSTc, USE_LAPSE ? 'LST terkoreksi' : 'LST'));
    if (USE_LAPSE) {
      body.add(ui.Label('LST asli: ' + fmt(v.LST, 1) + ' °C · elevasi ' + fmt(v.ELEV, 0) + ' m',
        {fontSize: '11px', color: C.muted, margin: '0 0 2px 22px'}));
    }
    body.add(valueRow('NDVI', v.NDVI));
    body.add(valueRow('NDMI', v.NDMI));
    if (MULTI) {
      var a = v['TVDI_' + Y0], b = v['TVDI_' + Y1];
      if (a !== null && a !== undefined && b !== null && b !== undefined) {
        var dd = b - a;
        var arah = Math.abs(dd) < 0.05 ? 'relatif tetap' : (dd > 0 ? 'makin kering' : 'makin basah');
        body.add(ui.Label('TVDI ' + Y0 + ': ' + fmt(a) + ' → ' + Y1 + ': ' + fmt(b) + '  (' + signed(dd) + ', ' + arah + ')',
          {fontSize: '12px', fontWeight: 'bold', margin: '6px 0 0 0'}));
      }
    }
  });
}

mainMap.onClick(function (c) {
  state.clickPt = [c.lon, c.lat];
  if (markerLayer) { mainMap.layers().remove(markerLayer); }
  markerLayer = ui.Map.Layer(ee.Geometry.Point(state.clickPt), {color: '00FFFF'}, 'Titik klik');
  mainMap.layers().add(markerLayer);
  inspect(c.lon, c.lat);
});

function refresh() {
  state.dataLayers = [];
  state.toggleBtns = [];
  layerInfo.setValue(LAYERS[state.layer].info);
  if (state.compare) {
    drawMap(leftMap, state.year, '◀ ' + state.year, false);
    drawMap(rightMap, state.yearB, state.yearB + ' ▶', true);
  } else {
    drawMap(mainMap, state.year, null, true);
    if (state.clickPt) {
      markerLayer = ui.Map.Layer(ee.Geometry.Point(state.clickPt), {color: '00FFFF'}, 'Titik klik');
      mainMap.layers().add(markerLayer);
      if (state.inspectKey !== state.year + '_' + state.period) { inspect(state.clickPt[0], state.clickPt[1]); }
    }
  }
  updateSummary();
  if (currentTab === 'Analisis') { showPage(pageSelect.getValue()); }
}

var header = ui.Panel([
  ui.Label('WebGIS Tingkat Kekeringan Lahan', {fontSize: '20px', fontWeight: 'bold', color: 'white', backgroundColor: C.primary, margin: '0'}),
  ui.Label('Kabupaten Sleman · Landsat 8 OLI/TIRS C2 L2 · ' + YEARS.join(' & ') + ' · indeks TVDI',
    {fontSize: '12px', color: 'white', backgroundColor: C.primary, margin: '4px 0 0 0'}),
  ui.Button({label: '« Tutup panel', style: {margin: '6px 0 0 0', padding: '0'},
    onClick: function () { ui.root.widgets().set(0, leftStrip); }})
], ui.Panel.Layout.flow('vertical'), {backgroundColor: C.primary, padding: '12px'});

var leftStrip = ui.Panel([
  ui.Button({label: '»', onClick: function () { ui.root.widgets().set(0, side); }, style: {margin: '6px 2px', padding: '0'}}),
  ui.Label('Buka panel', {fontSize: '10px', color: C.muted, margin: '0 4px', whiteSpace: 'pre-wrap'})
], ui.Panel.Layout.flow('vertical'), {width: '56px', padding: '0'});

var TAB_NAMES = ['Peta', 'Analisis', 'Keterangan Kelas', 'Metodologi'];
var currentTab = 'Peta';
var content = ui.Panel();
var tabButtons = TAB_NAMES.map(function (n) {
  return ui.Button({label: n, style: {margin: '2px', padding: '0'}, onClick: function () { showTab(n); }});
});
var tabBar = ui.Panel(tabButtons, ui.Panel.Layout.flow('horizontal', true), {margin: '6px 6px 0 6px'});

function showTab(n) {
  currentTab = n;
  tabButtons.forEach(function (b, i) { b.setLabel((TAB_NAMES[i] === n ? '● ' : '') + TAB_NAMES[i]); });
  content.clear();
  if (n === 'Peta') { content.add(mapTab); }
  if (n === 'Analisis') { content.add(analisisTab); showPage(pageSelect.getValue()); }
  if (n === 'Keterangan Kelas') { content.add(kelasTab); }
  if (n === 'Metodologi') { content.add(buildMetodologi()); }
}

var yearSelect = ui.Select({items: yearStr, value: String(state.year), style: {stretch: 'horizontal'},
  onChange: function (v) { state.year = Number(v); refresh(); }});
var periodSelect = ui.Select({items: PERIODS.map(function (p) { return p.name; }), value: PERIODS[state.period].name,
  style: {stretch: 'horizontal', margin: '4px 10px'},
  onChange: function (v) {
    PERIODS.forEach(function (p, i) { if (p.name === v) { state.period = i; } });
    refresh();
  }});
var layerSelect = ui.Select({items: LAYERS.map(function (l) { return l.name; }), value: LAYERS[0].name,
  style: {stretch: 'horizontal', margin: '4px 10px'},
  onChange: function (v) { state.layer = layerIndex(v); refresh(); }});
var layerInfo = note(LAYERS[0].info);
var opacitySlider = ui.Slider({min: 0, max: 1, step: 0.05, value: state.opacity, style: {stretch: 'horizontal', margin: '4px 10px'},
  onChange: function (v) { state.opacity = v; state.dataLayers.forEach(function (l) { l.setOpacity(v); }); }});
var yearBSelect = ui.Select({items: yearStr, value: String(state.yearB),
  onChange: function (v) { state.yearB = Number(v); refresh(); }});
var yearBPanel = ui.Panel([ui.Label('Tahun kanan:', {fontSize: '12px', margin: '8px 6px 0 10px'}), yearBSelect],
  ui.Panel.Layout.flow('horizontal'), {shown: false});
var compareCheck = ui.Checkbox({label: 'Mode bandingkan 2 tahun (geser pembatas peta)', value: false,
  style: {margin: '8px 10px 0 10px', shown: MULTI},
  onChange: function (v) {
    state.compare = v;
    yearBPanel.style().set('shown', v);
    ui.root.widgets().set(1, v ? split : mainMap);
    refresh();
  }});

var KEC_ALL = 'Semua kecamatan (Kab. Sleman)';
var kecCheck = ui.Checkbox({label: 'Tampilkan batas kecamatan', value: true, style: {margin: '4px 10px', shown: false},
  onChange: function (v) { state.showKec = v; refresh(); }});
var kecClipCheck = ui.Checkbox({label: 'Tampilkan layer hanya di kecamatan terpilih', value: false,
  style: {margin: '4px 10px', shown: false},
  onChange: function (v) { state.clipKec = v; refresh(); }});
var kecSelect = ui.Select({items: [KEC_ALL], value: KEC_ALL, disabled: true, style: {stretch: 'horizontal', margin: '4px 10px'},
  onChange: function (v) {
    state.kec = (v === KEC_ALL) ? null : v;
    [mainMap, leftMap].forEach(function (m) {
      if (state.kec) { m.centerObject(kecGeom(state.kec)); } else { m.centerObject(aoi, 11); }
    });
    refresh();
  }});
var kecStatus = note('⏳ Memuat daftar kecamatan…');
function focusKec(nm) { if (KEC_NAMES.indexOf(nm) >= 0) { showTab('Peta'); kecSelect.setValue(nm); } }

var mapTab = ui.Panel([
  card([
    para('Jelajahi tingkat kekeringan lahan Kabupaten Sleman berdasarkan TVDI, didukung suhu permukaan (LST), ' +
         'kerapatan vegetasi (NDVI), dan kelembapan (NDMI).'),
    note('Cara pakai: pilih tahun, periode, dan layer → klik titik di peta untuk melihat nilai dan kelasnya → ' +
         'buka tab Analisis untuk segitiga NDVI–LST, dinamika bulanan, dan perbandingan tahun.')
  ]),
  subtitle('Tahun'), ui.Panel([yearSelect], ui.Panel.Layout.flow('horizontal'), {margin: '0 6px'}),
  subtitle('Periode komposit'), periodSelect,
  subtitle('Layer'), layerSelect, layerInfo,
  subtitle('Transparansi layer'), opacitySlider,
  compareCheck, yearBPanel,
  subtitle('Kecamatan'), kecSelect, kecClipCheck, kecCheck, kecStatus,
  note('Ringkasan statistik tampil di panel kanan; tombol "Statistik" di sisi kanan peta untuk menampilkan/menyembunyikan.')
]);

var rightPanel = ui.Panel({style: {width: '340px', padding: '0', shown: true}});
function toggleRight() {
  var shown = !rightPanel.style().get('shown');
  rightPanel.style().set('shown', shown);
  state.toggleBtns.forEach(function (b) { b.setLabel(shown ? 'Sembunyikan statistik ▶' : '◀ Statistik'); });
}

var kecRankCache = {}, kecStatCache = {}, pieCache = {};

function kecRanking(yr, pi, cb) {
  var k = yr + '_' + pi;
  if (kecRankCache[k]) { cb(kecRankCache[k]); return; }
  getData(yr, pi).tvdi.reduceRegions({collection: kecFc, reducer: ee.Reducer.mean(), scale: SCALE_STATS, tileScale: 4})
    .filter(ee.Filter.notNull(['mean'])).sort('mean', false)
    .reduceColumns(ee.Reducer.toList(2), ['nama', 'mean']).get('list')
    .evaluate(function (list, err) {
      if (err || !list) { cb(null); return; }
      kecRankCache[k] = list;
      cb(list);
    });
}

function kecTopPanel(yr, pi, label) {
  var bg = RP_YELLOW;
  var inner = ui.Panel([rpLabel('⏳ Menghitung peringkat kecamatan…', bg)], ui.Panel.Layout.flow('vertical'), {backgroundColor: bg});
  kecRanking(yr, pi, function (list) {
    inner.clear();
    if (!list) { inner.add(rpLabel('Gagal menghitung peringkat.', bg)); return; }
    var row = function (it, i) {
      return ui.Panel([rpLabel((i + 1) + '.', bg, {width: '24px'}),
        ui.Button({label: String(it[0]) + ' · TVDI ' + fmt(it[1]), style: {margin: '1px 0', padding: '0'},
          onClick: function () { focusKec(String(it[0])); }})], ui.Panel.Layout.flow('horizontal'), {backgroundColor: bg});
    };
    inner.add(rpLabel('🔥 5 terkering', bg, {fontWeight: 'bold'}));
    list.slice(0, 5).forEach(function (it, i) { inner.add(row(it, i)); });
    var start = Math.max(5, list.length - 3);
    if (start < list.length) {
      inner.add(rpLabel('💧 Terbasah', bg, {fontWeight: 'bold'}));
      list.slice(start).forEach(function (it, j) { inner.add(row(it, start + j)); });
    }
  });
  return rpSection(label + ' Kecamatan Terkering & Terbasah — ' + yr, bg, [inner,
    rpLabel('Diurutkan dari TVDI rata-rata. Klik nama untuk detail.', bg, {fontSize: '11px', color: C.muted})]);
}

function kecDetailPanel(name, yr, pi, label) {
  var bg = RP_YELLOW, holder = ui.Panel(), k = name + '_' + yr + '_' + pi;
  var fill = function (s) {
    holder.clear();
    var tot = sum(s.areas), rankRow = rpRow('Peringkat kekeringan', '⏳', bg);
    var rows = [
      rpRow('Luas kecamatan', fmt(s.area_km2, 1) + ' km²', bg),
      rpRow('TVDI rata-rata', fmt(s.TVDI) + '  (' + CLASS_DEF.TVDI.names[classIndex(s.TVDI, CLASS_DEF.TVDI)] + ')', bg, C.primary),
      rpRow('Luas kering + sangat kering', fmt(s.areas[3] + s.areas[4], 1) + ' km² (' +
        fmt(tot ? (s.areas[3] + s.areas[4]) / tot * 100 : null, 1) + '%)', bg),
      rpRow('LST rata-rata', fmt(s.LSTc, 1) + ' °C', bg),
      rpRow('NDVI rata-rata', fmt(s.NDVI, 3), bg),
      rpRow('NDMI rata-rata', fmt(s.NDMI, 3), bg),
      rankRow
    ];
    holder.add(rpSection(label + ' Kecamatan ' + name + ' — ' + yr, bg, rows));
    holder.add(pieChart('TVDI', s.areas, 'Kelas TVDI Kec. ' + name + ' · ' + yr));
    kecRanking(yr, pi, function (list) {
      var txt = '–';
      (list || []).forEach(function (it, i) {
        if (String(it[0]) === name) { txt = 'ke-' + (i + 1) + ' terkering dari ' + list.length + ' kecamatan'; }
      });
      rankRow.widgets().get(1).setValue(txt);
    });
    holder.add(ui.Button({label: '↩ Kembali ke seluruh kabupaten', style: {margin: '4px 8px'},
      onClick: function () { kecSelect.setValue(KEC_ALL); }}));
  };
  if (kecStatCache[k]) { fill(kecStatCache[k]); return holder; }
  holder.add(loadingLabel('Menghitung statistik Kecamatan ' + name + '…'));
  var d = getData(yr, pi), g = kecGeom(name);
  ee.Dictionary(rr(d.img.select(['LSTc', 'NDVI', 'NDMI']).addBands(d.tvdi), ee.Reducer.mean(), g))
    .set('areas', classAreas(classify(d.tvdi, CLASS_DEF.TVDI), g))
    .set('area_km2', g.area(1).divide(1e6))
    .evaluate(function (s, err) {
      if (err || !s) { holder.clear(); holder.add(note('Gagal menghitung: ' + err)); return; }
      s.areas = groupsToArr(s.areas);
      kecStatCache[k] = s;
      fill(s);
    });
  return holder;
}

function piePanel(key, yr, pi) {
  var id = key + '_' + yr + '_' + pi, p = ui.Panel();
  if (pieCache[id]) { p.add(pieChart(key, pieCache[id], 'Komposisi kelas ' + key + ' · ' + yr)); return p; }
  p.add(loadingLabel('Menghitung komposisi kelas…'));
  ee.List([classAreas(classify(getBand(key, getData(yr, pi)), CLASS_DEF[key]))]).evaluate(function (r, err) {
    p.clear();
    if (err) { p.add(note('Gagal menghitung: ' + err)); return; }
    pieCache[id] = groupsToArr(r[0]);
    p.add(pieChart(key, pieCache[id], 'Komposisi kelas ' + key + ' · ' + yr));
  });
  return p;
}

function readingGuide(L) {
  var t;
  if (L.kind === 'class') {
    var d = CLASS_DEF[L.key];
    t = '• Warna menunjukkan 5 kelas ' + L.key + ', dari "' + d.names[0] + '" (' + d.ranges[0] + ') hingga "' +
        d.names[4] + '" (' + d.ranges[4] + ').\n• ' + L.info;
  } else if (L.kind === 'cont') {
    var v = visCont[L.key], u = CLASS_DEF[L.key].unit;
    t = '• Gradasi warna menunjukkan nilai ' + L.key + ' dari ' + fmt(v.min, 1) + u + ' hingga ' + fmt(v.max, 1) + u + '.\n• ' + L.info;
  } else if (L.kind === 'diff') {
    t = '• ' + L.info + '\n• Kuning = perubahan kecil (±0,1).';
  } else {
    t = '• ' + L.info + ' Gunakan untuk mencocokkan pola kekeringan dengan objek nyata.';
  }
  return t + '\n• Klik di peta untuk melihat nilai piksel.\n• Lahan terbangun dan pasir cenderung terbaca "kering" ' +
    'karena panas dan minim vegetasi — perhatikan saat menafsirkan.';
}

var summaryToken = 0;
function updateSummary() {
  var token = ++summaryToken;
  var L = LAYERS[state.layer], yr = state.year, pi = state.period;
  rightPanel.clear();
  rightPanel.add(ui.Panel([
    ui.Label('📊 Statistik Kekeringan', {fontSize: '16px', fontWeight: 'bold', color: 'white', backgroundColor: C.primary, margin: '4px 0'}),
    ui.Button({label: 'Tutup »', onClick: toggleRight, style: {margin: '0', padding: '0'}})
  ], ui.Panel.Layout.flow('horizontal'), {backgroundColor: C.primary, padding: '8px 12px'}));
  var holder = ui.Panel([loadingLabel('Menghitung statistik ' + yr + '…')]);
  rightPanel.add(holder);

  withStats(yr, pi, function (s) {
    if (token !== summaryToken) { return; }
    holder.clear();
    if (s.error) { holder.add(note('⚠ ' + s.error)); return; }
    var n = 0, num = function () { return NUMS[n++]; };
    var e = s.edges;

    holder.add(rpSection(num() + ' Ringkasan Kekeringan — ' + yr, RP_ORANGE, [
      rpLabel('Komposit median ' + PERIODS[pi].name + ' dari ' + s.n_scenes + ' scene Landsat 8.', RP_ORANGE,
        {fontSize: '11px', color: C.muted}),
      rpRow('TVDI rata-rata (μ)', fmt(s.TVDI) + '  (' + CLASS_DEF.TVDI.names[classIndex(s.TVDI, CLASS_DEF.TVDI)] + ')', RP_ORANGE, C.primary),
      rpRow('TVDI simpangan baku (σ)', fmt(s.TVDI_std), RP_ORANGE),
      rpRow('Luas kering + sangat kering', fmt(s.areas[3] + s.areas[4], 1) + ' km² (' + fmt(s.pct_kering, 1) + '%)', RP_ORANGE, '#d7191c'),
      rpRow('Luas terklasifikasi', fmt(s.area_total, 1) + ' km²', RP_ORANGE),
      rpRow(USE_LAPSE ? 'LST terkoreksi rata-rata' : 'LST rata-rata', fmt(s.LSTc, 2) + ' °C', RP_ORANGE),
      rpRow('NDVI rata-rata', fmt(s.NDVI, 3), RP_ORANGE),
      rpRow('NDMI rata-rata', fmt(s.NDMI, 3), RP_ORANGE)
    ]));

    var edgeWarn = (e.b_dry >= 0) ? [rpLabel('⚠ Kemiringan dry edge tidak negatif — segitiga NDVI–LST kurang ideal, ' +
      'coba periode lain.', RP_BLUE, {color: '#b2182b', fontSize: '11px'})] : [];
    holder.add(rpSection(num() + ' Persamaan Dry & Wet Edge', RP_BLUE, [
      rpLabel(edgeEq(e.a_dry, e.b_dry, 'LSTmax') + '   (r = ' + fmt(e.r_dry, 3) + ')', RP_BLUE),
      rpLabel(edgeEq(e.a_wet, e.b_wet, 'LSTmin') + '   (r = ' + fmt(e.r_wet, 3) + ')', RP_BLUE),
      rpLabel('Dari ' + e.n_bins + ' interval NDVI (' + fmt(NDVI_FIT_MIN, 2) + ' – ' + fmt(NDVI_FIT_MAX, 2) + ').', RP_BLUE,
        {fontSize: '11px', color: C.muted})
    ].concat(edgeWarn)));

    holder.add(subtitle(num() + ' Komposisi Kelas TVDI — ' + yr));
    holder.add(pieChart('TVDI', s.areas, 'Kelas kekeringan · ' + yr));

    if (MULTI) {
      var cmp = ui.Panel([rpLabel('⏳ Menghitung tahun lain…', RP_GREY)], ui.Panel.Layout.flow('vertical'), {backgroundColor: RP_GREY});
      holder.add(rpSection(num() + ' Perbandingan ' + Y0 + ' → ' + Y1, RP_GREY, [cmp]));
      withAllStats(pi, function (all) {
        if (token !== summaryToken) { return; }
        cmp.clear();
        var a = all[Y0], b = all[Y1];
        if (a.error || b.error) { cmp.add(rpLabel('Data salah satu tahun tidak tersedia.', RP_GREY)); return; }
        var dl = function (lbl, va, vb, dec, unit) {
          return rpRow(lbl, fmt(va, dec) + ' → ' + fmt(vb, dec) + unit + '  (' + signed(vb - va, dec) + ')', RP_GREY);
        };
        cmp.add(dl('TVDI rata-rata', a.TVDI, b.TVDI, 3, ''));
        cmp.add(dl('% kering + sangat kering', a.pct_kering, b.pct_kering, 1, '%'));
        cmp.add(dl('LST rata-rata', a.LSTc, b.LSTc, 2, ' °C'));
        cmp.add(dl('NDVI', a.NDVI, b.NDVI, 3, ''));
        cmp.add(dl('NDMI', a.NDMI, b.NDMI, 3, ''));
      });
    }

    if (kecFc && state.kec) { holder.add(kecDetailPanel(state.kec, yr, pi, num())); }
    else if (kecFc) { holder.add(kecTopPanel(yr, pi, num())); }

    holder.add(rpSection(num() + ' Cara Membaca Peta', RP_GREEN, [rpLabel(readingGuide(L), RP_GREEN)]));

    if (L.kind === 'class' && L.key !== 'TVDI') {
      holder.add(subtitle(num() + ' Komposisi Kelas ' + L.key + ' — ' + yr));
      holder.add(piePanel(L.key, yr, pi));
    }
    holder.add(note('Analisis lengkap ada di tab Analisis pada panel kiri.'));
  });
}

var PAGES = ['1. TVDI & segitiga NDVI–LST', '2. Dinamika bulanan (tahun terpilih)'];
if (MULTI) { PAGES.push('3. Perbandingan ' + Y0 + ' – ' + Y1); }
var pageCache = {};
var pageHolder = ui.Panel();
var pageSelect = ui.Select({items: PAGES, value: PAGES[0], style: {stretch: 'horizontal', margin: '8px 10px'},
  onChange: function (v) { showPage(v); }});
var analisisTab = ui.Panel([pageSelect, pageHolder]);

function showPage(name) {
  var i = PAGES.indexOf(name);
  var key = i + '_' + (i === 2 ? '' : state.year) + '_' + (i === 1 ? '' : state.period);
  pageHolder.clear();
  if (!pageCache[key]) { pageCache[key] = PAGE_BUILDERS[i](); }
  pageHolder.add(pageCache[key]);
}

function classAreaYearsPanel(key, pi) {
  var p = ui.Panel([loadingLabel('Menghitung luas tiap kelas…')]);
  var d = CLASS_DEF[key];
  ee.List(YEARS.map(function (yr) { return classAreas(classify(getBand(key, getData(yr, pi)), d)); }))
    .evaluate(function (res, err) {
      p.clear();
      if (err) { p.add(note('Gagal menghitung: ' + err)); return; }
      var arrs = res.map(groupsToArr);
      var table = [['Kelas'].concat(yearStr)];
      d.names.forEach(function (nm, c) { table.push([nm].concat(arrs.map(function (a) { return a[c]; }))); });
      p.add(ui.Chart(table, 'ColumnChart', {title: 'Luas kelas ' + key + ' per tahun (km²) · ' + PERIODS[pi].name,
        colors: ['#bdbdbd', C.primary, '#d7191c', '#2c7bb6'].slice(0, YEARS.length).reverse(),
        vAxis: {title: 'Luas (km²)'}, legend: {position: 'bottom'}}));
      var tbl = [['Kelas', 'Rentang'].concat(YEARS.map(function (y) { return y + ' (km² / %)'; }))];
      d.names.forEach(function (nm, c) {
        tbl.push([nm, d.ranges[c]].concat(arrs.map(function (a) {
          var t = sum(a);
          return fmt(a[c], 1) + ' / ' + fmt(t ? a[c] / t * 100 : null, 1) + '%';
        })));
      });
      p.add(ui.Chart(tbl, 'Table', {}));
    });
  return p;
}

function kecBarPanel(pi) {
  var p = ui.Panel([loadingLabel('Menghitung TVDI per kecamatan…')]);
  var img = ee.Image.cat(YEARS.map(function (yr) { return getData(yr, pi).tvdi.rename('TVDI_' + yr); }));
  var fc = img.reduceRegions({collection: kecFc, reducer: ee.Reducer.mean(), scale: SCALE_STATS, tileScale: 4})
    .sort('TVDI_' + Y1, false);
  p.clear();
  p.add(ui.Chart.feature.byFeature(fc, 'nama', YEARS.map(function (y) { return 'TVDI_' + y; }))
    .setChartType('BarChart')
    .setOptions({title: 'TVDI rata-rata per kecamatan · ' + PERIODS[pi].name, height: 520,
      colors: ['#fdae61', '#d7191c'].slice(2 - YEARS.length), hAxis: {title: 'TVDI', viewWindow: {min: 0, max: 1}},
      legend: {position: 'bottom'}}));
  return p;
}

function pageTVDI() {
  var yr = state.year, pi = state.period, d = getData(yr, pi);
  var p = ui.Panel();
  p.add(title('TVDI & Segitiga NDVI–LST · ' + yr));
  p.add(note(PERIODS[pi].name + '. Setiap titik = satu piksel sampel. Garis merah = dry edge (batas kering), ' +
    'garis biru = wet edge (batas basah). TVDI = posisi relatif piksel di antara kedua garis.'));
  var info = ui.Panel([loadingLabel('Menghitung dry edge & wet edge…')]);
  p.add(info);
  var sample = d.img.select(['NDVI', 'LSTc']).updateMask(d.img.select('MNDWI').lt(0))
    .sample({region: aoi, scale: SCALE_STATS, numPixels: N_SAMPLE, seed: SEED, tileScale: 4, geometries: false});
  ee.Dictionary({pts: sample.reduceColumns(ee.Reducer.toList(2), ['NDVI', 'LSTc']).get('list'), e: d.edges})
    .evaluate(function (r, err) {
      info.clear();
      if (err || !r) { info.add(note('Gagal menghitung: ' + err)); return; }
      var e = r.e;
      info.add(card([
        ui.Label(edgeEq(e.a_dry, e.b_dry, 'Dry edge: LSTmax'), {fontWeight: 'bold', fontSize: '13px', margin: '4px 8px', color: '#d7191c'}),
        ui.Label(edgeEq(e.a_wet, e.b_wet, 'Wet edge: LSTmin'), {fontWeight: 'bold', fontSize: '13px', margin: '4px 8px', color: '#2c7bb6'}),
        para('r dry edge = ' + fmt(e.r_dry, 3) + ' · r wet edge = ' + fmt(e.r_wet, 3) + ' · ' + e.n_bins + ' interval NDVI'),
        note('Dry edge ideal memiliki kemiringan negatif (makin rapat vegetasi, LST maksimum makin rendah).')
      ]));
      var rows = [['NDVI', 'Piksel', 'Dry edge', 'Wet edge']];
      r.pts.forEach(function (q) { rows.push([q[0], q[1], null, null]); });
      [NDVI_FIT_MIN, NDVI_FIT_MAX].forEach(function (x) {
        rows.push([x, null, e.a_dry + e.b_dry * x, null]);
        rows.push([x, null, null, e.a_wet + e.b_wet * x]);
      });
      info.add(ui.Chart(rows, 'ScatterChart', {
        title: 'Ruang segitiga NDVI–LST · ' + yr, hAxis: {title: 'NDVI'}, vAxis: {title: 'LST (°C)'},
        legend: {position: 'bottom'}, dataOpacity: 0.6,
        series: {0: {pointSize: 2, lineWidth: 0, color: '#8c8c8c'},
                 1: {pointSize: 0, lineWidth: 3, color: '#d7191c'},
                 2: {pointSize: 0, lineWidth: 3, color: '#2c7bb6'}}
      }));
    });
  p.add(subtitle('Luas kelas TVDI'));
  p.add(classAreaYearsPanel('TVDI', pi));
  if (kecFc) { p.add(subtitle('TVDI per kecamatan')); p.add(kecBarPanel(pi)); }
  p.add(subtitle('Interpretasi'));
  p.add(para(INTERPRETASI.TVDI));
  p.add(goBtn('🗺 Lihat peta kelas kekeringan', 'TVDI – kelas kekeringan'));
  return p;
}

function pageBulanan() {
  var yr = state.year;
  var p = ui.Panel();
  p.add(title('Dinamika Bulanan ' + yr));
  p.add(note('Rata-rata wilayah dari komposit median tiap bulan (CLOUD_COVER < ' + MAX_CLOUD_MONTHLY + '%, ' +
    'piksel awan di-mask). Bulan musim hujan sering kosong/bias karena awan.'));
  var holder = ui.Panel([loadingLabel('Menghitung 12 komposit bulanan…')]);
  p.add(holder);
  ee.List.sequence(1, 12).map(function (m) {
    m = ee.Number(m);
    var col = filteredCol(yr, m, m, MAX_CLOUD_MONTHLY);
    var vals = ee.Algorithms.If(col.size().gt(0),
      addLSTc(col.map(prepL8).median()).select(['LSTc', 'NDVI', 'NDMI'])
        .reduceRegion({reducer: ee.Reducer.mean(), geometry: aoi, scale: 90, maxPixels: 1e13, bestEffort: true, tileScale: 4}),
      ee.Dictionary({}));
    return ee.Dictionary(vals).set('m', m).set('n', col.size());
  }).evaluate(function (res, err) {
    holder.clear();
    if (err) { holder.add(note('Gagal menghitung: ' + err)); return; }
    var val = function (o, k) { return (o[k] === undefined || o[k] === null) ? null : Number(o[k].toFixed(4)); };
    var t1 = [['Bulan', 'LST (°C)']], t2 = [['Bulan', 'NDVI', 'NDMI']], t3 = [['Bulan', 'Jumlah scene']];
    res.forEach(function (o, i) {
      t1.push([MON[i], val(o, 'LSTc')]);
      t2.push([MON[i], val(o, 'NDVI'), val(o, 'NDMI')]);
      t3.push([MON[i], o.n]);
    });
    holder.add(ui.Chart(t1, 'LineChart', {title: 'LST rata-rata bulanan ' + yr, pointSize: 5, colors: ['#d7191c'],
      vAxis: {title: '°C'}, legend: {position: 'none'}, interpolateNulls: true}));
    holder.add(ui.Chart(t2, 'LineChart', {title: 'NDVI & NDMI rata-rata bulanan ' + yr, pointSize: 5,
      colors: ['#1a9850', '#01665e'], vAxis: {title: 'Nilai indeks'}, legend: {position: 'bottom'}, interpolateNulls: true}));
    holder.add(ui.Chart(t3, 'ColumnChart', {title: 'Jumlah scene per bulan', colors: ['#bdbdbd'], legend: {position: 'none'}, height: 160}));
    var best = null;
    res.forEach(function (o, i) { if (o.LSTc !== undefined && o.LSTc !== null && (!best || o.LSTc > best.v)) { best = {v: o.LSTc, i: i}; } });
    if (best) { holder.add(note('LST rata-rata tertinggi terjadi pada bulan ' + MON[best.i] + ' (' + fmt(best.v, 1) + ' °C).')); }
  });
  p.add(subtitle('Interpretasi'));
  p.add(para(INTERPRETASI.BULANAN));
  return p;
}

function pageBanding() {
  var pi = state.period;
  var p = ui.Panel();
  p.add(title('Perbandingan ' + Y0 + ' – ' + Y1));
  p.add(note(PERIODS[pi].name + '. Ambang kelas sama untuk kedua tahun.'));
  var tbl = ui.Panel([loadingLabel('Menghitung statistik kedua tahun…')]);
  p.add(tbl);
  withAllStats(pi, function (all) {
    tbl.clear();
    var t = [['Parameter'].concat(yearStr)];
    var add = function (lbl, k, dec, unit) {
      t.push([lbl].concat(YEARS.map(function (y) { return all[y].error ? '–' : fmt(all[y][k], dec) + unit; })));
    };
    add('Jumlah scene', 'n_scenes', 0, '');
    add('TVDI rata-rata', 'TVDI', 3, '');
    add('% kering + sangat kering', 'pct_kering', 1, '%');
    add('LST rata-rata', 'LSTc', 2, ' °C');
    add('NDVI rata-rata', 'NDVI', 3, '');
    add('NDMI rata-rata', 'NDMI', 3, '');
    tbl.add(ui.Chart(t, 'Table', {}));
  });

  p.add(subtitle('Perubahan kelas kekeringan ' + Y0 + ' → ' + Y1));
  var ch = ui.Panel([loadingLabel('Menghitung perubahan kelas…')]);
  p.add(ch);
  var cA = classify(getData(Y0, pi).tvdi, CLASS_DEF.TVDI), cB = classify(getData(Y1, pi).tvdi, CLASS_DEF.TVDI);
  var chg = cB.subtract(cA).add(4).int();
  ee.List([classAreas(chg)]).evaluate(function (r, err) {
    ch.clear();
    if (err) { ch.add(note('Gagal menghitung: ' + err)); return; }
    var wet = 0, same = 0, dry = 0;
    (r[0] || []).forEach(function (g) {
      if (g.kelas < 4) { wet += g.sum; } else if (g.kelas > 4) { dry += g.sum; } else { same += g.sum; }
    });
    var tot = wet + same + dry;
    ch.add(ui.Chart([['Perubahan', 'Luas (km²)'], ['Makin basah', wet], ['Tetap', same], ['Makin kering', dry]],
      'PieChart', {title: 'Perubahan kelas TVDI ' + Y0 + ' → ' + Y1, colors: ['#1a9641', '#ffffbf', '#d7191c'],
        pieHole: 0.4, height: 220}));
    ch.add(note('Makin kering: ' + fmt(dry, 1) + ' km² (' + fmt(dry / tot * 100, 1) + '%) · tetap: ' + fmt(same, 1) +
      ' km² (' + fmt(same / tot * 100, 1) + '%) · makin basah: ' + fmt(wet, 1) + ' km² (' + fmt(wet / tot * 100, 1) + '%).'));
  });
  p.add(subtitle('Luas kelas TVDI per tahun'));
  p.add(classAreaYearsPanel('TVDI', pi));
  p.add(subtitle('Luas kelas NDMI per tahun'));
  p.add(classAreaYearsPanel('NDMI', pi));
  p.add(subtitle('Interpretasi'));
  p.add(para(INTERPRETASI.BANDING));
  p.add(goBtn('🗺 Lihat peta perubahan TVDI', 'Perubahan TVDI ' + Y0 + ' → ' + Y1));
  return p;
}

var PAGE_BUILDERS = [pageTVDI, pageBulanan, pageBanding];

var kelasTab = (function () {
  var p = ui.Panel();
  p.add(title('Keterangan Kelas'));
  p.add(note('Ambang kelas dibuat tetap untuk semua tahun agar perbandingan antartahun konsisten.'));
  CLASS_KEYS.forEach(function (k) {
    var d = CLASS_DEF[k];
    p.add(subtitle(d.title));
    p.add(note(d.about));
    d.names.forEach(function (n, i) {
      p.add(ui.Panel([chip(d.colors[i]),
        ui.Panel([
          ui.Label(n + '  ·  ' + d.ranges[i], {fontSize: '12px', fontWeight: 'bold', margin: '0'}),
          ui.Label(d.desc[i], {fontSize: '11px', color: C.muted, margin: '0', whiteSpace: 'pre-wrap'})
        ], ui.Panel.Layout.flow('vertical'), {margin: '0', width: '320px'})
      ], ui.Panel.Layout.flow('horizontal'), {margin: '3px 10px'}));
    });
  });
  return p;
})();

function buildMetodologi() {
  var p = ui.Panel();
  p.add(title('Data & Metodologi'));
  p.add(subtitle('Data'));
  p.add(para('• Landsat 8 OLI/TIRS Collection 2 Tier 1 Level 2 (LANDSAT/LC08/C02/T1_L2), tahun ' + YEARS.join(' dan ') + '.\n' +
    '• Periode komposit dapat dipilih (default ' + PERIODS[DEFAULT_PERIOD].name + '), CLOUD_COVER scene < ' + MAX_CLOUD + '%.\n' +
    '• DEM SRTM 30 m untuk koreksi elevasi LST.\n' +
    '• Batas administrasi Kabupaten Sleman' + (AOI_ASSET ? ' (asset ' + AOI_ASSET + ').' : ' (FAO GAUL 2015 level 2).') + '\n' +
    '• Batas kecamatan: ' + (KEC_SOURCE_LABEL === 'geoBoundaries ADM3'
      ? 'geoBoundaries ADM3 (WM/geoLab/geoBoundaries/600/ADM3).'
      : (KEC_SOURCE_LABEL ? 'asset ' + KEC_SOURCE_LABEL + '.' : 'belum dimuat.'))));
  p.add(subtitle('Tahapan pengolahan'));
  p.add(para('1. Masking awan, bayangan awan, cirrus, dan piksel saturasi (QA_PIXEL, QA_RADSAT).\n' +
    '2. Konversi reflektansi permukaan (×0,0000275 − 0,2) dan suhu permukaan ke °C.\n' +
    '3. Perhitungan NDVI, NDMI, dan MNDWI (MNDWI ≥ 0 = badan air, dikeluarkan dari TVDI).\n' +
    '4. Komposit median per periode per tahun.\n' +
    (USE_LAPSE ? '5. Koreksi elevasi LST: LSTc = LST + ' + String(LAPSE).replace('.', ',') + ' × (elevasi − elevasi terendah).\n'
               : '5. (Koreksi elevasi tidak digunakan.)\n') +
    '6. Ruang segitiga NDVI–LST: NDVI dibagi interval ' + String(BIN).replace('.', ',') + '; LST maksimum dan minimum tiap ' +
    'interval diregresikan terhadap NDVI → dry edge & wet edge (per tahun dan periode).\n' +
    '7. TVDI = (LST − LSTmin) / (LSTmax − LSTmin), dibatasi 0–1.\n' +
    '8. Klasifikasi 5 kelas kekeringan dengan ambang tetap (tab Keterangan Kelas).\n' +
    '9. Analisis luas kelas, perubahan antartahun, dinamika bulanan, dan per kecamatan.'));
  p.add(subtitle('Jumlah scene per tahun'));
  var holder = ui.Panel([loadingLabel()]);
  p.add(holder);
  withAllStats(state.period, function (all) {
    holder.clear();
    var t = [['Tahun', 'Periode', 'Jumlah scene']];
    YEARS.forEach(function (y) { t.push([String(y), PERIODS[state.period].name, all[y].error ? '–' : all[y].n_scenes]); });
    holder.add(ui.Chart(t, 'Table', {}));
  });
  p.add(subtitle('Keterbatasan'));
  p.add(para('• Resolusi asli band termal 100 m (diresampling 30 m).\n' +
    '• TVDI bersifat relatif terhadap kondisi wilayah dan periode yang sama, bukan ukuran lengas tanah absolut.\n' +
    '• Lahan terbangun, pasir, dan endapan material Merapi cenderung terbaca kering karena panas dan minim vegetasi.\n' +
    '• Tutupan awan di lereng Merapi dapat mengurangi jumlah piksel valid.\n' +
    '• Validasi lapangan atau data curah hujan disarankan.'));
  p.add(subtitle('Penyusun'));
  p.add(para(PENYUSUN));
  return p;
}

var side = ui.Panel([header, tabBar, content], ui.Panel.Layout.flow('vertical'), {width: '400px', padding: '0'});
ui.root.clear();
ui.root.setLayout(ui.Panel.Layout.flow('horizontal'));
ui.root.add(side);
ui.root.add(mainMap);
ui.root.add(rightPanel);
showTab('Peta');
refresh();

function geoBoundariesKec() {
  return ee.FeatureCollection(KEC_DEFAULT_ASSET)
    .filter(ee.Filter.eq('shapeGroup', 'IDN'))
    .filterBounds(aoi)
    .map(function (f) { return f.set('in_aoi', f.geometry().centroid(100).intersects(aoi, 100)); })
    .filter(ee.Filter.eq('in_aoi', true));
}

function setupKecamatan() {
  var sources = [];
  if (KEC_ASSET) {
    sources.push({fc: ee.FeatureCollection(KEC_ASSET), field: KEC_NAME_FIELD, label: 'KEC_ASSET'});
  } else if (AOI_ASSET) {
    sources.push({fc: aoiFc, field: KEC_NAME_FIELD, label: 'AOI_ASSET'});
  }
  sources.push({fc: geoBoundariesKec(), field: 'shapeName', label: 'geoBoundaries ADM3'});
  trySource(sources, 0, []);
}

function trySource(sources, i, msgs) {
  if (i >= sources.length) {
    kecStatus.setValue('⚠ Batas kecamatan tidak dapat dimuat. ' + msgs.join(' ') +
      ' Isi KEC_ASSET dengan batas kecamatan milikmu.');
    return;
  }
  var s = sources[i];
  var next = function (m) { msgs.push(m); trySource(sources, i + 1, msgs); };
  s.fc.first().propertyNames().evaluate(function (props, err) {
    if (err || !props) { next(s.label + ': gagal dibaca (' + (err || 'kosong') + ').'); return; }
    var field = (s.field && props.indexOf(s.field) >= 0) ? s.field : null;
    if (!field) {
      for (var k = 0; k < KEC_FIELD_CANDIDATES.length; k++) {
        if (props.indexOf(KEC_FIELD_CANDIDATES[k]) >= 0) { field = KEC_FIELD_CANDIDATES[k]; break; }
      }
    }
    if (!field) {
      next(s.label + ': kolom nama kecamatan tidak ditemukan (kolom: ' +
        props.filter(function (q) { return q.indexOf('system:') !== 0; }).join(', ') + '; isi KEC_NAME_FIELD).');
      return;
    }
    s.fc.aggregate_array(field).distinct().sort().evaluate(function (list, err2) {
      if (err2 || !list || list.length < 2) { next(s.label + ': tidak berisi poligon per kecamatan.'); return; }
      KEC_NAMES = list.map(String);
      kecFc = ee.FeatureCollection(ee.List(list).map(function (n) {
        return ee.Feature(s.fc.filter(ee.Filter.eq(field, n)).union(1).first().geometry(), {nama: n});
      }));
      kecOutline = kecFc.style({color: '333333', fillColor: '00000000', width: 1.2});
      KEC_SOURCE_LABEL = s.label;
      kecSelect.items().reset([KEC_ALL].concat(KEC_NAMES));
      kecSelect.setValue(KEC_ALL, false);
      kecSelect.setDisabled(false);
      kecClipCheck.style().set('shown', true);
      kecCheck.style().set('shown', true);
      kecStatus.setValue('✔ ' + KEC_NAMES.length + ' kecamatan dimuat dari ' + s.label + ' (kolom "' + field + '").' +
        (msgs.length ? '\nCatatan: ' + msgs.join(' ') : ''));
      pageCache = {};
      refresh();
    });
  });
}
setupKecamatan();
