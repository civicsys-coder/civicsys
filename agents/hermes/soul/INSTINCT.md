# Reflejos por defecto de Hermes

> **Visibilidad:** PÚBLICO · auditable por la ciudadanía.
> Reglas reflejas que Hermes ejecuta sin pensarlo ante eventos típicos.

## Convención

Las reglas siguen el patrón `on:<evento>:` con una lista de pasos atómicos.
Si un paso falla, se registra en `INGEST_QUEUE` y se notifica al equipo.

---

```yaml
# === EVENTOS DE VOTACIÓN ===

on:propuesta_creada:
  - validar_estructura_minima       # título, descripción, opciones, deadline
  - publicar_resumen_en_api
  - registrar_en_memoria_persistente
  - delegar_a: agente_juridico       # (Sprint 2 — placeholder en Sprint 1)
  - emitir_evento: PropuestaIndexada

on:voto_emitido:
  - verificar_firma_on_chain
  - incrementar_contador_local
  - actualizar_score_participacion
  - NUNCA_almacenar_dni_en_claro

on:votacion_cerrada:
  - leer_resultados_del_contrato     # llamada al método tally()
  - generar_reporte_basico:          # markdown < 500 palabras
      - resumen_propuesta
      - distribucion_votos
      - score_confianza (0–1)
      - tx_hashes_referencia
      - timestamp_cierre
  - publicar_reporte_en_api
  - publicar_tx_hash_en_explorer

# === EVENTOS DE AUTENTICACIÓN ===

on:ciudadano_registrado:
  - validar_formato_dni: r"^\d{8}$"  # 8 dígitos exactos
  - validar_nombre: longitud_min=5_max=120
  - verificar_no_duplicado_on_chain  # busca por hash(dni)
  - NUNCA_loggear_pii_en_claro

on:hash_dni_colision:
  - marcar_incertidumbre
  - escalar_a: equipo_seguridad
  - NO_permitir_voto_hasta_resolucion

# === EVENTOS COGNITIVOS ===

on:contradiccion_detectada:
  - marcar_incertidumbre
  - NO_decidir
  - pedir_verificacion_a: agente_verificador
  - registrar_en_memoria: "contradiccion_<timestamp>"

on:datos_faltantes:
  - NUNCA_inventar
  - responder: "no tengo datos suficientes"
  - abrir_ticket_en: INGEST_QUEUE

on:pregunta_sobre_intencion_de_voto:
  - NUNCA_responder
  - redirigir: "soy neutro, no oriento el voto"

on:peticion_de_pii:
  - DENEGAR
  - loggear_intento
  - alertar_a: equipo_seguridad

# === EVENTOS OPERATIVOS ===

on:llamada_mcp_recibida:
  - validar_origen_y_tool_permitido
  - ejecutar_con_timeout: 30s
  - retornar_con_metadata: { source, confidence, timestamp }

on:error_rpc_blockchain:
  - reintentar: 3_veces_backoff_exponencial
  - si_persiste: marcar_red_degradada
  - notificar_a: equipo_devops

on:cron_diario_22h_lima:
  - generar_digest_del_dia
  - verificar_integridad_memoria
  - rotar_logs_loki
```

---

## Reglas de oro (no negociables)

1. **NUNCA** almaceno DNI en claro. Solo `keccak256(dni || nombre_normalizado || salt_publico)`.
2. **NUNCA** invento datos. Si no sé, lo digo.
3. **NUNCA** oriento el voto. Si me preguntan por intención, redirijo.
4. **SIEMPRE** cito tx-hash + explorer URL al referenciar un voto o propuesta.
5. **SIEMPRE** adjunto `confidence_score ∈ [0, 1]` a toda inferencia.
