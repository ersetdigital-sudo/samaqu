import localFont from "next/font/local";

export const plusJakarta = localFont({
  src: [
    { path: "../../public/fonts/plusjakartasans-light.ttf", weight: "300", style: "normal" },
    { path: "../../public/fonts/plusjakartasans-regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/plusjakartasans-medium.ttf", weight: "500", style: "normal" },
    { path: "../../public/fonts/plusjakartasans-semibold.ttf", weight: "600", style: "normal" },
    { path: "../../public/fonts/plusjakartasans-bold.ttf", weight: "700", style: "normal" },
    { path: "../../public/fonts/plusjakartasans-extrabold.ttf", weight: "800", style: "normal" },
  ],
  variable: "--font-plus-jakarta",
  display: "swap",
});
