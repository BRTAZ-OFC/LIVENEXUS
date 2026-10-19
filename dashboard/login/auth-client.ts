type SafeUser = {
  user_id: string;
  user: string;
  role?: "admin" | "user";
  imagen?: string | null;
};

type AuthResult =
  { ok: true; user: SafeUser; token?: string; message: string } | { ok: false; message: string };

async function postAuth(
  path: string,
  data: { user: string; password: string },
): Promise<AuthResult> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(data),
  });

  const responseText = await response.text();
  let result: AuthResult;
  try {
    result = JSON.parse(responseText) as AuthResult;
  } catch {
    const contentType = response.headers.get("content-type") || "(não informado)";
    const preview = responseText.slice(0, 600);
    const error = new Error(
      `A API de autenticação retornou conteúdo que não é JSON. Endpoint: ${path}; HTTP: ${response.status} ${response.statusText}; Content-Type: ${contentType}; Resposta recebida: ${preview}`,
    );

    throw error;
  }

  if (!response.ok && result.ok) {
    const error = new Error(`Falha HTTP ${response.status} em ${path}.`);

    throw error;
  }

  return result;
}

export function registerUser({ data }: { data: { user: string; password: string } }) {
  return postAuth("/api/auth/register", data);
}

export function loginUser({ data }: { data: { user: string; password: string } }) {
  return postAuth("/api/auth/login", data);
}
