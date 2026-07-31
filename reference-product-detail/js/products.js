/* Data produk Samaqu — dipakai halaman katalog & halaman detail */
window.FABRIC_COLOR = {"B.01":"#141414","B.02":"#1E2436","A.02":"#B4A79B","C.01":"#CDBFB0"};

window.PRODUCTS = [
  {s:"thobe-superblack",       n:"Thobe Superblack",       f:"B.01", p:329000, t:"dark"},
  {s:"thobe-superblack-slim",  n:"Thobe Superblack Slim",  f:"B.01", p:339000, t:"dark"},
  {s:"thobe-superblack-pro",   n:"Thobe Superblack Pro",   f:"B.01", p:389000, t:"dark"},
  {s:"thobe-midnight",         n:"Thobe Midnight",         f:"B.02", p:349000, t:"dark"},
  {s:"thobe-midnight-slim",    n:"Thobe Midnight Slim",    f:"B.02", p:359000, t:"dark"},
  {s:"thobe-navy-formal",      n:"Thobe Navy Formal",      f:"B.02", p:379000, t:"dark"},
  {s:"thobe-sandstone",        n:"Thobe Sandstone",        f:"A.02", p:319000, t:"light"},
  {s:"thobe-sandstone-slim",   n:"Thobe Sandstone Slim",   f:"A.02", p:329000, t:"light"},
  {s:"thobe-classic",          n:"Thobe Classic",          f:"C.01", p:299000, t:"light"},
  {s:"thobe-ivory",            n:"Thobe Ivory",            f:"C.01", p:309000, t:"light"},
  {s:"thobe-ivory-premium",    n:"Thobe Ivory Premium",    f:"C.01", p:349000, t:"light"}
];

window.SERIES_LIST = ["Jharkah","Imron","Bayati","Nahawand","Karim","Imalah"];
window.SERIES_ADD  = {Jharkah:0, Imron:10000, Bayati:15000, Nahawand:20000, Karim:25000, Imalah:30000};
window.PRICE_TIERS = [["min","Harga Minimum"],["rec","Rekomendasi Samaqu (+Rp 30.000)"],["prem","Harga Premium (+Rp 60.000)"]];
window.TIER_ADD    = {min:0, rec:30000, prem:60000};

window.rupiah = function(v){ return "Rp " + v.toLocaleString("id-ID"); };
window.imgSrc = function(t){
  var el = document.getElementById(t === "dark" ? "assetDark" : "assetLight");
  return el ? el.getAttribute("src") : "";
};
