# Bucket de Scoop de drop

Manifiesto de [drop](https://github.com/Oloxx/drop), transferencia de archivos P2P cifrada de
extremo a extremo, para Windows x64.

```powershell
scoop bucket add oloxx https://github.com/Oloxx/scoop-bucket
scoop install oloxx/drop
```

Para actualizar, `scoop update drop`, no `drop update`: el binario es de Scoop.

Sin aviso de SmartScreen: Scoop descarga sin marcar el archivo como bajado de Internet.

## Cómo se mantiene

`bucket/drop.json` no se edita a mano. `scripts/update.mjs` lo genera a partir de la última
release de `Oloxx/drop`, y **solo después de comprobar con `minisign` la firma de su
`SHA256SUMS`** con la clave pública del proyecto:

```
RWQqNnfqvCrj+eavJ9njz2vCoHaC8YnLqjsvNBMndz3hBroQLpou7+Kp
```

El workflow `Actualizar y probar` lo ejecuta cada seis horas, hace commit si hay versión nueva e
instala el manifiesto de verdad con Scoop en Windows antes de darlo por bueno.
