/**
 * Fondo institucional estático (antes "lluvia Matrix").
 *
 * El repintado institucional retira el efecto cyberpunk/gamer. Conservamos el
 * mismo nombre de export y la misma firma (sin props) para no tocar las 4
 * páginas que lo importan; ahora pinta una atmósfera sobria: rejilla tipo
 * "ledger" muy tenue + un halo radial azul. Sin animación, sin canvas,
 * `aria-hidden`, detrás del contenido y sin capturar el puntero.
 */
export function MatrixRain() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        backgroundImage: [
          "radial-gradient(60rem 40rem at 50% -10%, rgba(62,143,214,0.10), transparent 70%)",
          "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
        ].join(","),
        backgroundSize: "100% 100%, 44px 44px, 44px 44px",
        maskImage:
          "radial-gradient(120% 90% at 50% 0%, #000 35%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(120% 90% at 50% 0%, #000 35%, transparent 100%)",
      }}
    />
  );
}
