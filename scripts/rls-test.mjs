const API = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.SUPABASE_ANON_KEY;
if (!ANON) {
  console.error("Set SUPABASE_ANON_KEY (from `npx supabase status -o env`).");
  process.exit(1);
}

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`);
  if (!ok) failures += 1;
};

async function signUp(email) {
  const res = await fetch(`${API}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "test-password-123" }),
  });
  const body = await res.json();
  return { token: body.access_token, id: body.user?.id };
}

const rest = (token, path, init = {}) =>
  fetch(`${API}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token ?? ANON}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

const stamp = Date.now();
const a = await signUp(`a-${stamp}@example.com`);
const b = await signUp(`b-${stamp}@example.com`);
check("two test users created", Boolean(a.token && b.token), JSON.stringify({ a, b }));

const add = await rest(a.token, "follows", {
  method: "POST",
  headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
  body: JSON.stringify([{ team_key: "soccer:19973" }, { team_key: "basketball:99" }]),
});
check("user A can add follows", add.status === 201, String(add.status));

const dupe = await rest(a.token, "follows?on_conflict=user_id,team_key", {
  method: "POST",
  headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
  body: JSON.stringify([{ team_key: "soccer:19973" }]),
});
check("re-adding a follow is ignored, not an error", dupe.status === 201, String(dupe.status));

const aRows = await (await rest(a.token, "follows?select=team_key")).json();
check("user A sees their 2 follows", aRows.length === 2, JSON.stringify(aRows));

const bRows = await (await rest(b.token, "follows?select=team_key")).json();
check("user B sees none of A's follows", bRows.length === 0, JSON.stringify(bRows));

const anonRows = await (await rest(null, "follows?select=team_key")).json();
check("signed-out visitors see nothing", Array.isArray(anonRows) && anonRows.length === 0, JSON.stringify(anonRows));

const forged = await rest(a.token, "follows", {
  method: "POST",
  body: JSON.stringify([{ user_id: b.id, team_key: "soccer:1" }]),
});
check("user A cannot add a follow for user B", forged.status === 403 || forged.status === 401, String(forged.status));

const bad = await rest(a.token, "follows", { method: "POST", body: JSON.stringify([{ team_key: "hockey:1" }]) });
check("invalid team key is rejected", bad.status === 400, String(bad.status));

const bDelete = await rest(b.token, "follows?team_key=eq.soccer:19973", { method: "DELETE", headers: { Prefer: "return=representation" } });
check("user B cannot delete A's follows", (await bDelete.json()).length === 0);

const token = await rest(a.token, "push_tokens", {
  method: "POST",
  headers: { Prefer: "return=minimal" },
  body: JSON.stringify([{ token: `tok-${stamp}`, platform: "ios" }]),
});
check("user A can register a push token", token.status === 201, String(token.status));
const bTokens = await (await rest(b.token, "push_tokens?select=token")).json();
check("user B cannot see A's push token", bTokens.length === 0);

const anonDelete = await rest(null, "rpc/delete_my_account", { method: "POST", body: "{}" });
check("signed-out visitors cannot call delete_my_account", anonDelete.status >= 400, String(anonDelete.status));

const del = await rest(a.token, "rpc/delete_my_account", { method: "POST", body: "{}" });
check("user A can delete their own account", del.status === 204 || del.status === 200, String(del.status));
const gone = await fetch(`${API}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${a.token}` } });
check("deleted account's session no longer works", gone.status >= 400, String(gone.status));
const bStill = await (await rest(b.token, "follows?select=team_key")).json();
check("user B is unaffected", Array.isArray(bStill));

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
