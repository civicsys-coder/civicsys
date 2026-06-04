/**
 * Banner de advertencia mostrado en la pagina de voto:
 * "tu voto es visible en el explorador hasta que se implemente commit-reveal".
 *
 * Mitiga parcialmente HC-03 / SC-04 de la auditoria — voto consultivo en
 * calldata claro. La privacidad real llega con commit-reveal en Sprint 3+.
 * Ver docs/security/known-limitations.md L-01.
 */
import Link from "next/link";

export function VoteVisibilityWarning() {
  return (
    <div
      role="alert"
      data-testid="vote-visibility-warning"
      className="rounded-md border border-amber-400 bg-amber-50 p-4 text-sm text-amber-900 my-4"
    >
      <p className="font-semibold">Aviso de transparencia</p>
      <p className="mt-1">
        Tu voto será visible públicamente en el explorador de zkTanenbaum hasta
        que se implemente commit-reveal (planificado Sprint 3+). Cualquiera
        puede correlacionar tu wallet con tu opción de voto consultivo.
      </p>
      <p className="mt-1">
        Más detalle:{" "}
        <Link
          href="https://github.com/SandroChavez/CivicSys/blob/main/docs/security/known-limitations.md"
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          docs/security/known-limitations.md
        </Link>{" "}
        (sección L-01).
      </p>
    </div>
  );
}
