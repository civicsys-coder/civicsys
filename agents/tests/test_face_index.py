from app.face_index import FaceIndex, cosine_similarity


def test_cosine_identicos_es_1():
    v = [0.0] * 384
    v[0] = 1.0
    assert abs(cosine_similarity(v, v) - 1.0) < 1e-9


def test_index_detecta_duplicado_por_umbral():
    idx = FaceIndex(threshold=0.92)
    base = [0.0] * 384
    base[0] = 1.0
    idx.add(base, "0x" + "ab" * 32)

    res = idx.query(base)
    assert res.duplicate is True
    assert res.similarity > 0.99
    assert res.top_match == "0x" + "ab" * 32


def test_index_no_duplica_vector_distinto():
    idx = FaceIndex(threshold=0.92)
    a = [0.0] * 384; a[0] = 1.0
    b = [0.0] * 384; b[1] = 1.0
    idx.add(a, "0x" + "11" * 32)
    res = idx.query(b)
    assert res.duplicate is False


def test_index_vacio_no_duplica():
    idx = FaceIndex(threshold=0.92)
    v = [0.0] * 384; v[0] = 1.0
    res = idx.query(v)
    assert res.duplicate is False
    assert res.top_match is None
