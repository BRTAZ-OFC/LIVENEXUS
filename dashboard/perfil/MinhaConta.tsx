import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { CircleUserRound, Pencil, Trash2, X, Upload, UserRound, LockKeyhole } from "lucide-react";

type AccountUser = { user_id: string; user: string; role?: "admin" | "user"; imagen?: string | null };
type ApiResult = { ok?: boolean; message?: string; user?: AccountUser };
const buttonBase: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 40, borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 650, cursor: "pointer", whiteSpace: "nowrap" };
const inputStyle: CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #334155", background: "#080d19", color: "#e2e8f0", borderRadius: 9, padding: "11px 12px", outline: "none", fontSize: 14 };
const labelStyle: CSSProperties = { display: "grid", gap: 7, color: "#cbd5e1", fontSize: 13 };

export default function MinhaConta() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [modal, setModal] = useState<"edit" | "delete" | null>(null);
  const [editMode, setEditMode] = useState<"username" | "password" | null>(null);
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    const token = sessionStorage.getItem("livenexus_token");
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    fetch("/api/auth/me", { credentials: "same-origin", headers, cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as ApiResult;
        if (!response.ok || !result.ok || !result.user) throw new Error(result.message || "Não foi possível carregar a conta.");
        if (alive) { setUser(result.user); setUsername(result.user.user); }
      })
      .catch((error: unknown) => { if (alive) setMessage(error instanceof Error ? error.message : "Erro ao carregar a conta."); });
    return () => { alive = false; };
  }, []);

  function closeModal() {
    setModal(null); setEditMode(null); setMessage("");
    setCurrentPassword(""); setNewPassword(""); setRepeatPassword("");
    if (user) setUsername(user.user);
  }

  async function send(path: string, body: Record<string, unknown>) {
    const token = sessionStorage.getItem("livenexus_token");
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(path, { method: "POST", credentials: "same-origin", headers, body: JSON.stringify(body), cache: "no-store" });
    const result = (await response.json()) as ApiResult;
    if (!response.ok || !result.ok) throw new Error(result.message || "Não foi possível concluir a operação.");
    return result;
  }

  async function saveUsername(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const result = await send("/api/account/username", { user: username });
      if (result.user) setUser(result.user);
      setMessage("Nome da conta atualizado."); setEditMode(null);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o nome."); }
    finally { setBusy(false); }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault(); setMessage("");
    if (newPassword !== repeatPassword) { setMessage("As novas senhas não coincidem."); return; }
    setBusy(true);
    try {
      await send("/api/account/password", { currentPassword, newPassword });
      setMessage("Senha alterada com sucesso."); setCurrentPassword(""); setNewPassword(""); setRepeatPassword(""); setEditMode(null);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível alterar a senha."); }
    finally { setBusy(false); }
  }

  async function chooseImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMessage("Selecione um arquivo de imagem."); return; }
    setBusy(true); setMessage("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
        reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file);
      });
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error("Arquivo de imagem inválido.")); img.src = dataUrl;
      });
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 512 / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d"); if (!context) throw new Error("Não foi possível processar a imagem.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let compressed = canvas.toDataURL("image/jpeg", 0.72);
      if (compressed.length > 350000) compressed = canvas.toDataURL("image/jpeg", 0.45);
      if (compressed.length > 350000) throw new Error("A imagem é muito grande. Escolha outra imagem.");
      const result = await send("/api/account/image", { imagen: compressed });
      if (result.user) setUser(result.user); setMessage("Imagem de perfil atualizada.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar a imagem."); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ""; }
  }

  async function deleteAccount() {
    setBusy(true); setMessage("");
    try {
      await send("/api/account/delete", {});
      sessionStorage.clear(); localStorage.clear();
      document.cookie = "livenexus_session=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
      window.location.replace("/");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível excluir a conta."); setBusy(false); }
  }

  const overlay: CSSProperties = { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(2,6,23,.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };
  const modalCard: CSSProperties = { width: "min(100%, 520px)", maxHeight: "85vh", overflowY: "auto", borderRadius: 16, border: "1px solid #334155", background: "#0b1220", padding: 24, color: "#e2e8f0", boxShadow: "0 24px 80px rgba(0,0,0,.45)" };

  return (
    <section style={{ width: "100%", padding: "6px 24px 40px", color: "#e2e8f0", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap", width: "100%", border: "1px solid #263449", background: "#0b1220", borderRadius: 14, padding: "16px 18px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <div style={{ width: 58, height: 58, flex: "0 0 58px", overflow: "hidden", borderRadius: 13, border: "1px solid #475569", background: "#172033", display: "grid", placeItems: "center" }}>
            {user?.imagen ? <img src={user.imagen} alt="Imagem de perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <CircleUserRound size={30} color="#a78bfa" />}
          </div>
          <div style={{ minWidth: 0 }}><div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>Minha conta</div><div style={{ marginTop: 4, fontSize: 20, fontWeight: 750, overflowWrap: "anywhere" }}>{user?.user ?? "Carregando conta..."}</div></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => { setModal("edit"); setMessage(""); }} style={{ ...buttonBase, border: "1px solid #6d5bd0", background: "#5b4acb", color: "#fff" }}><Pencil size={16} />Editar conta</button>
          <button type="button" onClick={() => { setModal("delete"); setMessage(""); }} style={{ ...buttonBase, border: "1px solid #7f1d1d", background: "#35151b", color: "#fecaca" }}><Trash2 size={16} />Deletar conta</button>
        </div>
      </div>
      <nav aria-label="Menu da conta" style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", marginTop: 4, padding: "10px 2px", borderBottom: "1px solid #263449" }}>
        {["Visão Geral", "Crescimento", "Audiência", "Engajamento", "Monetização", "Imagens"].map((label) => (
          <a key={label} href="#" onClick={(event) => event.preventDefault()} style={{ color: "#cbd5e1", textDecoration: "none", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</a>
        ))}
      </nav>
      {message && !modal && <p role="status" style={{ color: "#fca5a5", marginTop: 14, fontSize: 13 }}>{message}</p>}
      <input ref={fileInput} type="file" accept="image/*" hidden onChange={(event) => void chooseImage(event.target.files?.[0])} />
      {modal && <div style={overlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) closeModal(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="account-modal-title" style={modalCard}>
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
            <h2 id="account-modal-title" style={{ fontSize: 20, fontWeight: 750 }}>{modal === "edit" ? "Editar conta" : "Deletar conta"}</h2>
            <button type="button" aria-label="Fechar" disabled={busy} onClick={closeModal} style={{ ...buttonBase, minHeight: 34, width: 34, padding: 0, border: "1px solid #334155", background: "transparent", color: "#cbd5e1" }}><X size={17} /></button>
          </header>
          {modal === "delete" ? <>
            <p style={{ color: "#cbd5e1", lineHeight: 1.65, fontSize: 14 }}>Você deseja mesmo deletar esta conta? Esta função deletará toda sua conta permanentemente. Você perderá todos seus dados.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
              <button type="button" disabled={busy} onClick={closeModal} style={{ ...buttonBase, border: "1px solid #334155", background: "transparent", color: "#e2e8f0" }}>Cancelar</button>
              <button type="button" disabled={busy} onClick={() => void deleteAccount()} style={{ ...buttonBase, border: "1px solid #991b1b", background: "#991b1b", color: "#fff", opacity: busy ? .65 : 1 }}><Trash2 size={16} />{busy ? "Excluindo..." : "Confirmar exclusão"}</button>
            </div>
          </> : <div style={{ display: "grid", gap: 10 }}>
            <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} style={{ ...buttonBase, justifyContent: "flex-start", border: "1px solid #334155", background: "#111b2d", color: "#e2e8f0" }}><Upload size={16} />Adicionar imagem de perfil</button>
            <button type="button" onClick={() => { setEditMode(editMode === "username" ? null : "username"); setMessage(""); }} style={{ ...buttonBase, justifyContent: "flex-start", border: "1px solid #334155", background: "#111b2d", color: "#e2e8f0" }}><UserRound size={16} />Mudar nome da conta</button>
            <button type="button" onClick={() => { setEditMode(editMode === "password" ? null : "password"); setMessage(""); }} style={{ ...buttonBase, justifyContent: "flex-start", border: "1px solid #334155", background: "#111b2d", color: "#e2e8f0" }}><LockKeyhole size={16} />Mudar senha da conta</button>
            {editMode === "username" && <form onSubmit={(event) => void saveUsername(event)} style={{ display: "grid", gap: 13, padding: 15, marginTop: 4, border: "1px solid #334155", borderRadius: 11 }}>
              <label style={labelStyle}>Novo nome da conta<input style={inputStyle} value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} maxLength={32} required autoComplete="username" /></label>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 9 }}><button type="button" disabled={busy} onClick={() => { setEditMode(null); if (user) setUsername(user.user); }} style={{ ...buttonBase, border: "1px solid #334155", background: "transparent", color: "#e2e8f0" }}>Cancelar</button><button type="submit" disabled={busy} style={{ ...buttonBase, border: 0, background: "#5b4acb", color: "#fff" }}>{busy ? "Salvando..." : "Salvar"}</button></div>
            </form>}
            {editMode === "password" && <form onSubmit={(event) => void savePassword(event)} style={{ display: "grid", gap: 13, padding: 15, marginTop: 4, border: "1px solid #334155", borderRadius: 11 }}>
              <label style={labelStyle}>Senha atual<input style={inputStyle} type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required autoComplete="current-password" /></label>
              <label style={labelStyle}>Nova senha<input style={inputStyle} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required autoComplete="new-password" /></label>
              <label style={labelStyle}>Repetir nova senha<input style={inputStyle} type="password" value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} minLength={8} required autoComplete="new-password" /></label>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 9 }}><button type="button" disabled={busy} onClick={() => { setEditMode(null); setCurrentPassword(""); setNewPassword(""); setRepeatPassword(""); }} style={{ ...buttonBase, border: "1px solid #334155", background: "transparent", color: "#e2e8f0" }}>Cancelar</button><button type="submit" disabled={busy} style={{ ...buttonBase, border: 0, background: "#5b4acb", color: "#fff" }}>{busy ? "Salvando..." : "Salvar"}</button></div>
            </form>}
          </div>}
          {message && <p role="status" style={{ color: message.includes("sucesso") || message.includes("atualizado") ? "#86efac" : "#fca5a5", fontSize: 13, marginTop: 14 }}>{message}</p>}
        </section>
      </div>}
    </section>
  );
}
