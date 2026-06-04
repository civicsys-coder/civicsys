# T-02 — Copiar auditoría docx a `docs/security/`

**Prio**: infra · **Bloqueada por**: T-01 · **ADR**: —

## Qué hacer

Copiar `C:\Users\Orlando\OneDrive\Desktop\Syscoin Hackathon Blockchain\CivicSys-Auditoria-Ciberseguridad.docx` al repo en `docs/security/CivicSys-Auditoria-Ciberseguridad.docx`. Es la **fuente de verdad** de la auditoría original — vive en el repo desde ahora.

Si Tatiana entrega una versión revisada, sobreescribir el archivo y mencionar en `docs/security/README.md` "última actualización: <fecha>".

Borrar el archivo temporal `.aegis-tmp-auditoria.md` usado para análisis durante la fase Estrategia.

## Criterio de done

- [ ] Existe `docs/security/CivicSys-Auditoria-Ciberseguridad.docx` (tamaño ≥ 30 KB, formato docx válido).
- [ ] `docs/security/README.md` lo lista en la tabla de contenido.
- [ ] `.aegis-tmp-auditoria.md` borrado.

## Comando de verificación

```bash
ls -la docs/security/CivicSys-Auditoria-Ciberseguridad.docx
test ! -f .aegis-tmp-auditoria.md && echo OK
```
