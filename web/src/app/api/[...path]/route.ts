const BACKEND_ORIGIN = "https://qlklt-v414-he3f3zfz5-chaunguyen22012005-6505s-projects.vercel.app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

const requestHeaderAllowList = [
  "authorization",
  "accept",
  "accept-language",
  "content-type",
  "if-none-match",
  "range",
];

const responseHeaderAllowList = [
  "content-type",
  "content-disposition",
  "cache-control",
  "etag",
  "last-modified",
  "accept-ranges",
  "content-range",
  "location",
];

async function proxyRequest(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { path } = await context.params;

  if (!Array.isArray(path) || path.length === 0) {
    return Response.json(
      { detail: "API path is required." },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "X-QLKLT-Proxy": "V29",
        },
      },
    );
  }

  const incomingUrl = new URL(request.url);

  const encodedPath = path
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const targetUrl = new URL(
    `/api/${encodedPath}/`,
    BACKEND_ORIGIN,
  );

  targetUrl.search = incomingUrl.search;

  const upstreamHeaders = new Headers();

  for (const name of requestHeaderAllowList) {
    const value = request.headers.get(name);

    if (value) {
      upstreamHeaders.set(name, value);
    }
  }

  upstreamHeaders.set(
    "x-qlklt-forwarded-by",
    "next-route-handler-v28",
  );

  const method = request.method.toUpperCase();

  const init: RequestInit = {
    method,
    headers: upstreamHeaders,
    redirect: "manual",
    cache: "no-store",
  };

  if (method !== "GET" && method !== "HEAD") {
    const body = await request.arrayBuffer();

    if (body.byteLength > 0) {
      init.body = body;
    }
  }

  try {
    const upstream = await fetch(
      targetUrl,
      init,
    );

    const responseHeaders = new Headers();

    for (const name of responseHeaderAllowList) {
      const value = upstream.headers.get(name);

      if (value) {
        responseHeaders.set(name, value);
      }
    }

    const setCookie = upstream.headers.get("set-cookie");

    if (setCookie) {
      responseHeaders.set(
        "set-cookie",
        setCookie,
      );
    }

    responseHeaders.set(
      "X-QLKLT-Proxy",
      "V29",
    );

    responseHeaders.set(
      "X-QLKLT-Upstream-Status",
      String(upstream.status),
    );

    return new Response(
      upstream.body,
      {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      },
    );
  } catch (error) {
    console.error(
      "QLKLT V29 upstream fetch failed",
      error,
    );

    return Response.json(
      { detail: "Backend proxy unavailable." },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
          "X-QLKLT-Proxy": "V29",
        },
      },
    );
  }
}

export {
  proxyRequest as GET,
  proxyRequest as POST,
  proxyRequest as PUT,
  proxyRequest as PATCH,
  proxyRequest as DELETE,
  proxyRequest as OPTIONS,
  proxyRequest as HEAD,
};