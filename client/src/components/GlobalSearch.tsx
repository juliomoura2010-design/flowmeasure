import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Search, ClipboardList, Ruler, Building2, X } from "lucide-react";
import { useLocation } from "wouter";

function formatCurrency(value: string | number | null | undefined) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  const debouncedQuery = useDebounce(query, 300);

  const { data, isFetching } = trpc.busca.global.useQuery(
    { query: debouncedQuery },
    {
      enabled: debouncedQuery.trim().length >= 2,
    }
  );

  const pedidos = (data?.pedidos ?? []) as any[];
  const medicoes = (data?.medicoes ?? []) as any[];
  const fornecedores = (data?.fornecedores ?? []) as any[];
  const totalResultados = pedidos.length + medicoes.length + fornecedores.length;
  const hasResults = totalResultados > 0;
  const showDropdown = open && debouncedQuery.trim().length >= 2;

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = useCallback(() => {
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }, []);

  const handleNavigate = useCallback((path: string) => {
    setOpen(false);
    setQuery("");
    setLocation(path);
  }, [setLocation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative max-w-sm w-full">
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (query.trim().length >= 2) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Buscar pedidos, medições, fornecedores..."
          className="w-full pl-9 pr-8 h-9 rounded-md bg-muted/50 border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden max-h-[420px] overflow-y-auto">
          {isFetching && !data ? (
            <div className="flex items-center justify-center py-6 text-sm text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
              Buscando...
            </div>
          ) : !hasResults ? (
            <div className="py-8 text-center text-sm text-gray-400">
              <Search className="h-6 w-6 mx-auto mb-2 opacity-30" />
              Nenhum resultado para <strong className="text-gray-600">"{debouncedQuery}"</strong>
            </div>
          ) : (
            <div>
              {/* Pedidos */}
              {pedidos.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <ClipboardList className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Pedidos ({pedidos.length})
                    </span>
                  </div>
                  {pedidos.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => handleNavigate("/pedidos")}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900">{p.numero}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            p.status === "ativo" ? "bg-green-100 text-green-700" :
                            p.status === "concluido" ? "bg-blue-100 text-blue-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {p.status === "ativo" ? "Ativo" : p.status === "concluido" ? "Concluído" : "Cancelado"}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 truncate">
                          {p.fornecedorNome}
                          {p.responsavel && <span className="ml-2">· {p.responsavel}</span>}
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-700 ml-3 flex-shrink-0">
                        {formatCurrency(p.valor)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Medições */}
              {medicoes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <Ruler className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Medições ({medicoes.length})
                    </span>
                  </div>
                  {medicoes.map((m: any) => (
                    <button
                      key={m.id}
                      onClick={() => handleNavigate("/medicoes")}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium text-gray-900">{m.numero}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            m.status === "paga" ? "bg-green-100 text-green-700" :
                            m.status === "pendente" ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {m.status === "paga" ? "Pago" : m.status === "pendente" ? "Pendente" : "Cancelada"}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          Pedido {m.pedidoNumero}
                          {m.numeroPagamento && <span className="ml-2">· Pgto: {m.numeroPagamento}</span>}
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-700 ml-3 flex-shrink-0">
                        {formatCurrency(m.valor)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Fornecedores */}
              {fornecedores.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <Building2 className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Fornecedores ({fornecedores.length})
                    </span>
                  </div>
                  {fornecedores.map((f: any) => (
                    <button
                      key={f.id}
                      onClick={() => handleNavigate("/fornecedores")}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900">{f.nome}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            f.status === "ativo" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                          }`}>
                            {f.status === "ativo" ? "Ativo" : f.status}
                          </span>
                        </div>
                        {(f.cnpj || f.cidade) && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {f.cnpj && <span>{f.cnpj}</span>}
                            {f.cnpj && f.cidade && <span className="mx-1">·</span>}
                            {f.cidade && <span>{f.cidade}{f.estado ? `/${f.estado}` : ""}</span>}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Rodapé com total */}
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-center">
                {totalResultados} resultado{totalResultados !== 1 ? "s" : ""} encontrado{totalResultados !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
