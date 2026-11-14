/* Lịch & brief content fanpage Ninemila · mã dùng chung cho:
   - trang gốc  https://kigogroupvn-dot.github.io/lich-content-ninemila/
   - mục "Fanpage & Instagram" trong web Booming Ninemila (IMC)
   Dùng:  NinemilaLich.mount(phanTu, { embedded: false|true, base: 'đường dẫn tới thư mục trang gốc' })
   Dữ liệu: Google Sheet trong config.js (window.CONFIG.sheetUrl), dự phòng data.js (window.BRIEF). */
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const dd = n => String(n).padStart(2,'0');
  const safeUrl = u => /^https?:\/\//i.test(String(u||'').trim()) ? String(u).trim() : '';
  const STATUS = [['Chưa làm','s-chua'],['Đang làm','s-dang'],['Chờ duyệt','s-cho'],['Đã lên lịch','s-lich'],['Đã đăng','s-xong']];
  const GROUP_ORDER = ['KOC Reels','Sản phẩm','Hiệu quả & uy tín','Kênh chính hãng','Brand story','Ưu đãi'];
  const statusCls = s => (STATUS.find(x => x[0] === s) || [,'s-chua'])[1];

  /* ---------- Dữ liệu ---------- */
  function parseCSV(t){
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < t.length; i++){
      const c = t[i];
      if (q){ if (c === '"'){ if (t[i+1] === '"'){ f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === ','){ row.push(f); f = ''; }
      else if (c === '\n' || c === '\r'){ if (c === '\r' && t[i+1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (f !== '' || row.length){ row.push(f); rows.push(row); }
    return rows;
  }
  function parseDate(s, year){
    s = String(s||'').trim(); let m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return new Date(+m[1], m[2]-1, +m[3]);
    if ((m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/))) { let y = m[3] ? +m[3] : year; if (y < 100) y += 2000; return new Date(y, m[2]-1, +m[1]); }
    return null;
  }
  const lines = s => String(s||'').split(/\r?\n/).map(x => x.replace(/^[\s•●\-–]+/, '').trim()).filter(Boolean);
  function driveImg(u){
    u = safeUrl(u); if (!u) return '';
    const m = u.match(/\/d\/([\w-]{20,})/) || u.match(/[?&]id=([\w-]{20,})/);
    return m ? `https://lh3.googleusercontent.com/d/${m[1]}=w1600` : u;
  }
  function fromFallback(){
    const B = window.BRIEF, y = 2026;
    return { meta:{ ...B.meta, year:y, cover:'', bg:'' }, weeks:B.weeks.map(w => ({...w})),
      posts:B.posts.map(p => ({ no:p.no, date:parseDate(p.date, y), week:p.week, group:p.group, format:p.format, topic:p.topic, goal:p.goal,
        bullets:p.bullets, notes:p.notes, status:'', media:'', link:'' })) };
  }
  async function fromSheet(url){
    const id = (url.match(/\/d\/([\w-]{20,})/) || [])[1]; if (!id) throw new Error('Link Sheet không hợp lệ');
    const get = name => fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(name)}`, {cache:'no-store'})
      .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); }).then(t => parseCSV(t));
    const [P, W, C] = await Promise.all([get('Bài đăng'), get('Tuần').catch(() => null), get('Cài đặt').catch(() => null)]);
    const fb = fromFallback(), set = {};
    (C || []).slice(1).forEach(r => { if (r[0]) set[r[0].trim()] = (r[1]||'').trim(); });
    const year = +set['Năm'] || 2026;
    // Đọc cột theo tên tiêu đề (không phụ thuộc thứ tự cột)
    const norm = x => String(x||'').toLowerCase().normalize('NFC').trim();
    const H = P[0].map(norm), col = name => H.findIndex(h => h.startsWith(norm(name)));
    const C_ = { no:col('STT'), date:col('Ngày'), week:col('Tuần'), group:col('Nhóm'), format:col('Hình thức'), topic:col('Chủ đề'), goal:col('Mục tiêu'),
      brief:col('Brief'), notes:col('Lưu ý'), status:col('Tình trạng'), media:col('Link media'), link:col('Link bài') };
    if (C_.topic < 0 || C_.date < 0) throw new Error('Thiếu cột Ngày hoặc Chủ đề');
    const v = (r, k) => C_[k] < 0 ? '' : String(r[C_[k]] ?? '').trim();
    const posts = P.slice(1).filter(r => v(r,'topic') && parseDate(v(r,'date'), year)).map((r,i) => ({
      no: v(r,'no') || dd(i+1), date: parseDate(v(r,'date'), year), week: +v(r,'week') || 0, group: v(r,'group') || 'Khác',
      format: v(r,'format') || 'Ảnh đơn / Bộ ảnh', topic: v(r,'topic'), goal: v(r,'goal'), bullets: lines(v(r,'brief')),
      notes: lines(v(r,'notes')).map(x => { const k = x.indexOf(':'); return k > 0 && k < 40 ? {label:x.slice(0,k).trim(), text:x.slice(k+1).trim()} : {label:'Lưu ý', text:x}; }),
      status: v(r,'status') || 'Chưa làm', media: safeUrl(v(r,'media')), link: safeUrl(v(r,'link')) }));
    if (!posts.length) throw new Error('Tab Bài đăng trống');
    const weeks = W ? W.slice(1).filter(r => +r[0]).map(r => ({ n:+r[0], range:(r[1]||'').trim(), dir:(r[2]||'').trim() })) : fb.weeks;
    return { meta:{ title:set['Tiêu đề'] || fb.meta.title, period:set['Thời gian'] || fb.meta.period, focus:set['Trọng tâm'] || fb.meta.focus,
      year, cover:driveImg(set['Ảnh bìa']), bg:driveImg(set['Ảnh nền']) }, weeks, posts };
  }

  /* ---------- Khung trang ---------- */
  const COVER = `<header class="cover">
  <div class="wrap">
    <div class="top"><img src="{base}assets/logo-white.png" alt="Ninemila">
      <div class="actions"><button class="btn ghost-m" data-r="printBtn">In / lưu PDF</button><a class="btn solid" data-r="sheetBtn" target="_blank" rel="noopener" hidden>Mở Google Sheet ↗</a></div></div>
    <div class="hero">
      <div>
        <div class="kicker" data-r="kicker">Content fanpage</div>
        <h1 data-r="title"></h1>
        <dl class="meta">
          <dt class="label">Thời gian</dt><dd data-r="period"></dd>
          <dt class="label">Trọng tâm</dt><dd data-r="focus"></dd>
        </dl>
      </div>
      <div class="product"><img data-r="coverImg" src="{base}assets/anh-bia.jpg" alt="Ảnh bìa Ninemila"><span>Calming Beer</span></div>
    </div>
  </div>
</header>`;
  const BODY = `<div class="stats-band"><div class="wrap"><div class="stats" data-r="stats"></div><div class="sync"><span data-r="sync">Đang tải dữ liệu…</span>{links}</div></div></div>
<section class="sec">
  <div class="wrap">
    <div class="sec-head"><div><span class="label">01 · Cơ cấu</span><h2>Cơ cấu <em>nội dung</em></h2></div><p>Số bài theo nhóm và theo tuần. Ô càng đậm, nhóm đó càng dày trong tuần.</p></div>
  </div>
  <div class="mix"><div class="wrap mix-in" data-r="mix"></div></div>
</section>
<section class="sec">
  <div class="wrap">
    <div class="sec-head"><div><span class="label">02 · Lịch</span><h2>Lịch <em>đăng bài</em></h2></div><p>Bấm vào một ô để xem brief đầy đủ của bài.</p></div>
    <div class="filters" data-r="filters"></div>
    <div class="fbar" data-r="fbar"></div>
    <div class="keys" data-r="keys"></div>
    <div class="cal" data-r="cal"></div>
    <div class="list" data-r="list"></div>
  </div>
</section>`;
  const FOOT = `<footer class="footer"><div class="wrap"><img src="{base}assets/logo-white.png" alt="Ninemila"><span>Khối Marketing · Kigo Group</span></div></footer>`;
  const DRAWER = `<div class="scrim" data-r="scrim"></div>
<aside class="drawer" data-r="drawer" aria-hidden="true" role="dialog" aria-label="Brief bài đăng">
  <div class="dr-top">
    <div class="dr-nav"><span class="label" data-r="drLabel"></span>
      <button class="icon" data-r="prev" aria-label="Bài trước">‹</button><button class="icon" data-r="next" aria-label="Bài sau">›</button><button class="icon" data-r="close" aria-label="Đóng">×</button></div>
    <div data-r="drHead"></div>
  </div>
  <div class="dr-scroll" data-r="drScroll">
    <div class="work" data-r="drWork"></div>
    <div class="tools"><button class="tbtn" data-r="copyLink">Copy link bài</button><button class="tbtn" data-r="copyBrief">Copy brief</button></div>
    <div class="dr-body" data-r="drBody"></div>
  </div>
</aside>
<div class="toast" data-r="toast"></div>
<div id="print" data-r="print"></div>`;

  /* ---------- Gắn lịch vào một phần tử ---------- */
  function mount(root, opts = {}){
    const embedded = !!opts.embedded;
    const base = opts.base || '';
    const pageUrl = opts.pageUrl || (embedded ? base : location.href.split('#')[0]);
    const today = new Date(); today.setHours(0,0,0,0);
    let D = null, live = false, cur = 0, fGroup = 'Tất cả', fStatus = 'Tất cả';
    const url = safeUrl((window.CONFIG || {}).sheetUrl);

    root.classList.add('lich');
    if (embedded) root.classList.add('lich-embed');
    const links = embedded
      ? ` <span class="sync-links">${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">Mở Google Sheet ↗</a>` : ''}<a href="${esc(pageUrl)}" target="_blank" rel="noopener">Mở trang riêng ↗</a></span>` : '';
    root.innerHTML = ((embedded ? '' : COVER) + BODY.replace('{links}', links) + (embedded ? '' : FOOT) + DRAWER).split('{base}').join(base);
    if (embedded) root.style.setProperty('--nen', `url("${base}assets/nen-bia.jpg")`);
    const R = {}; root.querySelectorAll('[data-r]').forEach(el => R[el.dataset.r] = el);

    const fmtDate = d => `${dd(d.getDate())}/${dd(d.getMonth()+1)}`;
    const kind = p => /reel/i.test(p.format) ? 'reel' : p.group === 'Ưu đãi' ? 'sale' : '';
    const isLate = p => live && p.status !== 'Đã đăng' && p.date < today;
    const isToday = d => d.getTime() === today.getTime();
    const groupsOf = ps => [...GROUP_ORDER.filter(g => ps.some(p => p.group === g)), ...[...new Set(ps.map(p => p.group))].filter(g => !GROUP_ORDER.includes(g))];
    function statusHTML(p){
      if (!live) return '';
      if (isLate(p)) return `<span class="dot s-tre"></span>Trễ · ${esc(p.status)}`;
      if (p.status === 'Đã đăng') return `<span class="tick">✓</span>Đã đăng`;
      return `<span class="dot ${statusCls(p.status)}"></span>${esc(p.status)}`;
    }

    function render(){
      const P = D.posts; P.sort((a,b) => a.date - b.date); P.forEach((p,i) => p.i = i);
      const G = groupsOf(P), weeks = D.weeks.length ? D.weeks : [...new Set(P.map(p => p.week))].map(n => ({n, range:'', dir:''}));

      if (!embedded){
        const t = D.meta.title, k = t.lastIndexOf('fanpage');
        R.title.innerHTML = k > 0 ? `${esc(t.slice(0,k))}<em>${esc(t.slice(k))}</em>` : esc(t);
        R.kicker.textContent = `Content fanpage · ${P.length} bài`;
        R.period.textContent = D.meta.period; R.focus.textContent = D.meta.focus;
        if (D.meta.cover) R.coverImg.src = D.meta.cover;
      }
      if (D.meta.bg) root.style.setProperty('--nen', `url("${D.meta.bg.replace(/"/g,'')}")`);

      const done = P.filter(p => p.status === 'Đã đăng').length, late = P.filter(isLate).length;
      R.stats.innerHTML = `
        <div class="stat"><div class="v"><b>${P.length}</b><span>bài đăng</span></div></div>
        <div class="stat"><div class="v"><b>${done}<small>/${P.length}</small></b><span>đã đăng${late ? ` · <strong>${late} trễ</strong>` : ''}</span></div><div class="bar"><i style="width:${P.length ? done/P.length*100 : 0}%"></i></div></div>
        <div class="stat"><div class="v"><b>${P.filter(p => p.group === 'KOC Reels').length}</b><span>KOC Reels</span></div></div>
        <div class="stat"><div class="v"><b>${G.length}</b><span>nhóm nội dung</span></div></div>`;

      const cnt = (w,g) => P.filter(p => p.week === w && p.group === g).length;
      R.mix.innerHTML = `<table class="mtab"><thead><tr><th>Nhóm</th>${weeks.map(w => `<th>Tuần ${w.n}<span>${esc(w.range)}</span></th>`).join('')}<th>Tổng</th></tr></thead><tbody>
        ${G.map(g => `<tr><td>${esc(g)}</td>${weeks.map(w => { const n = cnt(w.n,g); return n ? `<td class="h${Math.min(n,3)}">${n}</td>` : '<td class="z">–</td>'; }).join('')}<td class="sum">${P.filter(p => p.group === g).length}</td></tr>`).join('')}
        <tr class="tot"><td>Tổng</td>${weeks.map(w => `<td>${P.filter(p => p.week === w.n).length}</td>`).join('')}<td class="sum">${P.length}</td></tr></tbody></table>
        <div class="legend"><span><i style="background:#fbe6d0"></i>1 bài</span><span><i style="background:var(--amber-light)"></i>2 bài</span><span><i style="background:var(--amber)"></i>3 bài trở lên</span></div>`;

      const chip = (type, v, label, extra='') => `<button class="chip" data-type="${type}" data-v="${esc(v)}" aria-pressed="${(type==='g'?fGroup:fStatus)===v}">${extra}${esc(label)}</button>`;
      R.filters.innerHTML = `<span class="label">Nhóm</span><div class="chips">${chip('g','Tất cả','Tất cả')}${G.map(g => chip('g', g, `${g} · ${P.filter(p => p.group === g).length}`)).join('')}</div>`
        + (live ? `<span class="label">Tình trạng</span><div class="chips">${chip('s','Tất cả','Tất cả')}${STATUS.map(([s,c]) => chip('s', s, `${s} · ${P.filter(p => p.status === s).length}`, `<span class="dot ${c}"></span>`)).join('')}${late ? chip('s','Trễ',`Trễ · ${late}`,'<span class="dot s-tre"></span>') : ''}</div>` : '');

      R.keys.innerHTML = `<span class="label" style="font-size:10px">Chú thích</span>
        <span><i class="sw reel"></i>Reel (video)</span><span><i class="sw sale"></i>Ưu đãi</span><span><i class="sw"></i>Ảnh đơn / Bộ ảnh</span>
        ${live ? '<span><i class="sw late"></i>Quá ngày đăng mà chưa đăng</span>' : ''}<span><i class="sw today"></i>Hôm nay</span>`;

      const start = new Date(P[0].date), end = P[P.length-1].date;
      const dow = ['CN','T2','T3','T4','T5','T6','T7'];
      const byKey = {}; P.forEach(p => (byKey[p.date.getTime()] ||= []).push(p));
      const rows = Math.ceil(((end - start) / 864e5 + 1) / 7);
      let c = [...Array(7)].map((_,k) => `<div class="dow">${dow[(start.getDay()+k)%7]}</div>`).join(''), list = '';
      for (let r = 0; r < rows; r++){
        const w = weeks[r] || {n:r+1, range:'', dir:''};
        c += `<div class="wdir"><b>Tuần ${w.n}<small>${esc(w.range)}</small></b><p>${esc(w.dir)}</p></div>`;
        list += `<div class="wkh"><b>Tuần ${w.n}</b><span>${esc(w.range)}</span><p>${esc(w.dir)}</p></div>`;
        for (let k = 0; k < 7; k++){
          const d = new Date(start); d.setDate(start.getDate() + r*7 + k);
          const tdy = isToday(d), tag = tdy ? '<span class="today-tag">Hôm nay</span>' : '';
          if (d > end){ c += `<div class="day out${tdy?' today':''}"></div>`; continue; }
          const ps = byKey[d.getTime()];
          if (!ps){ c += `<div class="day${d < today ? ' past' : ''}${tdy ? ' today' : ''}"><span class="n">${d.getDate()}${tag}</span></div>`; continue; }
          ps.forEach(p => {
            const cls = [kind(p), isLate(p) && 'late', tdy && 'today'].filter(Boolean).join(' ');
            c += `<button class="day ${cls}" data-i="${p.i}"><span class="n">${d.getDate()}${tag}</span>
              <span class="grp">${esc(p.group)}</span><span class="tp">${esc(p.topic)}</span><span class="fm">${esc(p.format)}</span><span class="st">${statusHTML(p)}</span></button>`;
            list += `<button class="${cls}" data-i="${p.i}"><div class="m"><b>${fmtDate(p.date)}</b> · ${esc(p.group)} · ${esc(p.format)}${tdy ? ' · Hôm nay' : ''}</div><div class="tp">${esc(p.topic)}</div>${live ? `<div class="m" style="margin-top:6px">${statusHTML(p)}</div>` : ''}</button>`;
          });
        }
      }
      R.cal.innerHTML = c; R.list.innerHTML = list;
      applyFilter(); renderPrint(weeks);
    }

    function applyFilter(){
      const on = fGroup !== 'Tất cả' || fStatus !== 'Tất cả'; let n = 0;
      root.querySelectorAll('[data-i]').forEach(x => {
        const p = D.posts[+x.dataset.i];
        const okG = fGroup === 'Tất cả' || p.group === fGroup;
        const okS = fStatus === 'Tất cả' || (fStatus === 'Trễ' ? isLate(p) : p.status === fStatus);
        const hit = on && okG && okS; if (hit && R.cal.contains(x)) n++;
        x.classList.toggle('hit', hit); x.classList.toggle('dim', on && !hit);
      });
      R.cal.classList.toggle('filtering', on); R.list.classList.toggle('filtering', on);
      const what = [fGroup !== 'Tất cả' && fGroup, fStatus !== 'Tất cả' && fStatus].filter(Boolean).join(' + ');
      R.fbar.classList.toggle('on', on);
      R.fbar.innerHTML = on ? `<span>Đang lọc: <b>${esc(what)}</b> · ${n} bài</span><button type="button" data-clear>× Bỏ lọc</button>` : '';
    }

    root.addEventListener('click', e => {
      if (e.target.closest('[data-clear]')){ fGroup = fStatus = 'Tất cả';
        R.filters.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x.dataset.v === 'Tất cả')); applyFilter(); return; }
      const b = e.target.closest('.chip');
      if (b && R.filters.contains(b)){
        if (b.dataset.type === 'g') fGroup = b.dataset.v; else fStatus = b.dataset.v;
        b.parentNode.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x === b));
        applyFilter(); return;
      }
      const d = e.target.closest('[data-i]');
      if (d && (R.cal.contains(d) || R.list.contains(d))) openPost(+d.dataset.i);
    });

    /* ---------- Ngăn brief ---------- */
    const postId = p => 'bai-' + p.no;
    function openPost(i){
      const P = D.posts; cur = (i + P.length) % P.length; const p = P[cur];
      R.drLabel.textContent = `Bài ${p.no} / ${P.length}`;
      R.drHead.innerHTML = `<div class="dr-meta"><span class="no">${esc(p.no)}</span><span class="date">${fmtDate(p.date)} · Tuần ${p.week}</span><span class="pill">${esc(p.group)}</span><span class="pill">${esc(p.format)}</span></div><h3>${esc(p.topic)}</h3>`;
      const link = (u, t) => u ? `<a class="lnk" href="${esc(u)}" target="_blank" rel="noopener">${t} ↗</a>` : '<span class="none">Chưa có</span>';
      R.drWork.innerHTML = live
        ? `<span class="k">Tình trạng</span><span class="status${isLate(p) ? ' late' : ''}">${statusHTML(p)}</span>
           <span class="k">Media</span>${link(p.media, 'Mở thư mục media')}
           <span class="k">Bài đã đăng</span>${link(p.link, 'Xem bài đã đăng')}`
        : `<span class="k">Tiến độ</span><span class="none">Chưa kết nối Google Sheet</span>`;
      R.drBody.innerHTML = `<article class="post">
        ${p.goal ? `<span class="k">Mục tiêu</span><p class="goal">${esc(p.goal)}</p>` : ''}
        ${p.bullets.length ? `<span class="k">Brief triển khai</span><ol>${p.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ol>` : ''}
        ${p.notes.map(n => `<div class="note"><b>${esc(n.label)}</b>${esc(n.text)}</div>`).join('')}</article>`;
      R.drScroll.scrollTop = 0;
      root.classList.add('open'); R.drawer.setAttribute('aria-hidden','false');
      if (!embedded) history.replaceState(null, '', '#' + postId(p));
    }
    function closeDr(){ root.classList.remove('open'); R.drawer.setAttribute('aria-hidden','true'); if (!embedded) history.replaceState(null, '', location.pathname + location.search); }
    R.close.onclick = closeDr; R.scrim.onclick = closeDr;
    R.prev.onclick = () => openPost(cur - 1); R.next.onclick = () => openPost(cur + 1);
    const onKey = e => {
      if (!root.isConnected){ document.removeEventListener('keydown', onKey); return; }
      if (!root.classList.contains('open')) return;
      if (e.key === 'Escape') closeDr(); if (e.key === 'ArrowLeft') openPost(cur - 1); if (e.key === 'ArrowRight') openPost(cur + 1);
    };
    document.addEventListener('keydown', onKey);

    function toast(t){ const el = R.toast; el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 1800); }
    async function copy(text, msg){
      try { await navigator.clipboard.writeText(text); }
      catch { const a = document.createElement('textarea'); a.value = text; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); }
      toast(msg);
    }
    function briefText(p){
      return [`Bài ${p.no} · ${fmtDate(p.date)}/${p.date.getFullYear()} · ${p.group} · ${p.format}`, `Chủ đề: ${p.topic}`, p.goal && `Mục tiêu: ${p.goal}`,
        p.bullets.length && 'Brief triển khai:\n' + p.bullets.map(b => '- ' + b).join('\n'), ...p.notes.map(n => `${n.label}: ${n.text}`),
        p.media && `Link media: ${p.media}`, p.link && `Bài đã đăng: ${p.link}`].filter(Boolean).join('\n\n');
    }
    R.copyLink.onclick = () => copy(pageUrl + '#' + postId(D.posts[cur]), 'Đã copy link bài');
    R.copyBrief.onclick = () => copy(briefText(D.posts[cur]), 'Đã copy brief');

    /* ---------- In ---------- */
    function renderPrint(weeks){
      const P = D.posts;
      R.print.innerHTML = `<h1>${esc(D.meta.title)}</h1><div class="pm">${esc(D.meta.period)} · ${P.length} bài · ${esc(D.meta.focus)}</div>` +
        weeks.map(w => `<div class="pw">Tuần ${w.n} · ${esc(w.range)}</div><div class="pwd">${esc(w.dir)}</div>` +
          P.filter(p => p.week === w.n).map(p => `<div class="pp"><div class="ph"><b>${esc(p.no)}</b> · ${fmtDate(p.date)} · ${esc(p.group)} · ${esc(p.format)}${live ? ' · ' + esc(p.status) : ''}</div>
            <h3>${esc(p.topic)}</h3>${p.goal ? `<div><b>Mục tiêu:</b> ${esc(p.goal)}</div>` : ''}<ul>${p.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
            ${p.notes.map(n => `<div class="pn"><b>${esc(n.label)}:</b> ${esc(n.text)}</div>`).join('')}
            ${p.media ? `<div class="pl">Media: ${esc(p.media)}</div>` : ''}${p.link ? `<div class="pl">Bài đã đăng: ${esc(p.link)}</div>` : ''}</div>`).join('')).join('');
    }
    if (R.printBtn) R.printBtn.onclick = () => window.print();

    /* ---------- Khởi động ---------- */
    (async () => {
      if (url && R.sheetBtn){ R.sheetBtn.href = url; R.sheetBtn.hidden = false; }
      D = fromFallback(); render();
      if (url){
        try {
          D = await fromSheet(url); live = true; if (!root.isConnected) return; render();
          const n = new Date(); R.sync.textContent = `Cập nhật từ Google Sheet lúc ${dd(n.getHours())}:${dd(n.getMinutes())}. Tải lại trang để xem dữ liệu mới nhất.`;
        } catch (e) { R.sync.textContent = 'Không tải được Google Sheet, đang hiện bản lưu sẵn (chưa có tình trạng và link).'; }
      } else R.sync.textContent = 'Chưa kết nối Google Sheet, đang hiện bản lưu sẵn.';
      if (!embedded){
        const h = location.hash.match(/^#bai-(.+)$/);
        if (h){ const p = D.posts.find(x => x.no === decodeURIComponent(h[1])); if (p) openPost(p.i); }
      }
    })();
  }

  window.NinemilaLich = { mount };
})();
