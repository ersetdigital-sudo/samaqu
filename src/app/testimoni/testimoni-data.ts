export type TestimoniType = "photo" | "video" | "text";
export type TestimoniCat = "Thobe" | "Kandora" | "Koko" | "Vest" | "Kabak" | "Cover & Hanger";

export interface Testimoni {
  name: string;
  type: TestimoniType;
  cat: TestimoniCat;
  rating: number;
  verified: boolean;
  date: string;
  img?: string;
  yt?: string;
  cap?: string;
  text: string;
}

export const testimoniCategories: TestimoniCat[] = [
  "Thobe", "Kandora", "Koko", "Vest", "Kabak", "Cover & Hanger",
];

export const testimoniData: Testimoni[] = [
  { name: "Ahmad R.", type: "photo", cat: "Thobe", rating: 5, verified: true, date: "12 Sep 2024", img: "https://api.moda.app/api/v2/images/ref/88db7c83-8b08-4301-befb-52ef4d1dc260?v=e88e152936618197&s=f5a2d19e7b5c32fdfae5799861f724ae", cap: "Thobe Signature — bahan adem, jahitan rapi", text: "Kualitasnya benar-benar premium. Bahannya jatuh sempurna dan nyaman dipakai seharian. Sangat puas!" },
  { name: "Fitriani H.", type: "text", cat: "Koko", rating: 5, verified: true, date: "9 Sep 2024", text: "Beli koko untuk suami, dan beliau langsung suka. Detail kancingnya elegan, potongannya pas. Terima kasih SAMAQU." },
  { name: "Usman K.", type: "video", cat: "Kandora", rating: 5, verified: true, date: "7 Sep 2024", img: "https://api.moda.app/api/v2/images/ref/d7a1fab3-7f1b-4577-a45b-366499871240?v=23e9844e3ec51ed9&s=d35278bca977f164b9f9606020ecbd21", yt: "ScMzIvxBSi4", cap: "Unboxing Kandora Premium", text: "Kandora-nya mewah banget. Lihat sendiri di video, kainnya benar-benar berkelas." },
  { name: "Halim S.", type: "photo", cat: "Vest", rating: 4, verified: true, date: "5 Sep 2024", img: "https://api.moda.app/api/v2/images/ref/83338354-398a-40b8-88d6-0c39aab362e0?v=d1a8cb041aa02769&s=6576a4248caf4deaa447a813aa7549b3", cap: "Vest untuk acara pernikahan", text: "Tampil beda saat kondangan. Vest-nya bikin penampilan makin rapi dan berwibawa." },
  { name: "Dewi A.", type: "text", cat: "Thobe", rating: 5, verified: false, date: "3 Sep 2024", text: "Pesan untuk rombongan pengajian, semua ukuran pas. Pelayanan lewat WhatsApp ramah dan cepat responnya." },
  { name: "Rizky P.", type: "photo", cat: "Koko", rating: 5, verified: true, date: "1 Sep 2024", img: "https://api.moda.app/api/v2/images/ref/10ac37bd-e678-47b3-a673-daedffd0de5a?v=8792b1c728ab3046&s=29642de7300ee17fbb6b730e6f6900c2", cap: "Koko harian favorit", text: "Sudah beli 3 warna. Adem, tidak gerah, cocok untuk aktivitas harian maupun ke masjid." },
  { name: "Bunga M.", type: "video", cat: "Vest", rating: 5, verified: true, date: "28 Ags 2024", img: "https://api.moda.app/api/v2/images/ref/897ae4e0-8b7a-43e9-843b-3b5b27141774?v=81c7ca43ae12f57a&s=1519bf0a37d2d7b7892ae7f5e40de6d6", yt: "ScMzIvxBSi4", cap: "Review Vest SAMAQU", text: "Jahitan rapi, bahan tebal tapi tetap nyaman. Highly recommended, lihat detailnya di video." },
  { name: "Faiz N.", type: "photo", cat: "Kandora", rating: 5, verified: true, date: "25 Ags 2024", img: "https://api.moda.app/api/v2/images/ref/ed8b38f2-83b0-4bf4-b061-f5d9bab20bf4?v=f822422b19585b51&s=d5d02eb1b1e3d6319ab601f80d706de2", cap: "Kandora untuk Idul Adha", text: "Dipakai saat Idul Adha, banyak yang tanya beli di mana. Kualitas tidak mengecewakan." },
  { name: "Salsabila", type: "text", cat: "Cover & Hanger", rating: 4, verified: false, date: "22 Ags 2024", text: "Cover dan hanger-nya kokoh dan terlihat premium. Koleksi thobe suami jadi lebih terawat dan rapi." },
  { name: "Bagus W.", type: "photo", cat: "Kabak", rating: 5, verified: true, date: "20 Ags 2024", img: "https://api.moda.app/api/v2/images/ref/7e9438fb-090c-4499-864e-60ee00729172?v=2e51166d88788c11&s=bafadad96b7ee1f327560d9c611c57c9", cap: "Kabak elegan warna caramel", text: "Warnanya hangat dan elegan. Bahannya berkualitas, cocok untuk acara formal maupun santai." },
  { name: "Nadia F.", type: "text", cat: "Koko", rating: 5, verified: true, date: "18 Ags 2024", text: "Packaging rapi, pengiriman cepat, dan produk sesuai foto. Belanja di SAMAQU memang beda." },
  { name: "Hendra T.", type: "photo", cat: "Thobe", rating: 5, verified: true, date: "15 Ags 2024", img: "https://api.moda.app/api/v2/images/ref/42ec219d-db51-471a-9c70-242750655b4a?v=3a187008919567b5&s=94c6de840adb0aa680b986efc4557c0b", cap: "Thobe untuk Jumatan", text: "Nyaman dipakai untuk shalat Jumat, bahannya ringan dan tidak panas. Recommended sekali." },
  { name: "Zahra L.", type: "text", cat: "Kabak", rating: 4, verified: false, date: "12 Ags 2024", text: "Model kabaknya modern tapi tetap sopan. Suami senang sekali, katanya nyaman dan terlihat gagah." },
  { name: "Imran G.", type: "photo", cat: "Vest", rating: 5, verified: true, date: "10 Ags 2024", img: "https://api.moda.app/api/v2/images/ref/88db7c83-8b08-4301-befb-52ef4d1dc260?v=e88e152936618197&s=f5a2d19e7b5c32fdfae5799861f724ae", cap: "Setelan vest dan koko", text: "Kombinasi vest dan koko-nya serasi. Detail finishing-nya rapi, terlihat sangat berkelas." },
  { name: "Kartika S.", type: "text", cat: "Kandora", rating: 5, verified: true, date: "8 Ags 2024", text: "Konsultasi dulu lewat WA sebelum beli, dibantu pilih ukuran dengan sabar. Hasilnya pas dan memuaskan." },
];
