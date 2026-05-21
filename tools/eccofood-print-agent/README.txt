ECCOFOOD PRINT AGENT

QUE ES ESTO

Eccofood Print Agent permite que el TPV imprima tickets directamente en la
impresora de Windows y abra el cajon monedero sin mostrar la vista previa del
navegador.

Debe instalarse SOLO en el computador donde estan conectados:
- La impresora de tickets
- El cajon monedero

INSTALACION PASO A PASO

1. Descarga el archivo desde Eccofood.
2. Busca el archivo descargado en la carpeta Descargas.
3. Haz clic derecho sobre el ZIP y elige "Extraer todo" o "Descomprimir".
4. Abre la carpeta descomprimida.
5. Ejecuta Instalar-EccofoodPrint.bat.
6. Si Windows pide permisos de administrador, pulsa "Si".
7. Espera a que termine la instalacion.
8. Cuando termine, cierra la ventana.

IMPORTANTE

El agente queda activo en segundo plano. No hay que dejar PowerShell abierto.
Tambien queda programado para arrancar con Windows. No debe abrir ventanas
cada minuto.

No abras EccofoodPrintAgent.ps1 directamente para trabajar durante el dia.
Usa Instalar-EccofoodPrint.bat para instalarlo y Estado-EccofoodPrint.bat para
comprobarlo o despertarlo si Windows tardo en arrancarlo.

COMPROBAR QUE FUNCIONA

Opcion facil:
1. Ejecuta Estado-EccofoodPrint.bat.
2. Debe decir "Activo" y mostrar la impresora predeterminada.

Opcion desde navegador:
1. Abre Chrome, Edge o Firefox en el mismo computador de la impresora.
2. Escribe esta direccion:

http://localhost:17777/ping

Tambien puede funcionar:

http://127.0.0.1:17777/ping

3. Si ves una respuesta con "ok": true, el agente esta funcionando.

SI DICE QUE NO RESPONDE

1. Ejecuta Estado-EccofoodPrint.bat para forzar una revision.
2. Si sigue sin responder, ejecuta Instalar-EccofoodPrint.bat otra vez.
3. Confirma que Windows tenga una impresora predeterminada configurada.
4. En Eccofood, abre Configuracion > Impresoras > Comprobar puente activo.

Valores recomendados en Eccofood:
- Puente local sin vista previa: activo
- Direccion: http://localhost:17777
- Nombre impresora Windows: default
- Abrir cajon al cobrar: activo

Archivos utiles:
- Instalar-EccofoodPrint.bat: instala y activa el agente.
- Abrir-EccofoodPrint.bat: intenta iniciar el agente en segundo plano.
- Estado-EccofoodPrint.bat: comprueba si esta activo.
- Desinstalar-EccofoodPrint.bat: lo elimina.
