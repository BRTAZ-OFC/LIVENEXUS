type SafeUser = {
  user_id: string;
  user: string;
  role?: "admin" | "user";
  imagen?: string | null;
};

type AuthResult =
  | { ok: true; user: SafeUser; token?: string; message: string }
  | { ok: false; message: string };

async function postAuth(
  path: string,
  data: { user: string; password: string },
): Promise<AuthResult> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(data),
  });

  return (await response.json()) as AuthResult;
}

export function registerUser({ data }: { data: { user: string; password: string } }) {
  return postAuth("/api/auth/register", data);
}

export function loginUser({ data }: { data: { user: string; password: string } }) {
  return postAuth("/api/auth/login", data);
}
