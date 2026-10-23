/* LIVENEXUS: Explica a tela de avaliações e o envio de respostas administrativas. */
import { useState } from "react";
import { Star, MessageSquare, ShieldCheck, Send, X } from "lucide-react";

type ReviewRow = {
  avaliacao_id: string;
  nome: string;
  nota: number;
  mensagem: string;
  resposta_admin?: string | null;
  respondido_por?: string | null;
  data_criacao?: string;
  data_atualizacao?: string;
};

// ReviewsManager: executa a tarefa indicada pelo nome e pelos parâmetros recebidos.
export default function ReviewsManager({
  reviews,
  onUpdate,
}: {
  reviews: ReviewRow[];
  onUpdate: () => void;
}) {
  const [selectedReview, setSelectedReview] = useState<ReviewRow | null>(null);
  const [resposta, setResposta] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSaveResponse() {
    if (!selectedReview || !resposta.trim()) return;
    setSubmitting(true);
    try {
      const token = sessionStorage.getItem("livenexus_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/database/avaliacoes", {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({
          avaliacao_id: selectedReview.avaliacao_id,
          changes: { resposta_admin: resposta.trim() },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Falha ao salvar resposta.");
      onUpdate();
      setSelectedReview(null);
      setResposta("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar resposta.");
    } finally {
      setSubmitting(false);
    }
  }

  {/* Estrutura visual retornada: div. */}

  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <div
          key={r.avaliacao_id}
          className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-3"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-white">{r.nome}</p>
              <p className="text-[10px] text-slate-500">
                {new Date(r.data_criacao!).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-3 w-3 ${r.nota >= s ? "text-amber-400 fill-amber-400" : "text-slate-700"}`}
                />
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-300">{r.mensagem}</p>
          {r.resposta_admin && (
            <div className="pl-3 border-l-2 border-cyan-500/50 bg-cyan-950/20 py-2 pr-2 rounded-r-xl">
              <p className="text-[10px] text-cyan-300 font-semibold mb-1 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Resposta Oficial ({r.respondido_por || "Admin"})
              </p>
              <p className="text-[11px] text-slate-300">{r.resposta_admin}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setSelectedReview(r);
              setResposta(r.resposta_admin || "");
            }}
            className="text-[10px] font-semibold text-violet-300 hover:text-white flex items-center gap-1"
          >
            <MessageSquare className="h-3 w-3" />{" "}
            {r.resposta_admin ? "Editar Resposta" : "Responder"}
          </button>
        </div>
      ))}

      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white">Responder avaliação</h3>
              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Respondendo à avaliação de{" "}
              <strong className="text-white">{selectedReview.nome}</strong>
            </p>
            <textarea
              value={resposta}
              onChange={(e) => setResposta(e.target.value)}
              placeholder="Digite sua resposta oficial..."
              className="w-full h-32 p-3 rounded-lg bg-slate-950 border border-white/10 text-white text-xs mb-4 focus:outline-none focus:border-cyan-500"
              maxLength={1000}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSaveResponse()}
                disabled={submitting || !resposta.trim()}
                className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-500 transition disabled:opacity-50"
              >
                {submitting ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
