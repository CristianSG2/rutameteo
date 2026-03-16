# rutameteo

Consulta el tiempo por tramos en tu ruta — sin registro, sin anuncios.

## ¿Qué es?

rutameteo es una app web que muestra el pronóstico del tiempo en cada tramo de tu ruta de conducción. Introduce origen, destino y hora de salida, y la app calcula la ruta real por carretera, estima la hora de llegada a cada punto intermedio y consulta el tiempo que hará en ese lugar a esa hora exacta.

## Demo

[rutameteo.cristiansg.dev](https://rutameteo.cristiansg.dev)

## Stack

- Vue 3 + Vite
- Leaflet.js + OpenStreetMap
- OSRM API (routing y tiempos de viaje)
- Open-Meteo API (pronóstico del tiempo)
- Photon by Komoot (geocodificación y autocompletado)
- SCSS
- Vercel (deploy)

## Funcionalidades

- Autocompletado de direcciones con soporte de calles y puntos de interés
- Paradas intermedias opcionales
- Selección de fecha y hora de salida
- Ruta real por carretera dibujada en el mapa
- Tiempo estimado de llegada a cada tramo usando OSRM Table API
- Pronóstico por tramo: temperatura, lluvia, viento, visibilidad e icono del tiempo
- Nombres reales de localidades en cada tramo (geocodificación inversa)
- 0 backends propios — todo corre en el cliente
- 0 API keys necesarias
- Responsive: móvil, tablet y desktop

## Desarrollo local

```bash
npm install
npm run dev     # localhost:5173
npm run build   # build de producción
```

## APIs utilizadas

Todas gratuitas y sin registro:

| API | Uso |
|-----|-----|
| [Open-Meteo](https://open-meteo.com) | Pronóstico horario del tiempo |
| [OSRM](https://project-osrm.org) | Cálculo de ruta y tiempos de viaje |
| [Photon by Komoot](https://photon.komoot.io) | Geocodificación y autocompletado |
| [OpenStreetMap](https://www.openstreetmap.org) | Tiles del mapa base |
