(() => {
  const KEYS = { albums: 'sidec_web_albums', videos: 'sidec_web_videos', theme: 'sidec_web_theme', sponsorText: 'sidec_web_commission_text_v1', settings: 'sidec_web_settings', playlists: 'sidec_web_playlists', views: 'sidec_web_views' };
  const DRAFT = 'sidec_web_draft';
  const DEFAULT_SPONSOR_TEXT = '感谢大家使用><其实更想要约稿支持我！\n孩子想要喝星巴克，所以有没有人向我约这种双人插呀TT\n小红书id：9567292790\n如果有宝子们喜欢的请小红书私信我( ◜ω◝و)و 🎶';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const today = () => new Date().toISOString().slice(0,10);
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const albums = () => read(KEYS.albums);
  const videos = () => read(KEYS.videos);
  const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = value => { try { const u=new URL(value); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
  const dateText = d => d ? esc(d) : '未记录日期';
  const FALLBACK_IMG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="rgba(140,140,165,.18)"/><text x="50" y="64" font-size="40" text-anchor="middle" fill="rgba(165,165,185,.6)">♪</text></svg>');
  const cover = (url, title='', cls='') => safeUrl(url) ? `<img class="cover ${cls}" referrerpolicy="no-referrer" src="${esc(safeUrl(url))}" alt="${esc(title)} 封面" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">` : `<div class="cover cover-placeholder ${cls}">${esc((title||'C').slice(0,1))}</div>`;
  const tags = list => (list||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('');
  const toast = message => { const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),2300); };
  const favoriteTracks = () => albums().flatMap(a=>(a.tracks||[]).filter(t=>t.favorite).map(t=>({...t,albumId:a.id,albumTitle:a.title,artist:a.artist,coverUrl:a.coverUrl})));
  const route = () => (location.hash.replace(/^#\/?/,'') || 'home').split('/');
  const go = path => { location.hash = path; };
  const pageHead = (eyebrow,title,desc,action='') => `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1 class="page-title">${title}</h1>${desc?`<div class="lead">${desc}</div>`:''}</div>${action}</div>`;
  const tile = (attr, id, img, title, date, hiddenText = '') => `<article class="album-card tile" ${attr}="${esc(id)}">${img}<div class="tile-info"><div class="tile-title">${esc(title)}</div><div class="tile-date">${dateText(date)}</div></div>${hiddenText ? `<span class="sr-only">${esc(hiddenText)}</span>` : ''}</article>`;
  const albumCard = a => tile('data-open-album', a.id, cover(a.coverUrl, a.title), a.title, a.listenedAt, a.artist);
  const videoCard = v => tile('data-open-video', v.id, cover(v.coverUrl, v.title, 'wide'), v.title, v.watchedAt);
  const empty = text => `<div class="empty">${text}</div>`;


  /* ================================================================
     V8 · 新增模块：通用弹层 / MV 挂载 / 自定义歌单 / 视图切换 / 年度回顾
     ================================================================ */

  /* ---------- 通用弹层 ---------- */
  const openSheet = (html, onMount) => {
    const modal = $('#sheetModal'), body = $('#sheetBody');
    if (!modal || !body) return;
    body.innerHTML = html;
    modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); document.body.classList.add('modal-open');
    if (onMount) onMount(body);
  };
  const closeSheet = () => {
    const modal = $('#sheetModal'); if (!modal) return;
    modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); document.body.classList.remove('modal-open');
  };

  /* ---------- 曲目挂载 MV ---------- */
  const mvOf = track => (track && track.mvId) ? videos().find(v => v.id === track.mvId) : null;
  const mvThumb = v => {
    const u = v ? safeUrl(v.coverUrl) : '';
    return u ? `<img class="mv-thumb" referrerpolicy="no-referrer" src="${esc(u)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">` : '<span class="mv-thumb mv-thumb-ph">▶</span>';
  };
  function openMvPicker(albumId, trackId) {
    const list = videos();
    if (!list.length) {
      openSheet(`<div class="sheet-head"><div class="eyebrow">PICK A MV</div><h2>还没有可以挂的MV</h2><p class="sheet-desc">先去「MV」页添加几条记录，之后就能把它们的封面挂到歌曲旁边了。</p></div><div class="sheet-foot"><button class="button" data-action="add-video">＋ 添加MV</button><button class="button secondary" type="button" data-close-sheet>关闭</button></div>`);
      return;
    }
    openSheet(`<div class="sheet-head"><div class="eyebrow">PICK A MV</div><h2>选择一条MV</h2><p class="sheet-desc">从你已经添加的MV里挑一条。挂上之后，封面会显示在歌曲旁边的圆形图标里，点一下就能跳到MV页面。</p></div>
      <input class="field" id="mvPickSearch" placeholder="搜索MV标题或艺人……" autocomplete="off" />
      <div class="pick-list" id="mvPickList">${list.map(v => `<button type="button" class="pick-item" data-pick-mv-id="${esc(v.id)}">${mvThumb(v)}<span class="pick-meta"><b>${esc(v.title)}</b><small>${esc(v.artist || '')}${v.watchedAt ? ' · ' + esc(v.watchedAt) : ''}</small></span></button>`).join('')}</div>
      <div class="sheet-foot"><button class="button secondary" type="button" data-close-sheet>取消</button></div>`, body => {
      body.querySelector('#mvPickSearch')?.addEventListener('input', e => {
        const q = e.target.value.trim().toLowerCase();
        body.querySelectorAll('[data-pick-mv-id]').forEach(el => { el.hidden = !!q && !el.textContent.toLowerCase().includes(q); });
      });
      body.querySelectorAll('[data-pick-mv-id]').forEach(btn => btn.addEventListener('click', () => {
        setTrackMv(albumId, trackId, btn.dataset.pickMvId); closeSheet();
      }));
    });
  }
  function setTrackMv(albumId, trackId, mvId) {
    const list = albums(), a = list.find(x => x.id === albumId), t = a?.tracks.find(x => x.id === trackId);
    if (!t) return;
    t.mvId = mvId || ''; write(KEYS.albums, list); render();
    toast(mvId ? '已为这首歌挂上MV' : '已移除MV');
  }

  /* ---------- 自定义歌单（只能从红心里挑选） ---------- */
  const customPlaylists = () => { try { return JSON.parse(localStorage.getItem(KEYS.playlists) || '[]') || []; } catch { return []; } };
  const saveCustomPlaylists = list => localStorage.setItem(KEYS.playlists, JSON.stringify(list));
  const plKey = (albumId, trackId) => `${albumId}::${trackId}`;
  function openCreatePlaylist(existingId) {
    const favs = favoriteTracks();
    const editing = existingId ? customPlaylists().find(x => x.id === existingId) : null;
    if (!favs.length) {
      openSheet(`<div class="sheet-head"><div class="eyebrow">NEW PLAYLIST</div><h2>还没有红心歌曲</h2><p class="sheet-desc">歌单里的歌曲来自你的红心。回到任意专辑，把喜欢的歌点亮 ♡ 之后再来创建吧。</p></div><div class="sheet-foot"><button class="button secondary" type="button" data-close-sheet>知道了</button></div>`);
      return;
    }
    const chosen = new Set((editing?.items || []).map(it => plKey(it.albumId, it.trackId)));
    openSheet(`<div class="sheet-head"><div class="eyebrow">${editing ? 'EDIT PLAYLIST' : 'NEW PLAYLIST'}</div><h2>${editing ? '编辑歌单' : '新建歌单'}</h2><p class="sheet-desc">给歌单起个名字，再从红心里挑几首放进去。歌单名字随时可以改。</p></div>
      <label class="field-label">歌单名字</label>
      <input class="field" id="plNameInput" placeholder="例如：深夜循环" maxlength="30" value="${esc(editing?.name || '')}" />
      <div class="field-label" style="margin-top:18px">选择歌曲 <span class="muted">· 共 ${favs.length} 首红心</span></div>
      <div class="pick-list" id="plPickList">${favs.map(t => `<label class="pick-item"><input type="checkbox" value="${esc(plKey(t.albumId, t.id))}"${chosen.has(plKey(t.albumId, t.id)) ? ' checked' : ''}><span class="pick-meta"><b>${esc(t.title)}</b><small>${esc(t.artist || '')} · ${esc(t.albumTitle || '')}</small></span></label>`).join('')}</div>
      <div class="sheet-foot"><button class="button" id="plSaveBtn">${editing ? '保存修改' : '创建歌单'}</button><button class="button secondary" type="button" data-close-sheet>取消</button></div>`, body => {
      body.querySelector('#plSaveBtn')?.addEventListener('click', () => {
        const name = (body.querySelector('#plNameInput')?.value || '').trim();
        if (!name) { toast('先给歌单起个名字吧'); return; }
        const picked = [...body.querySelectorAll('#plPickList input:checked')].map(i => i.value);
        if (!picked.length) { toast('至少选一首红心歌曲'); return; }
        const items = picked.map(k => { const [albumId, trackId] = k.split('::'); return { albumId, trackId }; });
        const favMap = new Map(favs.map(t => [plKey(t.albumId, t.id), t]));
        const coverUrl = favMap.get(plKey(items[0].albumId, items[0].trackId))?.coverUrl || '';
        const list = customPlaylists();
        const now = new Date().toISOString();
        if (editing) {
          const i = list.findIndex(x => x.id === editing.id);
          if (i >= 0) list[i] = { ...list[i], name, items, coverUrl, updatedAt: now };
        } else {
          list.unshift({ id: uid(), name, items, coverUrl, createdAt: now, updatedAt: now });
        }
        saveCustomPlaylists(list); closeSheet(); render();
        toast(editing ? '歌单已更新' : '歌单已创建');
      });
    });
  }

  /* ---------- 网格 / 列表 视图 + 时间筛选 ---------- */
  const viewState = { music: { mode: 'grid', q: '', year: '', month: '' }, mv: { mode: 'grid', q: '', year: '', month: '' } };
  const loadViews = () => { try { const v = JSON.parse(localStorage.getItem(KEYS.views) || '{}') || {}; if (v.music === 'list' || v.music === 'grid') viewState.music.mode = v.music; if (v.mv === 'list' || v.mv === 'grid') viewState.mv.mode = v.mv; } catch {} };
  const saveViews = () => localStorage.setItem(KEYS.views, JSON.stringify({ music: viewState.music.mode, mv: viewState.mv.mode }));
  const yearOptions = dates => [...new Set(dates.filter(Boolean).map(d => d.slice(0, 4)))].sort().reverse();
  const monthOptions = dates => [...new Set(dates.filter(Boolean).map(d => d.slice(0, 7)))].sort().reverse();
  const albumHay = a => [a.title, a.artist, a.listenedAt, a.review, a.intro, (a.tags || []).join(' '), (a.tracks || []).map(t => t.title).join(' ')].join(' ');
  const videoHay = v => [v.title, v.artist, v.watchedAt, v.review, (v.tags || []).join(' ')].join(' ');
  function passesFilter(st, date, hay) {
    if (st.year && !(date || '').startsWith(st.year)) return false;
    if (st.month && !(date || '').startsWith(st.month)) return false;
    const q = (st.q || '').trim().toLowerCase();
    if (q && !hay.toLowerCase().includes(q)) return false;
    return true;
  }
  const albumListRow = a => {
    const u = safeUrl(a.coverUrl);
    const img = u ? `<img class="list-cover" referrerpolicy="no-referrer" src="${esc(u)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">` : '<div class="list-cover list-cover-ph">♪</div>';
    const stars = a.rating ? '★'.repeat(Math.max(1, Math.min(5, Number(a.rating) || 1))) : '';
    return `<article class="list-row" data-open-album="${esc(a.id)}">${img}<span class="list-meta"><b>${esc(a.title)}</b><small>${esc(a.artist || '')}${(a.tracks || []).length ? ' · ' + (a.tracks || []).length + ' 首曲目' : ''} · ${dateText(a.listenedAt)}</small></span>${stars ? `<span class="list-rating">${stars}</span>` : '<span class="list-count"></span>'}<span class="list-arrow">›</span></article>`;
  };
  const videoListRow = v => {
    const u = safeUrl(v.coverUrl);
    const img = u ? `<img class="list-cover wide" referrerpolicy="no-referrer" src="${esc(u)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">` : '<div class="list-cover list-cover-ph wide">▶</div>';
    return `<article class="list-row" data-open-video="${esc(v.id)}">${img}<span class="list-meta"><b>${esc(v.title)}</b><small>${esc(v.artist || '')} · ${dateText(v.watchedAt)}</small></span><span class="list-count">${esc(v.platform || '')}</span><span class="list-arrow">›</span></article>`;
  };
  function archiveHTML(page) {
    const st = viewState[page], isMv = page === 'mv';
    const items = isMv ? videos() : albums();
    const list = items.filter(it => passesFilter(st, isMv ? (it.watchedAt || '') : (it.listenedAt || ''), isMv ? videoHay(it) : albumHay(it)));
    if (!list.length) return empty(isMv ? '没有符合条件的 MV。<br/>换个关键词或时间试试。' : '没有符合条件的专辑。<br/>换个关键词或时间试试。');
    if (st.mode === 'grid') return list.map(isMv ? videoCard : albumCard).join('');
    return list.map(isMv ? videoListRow : albumListRow).join('');
  }
  const viewToolbar = (page, st, dates, placeholder) => `
    <div class="view-toolbar">
      <input class="search" id="${page}Search" placeholder="${esc(placeholder)}" value="${esc(st.q || '')}" autocomplete="off" />
      <div class="toolbar-row">
        <div class="filter-group">
          <select class="chip-select" id="${page}Year" aria-label="按年份筛选"><option value="">全部年份</option>${yearOptions(dates).map(y => `<option value="${esc(y)}"${st.year === y ? ' selected' : ''}>${esc(y)} 年</option>`).join('')}</select>
          <select class="chip-select" id="${page}Month" aria-label="按月份筛选"><option value="">全部月份</option>${monthOptions(dates).filter(m => !st.year || m.startsWith(st.year)).map(m => `<option value="${esc(m)}"${st.month === m ? ' selected' : ''}>${esc(m.slice(5))} 月</option>`).join('')}</select>
        </div>
        <div class="seg" role="group" aria-label="显示方式">
          <button type="button" class="seg-btn${st.mode === 'grid' ? ' active' : ''}" data-view-mode="grid" data-view-page="${page}">网格</button>
          <button type="button" class="seg-btn${st.mode === 'list' ? ' active' : ''}" data-view-mode="list" data-view-page="${page}">列表</button>
        </div>
      </div>
    </div>`;
  function bindArchive(page) {
    const st = viewState[page];
    const box = $(page === 'music' ? '#musicAlbums' : '#videoGrid');
    if (!box) return;
    const dates = () => page === 'music' ? albums().map(a => a.listenedAt || '') : videos().map(v => v.watchedAt || '');
    const paint = () => {
      box.className = st.mode === 'grid' ? (page === 'music' ? 'tile-grid' : 'tile-grid video-grid') : 'row-list';
      box.innerHTML = archiveHTML(page);
    };
    const monthSel = $(`#${page}Month`);
    const rebuildMonths = () => {
      if (!monthSel) return;
      const list = monthOptions(dates()).filter(m => !st.year || m.startsWith(st.year));
      monthSel.innerHTML = '<option value="">全部月份</option>' + list.map(m => `<option value="${esc(m)}"${st.month === m ? ' selected' : ''}>${esc(m.slice(5))} 月</option>`).join('');
    };
    $(`#${page}Search`)?.addEventListener('input', e => { st.q = e.target.value; paint(); });
    $(`#${page}Year`)?.addEventListener('change', e => { st.year = e.target.value; if (st.month && !st.month.startsWith(st.year)) st.month = ''; rebuildMonths(); paint(); });
    monthSel?.addEventListener('change', e => { st.month = e.target.value; paint(); });
    $$('[data-view-mode]').forEach(btn => btn.addEventListener('click', () => {
      if (btn.dataset.viewPage !== page) return;
      viewState[page].mode = btn.dataset.viewMode; saveViews();
      const y = window.scrollY; render(); window.scrollTo(0, y);
    }));
    paint();
  }

  /* ---------- 年度回顾 ---------- */
  function heatmap(year) {
    const counts = {};
    const bump = d => { if (!d) return; counts[d] = (counts[d] || 0) + 1; };
    albums().forEach(a => bump(a.listenedAt));
    videos().forEach(v => bump(v.watchedAt));
    const start = new Date(Number(year), 0, 1);
    const gridStart = new Date(start);
    gridStart.setDate(start.getDate() - start.getDay());
    let cells = '';
    for (let w = 0; w < 53; w++) {
      for (let d = 0; d < 7; d++) {
        const day = new Date(gridStart);
        day.setDate(gridStart.getDate() + w * 7 + d);
        const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
        const inYear = day.getFullYear() === Number(year);
        const n = inYear ? (counts[key] || 0) : 0;
        const lvl = n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : 4;
        cells += `<span class="heat-cell lvl-${lvl}" title="${key} · ${n} 条记录"></span>`;
      }
    }
    return `<div class="heatmap">${cells}</div>`;
  }
  const recapRow = (item, kind) => {
    const isMv = kind === 'video', u = safeUrl(item.coverUrl), cls = isMv ? 'wide' : '', glyph = isMv ? '▶' : '♪';
    const img = u ? `<img class="list-cover ${cls}" referrerpolicy="no-referrer" src="${esc(u)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">` : `<div class="list-cover list-cover-ph ${cls}">${glyph}</div>`;
    const attr = isMv ? `data-open-video="${esc(item.id)}"` : `data-open-album="${esc(item.id)}"`;
    return `<div class="recap-row" role="button" tabindex="0" ${attr}>${img}<span class="recap-row-meta"><b>${esc(item.title)}</b><small>${esc(isMv ? (item.artist || '') : (item.artist || ''))}${item.rating ? ' · ★' + item.rating : ''}</small></span><span class="recap-date">${dateText(isMv ? item.watchedAt : item.listenedAt)}</span></div>`;
  };
  function yearlyView(arg) {
    const years = [...new Set([...albums().map(a => (a.listenedAt || '').slice(0, 4)), ...videos().map(v => (v.watchedAt || '').slice(0, 4))].filter(Boolean))].sort().reverse();
    const year = (arg && /^\d{4}$/.test(arg)) ? arg : (years[0] || String(new Date().getFullYear()));
    const byDate = (x, y) => (y || '').localeCompare(x || '');
    const yA = albums().filter(a => (a.listenedAt || '').startsWith(year)).sort((x, y) => byDate(x.listenedAt, y.listenedAt));
    const yV = videos().filter(v => (v.watchedAt || '').startsWith(year)).sort((x, y) => byDate(x.watchedAt, y.watchedAt));
    const days = new Set([...yA.map(a => a.listenedAt), ...yV.map(v => v.watchedAt)].filter(Boolean));
    const picker = years.length ? `<div class="year-picker">${years.map(y => `<button type="button" class="tab${y === year ? ' active' : ''}" data-year="${esc(y)}">${esc(y)}</button>`).join('')}</div>` : '';
    return `${pageHead('YEAR IN REVIEW', `${year} 年度回顾`, '这一年听过的、看过的，都在这里。')}
      ${picker}
      <div class="recap-hero"><div class="eyebrow">YOUR YEAR</div><div class="recap-year">${esc(year)}</div><div class="muted" style="font-size:12px">让每张专辑，都有归处。</div></div>
      <div class="recap-stats">
        <div class="recap-stat"><b>${yA.length}</b><span>张专辑</span></div>
        <div class="recap-stat"><b>${yV.length}</b><span>条 MV</span></div>
        <div class="recap-stat"><b>${favoriteTracks().length}</b><span>首红心</span></div>
        <div class="recap-stat"><b>${days.size}</b><span>天被记录</span></div>
      </div>
      <div class="heatmap-wrap">
        <div class="eyebrow" style="margin-bottom:14px">ACTIVITY · 记录小格子</div>
        ${heatmap(year)}
        <div class="heat-legend"><span>少</span><i style="background:var(--panel2)"></i><i style="background:color-mix(in srgb,var(--accent) 26%,transparent)"></i><i style="background:color-mix(in srgb,var(--accent) 48%,transparent)"></i><i style="background:color-mix(in srgb,var(--accent) 72%,transparent)"></i><i style="background:var(--accent)"></i><span>多</span><span style="margin-left:6px">颜色越深，那天记录的越多</span></div>
      </div>
      <div class="section-row"><div class="section-title">今年听的专辑</div><span class="muted" style="font-size:11px">${yA.length} 张</span></div>
      ${yA.length ? `<div class="recap-list">${yA.map(a => recapRow(a, 'album')).join('')}</div>` : empty('这一年还没有记录专辑。')}
      <div class="section-row"><div class="section-title">今年看的MV</div><span class="muted" style="font-size:11px">${yV.length} 条</span></div>
      ${yV.length ? `<div class="recap-list">${yV.map(v => recapRow(v, 'video')).join('')}</div>` : empty('这一年还没有记录MV。')}
      <div class="actions" style="margin-top:26px"><button class="button" data-action="export-year-txt">导出 TXT</button><button class="button secondary" data-action="export-year-json">导出 JSON</button><button class="button secondary" data-action="export-year-copy">复制摘要</button></div>`;
  }
  function exportYearly(kind) {
    const year = (route()[1] || String(new Date().getFullYear()));
    const byDate = (x, y) => (y || '').localeCompare(x || '');
    const yA = albums().filter(a => (a.listenedAt || '').startsWith(year)).sort((x, y) => byDate(x.listenedAt, y.listenedAt));
    const yV = videos().filter(v => (v.watchedAt || '').startsWith(year)).sort((x, y) => byDate(x.watchedAt, y.watchedAt));
    const lines = [`SIDE C · ${year} 年度回顾`, '让每张专辑，都有归处。', '', `【专辑 ${yA.length} 张】`,
      ...(yA.length ? yA.map(a => `${a.listenedAt}　${a.title}${a.artist ? ' — ' + a.artist : ''}`) : ['（还没有记录）']), '',
      `【MV ${yV.length} 条】`,
      ...(yV.length ? yV.map(v => `${v.watchedAt}　${v.title}${v.artist ? ' — ' + v.artist : ''}`) : ['（还没有记录）'])];
    const txt = lines.join('\n');
    if (kind === 'txt') { downloadText(`SIDE-C-${year}-年度回顾.txt`, txt, 'text/plain'); toast('已导出 TXT'); }
    else if (kind === 'json') { downloadText(`SIDE-C-${year}-年度回顾.json`, JSON.stringify({ app: 'SIDE C', year, slogan: '让每张专辑，都有归处。', albums: yA, videos: yV, exportedAt: new Date().toISOString() }, null, 2), 'application/json'); toast('已导出 JSON'); }
    else copyText(txt);
  }

  /* ---------- 提出建议 ---------- */
  function openSuggestion() {
    openSheet(`<div class="sheet-head"><div class="eyebrow">SUGGESTION</div><h2>提出建议</h2><p class="sheet-desc">有任何想法、功能需求，或者想让我画点什么，都欢迎写信告诉我。每一封我都会认真看。</p></div>
      <div class="contact-card"><div class="contact-label">联系邮箱</div><a class="contact-mail" href="mailto:ouch61@126.com">ouch61@126.com</a><p class="contact-hint">点击邮箱地址可以直接写信</p></div>
      <div class="sheet-foot"><a class="button" href="mailto:ouch61@126.com?subject=SIDE%20C%20%E5%BB%BA%E8%AE%AE">写信给我</a><button class="button secondary" type="button" data-close-sheet>关闭</button></div>`);
  }

  /* ---------- 编辑记录时保留曲目状态 ---------- */
  const mergeTracks = (oldTracks, parsed) => parsed.map(t => {
    const key = (t.title || '').trim().toLowerCase();
    const prev = (oldTracks || []).find(x => (x.title || '').trim().toLowerCase() === key);
    return prev ? { ...prev, title: t.title } : { id: uid(), title: t.title, favorite: false, note: '', mvId: '' };
  });

  /* ---------- 开屏界面 ---------- */
  function initSplash() {
    const splash = $('#splash'); if (!splash) return;
    const bar = $('#splashProgress');
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      splash.classList.add('hide');
      document.body.classList.remove('modal-open');
      setTimeout(() => splash.remove(), 900);
    };
    document.body.classList.add('modal-open');
    if (bar) { bar.style.transition = 'width 2.6s linear'; requestAnimationFrame(() => setTimeout(() => { bar.style.width = '100%'; }, 120)); }
    $('#splashEnter')?.addEventListener('click', finish);
    document.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') finish(); });
    setTimeout(finish, 2800);
  }

  /* ===== 自动抓取：专辑 / 简介 / 曲目 / MV ===== */
  const settings = () => { try { return JSON.parse(localStorage.getItem(KEYS.settings) || '{}') || {}; } catch { return {}; } };
  const saveSettings = patch => localStorage.setItem(KEYS.settings, JSON.stringify({ ...settings(), ...patch }));
  const withTimeout = (p, ms = 9000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  const getJson = async url => { const r = await withTimeout(fetch(url)); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
  const jsonp = url => new Promise((resolve, reject) => {
    const cb = 'sidec_cb_' + Math.random().toString(36).slice(2);
    const el = document.createElement('script');
    const done = () => { clearTimeout(timer); delete window[cb]; el.remove(); };
    const timer = setTimeout(() => { done(); reject(new Error('jsonp timeout')); }, 9000);
    window[cb] = data => { done(); resolve(data); };
    el.onerror = () => { done(); reject(new Error('jsonp error')); };
    el.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
    document.head.appendChild(el);
  });
  const itunes = async url => { try { return await getJson(url); } catch { return await jsonp(url); } };
  const decode = text => { const t = document.createElement('textarea'); t.innerHTML = text || ''; return t.value; };
  const bigCover = u => (u || '').replace(/\/\d+x\d+(?:bb)?\.(jpg|png)$/i, '/600x600bb.$1');
  const neBase = () => (safeUrl(settings().neteaseProxy) || '').replace(/\/+$/, '');

  async function searchItunes(q) {
    const countries = ['cn', 'us'];
    const rs = await Promise.allSettled(countries.map(c => itunes(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=8&country=${c}`)));
    const seen = new Set(), out = [];
    rs.forEach((r, i) => {
      if (r.status !== 'fulfilled') return;
      (r.value.results || []).forEach(x => {
        const key = `${x.collectionName}|${x.artistName}`.toLowerCase();
        if (seen.has(key)) return; seen.add(key);
        out.push({ source: 'iTunes', country: countries[i], id: x.collectionId, title: x.collectionName, artist: x.artistName, cover: bigCover(x.artworkUrl100), year: (x.releaseDate || '').slice(0, 10), trackCount: x.trackCount, genre: x.primaryGenreName || '', url: x.collectionViewUrl || '' });
      });
    });
    if (!out.length && rs.every(r => r.status === 'rejected')) throw new Error('itunes failed');
    return out;
  }
  async function itunesTracks(id, country) {
    const d = await itunes(`https://itunes.apple.com/lookup?id=${id}&entity=song&country=${country}`);
    return (d.results || []).filter(x => x.wrapperType === 'track').sort((a, b) => (a.discNumber || 1) - (b.discNumber || 1) || (a.trackNumber || 0) - (b.trackNumber || 0)).map(x => x.trackName);
  }
  async function searchNetease(q) {
    const d = await getJson(`${neBase()}/cloudsearch?keywords=${encodeURIComponent(q)}&type=10&limit=8`);
    return (d.result?.albums || []).map(x => ({ source: '网易云', id: x.id, title: x.name, artist: x.artist?.name || (x.artists || []).map(a => a.name).join(' / '), cover: (x.picUrl || '').replace(/^http:/, 'https:').split('?')[0] + '?param=600y600', year: x.publishTime ? new Date(x.publishTime).toISOString().slice(0, 10) : '', trackCount: x.size, genre: '', url: `https://music.163.com/#/album?id=${x.id}` }));
  }
  async function neteaseDetail(id) {
    const d = await getJson(`${neBase()}/album?id=${id}`);
    return { intro: (d.album?.description || '').trim(), tracks: (d.songs || []).map(x => x.name) };
  }
  async function wikiIntro(title, artist) {
    const clean = title.replace(/\s*[\(（\[].*?[\)）\]]/g, '').replace(/\s*-\s*(Single|EP)$/i, '').trim();
    const n = t => (t || '').toLowerCase();
    for (const lang of ['zh', 'en']) {
      try {
        const d = await getJson(`https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(clean + ' ' + artist)}&gsrlimit=4&prop=extracts&exlimit=4&exintro=1&explaintext=1&exchars=700&format=json&origin=*`);
        const pages = Object.values(d.query?.pages || {}).sort((a, b) => a.index - b.index);
        const hit = pages.find(p => p.extract && n(p.title).includes(n(clean)) && (n(p.extract).includes(n(artist)) || n(p.title).includes(n(artist)) || /专辑|專輯|album|\bEP\b/i.test(p.extract)));
        if (hit) return { text: hit.extract.trim(), source: `维基百科（${lang}）`, url: `https://${lang}.wikipedia.org/?curid=${hit.pageid}` };
      } catch {}
    }
    return null;
  }
  async function searchAlbums(q) {
    const jobs = [searchItunes(q)];
    if (neBase()) jobs.unshift(searchNetease(q));
    const rs = await Promise.allSettled(jobs);
    return { list: rs.flatMap(r => r.status === 'fulfilled' ? r.value : []).slice(0, 16), failed: rs.filter(r => r.status === 'rejected').length };
  }
  async function importAlbum(r, box) {
    box.innerHTML = '<div class="results-note">正在抓取封面、简介和曲目……</div>';
    const wikiP = wikiIntro(r.title, r.artist);
    let tracks = [], intro = null;
    try {
      if (r.source === '网易云') { const d = await neteaseDetail(r.id); tracks = d.tracks; if (d.intro) intro = { text: d.intro, source: '网易云音乐', url: r.url }; }
      else tracks = await itunesTracks(r.id, r.country);
    } catch {}
    if (!intro) intro = await wikiP;
    const draft = {
      title: r.title, artist: r.artist, coverUrl: r.cover, genre: r.genre,
      tracksText: tracks.map((t, i) => `${String(i + 1).padStart(2, '0')}. ${t}`).join('\n'),
      tagsText: r.genre || '', intro: intro?.text || '', introSource: intro?.source || '',
      wikiUrl: intro?.source?.startsWith('维基') ? intro.url : '', neteaseUrl: r.source === '网易云' ? r.url : '',
      sourceUrl: r.url || '', sourceName: r.source === 'iTunes' ? 'Apple Music' : r.source, trackTotal: tracks.length
    };
    sessionStorage.setItem(DRAFT, JSON.stringify(draft));
    if (route()[0] === 'add-album') render(); else go('add-album');
  }
  /*PURE_START*/
  function parseBili(t) {
    t = t || '';
    const bv = t.match(/BV[0-9A-Za-z]{10}/); if (bv) return { bvid: bv[0] };
    const av = t.match(/bilibili\.com\/video\/av(\d+)/i); if (av) return { aid: av[1] };
    const sh = t.match(/https?:\/\/b23\.tv\/[\w-]+/i); if (sh) return { short: sh[0] };
    return null;
  }
  const biliCover = u => (u || '').replace(/^\/\//, 'https://').replace(/^http:/, 'https:');
  const biliUrl = bv => `https://www.bilibili.com/video/${bv}`;
  /*PURE_END*/
  const proxyBase = () => (safeUrl(settings().proxy) || '').replace(/\/+$/, '');
  async function biliView(ref) {
    const q = ref.bvid ? `bvid=${ref.bvid}` : `aid=${ref.aid}`, b = proxyBase();
    const d = await getJson(b ? `${b}/bili/view?${q}` : `https://api.bilibili.com/x/web-interface/view?${q}`);
    if (d.code !== 0 || !d.data) throw new Error('bili view ' + d.code);
    return d.data;
  }
  const biliToVideo = d => ({ source: 'Bilibili', id: d.bvid, title: decode(d.title || ''), artist: d.owner?.name || '', cover: biliCover(d.pic), url: biliUrl(d.bvid) });
  async function searchBilibili(q) {
    const b = proxyBase();
    const d = await getJson(b ? `${b}/bili/search?keyword=${encodeURIComponent(q)}` : `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(q)}&page=1`);
    const items = d?.data?.result;
    if (!Array.isArray(items)) throw new Error('bili search ' + d?.code);
    return items.filter(x => x.bvid).slice(0, 10).map(x => ({ source: 'Bilibili', id: x.bvid, title: decode((x.title || '').replace(/<[^>]+>/g, '')), artist: x.author || '', cover: biliCover(x.pic), url: biliUrl(x.bvid) }));
  }
  const mvQuery = q => /\b(mv|live|official|music video)\b|现场|官方/i.test(q) ? q : q + ' MV';
  const biliFailNote = q => `<div class="results-note">${proxyBase() ? 'B站搜索没有成功（接口暂时不可用或被限流），稍后再试。' : 'B站不允许网页直接搜索，需要先配置中转接口地址（部署方法见项目 README）。'}<br/><a class="text-link" href="https://search.bilibili.com/video?keyword=${encodeURIComponent(mvQuery(q))}" target="_blank" rel="noopener">先去 B站手动搜索 ↗</a>，找到视频后把 BV 号（或链接）粘贴到上面的搜索框，会自动解析。</div>`;
  function fillVideoForm(v) {
    const f = $('#videoForm'); if (!f) return;
    const set = (n, val) => { if (val && f.elements[n]) f.elements[n].value = val; };
    set('title', v.title); set('artist', v.artist); set('coverUrl', v.cover); set('videoUrl', v.url); set('platform', 'Bilibili');
  }
  async function parseAndFill(text, box) {
    let ref = parseBili(text); if (!ref) return false;
    box.innerHTML = '<div class="results-note">正在解析 B站 链接……</div>';
    try {
      if (ref.short) {
        if (!proxyBase()) { box.innerHTML = '<div class="results-note">这是 b23.tv 短链接，浏览器无法展开。请粘贴电脑端地址栏里的完整链接（bilibili.com/video/BV…），或在设置里填好接口地址。</div>'; return true; }
        const r = await getJson(`${proxyBase()}/bili/resolve?url=${encodeURIComponent(ref.short)}`);
        ref = parseBili(r.url || ''); if (!ref) throw new Error('resolve');
      }
      let v, partial = false;
      try { v = biliToVideo(await biliView(ref)); }
      catch { if (!ref.bvid) throw new Error('view'); v = { url: biliUrl(ref.bvid) }; partial = true; }
      fillVideoForm(v);
      box.innerHTML = partial ? '<div class="results-note">已识别为 B站 视频并填入链接，但没能自动获取标题和封面（需要在「我的空间 → 数据来源设置」填好接口地址）。请手动补一下标题和艺人 ↓</div>' : '<div class="results-note">已解析并自动填入，检查一下就可以保存 ↓</div>';
      $('#videoForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch { box.innerHTML = '<div class="results-note">这个链接没能解析，请确认是 B站视频链接后重试。</div>'; }
    return true;
  }
  const mediaBlock = v => {
    const bv = /bilibili\.com/.test(v.videoUrl || '') ? (parseBili(v.videoUrl) || {}).bvid : '';
    if (bv) return `<div class="player-wrap"><iframe src="https://player.bilibili.com/player.html?bvid=${esc(bv)}&page=1&high_quality=1&autoplay=0" allowfullscreen scrolling="no" referrerpolicy="no-referrer" title="${esc(v.title)}"></iframe></div>`;
    return cover(v.coverUrl, v.title, 'wide');
  };

  const searchBox = (cls, ph) => `<form class="quick-search ${cls}" autocomplete="off"><input class="field" name="q" placeholder="${ph}" enterkeyhint="search" /><button class="button" type="submit">搜索</button></form><div class="results"></div>`;
  const resultRow = (r, i) => `<button type="button" class="result-item" data-pick="${i}"><img class="result-cover" referrerpolicy="no-referrer" src="${esc(safeUrl(r.cover))}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><span class="result-meta"><b>${esc(r.title)}</b><small>${esc(r.artist)}${r.year ? ' · ' + esc(r.year.slice(0, 4)) : ''}${r.trackCount ? ' · ' + esc(r.trackCount) + ' 首' : ''}</small></span><i class="tag">${esc(r.source)}</i></button>`;
  function showResults(box, list, onPick, row = resultRow) {
    box.innerHTML = list.map(row).join('');
    $$('[data-pick]', box).forEach(b => b.addEventListener('click', () => onPick(list[Number(b.dataset.pick)])));
  }
  function bindExtra() {
    $$('[data-pl-export]').forEach(btn => btn.addEventListener('click', () => exportPlaylist(btn.dataset.plExport)));
    $$('[data-pl-unlike]').forEach(btn => btn.addEventListener('click', () => {
      const [albumId, trackId] = btn.dataset.plUnlike.split('|'), list = albums(), a = list.find(x => x.id === albumId), t = a?.tracks.find(x => x.id === trackId);
      if (t) { t.favorite = false; write(KEYS.albums, list); render(); toast('已取消喜欢，歌单已更新'); }
    }));
    $$('form.album-search').forEach(form => form.addEventListener('submit', async e => {
      e.preventDefault();
      const q = form.elements.q.value.trim(); if (!q) return;
      const box = form.nextElementSibling;
      box.innerHTML = '<div class="results-note">正在搜索……</div>';
      const { list, failed } = await searchAlbums(q);
      if (!list.length) { box.innerHTML = `<div class="results-note">${failed ? '搜索服务暂时连不上，请检查网络后重试。' : `没有找到「${esc(q)}」。试试加上艺人名，或换成原名 / 英文名。`}<br/>也可以 <a class="text-link" href="#add-album">手动填写 ↗</a></div>`; return; }
      showResults(box, list, r => importAlbum(r, box));
    }));
    $$('form.video-search').forEach(form => {
      const box = form.nextElementSibling, input = form.elements.q;
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const text = input.value.trim(); if (!text) return;
        if (await parseAndFill(text, box)) return;
        box.innerHTML = '<div class="results-note">正在 B站 上搜索……</div>';
        try {
          const list = await searchBilibili(mvQuery(text));
          if (!list.length) { box.innerHTML = `<div class="results-note">B站没有搜到「${esc(text)}」，换个关键词试试（比如加上艺人名）。</div>`; return; }
          showResults(box, list, v => { fillVideoForm(v); box.innerHTML = '<div class="results-note">已自动填入，检查一下艺人名就可以保存 ↓</div>'; $('#videoForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
        } catch { box.innerHTML = biliFailNote(text); }
      });
      input.addEventListener('paste', () => setTimeout(() => { if (parseBili(input.value)) form.requestSubmit(); }, 0));
    });
    $('#videoForm')?.elements.videoUrl?.addEventListener('change', e => { const box = $('form.video-search')?.nextElementSibling; if (box && parseBili(e.target.value)) parseAndFill(e.target.value, box); });
  }

  /* ===== 歌单：由红心歌曲自动汇总，不可手动新建 ===== */
  const artistKey = a => (a || '').trim().toLowerCase();
  function playlists() {
    const all = favoriteTracks(), map = new Map();
    all.forEach(t => { const k = artistKey(t.artist) || '未知艺人'; if (!map.has(k)) map.set(k, { key: k, name: (t.artist || '').trim() || '未知艺人', tracks: [] }); map.get(k).tracks.push(t); });
    return { all, artists: [...map.values()].sort((a, b) => b.tracks.length - a.tracks.length || a.name.localeCompare(b.name)) };
  }
  function currentPlaylist(id) {
    const p = playlists();
    if (!id || id === 'all') return { id: 'all', name: '全部红心', tracks: p.all, showArtist: true };
    if (String(id).startsWith('c-')) {
      const pid = String(id).slice(2);
      const cp = customPlaylists().find(x => x.id === pid);
      if (!cp) return null;
      const fav = favoriteTracks();
      const tracks = cp.items.map(it => fav.find(f => f.albumId === it.albumId && f.id === it.trackId)).filter(Boolean);
      return { id, pid, name: cp.name, tracks, showArtist: false, custom: true };
    }
    let key = String(id).replace(/^a-/, ''); try { key = decodeURIComponent(key); } catch {}
    const a = p.artists.find(x => x.key === key);
    return a ? { id, name: a.name, tracks: a.tracks, showArtist: false } : null;
  }
  const miniCover = url => safeUrl(url) ? `<img class="pl-cover" referrerpolicy="no-referrer" src="${esc(safeUrl(url))}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : '<div class="pl-cover"></div>';
  const plRow = (id, name, n, coverUrl) => `<button type="button" class="pl-row" data-open-playlist="${esc(id)}">${miniCover(coverUrl)}<span class="pl-meta"><b>${esc(name)}</b><small>${n} 首</small></span><span class="pl-arrow">›</span></button>`;
  function playlistView(arg) {
    const p = playlists();
    const mine = customPlaylists();
    if (!arg) {
      const head = pageHead('PLAYLISTS', '歌单', '红心歌曲会自动汇总到这里，你也可以用红心里的歌创建自己的歌单。', '<button class="button" data-action="new-playlist">＋ 新建歌单</button>');
      const auto = p.all.length ? `<div class="pl-list">${plRow('all', '全部红心', p.all.length, p.all[0].coverUrl)}</div>
        <div class="section-row"><div class="section-title">按歌手</div><span class="muted" style="font-size:11px">${p.artists.length} 位</span></div>
        <div class="pl-list">${p.artists.map(a => plRow('a-' + encodeURIComponent(a.key), a.name, a.tracks.length, a.tracks[0].coverUrl)).join('')}</div>` : '';
      const custom = mine.length ? `<div class="section-row"><div class="section-title">我的歌单</div><span class="muted" style="font-size:11px">${mine.length} 个</span></div>
        <div class="pl-list">${mine.map(x => `<div class="pl-row-wrap"><div class="pl-row" role="button" tabindex="0" data-open-playlist="c-${esc(x.id)}">${miniCover(x.coverUrl)}<span class="pl-meta"><b>${esc(x.name)}</b><small>${x.items.length} 首 · 我的歌单</small></span><span class="pl-badge">自建</span><span class="pl-arrow">›</span></div><div class="pl-row-actions"><button class="mini-btn" data-pl-edit="${esc(x.id)}">编辑 / 改名</button><button class="mini-btn" data-pl-delete="${esc(x.id)}">删除</button></div></div>`).join('')}</div>` : '';
      if (!p.all.length && !mine.length) return head + empty('还没有红心歌曲。<br/>进入任意专辑，点亮喜欢的歌曲旁边的 ♡ 吧。');
      return `${head}${auto}${custom}`;
    }
    const pl = currentPlaylist(arg);
    if (!pl) return `${pageHead('PLAYLISTS', '没有找到这个歌单', '可能其中的红心已被取消。')}<button class="button" data-action="back">返回</button>`;
    if (pl.custom) {
      return `<div class="actions" style="margin-bottom:24px"><button class="button secondary small" data-action="back">← 返回</button></div>
        ${pageHead('MY PLAYLIST', esc(pl.name), `${pl.tracks.length} 首 · 自建歌单`, `<button class="button" data-pl-edit="${esc(pl.pid)}">编辑歌单</button>`)}
        <div class="actions"><button class="button secondary" type="button" data-pl-export="copy">复制歌单</button><button class="button secondary" type="button" data-pl-export="csv">下载 CSV</button><button class="button secondary" type="button" data-pl-export="txt">下载 TXT</button></div>
        <div class="hint" style="margin:12px 0 22px">歌单里的歌曲都来自你的红心。删掉红心后，对应的歌也会从这里消失。</div>
        ${pl.tracks.length ? `<div class="pl-tracks">${pl.tracks.map((t, i) => `<div class="pl-track"><span class="track-num">${String(i + 1).padStart(2, '0')}</span><div class="pl-track-meta"><div class="track-name">${esc(t.title)}</div><div class="card-sub">${esc(t.artist || '')} · ${esc(t.albumTitle || '')}</div></div><button type="button" class="icon-btn" data-pl-remove="${esc(pl.pid)}|${esc(t.albumId)}|${esc(t.id)}" aria-label="移出歌单" title="移出歌单">×</button></div>`).join('')}</div>` : empty('这个歌单还没有歌曲。<br/>点「编辑歌单」，从红心里挑几首放进来。')}`;
    }
    return `<div class="actions" style="margin-bottom:24px"><button class="button secondary small" data-action="back">← 返回</button></div>${pageHead('PLAYLIST', esc(pl.name), `${pl.tracks.length} 首红心歌曲`)}<div class="actions"><button class="button" type="button" data-pl-export="copy">复制歌单</button><button class="button secondary" type="button" data-pl-export="csv">下载 CSV</button><button class="button secondary" type="button" data-pl-export="txt">下载 TXT</button></div><div class="hint" style="margin:12px 0 22px">导出格式为「歌名 - 艺人」，每行一首。网易云和 Spotify 没有开放的网页导入接口，可以把导出的文本 / CSV 交给歌单迁移工具（如 Soundiiz、TuneMyMusic，具体支持的格式以工具为准）来创建歌单。</div><div class="pl-tracks">${pl.tracks.map((t, i) => `<div class="pl-track"><span class="track-num">${String(i + 1).padStart(2, '0')}</span><div class="pl-track-meta"><div class="track-name">${esc(t.title)}</div><div class="card-sub">${pl.showArtist ? esc(t.artist) + ' · ' : ''}${esc(t.albumTitle)}</div></div><button type="button" class="icon-btn heart-button liked" data-pl-unlike="${esc(t.albumId)}|${esc(t.id)}" aria-label="取消喜欢" title="取消喜欢">♥</button></div>`).join('')}</div>`;
  }
  const csvCell = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  function copyText(text) {
    const fallback = () => { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('歌单已复制'); } catch { toast('复制失败，请改用下载'); } ta.remove(); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => toast('歌单已复制'), fallback); else fallback();
  }
  function downloadText(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  }
  function exportPlaylist(kind) {
    const pl = currentPlaylist(route()[1]);
    if (!pl || !pl.tracks.length) { toast('歌单是空的'); return; }
    const text = pl.tracks.map(t => `${t.title} - ${(t.artist || '').trim()}`).join('\n');
    const csv = '\ufeff' + ['Track name,Artist name,Album name', ...pl.tracks.map(t => [t.title, (t.artist || '').trim(), t.albumTitle].map(csvCell).join(','))].join('\r\n');
    const name = `SIDE-C-${pl.name}-${today()}`.replace(/[\\/:*?"<>|]/g, '_');
    if (kind === 'copy') copyText(text);
    else if (kind === 'txt') { downloadText(name + '.txt', text, 'text/plain'); toast('已导出 TXT'); }
    else { downloadText(name + '.csv', csv, 'text/csv'); toast('已导出 CSV'); }
  }

  function homeView(){
    const a=albums(),v=videos(),pl=playlists(),byDate=k=>(x,y)=>(y[k]||'').localeCompare(x[k]||''),ra=[...a].sort(byDate('listenedAt')).slice(0,4),rv=[...v].sort(byDate('watchedAt')).slice(0,3);
    return `<div class="hero-brand"><div><div class="brand-mark">SIDE C.</div><div class="eyebrow">YOUR PERSONAL ARCHIVE</div></div><span class="year-chip">${new Date().getFullYear()}</span></div>
      <h1 class="hero-title">把喜欢的声音，<br/><em>留在这里。</em></h1><p class="lead">让每张专辑，都有归处。一份关于音乐、MV和生活的私人档案。</p>
      ${searchBox('album-search','输入专辑名，自动带入封面、简介和曲目……')}
      <div class="grid" style="margin-top:34px"><div class="panel metric-card"><div class="eyebrow">听过的专辑</div><div class="metric">${a.length}</div><div class="muted" style="font-size:11px">已收藏记录</div></div><div class="panel metric-card"><div class="eyebrow">看过的MV</div><div class="metric">${v.length}</div><div class="muted" style="font-size:11px">已收藏记录</div></div></div>
      <div class="grid" style="margin-top:12px"><div class="panel metric-card"><div class="eyebrow">喜欢的歌曲</div><div class="metric">${favoriteTracks().length}</div><div class="muted" style="font-size:11px">从专辑曲目自动汇总</div></div><div class="panel metric-card"><div class="eyebrow">歌单</div><div class="metric">${pl.artists.length + customPlaylists().length}</div><div class="muted" style="font-size:11px">自动汇总 + 你创建的</div></div></div>
      <div class="section-row"><div class="section-title">最近添加</div><a class="text-link" href="#music">查看全部 ↗</a></div>
      ${ra.length||rv.length?`${ra.length?`<div class="tile-grid">${ra.map(albumCard).join('')}</div>`:''}${rv.length?`<div class="section-row"><div class="section-title">最近的MV</div><a class="text-link" href="#mv">查看全部 ↗</a></div><div class="tile-grid video-grid">${rv.map(videoCard).join('')}</div>`:''}`:empty('你的音乐档案从这里开始。<br/>添加第一张喜欢的专辑吧。')}
      <div class="section-row"><div class="section-title">从这里开始</div></div><div class="actions"><button class="button" data-action="add-album">＋ 添加专辑</button><button class="button secondary" data-action="add-video">＋ 添加MV</button><a class="button secondary" href="#playlist">查看歌单</a></div>
      <footer class="site-footer">
        <div class="footer-rule"></div>
        <div class="footer-brand">SIDE C.</div>
        <p>一个收藏音乐、MV与记忆的小小空间。</p>
        <div class="footer-actions">
          <button class="sponsor-trigger support" id="openSponsor" type="button"><span aria-hidden="true">♡</span> 支持作者</button>
          <button class="sponsor-trigger" id="openSuggest" type="button"><span aria-hidden="true">✉</span> 提出建议</button>
        </div>
        <small class="footer-copyright">MADE WITH LOVE · SIDE C</small>
      </footer>`;
  }
  function musicView(){
    const all=albums(), st=viewState.music;
    const dates=all.map(a=>a.listenedAt||'');
    return `${pageHead('YOUR COLLECTION','音乐档案','收藏专辑，也标记那些格外喜欢的歌曲。','<button class="button" data-action="add-album">＋ 添加专辑</button>')}
      ${viewToolbar('music', st, dates, '搜索专辑、艺人、歌曲或日期（如 2026-03）……')}
      <section id="musicAlbums" class="${st.mode==='grid'?'tile-grid':'row-list'}">${archiveHTML('music')}</section>`;
  }
  function mvView(){
    const v=videos(), st=viewState.mv;
    const dates=v.map(x=>x.watchedAt||'');
    return `${pageHead('MOVING IMAGES','MV','收藏喜欢的 MV，按观看日期整理。','<button class="button" data-action="add-video">＋ 添加MV</button>')}
      ${viewToolbar('mv', st, dates, '搜索 MV、艺人或观看日期（如 2026-03）……')}
      <section id="videoGrid" class="${st.mode==='grid'?'tile-grid video-grid':'row-list'}">${archiveHTML('mv')}</section>`;
  }
  function timelineView(){const events=[...albums().map(x=>({...x,_type:'专辑',_date:x.listenedAt})),...videos().map(x=>({...x,_type:'MV',_date:x.watchedAt}))].filter(x=>x._date).sort((a,b)=>b._date.localeCompare(a._date));const y=String(new Date().getFullYear()),count=events.filter(e=>e._date.startsWith(y)).length;return `${pageHead('YOUR TIMELINE','时间线','按时间重新遇见听过和看过的瞬间。')}<div class="panel metric-card" style="margin-bottom:25px"><div class="eyebrow">${y} · 今年留下的记忆</div><div class="metric">${count}</div><div class="muted" style="font-size:11px">听歌与观看的时刻</div></div>${events.length?`<div class="timeline">${events.map(e=>`<div class="panel timeline-item"><div class="timeline-date">${dateText(e._date)}<br/><span class="tag">${e._type}</span></div><div><b style="font-size:13px">${esc(e.title||e.artist)}</b><div class="card-sub" style="margin-top:5px">${e._type==='MV'?'':esc(e.artist||'')}</div></div></div>`).join('')}</div>`:empty('随着收藏增加，你的时间线会慢慢丰富起来。')}`;}
  function profileView(){
    const a=albums(),v=videos(),artists={};
    a.forEach(x=>{if(x.artist)artists[x.artist]=(artists[x.artist]||0)+1});
    const rank=Object.entries(artists).sort((x,y)=>y[1]-x[1]).slice(0,5);
    const tagList=[...new Set([...a,...v].flatMap(x=>x.tags||[]))];
    const year=String(new Date().getFullYear());
    const yA=a.filter(x=>(x.listenedAt||'').startsWith(year)).length, yV=v.filter(x=>(x.watchedAt||'').startsWith(year)).length;
    return `${pageHead('YOUR SPACE','关于你的收藏。','SIDE C 是只属于你的音乐与MV档案。')}
      <div class="panel profile-block"><div class="eyebrow">SIDE C MEMBER</div><div class="brand-mark" style="margin:13px 0">Personal Archive</div><div class="muted" style="font-size:12px">珍藏每一份喜欢。</div></div>
      <div class="section-row"><div class="section-title">常出现的艺人</div></div>
      <div class="panel profile-block">${rank.length?rank.map(([name,n],i)=>`<div class="rank-row"><span>${i+1}. ${esc(name)}</span><span class="muted">${n}</span></div>`).join(''):'<div class="muted" style="font-size:12px">添加专辑和MV后，这里会出现你的常听艺人。</div>'}</div>
      <div class="section-row"><div class="section-title">标签</div></div>
      <div class="profile-block">${tagList.length?tagList.map(t=>`<span class="tag">${esc(t)}</span>`).join(' '):'<span class="muted" style="font-size:12px">你的标签会显示在这里。</span>'}</div>
      <div class="section-row"><div class="section-title">年度回顾</div><a class="text-link" href="#yearly">查看全部 ↗</a></div>
      <a class="recap-row" href="#yearly" style="text-decoration:none;margin-bottom:24px"><span class="recap-row-meta"><b>${year} 年度回顾</b><small>${yA} 张专辑 · ${yV} 条MV · ${favoriteTracks().length} 首喜欢的歌曲</small></span><span class="recap-date">点开查看 ↗</span></a>
      <div class="section-row"><div class="section-title">数据管理</div></div>
      <div class="panel profile-block"><p class="muted" style="font-size:11px;line-height:1.8">当前版本默认将数据保存在此浏览器的本地存储中。清除浏览器数据或更换设备可能导致记录丢失，请定期导出备份。</p><div class="actions"><button class="button" data-action="export">导出档案 JSON</button><label class="button secondary file-label">导入备份<input id="importFile" type="file" accept="application/json,.json" hidden></label></div></div>
      <div class="section-row"><div class="section-title">外观</div></div>
      <div class="panel"><div class="row"><span style="font-size:12px">主题模式</span><button class="button secondary small" id="profileTheme">切换浅色 / 深色</button></div></div>`;
  }

  function albumForm(existing){
    let d={};
    if (existing) {
      d = { ...existing, tracksText:(existing.tracks||[]).map(t=>t.title).join('\n'), tagsText:(existing.tags||[]).join('，') };
    } else {
      try { d = JSON.parse(sessionStorage.getItem(DRAFT)||'{}')||{}; } catch {}
      sessionStorage.removeItem(DRAFT);
    }
    const v=k=>esc(d[k]||'');
    const note=(!existing&&d.title)?`<div class="prefill-note">${cover(d.coverUrl,d.title)}<div>已从 ${esc(d.sourceName||'网络')} 自动填入封面${d.intro?'、简介':''}${d.trackTotal?`和 ${d.trackTotal} 首曲目`:''}。<br/>确认无误后，填个评分点「保存专辑」就行。</div></div>`:'';
    return `${pageHead(existing?'EDIT YOUR RECORD':'ADD TO YOUR ARCHIVE', existing?'编辑专辑记录':'添加专辑', existing?'修改这条专辑记录。曲目里已经点亮的 ♡、写过的备注和挂上的 MV 都会保留。':'搜一下专辑名，自动带入封面、简介和曲目；也可以在下面手动填写。')}
      ${existing?'':searchBox('album-search','输入专辑名，例如：叶惠美 / Random Access Memories')}
      <form id="albumForm" class="form-wrap panel">${note}<input type="hidden" name="__id" value="${esc(existing?existing.id:'')}"><input type="hidden" name="introSource" value="${v('introSource')}"><input type="hidden" name="sourceUrl" value="${v('sourceUrl')}"><input type="hidden" name="sourceName" value="${v('sourceName')}"><div class="form-grid"><div class="field-group"><label class="field-label">专辑名称 *</label><input class="field" name="title" required placeholder="输入专辑名称" value="${v('title')}"></div><div class="field-group"><label class="field-label">艺人 / 乐队 *</label><input class="field" name="artist" required placeholder="输入艺人或乐队" value="${v('artist')}"></div><div class="field-group full"><label class="field-label">封面图片链接</label><input class="field" name="coverUrl" type="url" placeholder="https://..." value="${v('coverUrl')}"></div><div class="field-group"><label class="field-label">听完日期 *</label><input class="field" name="listenedAt" type="date" value="${esc(d.listenedAt||today())}" required></div><div class="field-group"><label class="field-label">评分（1–5）</label><input class="field" name="rating" type="number" min="1" max="5" placeholder="5" value="${v('rating')}"></div><div class="field-group full"><label class="field-label">专辑简介${d.introSource?` · 来源：${v('introSource')}`:''}</label><textarea class="field" name="intro" placeholder="搜索导入时会自动填入，也可以自己写。">${v('intro')}</textarea></div><div class="field-group full"><label class="field-label">曲目列表 · 每行一首</label><textarea class="field" name="tracksText" ${d.tracksText?'style="min-height:220px"':''} placeholder="01. 第一首\n02. 第二首\n03. 第三首">${v('tracksText')}</textarea><div class="hint">搜索导入时会自动填好；也可以带序号粘贴，保存时自动整理。之后可以逐首标记喜欢、写备注、挂 MV。</div></div><div class="field-group full"><label class="field-label">标签 · 用逗号分隔</label><input class="field" name="tagsText" placeholder="独立、收藏、夜晚" value="${v('tagsText')}"></div><div class="field-group"><label class="field-label">百科链接</label><input class="field" name="wikiUrl" type="url" placeholder="https://..." value="${v('wikiUrl')}"></div><div class="field-group"><label class="field-label">网易云音乐链接</label><input class="field" name="neteaseUrl" type="url" placeholder="https://music.163.com/..." value="${v('neteaseUrl')}"></div><div class="field-group full"><label class="field-label">我的专辑笔记</label><textarea class="field" name="review" placeholder="写下这张专辑带给你的感受……">${v('review')}</textarea></div></div><div class="actions"><button class="button" type="submit">${existing?'保存修改':'保存专辑'}</button><button class="button secondary" type="button" data-action="back">取消</button></div></form>`;
  }
  function videoForm(existing){
    const v=k=>esc(existing?(existing[k]||''):'');
    return `${pageHead(existing?'EDIT YOUR RECORD':'ADD TO YOUR ARCHIVE', existing?'编辑MV记录':'添加MV', existing?'修改这条 MV 记录的信息。':'直接粘贴 B站 的 BV 号（例如 BV1xx411c7mD）就行，会自动解析并填好标题和封面。')}
      ${existing?'':searchBox('video-search','粘贴 B站 BV 号，例如 BV1xx411c7mD……')}
      <form id="videoForm" class="form-wrap panel"><input type="hidden" name="__id" value="${esc(existing?existing.id:'')}"><div class="form-grid"><div class="field-group"><label class="field-label">MV名称 *</label><input class="field" name="title" required placeholder="输入 MV 名称" value="${v('title')}"></div><div class="field-group"><label class="field-label">艺人 / UP主</label><input class="field" name="artist" placeholder="输入艺人" value="${v('artist')}"></div><input type="hidden" name="platform" value="Bilibili"><div class="field-group full"><label class="field-label">封面图片链接</label><input class="field" name="coverUrl" type="url" placeholder="https://..." value="${v('coverUrl')}"></div><div class="field-group"><label class="field-label">观看日期 *</label><input class="field" name="watchedAt" type="date" value="${esc(existing?existing.watchedAt:today())}" required></div><div class="field-group full"><label class="field-label">MV链接 *</label><input class="field" name="videoUrl" type="url" required placeholder="B站 BV 号或视频链接" value="${v('videoUrl')}"></div><div class="field-group full"><label class="field-label">标签 · 用逗号分隔</label><input class="field" name="tagsText" placeholder="视觉、收藏、舞蹈" value="${v('tagsText')}"></div><div class="field-group full"><label class="field-label">我的笔记</label><textarea class="field" name="review" placeholder="有什么画面留在了你的记忆里？">${v('review')}</textarea></div></div><div class="actions"><button class="button" type="submit">${existing?'保存修改':'保存MV'}</button><button class="button secondary" type="button" data-action="back">取消</button></div></form>`;
  }

  function detailView(id,type){
    const item=(type==='video'?videos():albums()).find(x=>x.id===id);
    if(!item)return `${pageHead('ARCHIVE','没有找到这条记录','可能已经被删除。')}<button class="button" data-action="back">返回</button>`;
    const isAlbum=type==='album';
    return `<div class="actions" style="margin-bottom:24px"><button class="button secondary small" data-action="back">← 返回</button><button class="button small" data-action="${isAlbum?'edit-album':'edit-video'}">编辑记录</button></div><div class="detail-layout${isAlbum?'':' video'}"><div class="detail-media">${isAlbum?cover(item.coverUrl,item.title):mediaBlock(item)}</div><div class="detail-info"><div class="eyebrow">${isAlbum?'ALBUM ARCHIVE':'MOVING IMAGE'}</div><h1 class="detail-title">${esc(item.title)}</h1><div class="lead">${esc(item.artist || '')}</div><div class="card-tags" style="margin:14px 0">${tags(item.tags)}</div><div class="panel" style="margin-top:20px"><div class="eyebrow">我的记忆</div><p class="card-sub" style="margin:10px 0">${isAlbum?'听完于':'观看于'} · ${dateText(isAlbum?item.listenedAt:item.watchedAt)}</p>${isAlbum&&item.rating?`<p class="card-sub">评分：${item.rating} / 5</p>`:''}<div class="divider" style="margin:15px 0"></div><div class="detail-note">${esc(item.review||'还没有写下笔记。')}</div></div>${isAlbum&&item.intro?`<div class="panel" style="margin-top:16px"><div class="eyebrow">专辑简介${item.introSource?' · '+esc(item.introSource):''}</div><div class="intro-text" style="margin-top:10px">${esc(item.intro)}</div></div>`:''}<div class="actions" style="margin-top:16px">${item.neteaseUrl?`<a class="button" href="${esc(safeUrl(item.neteaseUrl))}" target="_blank" rel="noopener">打开网易云音乐 ↗</a>`:''}${item.videoUrl?`<a class="button" href="${esc(safeUrl(item.videoUrl))}" target="_blank" rel="noopener">观看MV ↗</a>`:''}${item.sourceUrl&&safeUrl(item.sourceUrl)&&item.sourceUrl!==item.neteaseUrl?`<a class="button secondary" href="${esc(safeUrl(item.sourceUrl))}" target="_blank" rel="noopener">在 ${esc(item.sourceName||'来源')} 打开 ↗</a>`:''}${item.wikiUrl?`<a class="button secondary" href="${esc(safeUrl(item.wikiUrl))}" target="_blank" rel="noopener">百科资料 ↗</a>`:''}</div><button class="button danger small" style="margin-top:20px" data-delete-record="${esc(item.id)}" data-record-type="${type}">删除记录</button></div></div>${isAlbum?`<div class="section-row"><div class="section-title">曲目列表</div><span class="muted" style="font-size:11px">${(item.tracks||[]).length} 首</span></div>${item.tracks?.length?`<div class="track-list">${item.tracks.map((t,i)=>trackRow(item,t,i)).join('')}</div>`:empty('还没有曲目。添加专辑时可以逐行填写曲目。')}`:''}`;
  }
  function trackRow(album, t, i) {
    const mv = mvOf(t);
    const mvBtn = mv
      ? `<span class="track-mv-wrap"><button type="button" class="icon-btn track-mv-btn has-mv" data-goto-mv="${esc(mv.id)}" aria-label="打开MV" title="打开MV">${mvThumb(mv)}</button><button type="button" class="mv-remove" data-detach-mv="${esc(t.id)}" aria-label="移除MV" title="移除MV">×</button></span>`
      : `<span class="track-mv-wrap"><button type="button" class="icon-btn track-mv-btn" data-pick-mv="${esc(album.id)}|${esc(t.id)}" aria-label="添加MV" title="添加MV">▶</button></span>`;
    return `<div class="track"><span class="track-num">${String(i+1).padStart(2,'0')}</span><div><div class="track-name">${esc(t.title)}</div>${t.note?`<div class="track-note-text">${esc(t.note)}</div>`:''}</div><div class="track-actions"><button type="button" class="icon-btn" data-edit-note="${esc(t.id)}" aria-label="编辑笔记" title="编辑笔记">✎</button>${mvBtn}<button type="button" class="icon-btn heart-button ${t.favorite?'liked':''}" data-toggle-favorite="${esc(t.id)}" aria-label="${t.favorite?'取消喜欢':'喜欢'}">${t.favorite?'♥':'♡'}</button></div></div>`;
  }

  function render(){
    const [page,arg1]=route();const view=$('#view');let html='';
    if(page==='home')html=homeView();
    else if(page==='music')html=musicView();
    else if(page==='mv')html=mvView();
    else if(page==='playlist')html=playlistView(arg1);
    else if(page==='timeline')html=timelineView();
    else if(page==='yearly')html=yearlyView(arg1);
    else if(page==='profile')html=profileView();
    else if(page==='add-album')html=albumForm(null);
    else if(page==='edit-album')html=albumForm(albums().find(x=>x.id===arg1)||null);
    else if(page==='add-video')html=videoForm(null);
    else if(page==='edit-video')html=videoForm(videos().find(x=>x.id===arg1)||null);
    else if(page==='album'||page==='video')html=detailView(arg1,page);
    else html=homeView();
    view.innerHTML=html;
    $$('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===page||(page==='album'&&a.dataset.nav==='music')||(page==='video'&&a.dataset.nav==='mv')||(page==='edit-album'&&a.dataset.nav==='music')||(page==='edit-video'&&a.dataset.nav==='mv')||(page==='yearly'&&a.dataset.nav==='profile')||(page.startsWith('add-')&&a.dataset.nav==='home')));
    bindPageEvents();window.scrollTo({top:0,behavior:'instant'});
  }
  function formData(form){return Object.fromEntries(new FormData(form).entries());}
  function parseTracks(text){return (text||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).map((line,i)=>({id:uid(),title:line.replace(/^\s*(?:\d{1,3}[.、)）\-]\s*|Encore[:：]?\s*)/i,'').trim(),favorite:false,note:''})).filter(t=>t.title);}
  function bindPageEvents(){
    bindExtra();
    bindArchive('music');
    bindArchive('mv');
    $('#albumForm')?.addEventListener('submit',e=>{
      e.preventDefault();
      const raw=formData(e.currentTarget);
      const id=raw.__id||'';delete raw.__id;
      const list=albums();
      if(id){
        const idx=list.findIndex(x=>x.id===id);
        if(idx>=0){
          const prev=list[idx];
          list[idx]={...prev,title:raw.title,artist:raw.artist,coverUrl:raw.coverUrl||'',listenedAt:raw.listenedAt,rating:Number(raw.rating)||0,intro:raw.intro||'',tracks:mergeTracks(prev.tracks,parseTracks(raw.tracksText)),tags:(raw.tagsText||'').split(/[,，]/).map(x=>x.trim()).filter(Boolean),wikiUrl:raw.wikiUrl||'',neteaseUrl:raw.neteaseUrl||'',introSource:raw.introSource||prev.introSource||'',sourceUrl:raw.sourceUrl||prev.sourceUrl||'',sourceName:raw.sourceName||prev.sourceName||'',review:raw.review||'',updatedAt:new Date().toISOString()};
          write(KEYS.albums,list);toast('专辑记录已更新');go('album/'+id);return;
        }
      }
      list.unshift({...raw,id:uid(),rating:Number(raw.rating)||0,tags:(raw.tagsText||'').split(/[,，]/).map(x=>x.trim()).filter(Boolean),tracks:parseTracks(raw.tracksText),createdAt:new Date().toISOString()});
      write(KEYS.albums,list);toast('专辑已保存');go('music');
    });
    $('#videoForm')?.addEventListener('submit',e=>{
      e.preventDefault();
      const raw=formData(e.currentTarget);
      const id=raw.__id||'';delete raw.__id;
      const list=videos();
      if(id){
        const idx=list.findIndex(x=>x.id===id);
        if(idx>=0){
          const prev=list[idx];
          list[idx]={...prev,title:raw.title,artist:raw.artist||'',coverUrl:raw.coverUrl||'',watchedAt:raw.watchedAt,videoUrl:raw.videoUrl,tags:(raw.tagsText||'').split(/[,，]/).map(x=>x.trim()).filter(Boolean),review:raw.review||'',updatedAt:new Date().toISOString()};
          write(KEYS.videos,list);toast('MV记录已更新');go('video/'+id);return;
        }
      }
      list.unshift({...raw,id:uid(),tags:(raw.tagsText||'').split(/[,，]/).map(x=>x.trim()).filter(Boolean),createdAt:new Date().toISOString()});
      write(KEYS.videos,list);toast('MV已保存');go('mv');
    });
    $$('[data-toggle-favorite]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.toggleFavorite;const [,albumId]=route();const list=albums();const a=list.find(x=>x.id===albumId);if(!a)return;const t=a.tracks.find(x=>x.id===id);if(t)t.favorite=!t.favorite;write(KEYS.albums,list);render();toast(t?.favorite?'已加入喜欢的歌曲':'已取消喜欢');}));
    $$('[data-edit-note]').forEach(btn=>btn.addEventListener('click',()=>{const row=btn.closest('.track');const id=btn.dataset.editNote;const [,albumId]=route();const list=albums(),a=list.find(x=>x.id===albumId);const t=a?.tracks.find(x=>x.id===id);if(!t||row.querySelector('textarea'))return;const box=row.querySelector('.track-name').parentElement;box.querySelector('.track-note-text')?.remove();const ta=document.createElement('textarea');ta.className='track-note';ta.value=t.note||'';box.appendChild(ta);ta.focus();ta.addEventListener('blur',()=>{t.note=ta.value.trim();write(KEYS.albums,list);render();toast('已保存');});}));
    $$('[data-action]').forEach(el=>el.addEventListener('click',()=>{
      const a=el.dataset.action;
      if(a==='add-album')go('add-album');
      if(a==='add-video')go('add-video');
      if(a==='back')history.length>1?history.back():go('home');
      if(a==='export')exportData();
      if(a==='edit-album')go('edit-album/'+route()[1]);
      if(a==='edit-video')go('edit-video/'+route()[1]);
      if(a==='new-playlist')openCreatePlaylist();
      if(a==='export-year-txt')exportYearly('txt');
      if(a==='export-year-json')exportYearly('json');
      if(a==='export-year-copy')exportYearly('copy');
    }));
    $$('[data-delete-record]').forEach(el=>el.addEventListener('click',()=>{if(!confirm('确定删除这条记录吗？此操作无法撤销。'))return;const key=el.dataset.recordType==='video'?KEYS.videos:KEYS.albums;write(key,read(key).filter(x=>x.id!==el.dataset.deleteRecord));toast('记录已删除');go(el.dataset.recordType==='video'?'mv':'music');}));
    $$('[data-pick-mv]').forEach(btn=>btn.addEventListener('click',()=>{const [albumId,trackId]=btn.dataset.pickMv.split('|');openMvPicker(albumId,trackId);}));
    $$('[data-goto-mv]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();go('video/'+btn.dataset.gotoMv);}));
    $$('[data-detach-mv]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();const [,albumId]=route();setTrackMv(albumId,btn.dataset.detachMv,'');}));
    $$('[data-pl-edit]').forEach(btn=>btn.addEventListener('click',()=>openCreatePlaylist(btn.dataset.plEdit)));
    $$('[data-pl-delete]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.plDelete;const p=customPlaylists().find(x=>x.id===id);if(!p)return;if(!confirm('确定删除歌单「'+p.name+'」吗？'))return;saveCustomPlaylists(customPlaylists().filter(x=>x.id!==id));render();toast('歌单已删除');}));
    $$('[data-pl-remove]').forEach(btn=>btn.addEventListener('click',()=>{const [plId,albumId,trackId]=btn.dataset.plRemove.split('|');const list=customPlaylists();const p=list.find(x=>x.id===plId);if(!p)return;p.items=p.items.filter(it=>!(it.albumId===albumId&&it.trackId===trackId));saveCustomPlaylists(list);render();toast('已移出歌单');}));
    $$('[data-year]').forEach(btn=>btn.addEventListener('click',()=>go('yearly/'+btn.dataset.year)));
    $('#importFile')?.addEventListener('change',e=>importData(e.target.files?.[0]));
    $('#profileTheme')?.addEventListener('click',toggleTheme);
  }
  function exportData(){const data={app:'SIDE C',version:1,exportedAt:new Date().toISOString(),albums:albums(),videos:videos()};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`SIDE-C-backup-${today()}.json`;a.click();URL.revokeObjectURL(url);toast('备份文件已导出');}
  function importData(file){if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const d=JSON.parse(reader.result);if(!Array.isArray(d.albums)||!Array.isArray(d.videos))throw new Error('invalid');if(!confirm('导入将覆盖当前浏览器中的 SIDE C 数据，建议先导出备份。确定继续吗？'))return;write(KEYS.albums,d.albums);write(KEYS.videos,d.videos);toast('备份导入成功');render();}catch{toast('文件格式不正确，无法导入');}};reader.readAsText(file);}
  function toggleTheme(){const next=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=next;localStorage.setItem(KEYS.theme,next);toast(next==='light'?'已切换浅色模式':'已切换深色模式');}
  function initTheme(){const t=localStorage.getItem(KEYS.theme)||'dark';document.documentElement.dataset.theme=t;}
  function openSponsor(){
    const modal=$('#sponsorModal'); if(!modal)return;
    const copy=$('#sponsorCopy'); if(copy)copy.textContent=DEFAULT_SPONSOR_TEXT;
    modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');
  }
  function closeSponsor(){const modal=$('#sponsorModal');if(!modal)return;modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');}
  document.addEventListener('click',e=>{
    if(e.target.closest('#openSponsor')){openSponsor();return;}
    if(e.target.closest('#openSuggest')){openSuggestion();return;}
    if(e.target.closest('[data-close-sheet]')){closeSheet();return;}
    const a=e.target.closest('[data-open-album]');if(a){go('album/'+a.dataset.openAlbum);return;}
    const v=e.target.closest('[data-open-video]');if(v){go('video/'+v.dataset.openVideo);return;}
    const p=e.target.closest('[data-open-playlist]');if(p){go('playlist/'+p.dataset.openPlaylist);return;}
  });
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches&&e.target.matches('[data-open-album],[data-open-video],[data-open-playlist]'))e.target.click();});
  $$('[data-close-sponsor]').forEach(el=>el.addEventListener('click',closeSponsor));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeSponsor();closeSheet();}});
  $('#themeToggle')?.addEventListener('click',toggleTheme);$('#mobileTheme')?.addEventListener('click',toggleTheme);window.addEventListener('hashchange',render);initTheme();loadViews();initSplash();if('serviceWorker'in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});render();
})();
