import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://zympqqmrygldagpazvse.supabase.co",
  "sb_secret_Bg_KzHKhz0HdLmzIsWkTyg_xEhE9pmn"
);

// Products data from katalog-data.ts
const products = [
  // THOBE B-01 Jiharkah
  { id: "thobe-b01-jiharkah", name: "Thobe Jiharkah", category: "Thobe", kain: "B-01", series: "Jiharkah", colors: ["Superblack", "Broken White", "Latte", "Grey Indigo", "Mint", "Navy"], price: 389000, tag: null, note: null, image: "/products/jiharkah/15.jpg", images: ["/products/jiharkah/15.jpg", "/products/jiharkah/16.jpg", "/products/jiharkah/17.jpg", "/products/jiharkah/18.jpg", "/products/jiharkah/19.jpg", "/products/jiharkah/20.jpg", "/products/jiharkah/21.jpg", "/products/jiharkah/22.jpg", "/products/jiharkah/23.jpg"] },
  
  // THOBE B-02
  { id: "thobe-b02-coffee", name: "Thobe Coffee Brown", category: "Thobe", kain: "B-02", series: null, colors: ["Coffee Brown", "Deep Maroon"], price: 389000, tag: null, note: null, image: "/images/products/thobe-b02-1.jpg", images: ["/images/products/thobe-b02-1.jpg"] },
  { id: "thobe-b02-maroon", name: "Thobe Deep Maroon", category: "Thobe", kain: "B-02", series: null, colors: ["Coffee Brown", "Deep Maroon"], price: 389000, tag: null, note: null, image: "/images/products/thobe-b02-2.jpg", images: ["/images/products/thobe-b02-2.jpg"] },
  
  // THOBE A-02
  { id: "thobe-a02-charcoal", name: "Thobe Charcoal", category: "Thobe", kain: "A-02", series: null, colors: ["Charcoal Grey", "Soft Grey"], price: 389000, tag: null, note: null, image: "/images/products/thobe-a02-1.jpg", images: ["/images/products/thobe-a02-1.jpg"] },
  { id: "thobe-a02-softgrey", name: "Thobe Soft Grey", category: "Thobe", kain: "A-02", series: null, colors: ["Charcoal Grey", "Soft Grey"], price: 389000, tag: null, note: null, image: "/images/products/thobe-a02-2.jpg", images: ["/images/products/thobe-a02-2.jpg"] },
  
  // THOBE C-01
  { id: "thobe-c01-superblack", name: "Thobe Superblack", category: "Thobe", kain: "C-01", series: null, colors: ["Superblack"], price: 389000, tag: "Baru", note: null, image: "/images/products/thobe-c01-1.jpg", images: ["/images/products/thobe-c01-1.jpg"] },
  { id: "thobe-c01-broken-white", name: "Thobe Broken White", category: "Thobe", kain: "C-01", series: null, colors: ["Broken White"], price: 389000, tag: "Baru", note: null, image: "/images/products/thobe-c01-2.jpg", images: ["/images/products/thobe-c01-2.jpg"] },
  { id: "thobe-c01-army", name: "Thobe Army", category: "Thobe", kain: "C-01", series: null, colors: ["Army"], price: 389000, tag: null, note: null, image: "/images/products/thobe-c01-3.jpg", images: ["/images/products/thobe-c01-3.jpg"] },
  { id: "thobe-c01-beige", name: "Thobe Beige", category: "Thobe", kain: "C-01", series: null, colors: ["Beige"], price: 389000, tag: null, note: null, image: "/images/products/thobe-c01-4.jpg", images: ["/images/products/thobe-c01-4.jpg"] },
  { id: "thobe-c01-abu-silver", name: "Thobe Abu Silver", category: "Thobe", kain: "C-01", series: null, colors: ["Abu Silver"], price: 389000, tag: null, note: null, image: "/images/products/thobe-c01-5.jpg", images: ["/images/products/thobe-c01-5.jpg"] },
  { id: "thobe-c01-navy", name: "Thobe Navy", category: "Thobe", kain: "C-01", series: null, colors: ["Navy"], price: 389000, tag: null, note: null, image: "/images/products/thobe-c01-6.jpg", images: ["/images/products/thobe-c01-6.jpg"] },
  { id: "thobe-c01-cinnamon", name: "Thobe Cinnamon", category: "Thobe", kain: "C-01", series: null, colors: ["Cinnamon"], price: 389000, tag: null, note: null, image: "/images/products/thobe-c01-7.jpg", images: ["/images/products/thobe-c01-7.jpg"] },
  { id: "thobe-c01-maroon", name: "Thobe Maroon", category: "Thobe", kain: "C-01", series: null, colors: ["Maroon"], price: 389000, tag: null, note: null, image: "/images/products/thobe-c01-8.jpg", images: ["/images/products/thobe-c01-8.jpg"] },
  
  // KANDORA B-01
  { id: "kandora-b01-superblack", name: "Kandora Superblack", category: "Kandora", kain: "B-01", series: null, colors: ["Superblack"], price: 349000, tag: null, note: null, image: "/images/products/kandora-1.jpg", images: ["/images/products/kandora-1.jpg"] },
  { id: "kandora-b01-broken-white", name: "Kandora Broken White", category: "Kandora", kain: "B-01", series: null, colors: ["Broken White"], price: 349000, tag: null, note: null, image: "/images/products/kandora-2.jpg", images: ["/images/products/kandora-2.jpg"] },
  { id: "kandora-b01-latte", name: "Kandora Latte", category: "Kandora", kain: "B-01", series: null, colors: ["Latte"], price: 349000, tag: null, note: null, image: "/images/products/kandora-3.jpg", images: ["/images/products/kandora-3.jpg"] },
  { id: "kandora-b01-grey-indigo", name: "Kandora Grey Indigo", category: "Kandora", kain: "B-01", series: null, colors: ["Grey Indigo"], price: 349000, tag: null, note: null, image: "/images/products/kandora-4.jpg", images: ["/images/products/kandora-4.jpg"] },
  { id: "kandora-b01-mint", name: "Kandora Mint", category: "Kandora", kain: "B-01", series: null, colors: ["Mint"], price: 349000, tag: null, note: null, image: "/images/products/kandora-5.jpg", images: ["/images/products/kandora-5.jpg"] },
  { id: "kandora-b01-navy", name: "Kandora Navy", category: "Kandora", kain: "B-01", series: null, colors: ["Navy"], price: 349000, tag: null, note: null, image: "/images/products/kandora-6.jpg", images: ["/images/products/kandora-6.jpg"] },
  
  // KOKO ZAHWAN
  { id: "koko-zahwan-black", name: "Koko Zahwan Black", category: "Koko", kain: null, series: "Zahwan", colors: ["Black"], price: 289000, tag: null, note: null, image: "/images/products/koko-1.jpg", images: ["/images/products/koko-1.jpg"] },
  { id: "koko-zahwan-white", name: "Koko Zahwan White", category: "Koko", kain: null, series: "Zahwan", colors: ["White"], price: 289000, tag: null, note: null, image: "/images/products/koko-2.jpg", images: ["/images/products/koko-2.jpg"] },
  { id: "koko-zahwan-grey", name: "Koko Zahwan Grey", category: "Koko", kain: null, series: "Zahwan", colors: ["Grey"], price: 289000, tag: null, note: null, image: "/images/products/koko-3.jpg", images: ["/images/products/koko-3.jpg"] },
  { id: "koko-zahwan-brown", name: "Koko Zahwan Brown", category: "Koko", kain: null, series: "Zahwan", colors: ["Brown"], price: 289000, tag: null, note: null, image: "/images/products/koko-4.jpg", images: ["/images/products/koko-4.jpg"] },
  { id: "koko-zahwan-plum", name: "Koko Zahwan Plum", category: "Koko", kain: null, series: "Zahwan", colors: ["Plum"], price: 289000, tag: null, note: null, image: "/images/products/koko-5.jpg", images: ["/images/products/koko-5.jpg"] },
  
  // VEST DUHA
  { id: "vest-duha-jetblack", name: "Vest Duha Jetblack", category: "Vest", kain: null, series: "Duha", colors: ["Jetblack"], price: 249000, tag: "Eksklusif", note: null, image: "/images/products/vest-1.jpg", images: ["/images/products/vest-1.jpg"] },
  { id: "vest-duha-deep-forest-green", name: "Vest Duha Deep Forest Green", category: "Vest", kain: null, series: "Duha", colors: ["Deep Forest Green"], price: 249000, tag: null, note: null, image: "/images/products/vest-2.jpg", images: ["/images/products/vest-2.jpg"] },
  { id: "vest-duha-light-greige", name: "Vest Duha Light Greige", category: "Vest", kain: null, series: "Duha", colors: ["Light Greige"], price: 249000, tag: null, note: null, image: "/images/products/vest-3.jpg", images: ["/images/products/vest-3.jpg"] },
  { id: "vest-duha-dark-taupe", name: "Vest Duha Dark Taupe", category: "Vest", kain: null, series: "Duha", colors: ["Dark Taupe"], price: 249000, tag: null, note: null, image: "/images/products/vest-4.jpg", images: ["/images/products/vest-4.jpg"] },
  { id: "vest-duha-light-warm-grey", name: "Vest Duha Light Warm Grey", category: "Vest", kain: null, series: "Duha", colors: ["Light Warm Grey"], price: 249000, tag: null, note: null, image: "/images/products/vest-5.jpg", images: ["/images/products/vest-5.jpg"] },
  
  // KABAK
  { id: "kabak-01", name: "Kabak 01", category: "Kabak", kain: null, series: null, colors: [], price: 189000, tag: null, note: "Include box / Box only", image: "/images/products/kabak-1.jpg", images: ["/images/products/kabak-1.jpg"] },
  { id: "kabak-02", name: "Kabak 02", category: "Kabak", kain: null, series: null, colors: [], price: 189000, tag: null, note: "Include box / Box only", image: "/images/products/kabak-2.jpg", images: ["/images/products/kabak-2.jpg"] },
  { id: "kabak-03", name: "Kabak 03", category: "Kabak", kain: null, series: null, colors: [], price: 189000, tag: null, note: "Include box / Box only", image: "/images/products/kabak-3.jpg", images: ["/images/products/kabak-3.jpg"] },
  { id: "kabak-04", name: "Kabak 04", category: "Kabak", kain: null, series: null, colors: [], price: 189000, tag: null, note: "Include box / Box only", image: "/images/products/kabak-4.jpg", images: ["/images/products/kabak-4.jpg"] },
  { id: "kabak-05", name: "Kabak 05", category: "Kabak", kain: null, series: null, colors: [], price: 189000, tag: null, note: "Include box / Box only", image: "/images/products/kabak-5.jpg", images: ["/images/products/kabak-5.jpg"] },
  { id: "kabak-12", name: "Kabak 12", category: "Kabak", kain: null, series: null, colors: [], price: 189000, tag: null, note: "Include box / Box only", image: "/images/products/kabak-12.jpg", images: ["/images/products/kabak-12.jpg"] },
  { id: "kabak-13", name: "Kabak 13", category: "Kabak", kain: null, series: null, colors: [], price: 189000, tag: null, note: "Include box / Box only", image: "/images/products/kabak-13.jpg", images: ["/images/products/kabak-13.jpg"] },
  
  // COVER & HANGER
  { id: "cover-thobe", name: "Cover Thobe", category: "Cover & Hanger", kain: null, series: null, colors: [], price: 89000, tag: null, note: "Cover + Hanger / Cover only", image: "/images/products/cover-thobe.jpg", images: ["/images/products/cover-thobe.jpg"] },
  { id: "cover-koko", name: "Cover Koko", category: "Cover & Hanger", kain: null, series: null, colors: [], price: 89000, tag: null, note: "Cover + Hanger / Cover only / Hanger only", image: "/images/products/cover-koko.jpg", images: ["/images/products/cover-koko.jpg"] },
];

