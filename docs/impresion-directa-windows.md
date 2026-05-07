# Impresion directa Windows

Este modo evita la vista previa de Chrome y permite abrir el cajon monedero usando comandos ESC/POS.

## En el computador de la impresora

1. Abre PowerShell.
2. Entra a la carpeta del proyecto.
3. Ejecuta:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\eccofood-print-bridge.ps1
```

Deja esa ventana abierta mientras uses el TPV.

## En Eccofood

1. Ve a Configuracion > Impresoras.
2. Usa "Usar impresora instalada en Windows".
3. En la tarjeta de la impresora abre "Config".
4. Activa "Puente local".
5. Si quieres usar la impresora predeterminada de Windows, deja el nombre como `default`.

Si el puente local no esta abierto, Eccofood vuelve al metodo normal del navegador.
