ECCOFOOD PRINT AGENT

QUE ES ESTO

Eccofood Print Agent permite que el TPV imprima tickets directamente en la impresora
de Windows y abra el cajon monedero sin mostrar la vista previa de Chrome.

Debe instalarse SOLO en el computador donde estan conectados:
- La impresora de tickets
- El cajon monedero

INSTALACION PASO A PASO

1. Descarga el archivo desde Eccofood.
2. Busca el archivo descargado en la carpeta Descargas.
3. Haz clic derecho sobre el archivo ZIP y elige "Extraer todo" o "Descomprimir".
4. Abre la carpeta descomprimida.
5. Busca el archivo Instalar-EccofoodPrint.bat.
6. Haz clic derecho sobre Instalar-EccofoodPrint.bat.
7. Elige "Ejecutar como administrador".
8. Si Windows pregunta "Deseas permitir que esta aplicacion haga cambios", pulsa "Si".
9. Espera a que termine la instalacion.
10. Cuando termine, cierra la ventana.

IMPORTANTE

Despues de instalarlo como administrador, el agente debe abrirse solo cada vez que
Windows inicie sesion. No hace falta que el dueño este en el restaurante para abrirlo.

COMPROBAR QUE FUNCIONA

1. Abre Chrome en el mismo computador de la impresora.
2. Escribe esta direccion:

http://127.0.0.1:17777/health

3. Si ves una respuesta con "ok", el agente esta funcionando.

SI DICE QUE NO RESPONDE

1. Abre la carpeta donde descomprimiste el instalador.
2. Ejecuta Abrir-EccofoodPrint.bat.
3. Deja esa ventana abierta mientras uses el TPV.
4. Vuelve a probar:

http://127.0.0.1:17777/health

Luego abre Eccofood:
Configuracion > Impresoras > Usar impresora de Windows > Config

Valores recomendados:
- Puente local sin vista previa: activo
- Direccion: http://127.0.0.1:17777
- Nombre impresora Windows: default
- Abrir cajon al cobrar: activo

Verificar:
Abre esta direccion en el navegador del mismo computador:
http://127.0.0.1:17777/health

Si responde OK, el agente esta funcionando.

Archivos utiles:
- Abrir-EccofoodPrint.bat: abre el agente en una ventana visible.
- Estado-EccofoodPrint.bat: comprueba si esta activo.
- Desinstalar-EccofoodPrint.bat: lo elimina.
