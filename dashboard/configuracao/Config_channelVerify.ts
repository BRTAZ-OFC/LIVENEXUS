/* LIVENEXUS: Explica as opções para configurar a verificação do canal. */
// Cliente do verificador de bio integrado ao servidor do LIVENEXUS.
// Não usa Worker externo: os desafios e o resultado são tratados pela API local.
// post: executa a tarefa indicada pelo nome e pelos parâmetros recebidos.
async function post(path, body) {
  const token = sessionStorage.getItem("livenexus_token");
  const userId = sessionStorage.getItem("livenexus_user_id");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (userId) headers["X-User-Id"] = userId;
  const url = userId
    ? `/api/channel-verify/${path}?user_id=${encodeURIComponent(userId)}`
    : `/api/channel-verify/${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify({ ...body, ...(userId ? { user_id: userId } : {}) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.error || data.message || "Não foi possível verificar a bio do canal.");
  }
  return data;
}

export const channelVerify = {
  challenge(platform, channelIdentifier) {
    return post("challenge", { platform: String(platform).toLowerCase(), channelIdentifier });
  },
  verify(challengeId) {
    return post("verify", { challengeId });
  },
};
