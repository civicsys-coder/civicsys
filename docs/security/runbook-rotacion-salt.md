# Runbook — Rotación de `PUBLIC_SALT`

**Cuándo aplicar**:
- Tras cualquier sospecha de compromiso del salt (filtración del `.env`, comprometido del VPS).
- Al rotar entre entornos (dev → staging → prod).
- Como práctica programada (ej. cada 6-12 meses si hay producción).

**Quién lo ejecuta**: operador con acceso a los entornos productivos del frontend, backend Python y deploy de contratos.

**Impacto**: rotar el salt **invalida** los hashes ciudadanos ya registrados — los ciudadanos previamente registrados deben re-registrarse con el nuevo salt. Coordinar con anuncio público.

## Pasos

### 1. Generar nuevo salt

```bash
openssl rand -hex 32
# ej. salida: 7c8e9d1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d
```

Guardar este valor en un gestor seguro (1Password / vault / KMS). **No** anotarlo en chat ni en archivos compartidos.

### 2. Actualizar `.env` en cada deploy

Los archivos `.env` viven en cada deploy (no commiteados). Componentes que tienen `.env` con `PUBLIC_SALT`:

- **Frontend** (Next.js): `frontend/civicsys/.env.local` (variable expuesta vía `NEXT_PUBLIC_PUBLIC_SALT` si el frontend la usa directamente — verificar; idealmente el frontend solo recibe el hash ya calculado).
- **Backend Node BFF** (opcional, si lo necesita): `backend/.env`.
- **Agents Python**: `agents/.env`.
- **Hardhat deploy scripts**: `blockchain/.env`.

Comando por componente:

```bash
# Sustituir <NEW_SALT> por el valor de openssl rand
cd frontend/civicsys
# editar .env.local con $EDITOR
# PUBLIC_SALT=<NEW_SALT>

cd ../../backend
# .env  PUBLIC_SALT=<NEW_SALT>

cd ../agents
# .env  PUBLIC_SALT=<NEW_SALT>

cd ../blockchain
# .env  PUBLIC_SALT=<NEW_SALT>
```

### 3. Reiniciar servicios

```bash
# Reiniciar backend Python
cd agents
# detener uvicorn corriendo
# relanzar: uvicorn app.main:app --reload --port 8000

# Reiniciar backend Node
cd ../backend
# pnpm dev / pm2 restart

# Re-build frontend
cd ../frontend/civicsys
pnpm build && pnpm start
```

### 4. Re-deploy del contrato si el salt cambió en deploy time

**Sólo aplica si `PUBLIC_SALT` se usa en deploy de contratos** (Sprint 1 no aplica — el hash se calcula off-chain por el cliente). Si en algún sprint futuro el contrato recibe el salt como parámetro del constructor, hay que re-deploy.

### 5. Notificación a ciudadanos registrados

Si el sistema ya tenía padrón activo:

1. Publicar anuncio en la UI: "El sistema rotó su clave criptográfica por seguridad. Por favor re-registrate con tu DNI."
2. Re-registrar significa volver a calcular `hash = keccak256(dni || NEW_SALT)` y llamar `CitizenRegistry.register(newHash)` con la misma wallet (que mantiene la asociación `address → hash`).

### 6. Confirmación post-rotación

```bash
# Confirmar que el frontend produce hashes diferentes
# (manualmente o con un test E2E):
# - registrar un usuario de prueba
# - verificar que el hash on-chain difiere del padrón anterior

# Verificar que el repo NO commiteó el nuevo salt:
git grep -E "PUBLIC_SALT=[^<]" -- '*.env.example' && echo "ALERTA: salt commiteado, revertir" || echo "OK"
```

## Lo que NO se hace

- **No** se actualiza `.env.example` con el nuevo valor. Esos archivos sólo tienen placeholders.
- **No** se commitea el nuevo valor a git en ningún lado.
- **No** se comparte el valor en Slack / WhatsApp / chats no cifrados.

## En caso de error post-rotación

- Si los ciudadanos no pueden re-registrarse: revisar logs de FastAPI y del contrato. El error más común es no haber reiniciado todos los componentes (un servicio sigue con salt viejo).
- Si el frontend muestra hashes que parecen incorrectos: clear browser cache + redeploy.

## Referencias

- `docs/plans/executed/arquitectura/ADR-001-salt-strategy.md` — por qué hacemos esto.
- `docs/security/threat-model.md` — vector S1.
- `docs/security/known-limitations.md` — L-05 (HMAC con pepper futuro).
