import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Loader2, Lock } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";

/**
 * Bloqueia o acesso ao app até que o usuário informe a senha de acesso
 * (ACCESS_PASSWORD no servidor) ou já esteja autenticado via OAuth.
 * Não depende do fluxo OAuth do Manus estar configurado.
 */
export default function AccessGate({ children }: { children: ReactNode }) {
  const utils = trpc.useUtils();
  const accessQuery = trpc.auth.checkAccess.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loginMutation = trpc.auth.loginWithPassword.useMutation({
    onSuccess: async () => {
      setError(null);
      await utils.auth.checkAccess.invalidate();
    },
    onError: err => {
      setError(err.message || "Não foi possível entrar. Tente novamente.");
    },
  });

  if (accessQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasAccess = accessQuery.data?.hasAccess ?? false;

  if (hasAccess) {
    return <>{children}</>;
  }

  const passwordGateConfigured = accessQuery.data?.passwordGateConfigured ?? true;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;
    loginMutation.mutate({ password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-lg font-semibold">FlowMeasure</h1>
          <p className="text-sm text-muted-foreground">
            Digite a senha de acesso para continuar.
          </p>
        </div>

        {!passwordGateConfigured ? (
          <p className="text-center text-sm text-muted-foreground">
            Nenhuma senha de acesso foi configurada no servidor (variável
            ACCESS_PASSWORD).
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input
              type="password"
              autoFocus
              placeholder="Senha de acesso"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loginMutation.isPending}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loginMutation.isPending || !password}>
              {loginMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
