Objetivo
Publicar AquaRisk en:
https://terranava.org/aquarisk/

Contenido a subir
- Carpeta: aquarisk
- Archivo principal: aquarisk/index.html
- Carpeta: aquarisk-data
- Carpeta: aquarisk-api
- Nota crítica: AquaRisk consume rutas absolutas /aquarisk-data/... y no funcionará si solo subes el HTML.
- Nota crítica: La serie temporal en puntos libres usa /aquarisk-api/historical-climate.php como proxy y caché ligera. Si no subes esa carpeta, el histórico dependerá solo del fallback del navegador.

Ruta destino en Hostinger
- public_html/aquarisk/index.html
- public_html/aquarisk-data/...
- public_html/aquarisk-api/...

Preparación local
1. Desde la raíz del proyecto ejecuta:
   tools/package_hostinger_bundle.sh
2. Ese script genera / actualiza:
   - hostinger-deploy/aquarisk/index.html
   - aquarisk-hostinger.zip

Pasos en hPanel
1. Abre Hostinger hPanel.
2. Entra en Websites > terranava.org > Dashboard.
3. Abre File Manager.
4. Entra en public_html.
5. Sube aquarisk-hostinger.zip a public_html.
6. Extrae el ZIP dentro de public_html para que queden estas rutas:
   - public_html/aquarisk/index.html
   - public_html/aquarisk-data/...
   - public_html/aquarisk-api/historical-climate.php
7. Si el File Manager pregunta por sobreescritura, acepta reemplazar los archivos anteriores de AquaRisk.
8. Verifica:
   - https://terranava.org/aquarisk/
   - https://terranava.org/aquarisk-data/manifest/atlas.json
   - https://terranava.org/aquarisk-api/historical-climate.php?latitude=-21.4200&longitude=-64.7290

Paso final en WordPress
Cambia el botón actual que apunta a:
https://terranava.org/wp-content/uploads/2026/03/aquarisk-ong.html

Por esta URL limpia:
https://terranava.org/aquarisk/
