# EduCore PWA

EduCore se puede instalar como Progressive Web App (PWA). No es una app nativa y no usa React Native, App Store, Google Play ni Capacitor.

## Ruta inicial

La PWA abre directamente:

`/app`

Esta pantalla funciona como launcher sencillo para seleccionar el centro educativo. La landing pública sigue disponible en `/` para visitantes, demos y comunicación comercial.

## Instalación en iPhone

1. Abrir EduCore en Safari.
2. Pulsar el botón de compartir.
3. Elegir `Añadir a pantalla de inicio`.
4. Confirmar el nombre `EduCore`.

## Instalación en Android

1. Abrir EduCore en Chrome.
2. Pulsar `Instalar aplicación` si aparece el aviso.
3. Si no aparece, abrir el menú del navegador y seleccionar `Instalar aplicación` o `Añadir a pantalla de inicio`.

## Instalación en ordenador

1. Abrir EduCore en Chrome, Edge u otro navegador compatible.
2. Usar el botón `Instalar EduCore` de la landing o el icono de instalación del navegador.
3. Confirmar la instalación.

## Iconos y branding

Los assets PWA están en:

- `public/brand/educore/icon-192.png`
- `public/brand/educore/icon-512.png`
- `public/brand/educore/maskable-icon-512.png`
- `public/brand/educore/apple-touch-icon.png`
- `public/brand/educore/splash.png`
- `public/manifest.json`

Todos usan la identidad EduCore: navy oscuro, verde EduCore, dorado institucional, blanco cálido y gris claro.

## Limitaciones actuales

- No hay notificaciones push.
- No hay publicación en App Store ni Google Play.
- No hay modo offline completo para módulos internos.
- El launcher inicial solo muestra Colegio Peñafort como primer centro conectado.

## Próximos pasos

- Añadir múltiples centros desde configuración.
- Mejorar modo offline para recursos públicos.
- Evaluar notificaciones push cuando exista una política de privacidad y consentimiento clara.
- Añadir iconos PNG generados desde un pipeline de diseño definitivo cuando el equipo cierre los assets finales.
