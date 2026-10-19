const LOCAL_ENDPOINT = "/api/channel-verify";

async function request(path, body, method = "POST") {
  let response;
  try {
    response = await fetch(LOCAL_ENDPOINT + path, {
      method,
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Não foi possível conectar ao verificador. Tente novamente.");
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) {
    throw new Error(result.message || result.error || "Não foi possível validar a plataforma agora.");
  }
  return result;
}

export const channelVerify = {
  challenge: (platform, channelIdentifier) =>
    request("/challenge", { platform: String(platform).toLowerCase(), channelIdentifier }),
  reemit: (challengeKey) =>
    request("/challenge/reemit", { challengeKey }),
  verify: (platform, challengeId) =>
    request("/verify/" + String(platform).toLowerCase(), { challengeId }),
  validateProof: (proof) =>
    request("/validate-proof", { proof }),
  revoke: (verificationProof, challengeKey) =>
    request("/revoke", { verificationProof, challengeKey }),
  connections: () => request("/connections", undefined, "GET"),
};
