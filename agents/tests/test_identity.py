from app.identity import IdentityService


def _vec(i: int) -> list[float]:
    v = [0.0] * 384
    v[i] = 1.0
    return v


def test_register_y_dedupe():
    svc = IdentityService(threshold=0.92)
    fc = "0x" + "ab" * 32
    svc.register_face(_vec(0), fc)

    dup = svc.dedupe(_vec(0))
    assert dup.duplicate is True
    assert dup.top_match == fc

    distinto = svc.dedupe(_vec(5))
    assert distinto.duplicate is False


def test_register_idempotente_por_commitment():
    svc = IdentityService()
    fc = "0x" + "cd" * 32
    svc.register_face(_vec(1), fc)
    svc.register_face(_vec(1), fc)  # repetido, no duplica
    assert len(svc.index._items) == 1


def test_threshold_override_en_dedupe():
    svc = IdentityService(threshold=0.99)
    svc.register_face(_vec(0), "0x" + "11" * 32)
    # vector casi idéntico pero no exacto: con umbral alto no es duplicado
    almost = _vec(0)
    almost[1] = 0.3
    assert svc.dedupe(almost).duplicate is False
