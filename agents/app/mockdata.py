"""Datos ficticios para el demo del agente Hermes (sin dependencia de cadena/DB)."""

PROPOSALS = [
    {
        "id": 1,
        "title": "Reforma del artículo 56 — transparencia presupuestaria",
        "category": "gobernanza",
        "status": "abierta",
        "description": (
            "Obliga a publicar el presupuesto municipal ejecutado cada trimestre "
            "en formato de datos abiertos."
        ),
        "yes": 1240,
        "no": 380,
        "abstain": 95,
    },
    {
        "id": 2,
        "title": "Presupuesto participativo para el parque central",
        "category": "presupuesto",
        "status": "abierta",
        "description": (
            "Asigna el 5% del presupuesto de obras a proyectos elegidos directamente "
            "por la ciudadanía."
        ),
        "yes": 2100,
        "no": 540,
        "abstain": 120,
    },
    {
        "id": 3,
        "title": "Ordenanza de movilidad: ciclovías en la av. Central",
        "category": "movilidad",
        "status": "cerrada",
        "description": (
            "Construcción de 8 km de ciclovías protegidas reduciendo un carril "
            "vehicular en la avenida Central."
        ),
        "yes": 980,
        "no": 1450,
        "abstain": 210,
    },
    {
        "id": 4,
        "title": "Auditoría ciudadana del contrato de alumbrado público",
        "category": "auditoría",
        "status": "abierta",
        "description": (
            "Habilita una comisión ciudadana para auditar el contrato de alumbrado "
            "público 2024-2027."
        ),
        "yes": 3400,
        "no": 210,
        "abstain": 60,
    },
]


def get_proposal(pid: int) -> dict | None:
    return next((p for p in PROPOSALS if p["id"] == pid), None)
