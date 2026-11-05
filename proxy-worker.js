// SIDE C 中转接口 · Cloudflare Worker
// 作用：让网页能调用「B站搜索 / B站视频信息」（这些接口不允许浏览器直接访问）。
// 部署：Cloudflare 控制台 → Workers & Pages → Create → Hello World → Edit code → 粘贴本文件 → Deploy。
// 可选环境变量 ALLOWED_ORIGIN：例如 https://你的用户名.github.io ，设置后只允许你的网站使用。

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const BH = { 'User-Agent': UA, Referer: 'https://www.bilibili.com/', Origin: 'https://www.bilibili.com' };
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS', 'Access-Control-Allow-Headers': '*' };
const MIXIN = [46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13,37,48,7,16,24,55,40,61,26,17,0,1,60,51,30,4,22,25,54,21,56,59,6,63,57,62,11,36,20,34,44,52];

function md5(str) {
  const K = [], S = [7,12,17,22,5,9,14,20,4,11,16,23,6,10,15,21];
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
  const bytes = [...new TextEncoder().encode(str)], len = bytes.length;
  bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
  const bits = len * 8; for (let i = 0; i < 8; i++) bytes.push(i < 4 ? (bits >>> (8 * i)) & 255 : 0);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let o = 0; o < bytes.length; o += 64) {
    const M = []; for (let i = 0; i < 16; i++) M[i] = bytes[o + 4*i] | bytes[o + 4*i + 1] << 8 | bytes[o + 4*i + 2] << 16 | bytes[o + 4*i + 3] << 24;
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) >>> 0; A = D; D = C; C = B;
      const s = S[(i >> 4) * 4 + (i % 4)]; B = (B + ((F << s) | (F >>> (32 - s)))) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  return [a0, b0, c0, d0].map(v => [0, 8, 16, 24].map(s => ((v >>> s) & 255).toString(16).padStart(2, '0')).join('')).join('');
}

let session = { ts: 0, key: '', cookie: '' };
async function biliSession() {
  if (session.key && Date.now() - session.ts < 3600e3) return session;
  const spi = await (await fetch('https://api.bilibili.com/x/frontend/finger/spi', { headers: BH })).json();
  const cookie = `buvid3=${spi.data.b_3}; buvid4=${spi.data.b_4}`;
  const nav = await (await fetch('https://api.bilibili.com/x/web-interface/nav', { headers: { ...BH, Cookie: cookie } })).json();
  const part = u => u.slice(u.lastIndexOf('/') + 1, u.lastIndexOf('.'));
  const raw = part(nav.data.wbi_img.img_url) + part(nav.data.wbi_img.sub_url);
  session = { ts: Date.now(), key: MIXIN.map(i => raw[i]).join('').slice(0, 32), cookie };
  return session;
}
function signWbi(params, key) {
  const p = { ...params, wts: Math.floor(Date.now() / 1000) };
  const q = Object.keys(p).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(String(p[k]).replace(/[!'()*]/g, ''))}`).join('&');
  return `${q}&w_rid=${md5(q + key)}`;
}

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });
const pass = async r => new Response(await r.text(), { status: r.status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const origin = request.headers.get('Origin') || '';
    if (env && env.ALLOWED_ORIGIN && origin && origin !== env.ALLOWED_ORIGIN) return json({ error: 'forbidden' }, 403);
    const url = new URL(request.url), sp = url.searchParams;
    try {
      if (url.pathname === '/bili/search') {
        const s = await biliSession();
        const qs = signWbi({ search_type: 'video', keyword: sp.get('keyword') || '', page: '1' }, s.key);
        return pass(await fetch('https://api.bilibili.com/x/web-interface/wbi/search/type?' + qs, { headers: { ...BH, Cookie: s.cookie } }));
      }
      if (url.pathname === '/bili/view') {
        const s = await biliSession();
        const q = sp.get('bvid') ? 'bvid=' + encodeURIComponent(sp.get('bvid')) : 'aid=' + encodeURIComponent(sp.get('aid') || '');
        return pass(await fetch('https://api.bilibili.com/x/web-interface/view?' + q, { headers: { ...BH, Cookie: s.cookie } }));
      }
      if (url.pathname === '/bili/resolve') {
        const target = new URL(sp.get('url') || '');
        if (target.hostname !== 'b23.tv') return json({ error: 'only b23.tv' }, 400);
        const r = await fetch(target.href, { redirect: 'manual', headers: { 'User-Agent': UA } });
        return json({ url: r.headers.get('Location') || target.href });
      }
      return json({ ok: true, routes: ['/bili/search', '/bili/view', '/bili/resolve'] });
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 502);
    }
  }
};
