const ALLOWED_ORIGIN = "https://lironme3471.github.io";
const LOGIN_TARGETS = {
  test: "https://na1.test.nice-incontact.com/public/user/login",
  prod: "https://na1.nice-incontact.com/public/user/login",
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname === "/login" && request.method === "POST") {
      return handleLogin(request, url);
    }

    if (url.pathname === "/upload" && (request.method === "PUT" || request.method === "POST")) {
      return handleUpload(request, url);
    }

    return withCors(new Response("Not found", { status: 404 }));
  },
};

async function handleLogin(request, url) {
  const env = url.searchParams.get("env") === "prod" ? "prod" : "test";

  const upstream = await fetch(LOGIN_TARGETS[env], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
  });

  return withCors(copyResponse(upstream));
}

async function handleUpload(request, url) {
  const targetUrl = url.searchParams.get("url");
  const method = (url.searchParams.get("method") || "PUT").toUpperCase();
  const encodedHeaders = url.searchParams.get("headers");

  if (!targetUrl) {
    return withCors(new Response("Missing url query param", { status: 400 }));
  }

  const headers = parseForwardHeaders(encodedHeaders);

  const upstream = await fetch(targetUrl, {
    method,
    headers,
    body: request.body,
  });

  return withCors(copyResponse(upstream));
}

function parseForwardHeaders(encodedHeaders) {
  if (!encodedHeaders) return {};
  try {
    const decoded = atob(encodedHeaders);
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object") return {};

    const headers = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") headers[key] = value;
    }
    return headers;
  } catch {
    return {};
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function withCors(response) {
  const out = new Response(response.body, response);
  const headers = corsHeaders();
  for (const [key, value] of Object.entries(headers)) {
    out.headers.set(key, value);
  }
  out.headers.set("Vary", "Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
  return out;
}

function copyResponse(response) {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
