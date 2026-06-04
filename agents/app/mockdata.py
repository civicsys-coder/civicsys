"""Propuestas para la deliberación ciudadana de Hermes / La Tóxica.

Leyes y proyectos de ley PERUANOS REALES y ACTUALES (2024-2026). Los conteos de
votos REFLEJAN EL SENTIR REAL del pueblo (proporciones de encuestas reales —
IEP, Ipsos, Datum, CPI, referéndum 2018 — escaladas a una participación cívica
verosímil). `congress_context` es la acción REAL del Congreso/Estado (fechas y
votos verificados), que La Tóxica usa para comparar congreso vs pueblo.

Fuentes por ley en los campos `sentiment_source`/`sources` del research
(IEP, Ipsos, Datum, CPI, El Comercio, IDEHPUCP, Congreso, El Peruano, TC,
Defensoría, HRW, OHCHR, La República, Infobae). Demo del hackathon Syscoin.
"""

PROPOSALS = [
    {
        "id": 1,
        "title": "Ley 32419 — Amnistía a militares, policías y comités de autodefensa",
        "category": "justicia y derechos humanos",
        "status": "vigente",
        "description": (
            "Concede amnistía a militares, policías y comités de autodefensa por delitos en la "
            "lucha antiterrorista 1980-2000. Promulgada ago-2025; la ONU y la Corte IDH advierten "
            "que consagra impunidad para graves violaciones a los DD.HH."
        ),
        "yes": 17680, "no": 51360, "abstain": 15160,  # IEP set-2025: 21% a favor / 61% en contra / 18% indeciso
        "sentiment_source": "IEP set-2025: 61% rechaza, 21% a favor, 18% indeciso",
        "congress_context": (
            "El Congreso aprobó la Ley 32419 el 11 de junio de 2025 con 61 votos a favor, 44 en "
            "contra y 3 abstenciones. La presidenta Dina Boluarte la promulgó el 13 de agosto de "
            "2025 (publicada en El Peruano). Concede amnistía a FF.AA., PNP y comités de "
            "autodefensa por delitos en la lucha contra el terrorismo (1980-2000), beneficiando a "
            "personas sin sentencia firme y a mayores de 70 años con condena cumplida. La "
            "promulgación desacató a la Corte Interamericana de DD.HH., que había pedido suspender "
            "el proceso; la ONU la calificó de afrenta a las víctimas."
        ),
    },
    {
        "id": 2,
        "title": "Ley 32123 — Reforma de pensiones: prohíbe el retiro libre de fondos AFP",
        "category": "pensiones y economía",
        "status": "vigente",
        "description": (
            "Reforma previsional: pensión mínima de S/600 y prohíbe el retiro libre de fondos AFP. "
            "Tras protestas masivas, el Congreso revocó (sep-2025) el aporte obligatorio a "
            "independientes y el tope del 95,5% para menores de 40."
        ),
        "yes": 26780, "no": 39780, "abstain": 9940,  # ~35% a favor / 52% en contra / 13% indeciso
        "sentiment_source": "Ipsos: 82% rechaza Estado único administrador; CPI abr-2024: 65,6% quiere retirar AFP; protestas set-2025",
        "congress_context": (
            "El Congreso aprobó la Ley 32123 el 6 de junio de 2024 en segunda lectura con 38 votos "
            "a favor, 10 en contra y 16 abstenciones (con ausencias que cuestionaron su "
            "representatividad). Promulgada el 24 de septiembre de 2024. Fija pensión mínima de "
            "S/600, prohíbe el retiro libre de fondos, restringe el retiro del 95,5% a menores de "
            "40 y crea afiliación obligatoria. Tras protestas masivas del 13-21 de septiembre de "
            "2025, el propio Congreso revocó dos medidas impopulares: el aporte obligatorio de "
            "independientes y el tope del 95,5%."
        ),
    },
    {
        "id": 3,
        "title": "Ley 32330 — Adolescentes de 16-17 años juzgados como adultos",
        "category": "seguridad y justicia penal",
        "status": "anulada por el TC",
        "description": (
            "Permitía juzgar a adolescentes de 16-17 años como adultos por delitos graves "
            "(promulgada may-2025). El Tribunal Constitucional la declaró inconstitucional "
            "(dic-2025) y reafirmó la imputabilidad penal a los 18 años."
        ),
        "yes": 52950, "no": 32870, "abstain": 5480,  # ~58% a favor (clamor de seguridad) / 36% en contra / 6%
        "sentiment_source": "IEP ene-2025: 55% apoya mano dura aun violando derechos; Ipsos feb-2025: 62% pide Estado duro",
        "congress_context": (
            "El Congreso aprobó la Ley 32330 el 10 de mayo de 2025 (publicada en El Peruano), "
            "incorporando a los menores de 16 y 17 años como imputables penalmente por delitos "
            "graves (homicidio, sicariato, violación, terrorismo). La Defensoría del Pueblo "
            "presentó demanda de inconstitucionalidad; el Tribunal Constitucional, el 5 de "
            "diciembre de 2025, la declaró INCONSTITUCIONAL, reafirmó la imputabilidad a los 18 "
            "años (Convención sobre los Derechos del Niño) y ordenó archivar los procesos contra "
            "menores y trasladarlos a centros juveniles."
        ),
    },
    {
        "id": 4,
        "title": "Ley 31988 — Retorno a la bicameralidad (Senado + Cámara de Diputados)",
        "category": "reforma del Estado",
        "status": "vigente desde 2026",
        "description": (
            "Reforma constitucional que restablece el Congreso bicameral (Senado de 60 + Cámara de "
            "130 diputados) desde 2026, pese a que la bicameralidad fue rechazada por ~90% en el "
            "referéndum de 2018."
        ),
        "yes": 4870, "no": 33120, "abstain": 10710,  # ~10% a favor / 68% en contra / 22% (IEP mar-2024; ref. 2018 90% no)
        "sentiment_source": "Referéndum 2018: 90% rechazó; IEP mar-2024: 68% rechaza",
        "congress_context": (
            "El Congreso aprobó la Ley 31988 el 6 de marzo de 2024 con 91 votos a favor, 30 en "
            "contra y 1 abstención. La presidenta Boluarte la promulgó el 19 de marzo de 2024. "
            "Modifica más de 50 artículos de la Constitución para restablecer el Congreso bicameral "
            "(Senado de 60 + Cámara de 130 diputados), vigente desde las elecciones de 2026. Lo "
            "hizo SIN convocar un nuevo referéndum, pese a que la bicameralidad fue rechazada por "
            "el 90% de votantes en el referéndum de 2018."
        ),
    },
    {
        "id": 5,
        "title": "Detención policial de hasta 15 días por extorsión y sicariato",
        "category": "seguridad ciudadana",
        "status": "en debate",
        "description": (
            "Reforma constitucional (PL 12338/12440) que amplía la detención policial de 48 horas a "
            "15 días para extorsión y sicariato. Aprobada en comisión (nov-2025), pendiente de "
            "segunda votación en el pleno."
        ),
        "yes": 42410, "no": 18470, "abstain": 7520,  # ~62% a favor (mano dura) / 27% en contra / 11%
        "sentiment_source": "Ipsos feb-2025: 62% prefiere un Estado 'muy duro' contra el delito",
        "congress_context": (
            "La Comisión de Constitución aprobó el 4 de noviembre de 2025, con 20 votos a favor y 2 "
            "abstenciones, un dictamen que amplía la detención policial de 48 horas a un máximo de "
            "15 días para sicariato y extorsión. Por ser reforma constitucional requiere aprobación "
            "en dos legislaturas; al 4 de junio de 2026 sigue pendiente de la segunda votación en "
            "el pleno (plazo máximo julio 2026). La Defensoría, el Poder Judicial y el Ministerio "
            "Público respaldan la medida."
        ),
    },
    {
        "id": 6,
        "title": "Ley 32301 — Control estatal de ONG y cooperación extranjera (APCI)",
        "category": "sociedad civil y libertades",
        "status": "vigente",
        "description": (
            "Modifica la APCI: exige autorización estatal previa a las ONG, prohíbe financiar "
            "litigios contra el Estado y fija multas de hasta 500 UIT. Promulgada abr-2025; CIDH y "
            "ONU alertan riesgo a la sociedad civil y la libertad de prensa."
        ),
        "yes": 13720, "no": 20380, "abstain": 5100,  # ~35% a favor / 52% en contra / 13% (IEP jun-2025: 42% confía en ONG)
        "sentiment_source": "IEP jun-2025: 42% confía en ONG; rechazo de CIDH/ONU/IDL a la 'ley anti-ONG'",
        "congress_context": (
            "El Congreso aprobó la Ley 32301 el 12 de marzo de 2025 con 82 votos a favor, 16 en "
            "contra y 4 abstenciones (exonerada de segunda votación). Promulgada por Dina Boluarte "
            "el 14 de abril de 2025. Modifica la Ley 27692 (APCI): exige autorización previa "
            "obligatoria a los proyectos de ONG, prohíbe usar fondos de cooperación para litigar "
            "contra el Estado e impone multas de hasta 500 UIT (~US$720,000) y cancelación de "
            "registro. La CIDH y la ONU advirtieron que restringe el espacio cívico; el Poder "
            "Judicial la declaró parcialmente inaplicable (jun-2025, amparo del IDL)."
        ),
    },
    {
        "id": 7,
        "title": "Ley 32181 — Elimina la detención preliminar en casos no flagrantes",
        "category": "justicia y anticorrupción",
        "status": "derogada (restituida por Ley 32255)",
        "description": (
            "Eliminó la detención preliminar en casos de no flagrancia (dic-2024), debilitando la "
            "persecución del crimen organizado y la corrupción. El propio Congreso la restituyó con "
            "la Ley 32255 (mar-2025) tras críticas de la Fiscalía."
        ),
        "yes": 14590, "no": 33870, "abstain": 3650,  # ~28% a favor / 65% en contra / 7% (la gente pide mano dura)
        "sentiment_source": "Ipsos feb-2025: 62% pide Estado duro; IEP ene-2025: 41% culpa al Congreso de no aprobar leyes anti-crimen",
        "congress_context": (
            "El Congreso aprobó la Ley 32181 el 11 de diciembre de 2024 con 94 votos; Boluarte la "
            "promulgó ese mismo día. Eliminó la detención preliminar en casos de no flagrancia, "
            "afectando delitos graves (terrorismo, corrupción, trata, extorsión, narcotráfico). "
            "Ante las críticas de la Fiscalía, el Poder Judicial y organizaciones de DD.HH., el "
            "propio Congreso aprobó la Ley 32255 el 6 de marzo de 2025 (86 votos), que RESTITUYÓ la "
            "detención preliminar en casos de no flagrancia."
        ),
    },
]


def get_proposal(pid: int) -> dict | None:
    return next((p for p in PROPOSALS if p["id"] == pid), None)
