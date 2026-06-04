"""Propuestas para la deliberación ciudadana de Hermes.

Leyes y proyectos de ley PERUANOS REALES y ACTUALES (2024–2026), para que la
ciudadanía vote y el Concilio delibere. Descripciones factuales; fuentes:
Congreso de la República, El Peruano (SPIJ), Human Rights Watch, OHCHR/ONU,
La República, Infobae, IDEHPUCP. Los conteos de votos son ilustrativos del
sentir ciudadano para la demo (no son datos oficiales).
"""

PROPOSALS = [
    {
        "id": 1,
        "title": "Ley 32419 — Amnistía a militares, policías y comités de autodefensa",
        "category": "justicia y derechos humanos",
        "status": "abierta",
        "description": (
            "Exonera de responsabilidad penal a militares, policías y miembros de comités "
            "de autodefensa por hechos del conflicto armado interno (1980-2000). Promulgada "
            "en agosto de 2025. La ONU y HRW advierten que podría afectar 156 casos con "
            "sentencia firme y más de 600 procesos por graves violaciones a los DD.HH."
        ),
        "yes": 1820,
        "no": 4360,
        "abstain": 540,
    },
    {
        "id": 2,
        "title": "Ley 32123 — Reforma de pensiones: prohíbe el retiro libre de fondos AFP",
        "category": "pensiones y economía",
        "status": "abierta",
        "description": (
            "Moderniza el sistema previsional: pensión mínima de S/600 (con 240 aportes o "
            "20 años) y prohíbe el retiro libre de los fondos de las AFP para nuevos afiliados "
            "y menores de 40 años. Tras 7 retiros extraordinarios previos, el 72% de afiliados "
            "ya había retirado sus fondos (S/115,2 mil millones)."
        ),
        "yes": 980,
        "no": 5210,
        "abstain": 430,
    },
    {
        "id": 3,
        "title": "Responsabilidad penal de adolescentes: juzgar a los 16-17 como adultos",
        "category": "seguridad y justicia penal",
        "status": "abierta",
        "description": (
            "Permite procesar penalmente a adolescentes de 16 y 17 años como adultos. "
            "Promulgada en mayo de 2025; convertiría a Perú en el primer país de la región en "
            "hacerlo, pese a la Convención sobre los Derechos del Niño. Una encuesta CPI "
            "reportó 83% de apoyo ciudadano."
        ),
        "yes": 5430,
        "no": 980,
        "abstain": 210,
    },
    {
        "id": 4,
        "title": "Ley 31988 — Retorno a la bicameralidad (Senado + Cámara de Diputados)",
        "category": "reforma del Estado",
        "status": "abierta",
        "description": (
            "Reforma constitucional que restablece el Congreso bicameral (Senado y Cámara de "
            "Diputados) a partir de las elecciones 2026. La bicameralidad había sido rechazada "
            "por cerca del 90% de votantes en el referéndum de 2018."
        ),
        "yes": 1130,
        "no": 4920,
        "abstain": 360,
    },
    {
        "id": 5,
        "title": "Detención policial de hasta 15 días por extorsión y sicariato",
        "category": "seguridad ciudadana",
        "status": "abierta",
        "description": (
            "Reforma que amplía la detención policial de 48 horas a 15 días naturales para "
            "delitos graves como extorsión y sicariato (PL 12338 y 12440-2025). Busca reforzar "
            "la seguridad; especialistas alertan sobre el riesgo a las garantías procesales."
        ),
        "yes": 4210,
        "no": 1560,
        "abstain": 380,
    },
    {
        "id": 6,
        "title": "Ley de control de ONG y fondos de cooperación extranjera (APCI)",
        "category": "sociedad civil y libertades",
        "status": "abierta",
        "description": (
            "Amplía el poder del Estado para fiscalizar y sancionar a ONG y periodistas que "
            "reciben fondos extranjeros (aprobada en marzo de 2025). Organizaciones "
            "internacionales advierten un riesgo para la sociedad civil y la libertad de prensa."
        ),
        "yes": 1670,
        "no": 2980,
        "abstain": 720,
    },
    {
        "id": 7,
        "title": "Ley 32181 — Elimina la detención preliminar en casos no flagrantes",
        "category": "justicia y anticorrupción",
        "status": "abierta",
        "description": (
            "Elimina la detención preliminar para personas que no cometieron delito flagrante "
            "(promulgada en diciembre de 2024). La Fiscalía advirtió que debilita la "
            "investigación del crimen organizado y la corrupción al restringir una herramienta clave."
        ),
        "yes": 740,
        "no": 4830,
        "abstain": 290,
    },
]


def get_proposal(pid: int) -> dict | None:
    return next((p for p in PROPOSALS if p["id"] == pid), None)
