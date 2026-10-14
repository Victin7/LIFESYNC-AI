import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function ErrorState({ title = "Algo deu errado", description = "Não foi possível carregar os dados. Tente novamente.", onRetry }: Props) {
  return (
    <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-destructive" aria-hidden />
      </div>
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover transition">
          <RefreshCw className="w-4 h-4" /> Tentar novamente
        </button>
      )}
    </div>
  );
}
