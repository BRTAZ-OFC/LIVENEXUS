type OverlayUser = {
  user_id: string;
  user: string;
  role?: string;
};

export default function OverlaySection({ users }: { users: OverlayUser[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-white">Configurações de Overlay</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Área de gerenciamento de overlays da plataforma LiveNexus.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-4">
        <p className="text-xs text-slate-300">
          Usuários cadastrados e suas funções na plataforma:
        </p>
        {users.length === 0 ? (
          <p className="py-4 text-xs text-slate-400">
            Nenhum usuário cadastrado encontrado.
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {users.map((user) => (
              <div key={user.user_id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{user.user}</p>
                  <p className="text-[10px] text-slate-400">
                    Papel: <span className="text-violet-300 font-semibold">{user.role || "user"}</span>
                  </p>
                </div>
                <span className="px-2 py-1 rounded text-[10px] font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20 shrink-0">
                  Área de Overlay
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-white/15 bg-slate-950/30 p-5">
        <h3 className="text-xs font-semibold text-white">Contêiner de overlays</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          Esta área está preparada para receber os componentes e as configurações de overlay.
          Os elementos visuais específicos serão adicionados aqui.
        </p>
      </div>
    </div>
  );
}
