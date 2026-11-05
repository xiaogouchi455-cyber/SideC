
const BILI_API = "https://api.bilibili.com";

const ROUTES = [
  "/bili/spi",
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

// 统一处理 B 站 JSON 响应
async function readBiliJson(response) {
  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    return json({
      error: "Bilibili returned non-JSON content",
      status: response.status,
      contentType: response.headers.get("content-type"),
      preview: text.slice(0, 500)
    }, 502);
  }

  if (!response.ok) {
    return json({
      error: "Bilibili API request failed",
      status: response.status,
      data
    }, response.status);
  }

  return json(data);
}

// 统一请求头
function biliHeaders() {
  return {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Referer": "https://www.bilibili.com/",
    "Origin": "https://www.bilibili.com",
    "Accept": "application/json, text/plain, */*"
  };
}

// 1. B站 SPI 设备指纹接口
async function getBiliSPI() {
  const apiUrl =
    BILI_API + "/x/frontend/finger/spi";

  const response = await fetch(apiUrl, {
    method: "GET",
    headers: biliHeaders()
  });

  return readBiliJson(response);
}

// 2. 视频搜索
async function searchVideo(url) {
  const keyword = url.searchParams.get("keyword");

  if (!keyword) {
    return json({
      error: "Missing keyword parameter"
    }, 400);
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
    headers: biliHeaders()
  });

  return readBiliJson(response);
}

// 3. 视频详情
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
    headers: biliHeaders()
  });

  return readBiliJson(response);
}

// 4. b23.tv 短链接解析
async function resolveShortLink(url) {
  const shortUrl = url.searchParams.get("url");

  if (!shortUrl) {
    return json({
      error: "Missing url parameter"
    }, 400);
  }

  let parsed;

  try {
    parsed = new URL(shortUrl);
  } catch {
    return json({
      error: "Invalid URL"
    }, 400);
  }

  if (
    parsed.protocol !== "https:" ||
    !["b23.tv", "www.b23.tv"].includes(parsed.hostname)
  ) {
    return json({
      error: "Only HTTPS b23.tv links are supported"
    }, 400);
  }

  const response = await fetch(parsed.toString(), {
    method: "GET",
    redirect: "manual",
    headers: biliHeaders()
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

// Worker 主入口
export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS 预检
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (request.method !== "GET") {
      return json({
        error: "Method not allowed"
      }, 405);
    }

    try {
      switch (url.pathname) {
        case "/":
          return json({
            ok: true,
            name: "SIDE C Proxy",
            version: "2.0",
            routes: ROUTES
          });

        case "/bili/spi":
          return await getBiliSPI();

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
