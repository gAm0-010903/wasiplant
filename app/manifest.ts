import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WasiPlant - Gestión Administrativa',
    short_name: 'WasiPlant',
    description: 'Sistema de gestión logística y de clientes para WasiPlant',
    start_url: '/',
    display: 'standalone', // Esto hace que al abrirla se vea como app nativa (sin la barra del navegador)
    background_color: '#ecfdf5', // El verde agua que elegimos para el fondo
    theme_color: '#15803d', // Un verde oscuro para la barra superior del celular
    icons: [
      {
        src: '/wasi-plant.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/wasi-plant.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}