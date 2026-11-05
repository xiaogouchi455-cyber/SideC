
const BILI_API = "https://api.bilibili.com";

const ROUTES = [
  "/bili/search",
  "/bili/view",
  "/bili/resolve"
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders
  });
}

async function readBiliJson(response) {
  const text = await response.text();

  try {
    const data = JSON.parse(text);

    if (!response.ok) {
      return json({
        error: "Bilibili API request failed",
        status: response.status,
        data
      }, response.status);
    }

    return json(data);
  } catch {
    return json({
      error: "Bilibili returned non-JSON content",
      status: response.status,
      contentType: response.headers.get("content-type"),
      preview: text.slice(0, 500)
    }, 502);
  }
}

async function searchVideo(url) {
  const keyword = url.searchParams.get("keyword");

  if (!keyword) {
    return json({ error: "Missing keyword parameter" }, 400);
  }

  const page = Math.max(
    1,
    Number(url.searchParams.get("page") || 1)
  );

  const apiUrl = new URL(
    BILI_API + "/x/web-interface/search/type"
  );

  apiUrl.searchParams.set("search_type", "video");
  apiUrl.searchParams.set("keyword", keyword);
  apiUrl.searchParams.set("page", String(page));

  const response = await fetch(apiUrl.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Referer": "https://www.bilibili.com/",
      "Accept": "application/json, text/plain, */*"
    }
  });

  return readBiliJson(response);
}

async function viewVideo(url) {
  const bvid = url.searchParams.get("bvid");
  const aid = url.searchParams.get("aid");

  if (!bvid && !aid) {
    return json({
      error: "Missing bvid or aid parameter"
    }, 400);
  }

  const apiUrl = new URL(
    BILI_API + "/x/web-interface/view"
  );

  if (bvid) {
    apiUrl.searchParams.set("bvid", bvid);
  } else {
    apiUrl.searchParams.set("aid", aid);
  }

  const response = await fetch(apiUrl.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Referer": "https://www.bilibili.com/",
      "Accept": "application/json, text/plain, */*"
    }
  });

  return readBiliJson(response);
}

async function resolveShortLink(url) {
  const shortUrl = url.searchParams.get("url");

  if (!shortUrl) {
    return json({ error: "Missing url parameter" }, 400);
  }

  let parsed;

  try {
    parsed = new URL(shortUrl);
  } catch {
    return json({ error: "Invalid URL" }, 400);
  }

  if (
    parsed.hostname !== "b23.tv" &&
    parsed.hostname !== "www.b23.tv"
  ) {
    return json({ error: "Only b23.tv links are supported" }, 400);
  }

  const response = await fetch(parsed.toString(), {
    method: "GET",
    redirect: "manual",
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Referer": "https://www.bilibili.com/"
    }
  });

  const location = response.headers.get("Location");

  if (location) {
    return json({
      success: true,
      url: new URL(location, parsed).toString()
    });
  }

  if (response.status >= 200 && response.status < 300) {
    return json({
      success: true,
      url: response.url || parsed.toString()
    });
  }

  return json({
    error: "Unable to resolve short link",
    status: response.status
  }, 502);
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405);
    }

    try {
      switch (url.pathname) {
        case "/":
          return json({
            ok: true,
            name: "SIDE C Proxy",
            routes: ROUTES
          });

        case "/bili/search":
          return await searchVideo(url);

        case "/bili/view":
          return await viewVideo(url);

        case "/bili/resolve":
          return await resolveShortLink(url);

        default:
          return json({
            error: "Not found",
            routes: ROUTES
          }, 404);
      }
    } catch (error) {
      return json({
        error: "Worker internal error",
        message: error.message
      }, 500);
    }
  }
};
