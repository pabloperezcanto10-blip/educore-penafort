# Known Bugs / Riesgos conocidos

## Entorno local

Históricamente hubo problemas de caché CSS/Next cuando el proyecto estaba en OneDrive. La ruta estable recomendada es:

`C:\Proyectos\Colegio-Penafort-Platform`

## Corium AI

- Si `AI_ASSISTANT_ENABLED=false`, el botón no aparece.
- Si falta la clave del proveedor seleccionado, el endpoint devuelve: `El asistente todavía no está configurado.`
- Los límites gratuitos dependen del proveedor y pueden cambiar.
- La fase 1 no usa contexto automático; las respuestas dependen del texto que escriba el usuario.

## Pendiente de revisar en producción

- Variables de entorno de Vercel para AI.
- Cuotas del proveedor seleccionado.
- Pruebas manuales con clave real de Groq o Gemini.
