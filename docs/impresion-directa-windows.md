# Impresion directa Windows

Este modo evita la vista previa de Chrome y permite abrir el cajon monedero usando comandos ESC/POS.

## En el computador de la impresora

1. Abre Eccofood.
2. Ve a `Configuracion > Impresoras`.
3. Descarga `Eccofood Print Agent`.
4. Descomprime el ZIP.
5. Haz clic derecho en `Instalar-EccofoodPrint.bat`.
6. Selecciona `Ejecutar como administrador`.

## En Eccofood

1. Usa `Usar impresora de Windows`.
2. En la tarjeta de la impresora abre `Config`.
3. Activa `Puente local`.
4. Deja la direccion como `http://127.0.0.1:17777`.
5. Si quieres usar la impresora predeterminada de Windows, deja el nombre como `default`.
6. Activa `Abrir cajon al cobrar`.

## Verificar

Abre esta direccion en el mismo computador:

```text
http://127.0.0.1:17777/health
```

Si responde `ok`, el agente esta funcionando.
