// Cliente do verificador de bio integrado ao servidor do LIVENEXUS.
// Não usa Worker externo: os desafios e o resultado são tratados pela API local.
async function post(path, body) {
  const token = sessionStorage.getItem("livenexus_token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`/api/channel-verify/${path}`, {
    method: "POST",
    headers,
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify(body),
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
