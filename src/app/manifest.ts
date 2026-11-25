import type { MetadataRoute } from "next";

// The app icons from shukraan-emblem-files.zip (the emblem on cream).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ŞukraanEdu Akademisi | أَكاديمِيَّةُ شُكْران إِيدْيُو",
    short_name: "ShukraanEdu",
    start_url: "/",
    display: "browser",
    background_color: "#f3ead7",
    theme_color: "#071027",
    icons: [
      { src: "/icons/icon-180.png", sizes: "180x180", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
