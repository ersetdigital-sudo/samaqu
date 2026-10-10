/** State alur Open Order (/open-order) — dipakai lintas langkah wizard. */

export interface ProductDraft {
  productId: string;
  color: string;
  size: string;
  series: string;
  quantity: number;
  /** Harga pilihan customer (Create Your Price), minimal harga series terpilih. */
  price: number;
}

export interface CartLine extends ProductDraft {
  key: number;
}

export interface CustomerData {
  name: string;
  whatsapp: string;
  address: string;
  district: string;
  city: string;
  postalCode: string;
  notes: string;
}

export const EMPTY_CUSTOMER: CustomerData = {
  name: "",
  whatsapp: "",
  address: "",
  district: "",
  city: "",
  postalCode: "",
  notes: "",
};

export interface DraftShipping {
  service: string;
  cost: number;
}
