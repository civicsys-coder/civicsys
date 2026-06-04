from app.memory import HermesMemoryStore, HashEmbedder


def test_hash_embedder_returns_384_dims():
    e = HashEmbedder()
    vec = e.encode("texto cualquiera")
    assert len(vec) == 384
    assert all(isinstance(x, float) for x in vec)


def test_hash_embedder_deterministic():
    e = HashEmbedder()
    a = e.encode("hola")
    b = e.encode("hola")
    assert a == b


def test_hash_embedder_differs_per_text():
    e = HashEmbedder()
    a = e.encode("hola")
    b = e.encode("mundo")
    assert a != b


def test_hash_embedder_values_in_range():
    e = HashEmbedder()
    vec = e.encode("test")
    for v in vec:
        assert -1.0 <= v <= 1.0


def test_memory_store_uses_embedder():
    store = HermesMemoryStore(embedder=HashEmbedder())
    emb = store.compute_embedding("doc")
    assert len(emb) == 384
