import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite acceder al server de desarrollo desde otros dispositivos de la red local
  // (celulares en la misma Wi-Fi). Sin esto, Next 16 bloquea los recursos de dev y
  // la página se ve pero no responde (no hidrata el JavaScript).
  allowedDevOrigins: ["192.168.10.152"],
  // Oculta el indicador de dev de Next (el círculo con la "N").
  devIndicators: false,
};

export default nextConfig;