// Testimonials data from testimoni-data.ts
const testimonials = [
  { customer_name: "Ahmad R.", type: "photo", category: "Thobe", rating: 5, verified: true, content: "Kualitasnya benar-benar premium. Bahannya jatuh sempurna dan nyaman dipakai seharian. Sangat puas!", image_url: "https://api.moda.app/api/v2/images/ref/88db7c83-8b08-4301-befb-52ef4d1dc260?v=e88e152936618197&s=f5a2d19e7b5c32fdfae5799861f724ae", caption: "Thobe Signature — bahan adem, jahitan rapi" },
  { customer_name: "Fitriani H.", type: "text", category: "Koko", rating: 5, verified: true, content: "Beli koko untuk suami, dan beliau langsung suka. Detail kancingnya elegan, potongannya pas. Terima kasih SAMAQU." },
  { customer_name: "Usman K.", type: "video", category: "Kandora", rating: 5, verified: true, content: "Kandora-nya mewah banget. Lihat sendiri di video, kainnya benar-benar berkelas.", image_url: "https://api.moda.app/api/v2/images/ref/d7a1fab3-7f1b-4577-a45b-366499871240?v=23e9844e3ec51ed9&s=d35278bca977f164b9f9606020ecbd21", video_url: "ScMzIvxBSi4", caption: "Unboxing Kandora Premium" },
  { customer_name: "Halim S.", type: "photo", category: "Vest", rating: 4, verified: true, content: "Tampil beda saat kondangan. Vest-nya bikin penampilan makin rapi dan berwibawa.", image_url: "https://api.moda.app/api/v2/images/ref/83338354-398a-40b8-88d6-0c39aab362e0?v=d1a8cb041aa02769&s=6576a4248caf4deaa447a813aa7549b3", caption: "Vest untuk acara pernikahan" },
  { customer_name: "Dewi A.", type: "text", category: "Thobe", rating: 5, verified: false, content: "Pesan untuk rombongan pengajian, semua ukuran pas. Pelayanan lewat WhatsApp ramah dan cepat responnya." },
  { customer_name: "Rizky P.", type: "photo", category: "Koko", rating: 5, verified: true, content: "Sudah beli 3 warna. Adem, tidak gerah, cocok untuk aktivitas harian maupun ke masjid.", image_url: "https://api.moda.app/api/v2/images/ref/10ac37bd-e678-47b3-a673-daedffd0de5a?v=8792b1c728ab3046&s=29642de7300ee17fbb6b730e6f6900c2", caption: "Koko harian favorit" },
  { customer_name: "Bunga M.", type: "video", category: "Vest", rating: 5, verified: true, content: "Jahitan rapi, bahan tebal tapi tetap nyaman. Highly recommended, lihat detailnya di video.", image_url: "https://api.moda.app/api/v2/images/ref/897ae4e0-8b7a-43e9-843b-3b5b27141774?v=81c7ca43ae12f57a&s=1519bf0a37d2d7b7892ae7f5e40de6d6", video_url: "ScMzIvxBSi4", caption: "Review Vest SAMAQU" },
  { customer_name: "Faiz N.", type: "photo", category: "Kandora", rating: 5, verified: true, content: "Dipakai saat Idul Adha, banyak yang tanya beli di mana. Kualitas tidak mengecewakan.", image_url: "https://api.moda.app/api/v2/images/ref/ed8b38f2-83b0-4bf4-b061-f5d9bab20bf4?v=f822422b19585b51&s=d5d02eb1b1e3d6319ab601f80d706de2", caption: "Kandora untuk Idul Adha" },
  { customer_name: "Salsabila", type: "text", category: "Cover & Hanger", rating: 4, verified: false, content: "Cover dan hanger-nya kokoh dan terlihat premium. Koleksi thobe suami jadi lebih terawat dan rapi." },
  { customer_name: "Bagus W.", type: "photo", category: "Kabak", rating: 5, verified: true, content: "Warnanya hangat dan elegan. Bahannya berkualitas, cocok untuk acara formal maupun santai.", image_url: "https://api.moda.app/api/v2/images/ref/7e9438fb-090c-4499-864e-60ee00729172?v=2e51166d88788c11&s=bafadad96b7ee1f327560d9c611c57c9", caption: "Kabak elegan warna caramel" },
  { customer_name: "Nadia F.", type: "text", category: "Koko", rating: 5, verified: true, content: "Packaging rapi, pengiriman cepat, dan produk sesuai foto. Belanja di SAMAQU memang beda." },
  { customer_name: "Hendra T.", type: "photo", category: "Thobe", rating: 5, verified: true, content: "Nyaman dipakai untuk shalat Jumat, bahannya ringan dan tidak panas. Recommended sekali.", image_url: "https://api.moda.app/api/v2/images/ref/42ec219d-db51-471a-9c70-242750655b4a?v=3a187008919567b5&s=94c6de840adb0aa680b986efc4557c0b", caption: "Thobe untuk Jumatan" },
  { customer_name: "Zahra L.", type: "text", category: "Kabak", rating: 4, verified: false, content: "Model kabaknya modern tapi tetap sopan. Suami senang sekali, katanya nyaman dan terlihat gagah." },
  { customer_name: "Imran G.", type: "photo", category: "Vest", rating: 5, verified: true, content: "Kombinasi vest dan koko-nya serasi. Detail finishing-nya rapi, terlihat sangat berkelas.", image_url: "https://api.moda.app/api/v2/images/ref/88db7c83-8b08-4301-befb-52ef4d1dc260?v=e88e152936618197&s=f5a2d19e7b5c32fdfae5799861f724ae", caption: "Setelan vest dan koko" },
  { customer_name: "Kartika S.", type: "text", category: "Kandora", rating: 5, verified: true, content: "Konsultasi dulu lewat WA sebelum beli, dibantu pilih ukuran dengan sabar. Hasilnya pas dan memuaskan." },
];

async function migrateData() {
  console.log("Starting migration...\n");

  // Insert products
  console.log("Inserting products...");
  const { error: productsError } = await supabase.from("products").upsert(products, { onConflict: "id" });
  if (productsError) {
    console.error("Products error:", productsError.message);
  } else {
    console.log(`✅ ${products.length} products inserted`);
  }

  // Insert testimonials
  console.log("Inserting testimonials...");
  const { error: testimonialsError } = await supabase.from("testimonials").upsert(testimonials);
  if (testimonialsError) {
    console.error("Testimonials error:", testimonialsError.message);
  } else {
    console.log(`✅ ${testimonials.length} testimonials inserted`);
  }

  // Verify
  console.log("\nVerifying...");
  const { count: productsCount } = await supabase.from("products").select("*", { count: "exact", head: true });
  const { count: testimonialsCount } = await supabase.from("testimonials").select("*", { count: "exact", head: true });
  console.log(`Products in DB: ${productsCount}`);
  console.log(`Testimonials in DB: ${testimonialsCount}`);
}

migrateData().catch(console.error);
