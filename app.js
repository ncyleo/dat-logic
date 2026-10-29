/* DAT 數位邏輯三欄自學 */
(function () {
  const LS_KEY = 'dat-logic-3col-progress-v1';
  const BANK = window.LOGIC_BANK || { lessons: [], chapters: [], titleZh: '數位邏輯自學' };
  const LESSONS = BANK.lessons || [];

  let currentId = 'home';
  let practiceChecked = false;
  let hintStep = 0;
  let progress = loadProgress();

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Convert prime Boolean complement (A', (AB＋CD)') to continuous top-bar HTML. Input must already be HTML-escaped (or trusted text without raw <>&). */
  function primeToObar(s) {
    s = String(s == null ? '' : s);
    let out = '';
    let i = 0;
    const n = s.length;
    while (i < n) {
      const ch = s[i];
      if (ch === '(') {
        let depth = 1;
        let j = i + 1;
        while (j < n && depth > 0) {
          if (s[j] === '(') depth++;
          else if (s[j] === ')') depth--;
          j++;
        }
        const inner = s.slice(i + 1, j - 1);
        if (j <= n && s[j - 1] === ')' && j < n && s[j] === "'") {
          let content = '<span class="obar">' + primeToObar(inner) + '</span>';
          j++; // consume first '
          while (j < n && s[j] === "'") {
            content = '<span class="obar">' + content + '</span>';
            j++;
          }
          out += content;
          i = j;
        } else {
          out += '(' + primeToObar(inner) + ')';
          i = j;
        }
      } else if (/[A-Za-z0-9]/.test(ch)) {
        let atom = ch;
        i++;
        while (i < n && s[i] === "'") {
          atom = '<span class="obar">' + atom + '</span>';
          i++;
        }
        out += atom;
      } else {
        out += ch;
        i++;
      }
    }
    return out;
  }

  /** Escape plain text then convert primes → .obar spans. */
  function boolHtml(raw) {
    return primeToObar(esc(raw));
  }

  /** Walk trusted HTML: convert primes in text nodes only; do not touch tags. */
  function boolHtmlInTrustedHtml(html) {
    return String(html == null ? '' : html).replace(/(<[^>]*>)|([^<]+)/g, function (m, tag, text) {
      if (tag) return tag;
      return primeToObar(text);
    });
  }

  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function saveProgress() {
    localStorage.setItem(LS_KEY, JSON.stringify(progress));
  }
  function markDone(id) {
    if (!progress.done) progress.done = {};
    progress.done[id] = true;
    saveProgress();
    renderNav();
    updateProgressTag();
  }
  function clearProgress() {
    if (!confirm('確定重置所有進度？')) return;
    progress = {};
    localStorage.removeItem(LS_KEY);
    renderNav();
    updateProgressTag();
    showLesson(currentId);
  }
  function isDone(id) { return !!(progress.done && progress.done[id]); }

  function liveLessons() {
    return LESSONS.filter(l => l.live && l.id !== 'home');
  }
  function progressStats() {
    const live = liveLessons();
    const done = live.filter(l => isDone(l.id)).length;
    return { done, total: live.length };
  }
  function updateProgressTag() {
    const s = progressStats();
    const el = $('progressTag');
    if (el) el.textContent = '已完成 ' + s.done + '／' + s.total;
  }
  function findLesson(id) { return LESSONS.find(l => l.id === id); }
  function lessonIndex(id) { return LESSONS.findIndex(l => l.id === id); }
  function adjacentLive(id, dir) {
    const live = LESSONS.filter(l => l.live);
    const i = live.findIndex(l => l.id === id);
    if (i < 0) return null;
    return live[i + dir] || null;
  }
  function isFirstLivePractice(id) {
    const live = liveLessons();
    return live.length && live[0].id === id;
  }

  function renderNav() {
    const box = $('navList');
    if (!box) return;
    let html = '';
    html += '<button type="button" class="nav-item' + (currentId === 'home' ? ' active' : '') + '" data-id="home">' +
      '<span class="ord">⌂</span><span class="ttl">學習地圖</span></button>';

    const byCh = {};
    LESSONS.forEach(l => {
      if (l.id === 'home') return;
      const ch = l.chapter || 0;
      if (!byCh[ch]) byCh[ch] = [];
      byCh[ch].push(l);
    });
    const chMeta = {};
    (BANK.chapters || []).forEach(c => { chMeta[c.n] = c; });

    Object.keys(byCh).map(Number).sort((a, b) => a - b).forEach(ch => {
      const meta = chMeta[ch] || { name: '第 ' + ch + ' 章' };
      const label = '第 ' + ch + ' 章 · ' + (meta.name || '');
      html += '<div class="nav-ch">' + esc(label) + (meta.soon || !meta.live ? ' · 預告' : '') + '</div>';
      byCh[ch].forEach((l, idx) => {
        const locked = !l.live;
        const active = currentId === l.id ? ' active' : '';
        const star = isDone(l.id) ? '<span class="star">★</span>' : '';
        const soon = locked ? '<span class="soon">即將推出</span>' : '';
        html += '<button type="button" class="nav-item' + active + (locked ? ' locked' : '') + '" data-id="' + esc(l.id) + '"' +
          (locked ? ' data-soon="1"' : '') + '>' +
          '<span class="ord">' + (idx + 1) + '</span>' +
          '<span class="ttl">' + boolHtml(l.nav || l.title) + ' ' + soon + '</span>' + star +
          '</button>';
      });
    });
    box.innerHTML = html;
    box.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        showLesson(id);
      });
    });
  }

  function renderSupport(lesson) {
    const box = $('supportBody');
    if (!box) return;
    if (!lesson) {
      box.innerHTML = '<p class="muted">左欄揀課題 → 中欄睇教學同做練習 → 右欄睇定義、例子同引導提示。</p>';
      return;
    }
    const s = lesson.support || {};
    let html = '';
    if (lesson.practice && lesson.practice.type === 'tt-live') {
      html += '<div class="tt-live-panel" id="ttLiveSideSync"><div class="live-lab">即時</div>' +
        '<div class="muted">填表或輸入公式後顯示 Σm／簡式／邏輯圖</div></div>';
    }
    html += '<h3>定義</h3><dl class="defs"><dt>' + boolHtml(lesson.title || '') + '</dt><dd>' +
      boolHtml(s.definition || '見中欄教學。') + '</dd></dl>';
    if (s.fig) {
      html += '<div class="fig-def"><img src="' + esc(s.fig) + '" alt="示意"></div>';
    }
    html += '<h3>範例</h3><div class="hint-card"><div class="hint-lab">例子</div>' +
      boolHtml(s.example || '跟中欄示範。') + '</div>';
    if (s.tip) {
      html += '<h3>溫習口訣</h3><div class="hint-card"><div class="hint-lab">記住</div>' +
        boolHtml(s.tip) + '</div>';
    }
    const hints = Array.isArray(s.guidedHints) ? s.guidedHints.filter(Boolean) : [];
    html += '<h3>引導提示</h3><p class="muted">提示係引導問題，唔會直接講出本題答案。撳中欄「提示」逐步解鎖。</p>';
    if (!lesson.live) {
      html += '<p class="muted">呢章已預留，今輪未開放練習。</p>';
    } else if (!hints.length) {
      html += '<div class="hint-card"><div class="hint-lab">提示</div>先睇定義同範例，再問自己：已知邊啲？要求邊個？</div>';
    } else {
      hints.forEach((text, i) => {
        const show = hintStep > i;
        html += '<div class="hint-card ' + (show ? 'open' : 'locked') + '">' +
          '<div class="hint-lab">提示 ' + (i + 1) + (show ? '' : '（未解鎖）') + '</div>' +
          (show ? '<div>' + boolHtml(text) + '</div>' : '<div class="muted">再撳「提示」解鎖</div>') +
          '</div>';
      });
    }
    if (lesson.pill) {
      html += '<p class="muted" style="margin-top:.8rem">標籤：' + esc(lesson.pill) +
        (lesson.live ? '' : ' · 即將推出') + '</p>';
    }
    box.innerHTML = html;
    if (lesson.practice && lesson.practice.type === 'tt-live' && $('ttLiveTable')) {
      ttLiveUpdatePanel();
    }
  }

  function renderHome() {
    const s = progressStats();
    const pct = s.total ? Math.round(100 * s.done / s.total) : 0;
    let html = '<div class="welcome"><h2>' + esc(BANK.titleZh || '數位邏輯自學') + '</h2>';
    html += '<p>左欄自由揀課；中欄短講＋ Try it；右欄「定義 · 範例 · 引導提示」（撳「提示」逐步解鎖）。</p>';
    html += '<div class="progress-bar"><span style="width:' + pct + '%"></span></div>';
    html += '<p class="muted">進度：' + s.done + '／' + s.total + '（' + pct + '%）</p>';
    html += '<div class="map-grid">';
    (BANK.chapters || []).forEach(c => {
      const live = !!c.live;
      const nDone = LESSONS.filter(l => l.chapter === c.n && l.live && isDone(l.id)).length;
      const nLive = LESSONS.filter(l => l.chapter === c.n && l.live).length;
      html += '<button type="button" class="map-card' + (live ? ' live' : '') + '" data-ch="' + c.n + '"' +
        (live ? '' : ' disabled') + '>' +
        '<span class="num">CHAPTER ' + c.n + '</span>' +
        '<span class="name">' + esc(c.name) + '</span>' +
        '<span class="state">' + (live ? ('可學 · ' + nDone + '/' + nLive) : '即將推出') + '</span></button>';
    });
    html += '</div></div>';
    return html;
  }


  /* ===== tt-live: truth table / K-map ↔ Boolean formula ===== */
  const TT_LIVE_VARS = ['A', 'B', 'C', 'D'];
  let ttLive = { n: 3, lastSrc: null, debounce: null, formulaTouched: false };

  function ttLiveVarNames(n) { return TT_LIVE_VARS.slice(0, n); }

  function ttLiveKmapLayout(n) {
    if (n === 2) {
      return {
        rows: 2, cols: 2,
        rowLabels: ['A＝0', 'A＝1'],
        colLabels: ['B＝0', 'B＝1'],
        cellMinterms: [0, 1, 2, 3]
      };
    }
    if (n === 3) {
      return {
        rows: 2, cols: 4,
        rowLabels: ['A＝0', 'A＝1'],
        colLabels: ['BC＝00', '01', '11', '10'],
        cellMinterms: [0, 1, 3, 2, 4, 5, 7, 6]
      };
    }
    const gray = [0, 1, 3, 2];
    const cellMinterms = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      cellMinterms.push((gray[r] << 2) | gray[c]);
    }
    return {
      rows: 4, cols: 4,
      rowLabels: ['AB＝00', '01', '11', '10'],
      colLabels: ['CD＝00', '01', '11', '10'],
      cellMinterms: cellMinterms
    };
  }

  function ttLiveMintermExpr(idx, n) {
    const names = ttLiveVarNames(n);
    const parts = [];
    for (let i = 0; i < n; i++) {
      const bit = (idx >> (n - 1 - i)) & 1;
      parts.push(bit ? names[i] : (names[i] + "'"));
    }
    return parts.join('·');
  }

  function ttLiveReadValues() {
    const bits = document.querySelectorAll('#ttLiveTable button.bit');
    const vals = [];
    let missing = 0;
    bits.forEach(btn => {
      const v = btn.getAttribute('data-val');
      if (v === '' || v == null) { vals.push(null); missing++; }
      else vals.push(+v);
    });
    return { vals: vals, missing: missing };
  }

  function ttLiveSetValues(vals, n) {
    const N = 1 << n;
    document.querySelectorAll('#ttLiveTable button.bit').forEach(btn => {
      const ri = +btn.getAttribute('data-row');
      const v = (ri < N && vals[ri] != null) ? vals[ri] : 0;
      const s = String(v);
      btn.setAttribute('data-val', s);
      btn.textContent = s;
      btn.classList.toggle('on', v === 1);
      btn.classList.toggle('off', v === 0);
    });
    const layout = ttLiveKmapLayout(n);
    document.querySelectorAll('#ttLiveKmap button.kbit').forEach(btn => {
      const di = +btn.getAttribute('data-idx');
      const m = layout.cellMinterms[di];
      const v = (m < N && vals[m] != null) ? vals[m] : 0;
      const s = String(v);
      btn.setAttribute('data-val', s);
      btn.textContent = s;
      btn.classList.toggle('on', v === 1);
      btn.classList.toggle('off', v === 0);
    });
  }

  function ttLiveSyncKmapFromTable(n) {
    const { vals } = ttLiveReadValues();
    const layout = ttLiveKmapLayout(n);
    document.querySelectorAll('#ttLiveKmap button.kbit').forEach(btn => {
      const di = +btn.getAttribute('data-idx');
      const m = layout.cellMinterms[di];
      const raw = vals[m];
      const s = (raw === null || raw === undefined) ? '' : String(raw);
      btn.setAttribute('data-val', s);
      btn.textContent = s === '' ? '?' : s;
      btn.classList.toggle('on', s === '1');
      btn.classList.toggle('off', s === '0');
    });
  }

  function ttLiveSyncTableFromKmap(n) {
    const layout = ttLiveKmapLayout(n);
    const byM = {};
    document.querySelectorAll('#ttLiveKmap button.kbit').forEach(btn => {
      const di = +btn.getAttribute('data-idx');
      const m = layout.cellMinterms[di];
      byM[m] = btn.getAttribute('data-val');
    });
    document.querySelectorAll('#ttLiveTable button.bit').forEach(btn => {
      const ri = +btn.getAttribute('data-row');
      const s = byM[ri] == null ? '' : byM[ri];
      btn.setAttribute('data-val', s);
      btn.textContent = s === '' ? '?' : s;
      btn.classList.toggle('on', s === '1');
      btn.classList.toggle('off', s === '0');
    });
  }

  /** Quine–McCluskey (exact, n≤4). ones: array of minterm indices. */
  function ttLiveSimplify(ones, n) {
    const names = ttLiveVarNames(n);
    const total = 1 << n;
    if (!ones.length) return '0';
    if (ones.length === total) return '1';
    const uniq = Array.from(new Set(ones)).sort((a, b) => a - b);

    function bitCount(x) {
      let c = 0;
      while (x) { c += x & 1; x >>= 1; }
      return c;
    }
    function combine(a, b) {
      const diff = a.mask ^ b.mask;
      if (a.dash !== b.dash) return null;
      if (bitCount(diff) !== 1) return null;
      if ((diff & a.dash) !== 0) return null;
      return { mask: a.mask & b.mask, dash: a.dash | diff, terms: a.terms.concat(b.terms.filter(t => a.terms.indexOf(t) < 0)).sort((x, y) => x - y) };
    }
    function keyOf(p) { return p.mask + '/' + p.dash; }
    function toExpr(p) {
      const parts = [];
      for (let i = 0; i < n; i++) {
        const bit = 1 << (n - 1 - i);
        if (p.dash & bit) continue;
        parts.push((p.mask & bit) ? names[i] : (names[i] + "'"));
      }
      return parts.length ? parts.join('·') : '1';
    }

    let current = uniq.map(t => ({ mask: t, dash: 0, terms: [t] }));
    const allPrime = [];
    while (current.length) {
      const used = {};
      const nextMap = {};
      for (let i = 0; i < current.length; i++) {
        for (let j = i + 1; j < current.length; j++) {
          const c = combine(current[i], current[j]);
          if (!c) continue;
          used[i] = true; used[j] = true;
          const k = keyOf(c);
          if (!nextMap[k]) nextMap[k] = c;
        }
      }
      for (let i = 0; i < current.length; i++) {
        if (!used[i]) allPrime.push(current[i]);
      }
      current = Object.keys(nextMap).map(k => nextMap[k]);
    }

    // unique primes
    const primeMap = {};
    allPrime.forEach(p => { primeMap[keyOf(p)] = p; });
    const primes = Object.keys(primeMap).map(k => primeMap[k]);

    // Petrick / greedy essential covering
    const chart = {};
    uniq.forEach(m => { chart[m] = []; });
    primes.forEach((p, pi) => {
      p.terms.forEach(t => {
        if (chart[t]) chart[t].push(pi);
      });
    });

    const selected = {};
    const remaining = {};
    uniq.forEach(m => { remaining[m] = true; });

    function coverWith(pi) {
      selected[pi] = true;
      primes[pi].terms.forEach(t => { delete remaining[t]; });
    }

    let changed = true;
    while (changed) {
      changed = false;
      Object.keys(remaining).forEach(m => {
        const list = (chart[m] || []).filter(pi => {
          return primes[pi].terms.some(t => remaining[t]);
        });
        // essentials: only one prime covers m among primes that still cover something in remaining
        const coverers = (chart[m] || []).filter(pi => primes[pi].terms.indexOf(+m) >= 0 && !selected[pi]);
        if (coverers.length === 1 && remaining[m]) {
          coverWith(coverers[0]);
          changed = true;
        }
      });
    }

    // greedy for rest
    while (Object.keys(remaining).length) {
      let best = -1, bestCover = -1;
      primes.forEach((p, pi) => {
        if (selected[pi]) return;
        let c = 0;
        p.terms.forEach(t => { if (remaining[t]) c++; });
        if (c > bestCover) { bestCover = c; best = pi; }
      });
      if (best < 0 || bestCover <= 0) break;
      coverWith(best);
    }

    const exprs = Object.keys(selected).map(pi => toExpr(primes[+pi]));
    exprs.sort();
    return exprs.join('＋');
  }

  function ttLiveNormalizeExpr(raw) {
    let s = String(raw == null ? '' : raw).trim();
    if (!s) return '';
    s = s.replace(/＋/g, '+').replace(/·/g, '*').replace(/[⋅•]/g, '*')
      .replace(/[′’']/g, "'").replace(/～/g, '~').replace(/∨/g, '+').replace(/∧/g, '*')
      .replace(/⊕/g, '^').replace(/‾/g, '~');
    s = s.replace(/\bNOT\b/gi, '~').replace(/\bAND\b/gi, '*').replace(/\bOR\b/gi, '+').replace(/\bXOR\b/gi, '^');
    s = s.replace(/\s+/g, '');
    s = s.replace(/[a-d]/g, ch => ch.toUpperCase());
    let out = '';
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      const prev = out.length ? out[out.length - 1] : '';
      if (prev && /[A-D01)']/.test(prev) && /[A-D01(~]/.test(c)) out += '*';
      out += c;
    }
    return out;
  }

  function ttLiveParse(raw, n) {
    const names = ttLiveVarNames(n);
    const allowed = {};
    names.forEach(v => { allowed[v] = true; });
    const s = ttLiveNormalizeExpr(raw);
    if (!s) return { ok: false, error: '請輸入布林公式。' };
    let i = 0;
    function peek() { return s[i] || ''; }
    function get() { return s[i++] || ''; }
    function err(msg) { const e = new Error(msg); e.parse = true; throw e; }

    function parseExpr() { return parseXor(); }
    function parseXor() {
      let left = parseOr();
      while (peek() === '^') {
        get();
        const right = parseOr();
        const L = left, R = right;
        left = env => L(env) ^ R(env);
      }
      return left;
    }
    function parseOr() {
      let left = parseAnd();
      while (peek() === '+') {
        get();
        const right = parseAnd();
        const L = left, R = right;
        left = env => (L(env) | R(env)) & 1;
      }
      return left;
    }
    function parseAnd() {
      let left = parseUnary();
      while (peek() === '*') {
        get();
        const right = parseUnary();
        const L = left, R = right;
        left = env => (L(env) & R(env)) & 1;
      }
      return left;
    }
    function parseUnary() {
      if (peek() === '~') {
        get();
        const u = parseUnary();
        return env => (u(env) ^ 1) & 1;
      }
      return parsePrimary();
    }
    function parsePrimary() {
      const c = peek();
      if (c === '(') {
        get();
        const e = parseExpr();
        if (get() !== ')') err('括號唔對稱，檢查 ( )。');
        return finishPostfix(e);
      }
      if (c === '0' || c === '1') {
        get();
        const v = +c;
        return finishPostfix(() => v);
      }
      if (/[A-D]/.test(c)) {
        const name = get();
        if (!allowed[name]) err('呢課用緊 ' + names.join('、') + '，唔好用 ' + name + '。');
        return finishPostfix(env => env[name] & 1);
      }
      if (!c) err('公式未寫完。');
      err('唔認得「' + c + '」。可用 A–D、·、＋、\'、NOT、~、括號。');
    }
    function finishPostfix(node) {
      while (peek() === "'") {
        get();
        const inner = node;
        node = env => (inner(env) ^ 1) & 1;
      }
      return node;
    }

    try {
      const fn = parseExpr();
      if (i < s.length) err('多餘字元「' + s.slice(i) + '」。');
      return { ok: true, eval: fn, normalized: s };
    } catch (e) {
      return { ok: false, error: e.message || '無法解析公式。' };
    }
  }

  function ttLiveEvalAll(fn, n) {
    const names = ttLiveVarNames(n);
    const N = 1 << n;
    const vals = [];
    for (let m = 0; m < N; m++) {
      const env = {};
      for (let i = 0; i < n; i++) env[names[i]] = (m >> (n - 1 - i)) & 1;
      vals.push(fn(env) & 1);
    }
    return vals;
  }

  function ttLiveDerive(vals, n) {
    const ones = [];
    let missing = 0;
    vals.forEach((v, i) => {
      if (v === null || v === undefined) missing++;
      else if (v === 1) ones.push(i);
    });
    const N = 1 << n;
    const filled = vals.map(v => (v === null || v === undefined) ? null : v);
    const allFilled = missing === 0;
    let sigma = '';
    let sop = '';
    let simplified = '';
    if (ones.length === 0 && allFilled) {
      sigma = 'Σm( )';
      sop = '0';
      simplified = '0';
    } else if (allFilled && ones.length === N) {
      sigma = 'Σm(' + ones.join(', ') + ')';
      sop = '1';
      simplified = '1';
    } else {
      sigma = ones.length ? ('Σm(' + ones.join(', ') + ')') : 'Σm( )';
      sop = ones.length ? ones.map(i => ttLiveMintermExpr(i, n)).join('＋') : '0';
      simplified = ones.length ? ttLiveSimplify(ones, n) : '0';
    }
    return { ones: ones, sigma: sigma, sop: sop, simplified: simplified, missing: missing, allFilled: allFilled };
  }

  /**
   * Logic diagram is NOT+AND+OR from the simplified SOP (else standard SOP).
   * XOR/⊕ is not drawn as an XOR gate: the live lab already evaluates it onto
   * the truth table, and Quine–McCluskey rewrites it as SOP (A⊕B → A'·B＋A·B').
   */
  function ttLiveParseGateExpr(expr) {
    let s = String(expr == null ? '' : expr).replace(/\s+/g, '');
    if (!s) return { ok: false };
    s = s.replace(/[′’']/g, "'").replace(/[⋅•]/g, '·');
    if (s === '0' || s === '1') return { ok: true, kind: 'const', value: s };
    const chunks = s.split(/＋|\+/);
    const terms = [];
    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci];
      if (!chunk) return { ok: false };
      if (chunk === '1') return { ok: true, kind: 'const', value: '1' };
      if (chunk === '0') continue;
      const bits = chunk.split(/·|\*/);
      const lits = [];
      for (let bi = 0; bi < bits.length; bi++) {
        const m = /^([A-D])('*)$/.exec(bits[bi]);
        if (!m) return { ok: false };
        lits.push({ v: m[1], inv: (m[2].length % 2) === 1 });
      }
      if (!lits.length) return { ok: false };
      terms.push(lits);
    }
    if (!terms.length) return { ok: true, kind: 'const', value: '0' };
    return { ok: true, kind: 'sop', terms: terms };
  }

  function ttLiveCircuitBlurb(model) {
    if (model.kind === 'const') {
      return model.value === '1'
        ? '常數 1：輸出一直係高，唔接輸入。'
        : '常數 0：輸出一直係低，唔接輸入。';
    }
    const terms = model.terms;
    const anyInv = terms.some(t => t.some(l => l.inv));
    const anyAnd = terms.some(t => t.length >= 2);
    const multi = terms.length >= 2;
    if (!multi && !anyAnd && !anyInv) return '單一變數：F 直接由輸入連去輸出，唔使閘。';
    if (!multi && !anyAnd && anyInv) return '一個 NOT（反相器）。';
    if (!multi && anyAnd) return '一個乘積項：AND' + (anyInv ? '，補數輸入先經 NOT。' : '。');
    if (multi && !anyAnd) return '多個輸入相或：OR' + (anyInv ? '，補數先經 NOT。' : '。');
    return '積之和：每個乘積項一個 AND，輸出再入 OR' + (anyInv ? '；補數輸入用 NOT。' : '。');
  }

  function ttLiveCircuitSvg(model) {
    const px = n => String(Math.round(n * 10) / 10);
    const INK = '#111827';
    const parts = [];
    function wirePath(d) {
      parts.push('<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>');
    }
    function hWire(x1, x2, y, hopXs) {
      if (x2 < x1) return;
      const r = 4.5;
      const hops = (hopXs || []).filter(hx => hx > x1 + r + 0.5 && hx < x2 - r - 0.5).sort((a, b) => a - b);
      hops.forEach(hx => {
        parts.push('<path d="M ' + px(hx - r) + ' ' + px(y) + ' A ' + r + ' ' + r + ' 0 0 0 ' +
          px(hx + r) + ' ' + px(y) + ' Z" fill="#fff" stroke="none"/>');
      });
      let d = 'M ' + px(x1) + ' ' + px(y);
      hops.forEach(hx => {
        d += ' L ' + px(hx - r) + ' ' + px(y);
        d += ' A ' + r + ' ' + r + ' 0 0 0 ' + px(hx + r) + ' ' + px(y);
      });
      d += ' L ' + px(x2) + ' ' + px(y);
      wirePath(d);
    }
    function label(text, x, y, anchor) {
      parts.push('<text x="' + px(x) + '" y="' + px(y) + '" text-anchor="' + anchor +
        '" dominant-baseline="central" font-family="\'Noto Sans TC\',\'Microsoft JhengHei\',system-ui,sans-serif" font-size="15" font-weight="700" fill="' + INK + '">' +
        text + '</text>');
    }
    function svgWrap(w, h, body, aria) {
      return '<svg class="ckt" xmlns="http://www.w3.org/2000/svg" width="' + px(w) + '" height="' + px(h) +
        '" viewBox="0 0 ' + px(w) + ' ' + px(h) + '" role="img" aria-label="邏輯圖 ' + esc(aria) + '" focusable="false">' +
        '<title>邏輯圖 ' + esc(aria) + '</title>' +
        '<rect width="100%" height="100%" fill="#fff"/>' + body + '</svg>';
    }

    if (model.kind === 'const') {
      const w = 196;
      const h = 72;
      const body =
        '<rect x="28" y="20" width="42" height="32" rx="6" fill="#fff" stroke="' + INK + '" stroke-width="1.8"/>' +
        '<text x="49" y="36" text-anchor="middle" dominant-baseline="central" font-family="ui-monospace,Consolas,monospace" font-size="18" font-weight="700" fill="' + INK + '">' + model.value + '</text>' +
        '<path d="M 70 36 H 150" fill="none" stroke="' + INK + '" stroke-width="1.7" stroke-linecap="round"/>' +
        '<text x="158" y="36" text-anchor="start" dominant-baseline="central" font-family="\'Noto Sans TC\',system-ui,sans-serif" font-size="16" font-weight="700" fill="' + INK + '">F</text>';
      return svgWrap(w, h, body, 'F=' + model.value);
    }

    const terms = model.terms;
    const varOrder = ['A', 'B', 'C', 'D'];
    const used = [];
    terms.forEach(t => t.forEach(l => { if (used.indexOf(l.v) < 0) used.push(l.v); }));
    used.sort((a, b) => varOrder.indexOf(a) - varOrder.indexOf(b));

    const anyInv = terms.some(t => t.some(l => l.inv));
    const anyAnd = terms.some(t => t.length >= 2);
    const multi = terms.length >= 2;

    const PITCH = 30;
    const PAD = 13;
    const GAP = 18;
    const BAND1 = 34;
    const railDx = 36;
    const taps = {};
    used.forEach(v => { taps[v] = []; });

    const needHeaders = used.some(v => {
      let c = 0;
      terms.forEach(t => t.forEach(l => { if (l.v === v) c++; }));
      return c >= 2;
    });
    let y = needHeaders ? 42 : 16;
    const bands = terms.map(term => {
      const k = term.length;
      const h = k >= 2 ? (PAD * 2 + (k - 1) * PITCH) : BAND1;
      const top = y;
      const inputs = [];
      if (k <= 1) inputs.push(top + h / 2);
      else for (let i = 0; i < k; i++) inputs.push(top + PAD + i * PITCH);
      const mid = (inputs[0] + inputs[inputs.length - 1]) / 2;
      y += h + GAP;
      return { term: term, top: top, h: h, inputs: inputs, mid: mid };
    });
    bands.forEach(b => {
      b.term.forEach((lit, li) => {
        taps[lit.v].push({ y: b.inputs[li], inv: lit.inv, band: b, li: li });
      });
    });

    const hasShared = used.some(v => taps[v].length >= 2);
    const hasSingle = used.some(v => taps[v].length < 2);
    const rail0 = hasShared && hasSingle ? 78 : 52;
    const pinX = hasShared ? 46 : 52;
    const railX = {};
    let railN = 0;
    used.forEach(v => {
      if (taps[v].length >= 2) {
        railX[v] = rail0 + railN * railDx;
        railN++;
      }
    });
    function srcX(v) { return taps[v].length >= 2 ? railX[v] : pinX; }
    const lastX = used.length ? Math.max.apply(null, used.map(srcX)) : 24;
    const hopRails = used.filter(v => taps[v].length >= 2).map(v => railX[v]);

    const NOT_TRI_W = 18;
    const NOT_TRI_H = 18;
    const NOT_R = 4.4;
    function notOutDelta() { return NOT_TRI_W + NOT_R * 2 - 0.35; }

    let cursor = lastX + 28;
    let xNotIn = null;
    let xNotOut = null;
    if (anyInv) {
      xNotIn = cursor;
      xNotOut = xNotIn + notOutDelta();
      cursor = xNotOut + 18;
    }
    let xAndIn = null;
    if (anyAnd) {
      xAndIn = cursor;
    }

    function andGeom(x, top, h) {
      const depth = Math.min(26, h / 2);
      const flat = 16;
      const right = x + flat;
      const out = right + depth;
      const d = 'M ' + px(x) + ' ' + px(top) + ' H ' + px(right) +
        ' A ' + px(depth) + ' ' + px(h / 2) + ' 0 0 1 ' + px(right) + ' ' + px(top + h) +
        ' H ' + px(x) + ' Z';
      return { d: d, out: out };
    }

    const andOut = {};
    let maxAndOut = xAndIn || cursor;
    if (anyAnd) {
      bands.forEach((b, bi) => {
        if (b.term.length >= 2) {
          const g = andGeom(xAndIn, b.top, b.h);
          andOut[bi] = g;
          if (g.out > maxAndOut) maxAndOut = g.out;
        }
      });
    }

    const gateRight = anyAnd ? maxAndOut : (anyInv ? xNotOut : lastX);
    const OR_BACK = 0.36;
    const OR_BOW = 0.66;
    let or = null;
    if (multi) {
      const top = bands[0].mid - 15;
      const bot = bands[bands.length - 1].mid + 15;
      const h = Math.max(40, bot - top);
      const w = Math.max(50, Math.min(64, h * 0.58));
      or = { x: gateRight + 26, y: top, w: w, h: h };
    }

    function orHitX(wireY) {
      const t = Math.min(1, Math.max(0, (wireY - or.y) / or.h));
      const back = or.w * OR_BACK;
      const bow = or.w * OR_BOW;
      const lx = (1 - t) * (1 - t) * back + 2 * (1 - t) * t * bow + t * t * back;
      return or.x + lx;
    }

    const wAfterNot = [];
    const wAfterAnd = [];
    const wAfterOr = [];
    function stub(bucket, x1, x2, y) {
      if (x2 < x1) return;
      bucket.push('<path d="M ' + px(x1) + ' ' + px(y) + ' H ' + px(x2) + '" fill="none" stroke="' + INK + '" stroke-width="1.7" stroke-linecap="butt"/>');
    }

    // Rails
    if (needHeaders) {
      used.forEach(v => {
        if (taps[v].length < 2) return;
        const ys = taps[v].map(t => t.y);
        const y2 = Math.max.apply(null, ys);
        wirePath('M ' + px(railX[v]) + ' 28 L ' + px(railX[v]) + ' ' + px(y2));
      });
    }

    bands.forEach((b, bi) => {
      const isAnd = b.term.length >= 2;
      b.term.forEach((lit, li) => {
        const wy = b.inputs[li];
        const x0 = srcX(lit.v);
        let xEnd;
        if (lit.inv) xEnd = xNotIn;
        else if (isAnd) xEnd = xAndIn;
        else if (multi) xEnd = orHitX(b.mid) + 1.2;
        else xEnd = gateRight + 36;
        hWire(x0, xEnd, wy, hopRails.filter(hx => hx !== x0));
        if (lit.inv) {
          const nx = xNotOut;
          if (isAnd) stub(wAfterNot, nx, xAndIn, wy);
          else if (multi) stub(wAfterAnd, nx, orHitX(b.mid) + 1.2, wy);
          else stub(wAfterNot, nx, xNotOut + 28, wy);
        }
      });
      if (isAnd) {
        const g = andOut[bi];
        if (multi) stub(wAfterAnd, g.out, orHitX(b.mid) + 1.2, b.mid);
        else stub(wAfterAnd, g.out, g.out + 28, b.mid);
      }
    });

    const notGates = [];
    const andGates = [];
    const orGates = [];
    bands.forEach((b, bi) => {
      b.term.forEach((lit, li) => {
        if (!lit.inv) return;
        const cy = b.inputs[li];
        const top = cy - NOT_TRI_H / 2;
        const tip = xNotIn + NOT_TRI_W;
        const bcx = tip + NOT_R - 0.35;
        notGates.push('<path d="M ' + px(xNotIn) + ' ' + px(top) + ' L ' + px(tip) + ' ' + px(cy) + ' L ' + px(xNotIn) + ' ' + px(top + NOT_TRI_H) + ' Z" fill="#fff" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="miter"/>');
        notGates.push('<circle cx="' + px(bcx) + '" cy="' + px(cy) + '" r="' + NOT_R + '" fill="#fff" stroke="' + INK + '" stroke-width="1.8"/>');
      });
      if (b.term.length >= 2) {
        andGates.push('<path d="' + andOut[bi].d + '" fill="#fff" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="miter"/>');
      }
    });
    if (or) {
      const x = or.x, y0 = or.y, w = or.w, h = or.h;
      const ym = y0 + h / 2;
      const xb = x + w * OR_BACK;
      const bow = x + w * OR_BOW;
      const sh = x + w * 0.72;
      const tip = x + w;
      const d = 'M ' + px(xb) + ' ' + px(y0) +
        ' Q ' + px(bow) + ' ' + px(ym) + ' ' + px(xb) + ' ' + px(y0 + h) +
        ' Q ' + px(sh) + ' ' + px(y0 + h) + ' ' + px(tip) + ' ' + px(ym) +
        ' Q ' + px(sh) + ' ' + px(y0) + ' ' + px(xb) + ' ' + px(y0) + ' Z';
      orGates.push('<path d="' + d + '" fill="#fff" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>');
      stub(wAfterOr, tip, tip + 26, ym);
    }
    parts.push(notGates.join(''));
    parts.push(wAfterNot.join(''));
    parts.push(andGates.join(''));
    parts.push(wAfterAnd.join(''));
    parts.push(orGates.join(''));
    parts.push(wAfterOr.join(''));

    // Junction dots on shared nets only (drawn above wires)
    used.forEach(v => {
      if (taps[v].length < 2) return;
      taps[v].forEach(t => {
        parts.push('<circle cx="' + px(railX[v]) + '" cy="' + px(t.y) + '" r="3.15" fill="' + INK + '"/>');
      });
    });

    used.forEach(v => {
      if (taps[v].length >= 2) {
        label(v, railX[v], 14, 'middle');
      } else {
        label(v, pinX - 8, taps[v][0].y, 'end');
      }
    });

    let fX, fY;
    if (or) {
      fX = or.x + or.w + 26 + 6;
      fY = or.y + or.h / 2;
    } else if (anyAnd) {
      const g = andOut[0];
      fX = g.out + 28 + 6;
      fY = bands[0].mid;
    } else if (anyInv) {
      fX = xNotOut + 28 + 6;
      fY = bands[0].mid;
    } else {
      fX = lastX + 36 + 6;
      fY = bands[0].mid;
    }
    label('F', fX, fY, 'start');

    const yBottom = Math.max(y - GAP, or ? or.y + or.h : 0, fY) + 16;
    const xRight = fX + 18;
    const desc = terms.map(t => t.map(l => l.v + (l.inv ? "'" : '')).join('*')).join('+');
    return svgWrap(Math.max(160, xRight), Math.max(64, yBottom), parts.join(''), 'F=' + desc);
  }

  function ttLivePickCircuit(der) {
    const simp = String(der.simplified || '').trim();
    const sop = String(der.sop || '').trim();
    if (simp) {
      const m = ttLiveParseGateExpr(simp);
      if (m.ok) return { model: m, expr: simp, src: '簡式' };
    }
    if (sop) {
      const m = ttLiveParseGateExpr(sop);
      if (m.ok) return { model: m, expr: sop, src: '標準 SOP' };
    }
    return null;
  }

  function ttLiveCircuitHtml(der) {
    const chosen = ttLivePickCircuit(der);
    if (!chosen) {
      return '<h4>邏輯圖</h4><div class="ckt-cap">暫時畫唔到呢條式。邏輯圖支援常數 0／1、單項、乘積同積之和（SOP）。</div>';
    }
    const missing = der.missing
      ? '<div class="ckt-cap">仲有未填格（?）。邏輯圖跟而家嘅' + chosen.src + '，只計已填嘅 1。</div>'
      : '';
    return '<h4>邏輯圖</h4>' +
      '<div class="ckt-cap">跟' + chosen.src + '畫，只用 NOT、AND、OR（⊕／XOR 會先化成 SOP，唔畫異或閘）。' +
      ttLiveCircuitBlurb(chosen.model) + '</div>' +
      '<div class="ckt-scroll" data-expr="' + esc(chosen.expr) + '">' + ttLiveCircuitSvg(chosen.model) + '</div>' +
      '<div class="live-val">F＝' + boolHtml(chosen.expr) + '</div>' +
      missing;
  }

  function ttLiveRenderPanel(der, opts) {
    opts = opts || {};
    const note = der.missing
      ? ('尚有 ' + der.missing + ' 格未填（?）；Σm／SOP 只計已填嘅 1。')
      : '全部格已填。';
    let err = opts.error ? ('<div class="live-err">' + esc(opts.error) + '</div>') : '';
    return '' +
      '<h4>即時公式</h4>' +
      '<div class="live-row"><div class="live-lab">Σm（F＝1）</div><div class="live-val">' + boolHtml(der.sigma) + '</div></div>' +
      '<div class="live-row"><div class="live-lab">標準 SOP</div><div class="live-val">' + boolHtml('F＝' + der.sop) + '</div></div>' +
      '<div class="live-row"><div class="live-lab">簡式（≤4 變數）</div><div class="live-val">' + boolHtml('F＝' + der.simplified) + '</div></div>' +
      '<div class="live-note">' + esc(note) + '</div>' + err;
  }

  function ttLiveUpdatePanel(opts) {
    const box = $('ttLivePanel');
    if (!box) return;
    const n = ttLive.n;
    const { vals, missing } = ttLiveReadValues();
    const der = ttLiveDerive(vals, n);
    box.innerHTML = ttLiveRenderPanel(der, opts);
    // side support live strip
    const side = $('ttLiveSideSync');
    if (side) {
      side.innerHTML = '<div class="live-lab">即時</div><div class="live-val">' +
        boolHtml(der.sigma) + '</div><div class="live-val">' + boolHtml('F＝' + der.simplified) + '</div>' +
        '<div class="live-note">邏輯圖跟簡式（NOT＋AND＋OR）</div>';
    }
    const circ = $('ttLiveCircuit');
    if (circ) circ.innerHTML = ttLiveCircuitHtml(der);
    return der;
  }

  function ttLiveBuildTruthHtml(n) {
    const names = ttLiveVarNames(n);
    const N = 1 << n;
    let body = '<table class="tt-fill" id="ttLiveTable"><thead><tr>';
    names.forEach(h => { body += '<th>' + h + '</th>'; });
    body += '<th>編號</th><th>F</th></tr></thead><tbody>';
    for (let m = 0; m < N; m++) {
      body += '<tr data-row="' + m + '">';
      for (let i = 0; i < n; i++) {
        body += '<td>' + ((m >> (n - 1 - i)) & 1) + '</td>';
      }
      body += '<td>' + m + '</td>';
      body += '<td class="fcell"><button type="button" class="bit" data-row="' + m + '" data-val="">?</button></td>';
      body += '</tr>';
    }
    body += '</tbody></table>';
    body += '<p style="font-size:.8rem;color:#64748b">撳 F：? → 0 → 1。</p>';
    return body;
  }

  function ttLiveBuildKmapHtml(n) {
    const layout = ttLiveKmapLayout(n);
    let body = '<div class="kmap-wrap"><table class="kmap-grid" id="ttLiveKmap"><thead><tr><th class="kmap-corner"></th>';
    layout.colLabels.forEach(h => { body += '<th>' + boolHtml(h) + '</th>'; });
    body += '</tr></thead><tbody>';
    for (let r = 0; r < layout.rows; r++) {
      body += '<tr><th>' + boolHtml(layout.rowLabels[r] || '') + '</th>';
      for (let c = 0; c < layout.cols; c++) {
        const di = r * layout.cols + c;
        const m = layout.cellMinterms[di];
        body += '<td class="kmap-cell"><button type="button" class="kbit" data-idx="' + di +
          '" data-minterm="' + m + '" data-val="" title="m' + m + '">?</button></td>';
      }
      body += '</tr>';
    }
    body += '</tbody></table>';
    body += '<p class="kmap-hint">K-map 同真值表雙向同步（Gray code 軸）。</p></div>';
    return body;
  }

  function renderTtLive(pr) {
    const n0 = pr.defaultVars || 3;
    ttLive.n = n0;
    ttLive.lastSrc = null;
    ttLive.formulaTouched = false;
    let body = '<p class="try-note">' + boolHtml(pr.prompt || '') + '</p>';
    body += '<div class="tt-live-vars"><label>變數數</label>';
    [2, 3, 4].forEach(n => {
      body += '<button type="button" class="var-btn' + (n === n0 ? ' active' : '') + '" data-n="' + n + '">' +
        n + '（' + ttLiveVarNames(n).join('') + '）</button>';
    });
    body += '</div>';
    body += '<div class="tt-live-wrap">';
    body += '<div id="ttLiveTableWrap">' + ttLiveBuildTruthHtml(n0) + '</div>';
    body += '<div class="tt-live-panel" id="ttLivePanel"></div>';
    body += '</div>';
    body += '<div class="tt-live-formula-box"><label for="ttLiveFormula">輸入／貼上布林公式（即時更新表、K-map 同邏輯圖）</label>';
    body += '<input type="text" id="ttLiveFormula" placeholder="例：A\'·B ＋ C  或  (A＋B)\'  或  NOT A" autocomplete="off" spellcheck="false">';
    body += '<div class="ex">支援 · ＊ &amp; AND、＋ + OR、\'／NOT／~、括號；變數 A–D。XOR 可用 ⊕ 或 ^（邏輯圖會化成 SOP）。</div></div>';
    body += '<div class="tt-live-circuit" id="ttLiveCircuit"></div>';
    body += '<div id="ttLiveKmapWrap">' + ttLiveBuildKmapHtml(n0) + '</div>';
    return body;
  }


  function bitToggleHtml(cls, rowAttr) {
    return '<button type="button" class="' + cls + '" ' + rowAttr + ' data-val="">?</button>';
  }

  function renderPractice(lesson) {
    const pr = lesson.practice;
    if (!pr) return '';
    let body = '';

    if (pr.type === 'mcq') {
      body += '<p class="try-note">' + boolHtml(pr.prompt) + '</p><div class="mcq-opts" id="mcqOpts">';
      pr.choices.forEach((c, i) => {
        body += '<label><input type="radio" name="mcq" value="' + i + '"><span>' + boolHtml(c) + '</span></label>';
      });
      body += '</div>';
    } else if (pr.type === 'truth') {
      body += renderTruthBlock(pr, 'ttFill');
    } else if (pr.type === 'kmap') {
      body += '<p class="try-note">' + boolHtml(pr.prompt) + '</p>';
      body += '<div class="kmap-wrap" id="kmapWrap">';
      body += '<table class="kmap-grid" id="kmapGrid"><thead><tr><th class="kmap-corner"></th>';
      (pr.colLabels || []).forEach(h => { body += '<th>' + boolHtml(h) + '</th>'; });
      body += '</tr></thead><tbody>';
      const R = pr.rows || 2, C = pr.cols || 2;
      for (let r = 0; r < R; r++) {
        body += '<tr><th>' + boolHtml((pr.rowLabels || [])[r] || '') + '</th>';
        for (let c = 0; c < C; c++) {
          const i = r * C + c;
          const id = (pr.cellIds && pr.cellIds[i]) ? pr.cellIds[i] : ('c' + i);
          body += '<td class="kmap-cell"><button type="button" class="kbit" data-idx="' + i +
            '" data-val="" title="' + esc(id) + '">?</button></td>';
        }
        body += '</tr>';
      }
      body += '</tbody></table>';
      body += '<p class="kmap-hint">撳格：? → 0 → 1。軸標已用 Gray code。</p>';
      if (pr.readChoices && pr.readChoices.length) {
        body += '<p class="try-note" style="margin-top:.75rem">' + boolHtml(pr.readPrompt || '化簡後 F 係？') + '</p>';
        body += '<div class="mcq-opts" id="kmapReadOpts">';
        pr.readChoices.forEach((ch, i) => {
          body += '<label><input type="radio" name="kmapRead" value="' + i + '"><span>' + boolHtml(ch) + '</span></label>';
        });
        body += '</div>';
      }
      body += '</div>';
    } else if (pr.type === 'tt-live') {
      body += renderTtLive(pr);
    } else if (pr.type === 'design') {
      body += '<p class="try-note"><strong>情境：</strong>' + boolHtml(pr.scenario || pr.prompt || '') + '</p>';
      (pr.steps || []).forEach((st, si) => {
        body += '<div class="design-step" data-step="' + si + '">';
        body += '<div class="step-lab">步驟 ' + (si + 1) + '</div>';
        if (st.kind === 'mcq') {
          body += '<p class="try-note">' + boolHtml(st.prompt) + '</p>';
          body += '<div class="mcq-opts" id="designMcq' + si + '">';
          (st.choices || []).forEach((c, i) => {
            body += '<label><input type="radio" name="designMcq' + si + '" value="' + i + '"><span>' + boolHtml(c) + '</span></label>';
          });
          body += '</div>';
        } else if (st.kind === 'truth') {
          body += renderTruthBlock(st, 'designTt' + si);
        }
        body += '</div>';
      });
    }

    const first = isFirstLivePractice(lesson.id);
    const checkLabel = (pr.type === 'tt-live') ? '標為已練' : '檢查答案';
    body += '<div class="btn-row">' +
      '<button type="button" class="btn btn-ghost" id="prevBtn"' +
      (first ? ' disabled title="已經係第一題"' : '') + '>上一題</button>' +
      '<button type="button" class="btn btn-ghost" id="hintBtn">提示</button>' +
      '<button type="button" class="btn btn-primary" id="checkBtn">' + checkLabel + '</button>' +
      '<button type="button" class="btn btn-ghost" id="retryBtn">重試</button>' +
      '<button type="button" class="btn btn-secondary" id="nextBtn">下一題</button>' +
      '</div>';
    body += '<div class="status info" id="practiceStatus"></div>';
    body += '<div id="explainBox" style="display:none" class="tip"></div>';
    return '<div class="tryit"><h3>Try it · 練習</h3>' + body + '</div>';
  }

  function renderTruthBlock(pr, tableId) {
    let body = '<p class="try-note">' + boolHtml(pr.prompt) + '</p>';
    body += '<table class="tt-fill" id="' + tableId + '"><thead><tr>';
    (pr.inputs || []).forEach(h => { body += '<th>' + boolHtml(h) + '</th>'; });
    body += '<th>F</th></tr></thead><tbody>';
    (pr.rows || []).forEach((row, ri) => {
      body += '<tr data-row="' + ri + '">';
      row.forEach(v => { body += '<td>' + v + '</td>'; });
      body += '<td class="fcell"><button type="button" class="bit" data-row="' + ri + '" data-val="">?</button></td>';
      body += '</tr>';
    });
    body += '</tbody></table>';
    body += '<p style="font-size:.8rem;color:#64748b">撳 F 欄喺 ? → 0 → 1 之間切換。</p>';
    return body;
  }

  function bindBitButtons(selector) {
    document.querySelectorAll(selector).forEach(btn => {
      btn.addEventListener('click', () => {
        if (practiceChecked) return;
        const cur = btn.getAttribute('data-val');
        let next = '';
        if (cur === '') next = '0';
        else if (cur === '0') next = '1';
        else next = '';
        btn.setAttribute('data-val', next);
        btn.textContent = next === '' ? '?' : next;
        btn.classList.toggle('on', next === '1');
        btn.classList.toggle('off', next === '0');
      });
    });
  }

  function checkTruthTable(tableSel, answers) {
    const bits = document.querySelectorAll(tableSel + ' button.bit');
    let allFilled = true, allOk = true;
    bits.forEach(btn => {
      const ri = +btn.getAttribute('data-row');
      const val = btn.getAttribute('data-val');
      const td = btn.parentElement;
      td.classList.remove('cell-ok', 'cell-bad', 'cell-miss');
      if (val === '') {
        allFilled = false; allOk = false; td.classList.add('cell-miss');
        btn.textContent = '?→' + answers[ri];
      } else if (+val === answers[ri]) {
        td.classList.add('cell-ok');
      } else {
        allOk = false; td.classList.add('cell-bad');
        btn.textContent = val + '→' + answers[ri];
      }
    });
    return { allFilled, allOk };
  }

  function bindPractice(lesson) {
    const pr = lesson.practice;
    if (!pr) return;
    practiceChecked = false;
    const maxHints = ((lesson.support && lesson.support.guidedHints) || []).length || 3;

    if (pr.type === 'kmap') bindBitButtons('#kmapGrid button.kbit');
    if (pr.type === 'truth') bindBitButtons('#ttFill button.bit');
    if (pr.type === 'design') {
      bindBitButtons('.design-step button.bit');
    }
    if (pr.type === 'tt-live') {
      bindTtLive(lesson);
    }

    const status = $('practiceStatus');
    const explain = $('explainBox');

    const hintBtn = $('hintBtn');
    if (hintBtn) {
      hintBtn.addEventListener('click', () => {
        hintStep = Math.min(hintStep + 1, maxHints);
        renderSupport(lesson);
      });
    }

    $('checkBtn').addEventListener('click', () => {
      if (pr.type === 'mcq') {
        const sel = document.querySelector('input[name="mcq"]:checked');
        if (!sel) {
          status.textContent = '請先揀一個選項。';
          status.className = 'status info';
          return;
        }
        const idx = +sel.value;
        document.querySelectorAll('#mcqOpts label').forEach((lb, i) => {
          lb.classList.remove('correct-mark', 'wrong-mark');
          if (i === pr.answer) lb.classList.add('correct-mark');
          else if (i === idx && idx !== pr.answer) lb.classList.add('wrong-mark');
        });
        practiceChecked = true;
        if (idx === pr.answer) {
          status.textContent = '正確！★';
          status.className = 'status ok';
          markDone(lesson.id);
        } else {
          status.textContent = '未啱。試撳「提示」睇引導問題，再答一次。';
          status.className = 'status err';
          if (hintStep < 1) { hintStep = 1; renderSupport(lesson); }
        }
        explain.style.display = 'block';
        explain.innerHTML = '<strong>講解：</strong>' + boolHtml(pr.explain || '');
      } else if (pr.type === 'truth') {
        const r = checkTruthTable('#ttFill', pr.answers);
        practiceChecked = true;
        if (!r.allFilled) {
          status.textContent = '有格請填 0 或 1（黃色＝未填）。已標出正確值供對照。';
          status.className = 'status info';
        } else if (r.allOk) {
          status.textContent = '真值表全對！★';
          status.className = 'status ok';
          markDone(lesson.id);
        } else {
          status.textContent = '有格唔啱（紅色）。試撳「提示」再諗。綠色＝正確；箭嘴顯示應填值。';
          status.className = 'status err';
          if (hintStep < 1) { hintStep = 1; renderSupport(lesson); }
        }
        explain.style.display = 'block';
        explain.innerHTML = '<strong>講解：</strong>' + boolHtml(pr.explain || '');
      } else if (pr.type === 'kmap') {
        const bits = document.querySelectorAll('#kmapGrid button.kbit');
        let allFilled = true, fillOk = true;
        bits.forEach(btn => {
          const i = +btn.getAttribute('data-idx');
          const val = btn.getAttribute('data-val');
          const td = btn.parentElement;
          td.classList.remove('cell-ok', 'cell-bad', 'cell-miss');
          if (val === '') {
            allFilled = false; fillOk = false; td.classList.add('cell-miss');
            btn.textContent = '?→' + pr.answers[i];
          } else if (+val === pr.answers[i]) {
            td.classList.add('cell-ok');
          } else {
            fillOk = false; td.classList.add('cell-bad');
            btn.textContent = val + '→' + pr.answers[i];
          }
        });
        let readOk = true;
        const readNeeded = !!(pr.readChoices && pr.readChoices.length);
        if (readNeeded) {
          const sel = document.querySelector('input[name="kmapRead"]:checked');
          const labels = document.querySelectorAll('#kmapReadOpts label');
          if (!sel) {
            status.textContent = '請填完格，並揀簡式選項。';
            status.className = 'status info';
            practiceChecked = true;
            explain.style.display = 'block';
            explain.innerHTML = '<strong>講解：</strong>' + boolHtml(pr.explain || '');
            return;
          }
          const idx = +sel.value;
          labels.forEach((lb, i) => {
            lb.classList.remove('correct-mark', 'wrong-mark');
            if (i === pr.readAnswer) lb.classList.add('correct-mark');
            else if (i === idx && idx !== pr.readAnswer) lb.classList.add('wrong-mark');
          });
          readOk = idx === pr.readAnswer;
        }
        practiceChecked = true;
        if (!allFilled) {
          status.textContent = '有格未填（黃色）。已標出應填值。';
          status.className = 'status info';
        } else if (fillOk && readOk) {
          status.textContent = 'K-map 全對！★';
          status.className = 'status ok';
          markDone(lesson.id);
        } else if (fillOk && !readOk) {
          status.textContent = '填格啱，簡式未啱——試撳「提示」再諗。';
          status.className = 'status err';
          if (hintStep < 1) { hintStep = 1; renderSupport(lesson); }
        } else {
          status.textContent = '填格有誤（紅色）。試撳「提示」再諗。';
          status.className = 'status err';
          if (hintStep < 1) { hintStep = 1; renderSupport(lesson); }
        }
        explain.style.display = 'block';
        explain.innerHTML = '<strong>講解：</strong>' + boolHtml(pr.explain || '');
      } else if (pr.type === 'tt-live') {
        practiceChecked = true;
        const der = ttLiveUpdatePanel();
        status.textContent = '已標為練過。而家 Σm／SOP／邏輯圖會繼續即時更新。★';
        status.className = 'status ok';
        markDone(lesson.id);
        explain.style.display = 'block';
        explain.innerHTML = '<strong>講解：</strong>' + boolHtml(pr.explain || '');
      } else if (pr.type === 'design') {
        let allOk = true;
        let msgParts = [];
        (pr.steps || []).forEach((st, si) => {
          if (st.kind === 'mcq') {
            const sel = document.querySelector('input[name="designMcq' + si + '"]:checked');
            const labels = document.querySelectorAll('#designMcq' + si + ' label');
            if (!sel) {
              allOk = false;
              msgParts.push('步驟' + (si + 1) + '未揀');
              return;
            }
            const idx = +sel.value;
            labels.forEach((lb, i) => {
              lb.classList.remove('correct-mark', 'wrong-mark');
              if (i === st.answer) lb.classList.add('correct-mark');
              else if (i === idx && idx !== st.answer) lb.classList.add('wrong-mark');
            });
            if (idx !== st.answer) {
              allOk = false;
              msgParts.push('步驟' + (si + 1) + '未啱');
            }
          } else if (st.kind === 'truth') {
            const r = checkTruthTable('#designTt' + si, st.answers);
            if (!r.allFilled || !r.allOk) {
              allOk = false;
              msgParts.push('步驟' + (si + 1) + '真值表');
            }
          }
        });
        practiceChecked = true;
        if (allOk) {
          status.textContent = '選閘解題全對！★';
          status.className = 'status ok';
          markDone(lesson.id);
        } else {
          status.textContent = '未完成或有錯：' + (msgParts.join('、') || '請檢查') + '。試撳「提示」。';
          status.className = 'status err';
          if (hintStep < 1) { hintStep = 1; renderSupport(lesson); }
        }
        explain.style.display = 'block';
        explain.innerHTML = '<strong>講解：</strong>' + boolHtml(pr.explain || '');
      }
    });

    $('retryBtn').addEventListener('click', () => {
      practiceChecked = false;
      showLesson(lesson.id);
    });
    const prevBtn = $('prevBtn');
    if (prevBtn && !prevBtn.disabled) {
      prevBtn.addEventListener('click', () => {
        const prev = adjacentLive(lesson.id, -1);
        if (prev) showLesson(prev.id);
      });
    }
    $('nextBtn').addEventListener('click', () => {
      const next = adjacentLive(lesson.id, 1);
      if (next) showLesson(next.id);
      else showLesson('home');
    });
  }


  function bindTtLive(lesson) {
    const pr = lesson.practice || {};
    ttLive.n = pr.defaultVars || 3;
    ttLive.lastSrc = null;
    ttLive.formulaTouched = false;

    function cycleBit(btn) {
      const cur = btn.getAttribute('data-val');
      let next = '';
      if (cur === '') next = '0';
      else if (cur === '0') next = '1';
      else next = '';
      btn.setAttribute('data-val', next);
      btn.textContent = next === '' ? '?' : next;
      btn.classList.toggle('on', next === '1');
      btn.classList.toggle('off', next === '0');
    }

    function mirrorFormulaFromDer(der) {
      const inp = $('ttLiveFormula');
      if (!inp) return;
      // Table/K-map is source of truth: mirror 簡式 into input (not a parse loop — lastSrc guards).
      if (!der.ones.length && der.allFilled) inp.value = '0';
      else if (der.allFilled && der.sop === '1') inp.value = '1';
      else if (der.ones.length) inp.value = der.simplified;
      else inp.value = '';
      ttLive.formulaTouched = false;
    }

    function onTableEdit() {
      ttLive.lastSrc = 'table';
      ttLiveSyncKmapFromTable(ttLive.n);
      const der = ttLiveUpdatePanel();
      mirrorFormulaFromDer(der);
    }

    function onKmapEdit() {
      ttLive.lastSrc = 'kmap';
      ttLiveSyncTableFromKmap(ttLive.n);
      const der = ttLiveUpdatePanel();
      mirrorFormulaFromDer(der);
    }

    function applyFormula(raw) {
      ttLive.lastSrc = 'formula';
      ttLive.formulaTouched = true;
      const parsed = ttLiveParse(raw, ttLive.n);
      if (!parsed.ok) {
        ttLiveUpdatePanel({ error: parsed.error });
        return;
      }
      const vals = ttLiveEvalAll(parsed.eval, ttLive.n);
      ttLiveSetValues(vals, ttLive.n);
      ttLiveUpdatePanel();
    }

    document.querySelectorAll('#ttLiveTable button.bit').forEach(btn => {
      btn.addEventListener('click', () => {
        cycleBit(btn);
        onTableEdit();
      });
    });
    document.querySelectorAll('#ttLiveKmap button.kbit').forEach(btn => {
      btn.addEventListener('click', () => {
        cycleBit(btn);
        onKmapEdit();
      });
    });

    document.querySelectorAll('.tt-live-vars button.var-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const n = +btn.getAttribute('data-n');
        if (n === ttLive.n) return;
        ttLive.n = n;
        ttLive.formulaTouched = false;
        ttLive.lastSrc = null;
        document.querySelectorAll('.tt-live-vars button.var-btn').forEach(b => {
          b.classList.toggle('active', +b.getAttribute('data-n') === n);
        });
        $('ttLiveTableWrap').innerHTML = ttLiveBuildTruthHtml(n);
        $('ttLiveKmapWrap').innerHTML = ttLiveBuildKmapHtml(n);
        document.querySelectorAll('#ttLiveTable button.bit').forEach(b => {
          b.addEventListener('click', () => { cycleBit(b); onTableEdit(); });
        });
        document.querySelectorAll('#ttLiveKmap button.kbit').forEach(b => {
          b.addEventListener('click', () => { cycleBit(b); onKmapEdit(); });
        });
        const inp = $('ttLiveFormula');
        if (inp) inp.value = '';
        ttLiveUpdatePanel();
      });
    });

    const inp = $('ttLiveFormula');
    if (inp) {
      const run = () => {
        if (ttLive.debounce) clearTimeout(ttLive.debounce);
        ttLive.debounce = setTimeout(() => {
          const v = inp.value;
          if (!String(v).trim()) {
            ttLiveUpdatePanel();
            return;
          }
          applyFormula(v);
        }, 180);
      };
      inp.addEventListener('input', run);
      inp.addEventListener('change', run);
    }

    // Right-rail strip shell comes from renderSupport; fill after a tick if needed.
    setTimeout(() => ttLiveUpdatePanel(), 0);
    ttLiveUpdatePanel();
  }


  function showLesson(id) {
    currentId = id;
    hintStep = 0;
    practiceChecked = false;
    const lesson = findLesson(id);
    const mid = $('practiceBody');
    renderNav();
    updateProgressTag();

    if (!lesson) {
      mid.innerHTML = '<p>找不到課題。</p>';
      renderSupport(null);
      return;
    }

    if (id === 'home') {
      mid.innerHTML = renderHome();
      mid.querySelectorAll('.map-card[data-ch]').forEach(card => {
        card.addEventListener('click', () => {
          const ch = +card.getAttribute('data-ch');
          const first = LESSONS.find(l => l.chapter === ch && l.live);
          if (first) showLesson(first.id);
        });
      });
      renderSupport(lesson);
      return;
    }

    const pill = lesson.pill ? '<span class="pill">' + esc(lesson.pill) + '</span> ' : '';
    let html = '<h2 class="stem">' + pill + boolHtml(lesson.title) + '</h2>';
    html += '<div class="teach">' + boolHtmlInTrustedHtml(lesson.teach || '') + '</div>';
    if (!lesson.live) {
      html += '<div class="tip">呢章練習即將推出。可先溫習第 1–4 章。</div>';
    } else {
      html += renderPractice(lesson);
    }
    html += '<div class="btn-row nav-lesson">';
    const i = lessonIndex(id);
    const prev = i > 0 ? LESSONS[i - 1] : null;
    const next = LESSONS.slice(i + 1).find(l => l.live || l.soon);
    if (prev && prev.id !== 'home') {
      html += '<button type="button" class="btn btn-ghost" id="prevLesson">← ' + boolHtml(prev.nav) + '</button>';
    } else {
      html += '<button type="button" class="btn btn-ghost" id="prevLesson">← 地圖</button>';
    }
    if (next) html += '<button type="button" class="btn btn-ghost" id="nextLesson">' + boolHtml(next.nav) + ' →</button>';
    html += '</div>';

    mid.innerHTML = html;
    if (lesson.live && lesson.practice) bindPractice(lesson);
    renderSupport(lesson);
    if (lesson.practice && lesson.practice.type === 'tt-live') ttLiveUpdatePanel();

    const goPrev = $('prevLesson');
    if (goPrev) goPrev.addEventListener('click', () => {
      if (prev && prev.id !== 'home') showLesson(prev.id);
      else showLesson('home');
    });
    const goNext = $('nextLesson');
    if (goNext && next) goNext.addEventListener('click', () => showLesson(next.id));
  }

  /* lightbox */
  function openLightbox(src, alt) {
    const lb = $('imgLightbox');
    const img = $('lightboxImg');
    img.src = src;
    img.alt = alt || '放大圖';
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
  }
  function closeLightbox() {
    const lb = $('imgLightbox');
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    $('lightboxImg').src = '';
  }

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && t.closest('#practiceBody, #supportBody')) {
      if (t.closest('.lightbox')) return;
      openLightbox(t.src, t.alt);
      return;
    }
    if (t && (t.id === 'imgLightbox' || t.id === 'btnCloseLightbox' || t.id === 'lightboxImg')) {
      closeLightbox();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  $('btnToggleLeft').addEventListener('click', () => {
    document.body.classList.toggle('hide-left');
    $('btnToggleLeft').textContent = document.body.classList.contains('hide-left') ? '顯示目錄' : '隱藏目錄';
  });
  $('btnToggleRight').addEventListener('click', () => {
    document.body.classList.toggle('hide-right');
    $('btnToggleRight').textContent = document.body.classList.contains('hide-right') ? '顯示支援' : '隱藏支援';
  });
  $('btnReset').addEventListener('click', clearProgress);

  if (BANK.uiNoteZh) {
    const c = $('creditLine');
    if (c) c.textContent = BANK.uiNoteZh;
  }

  if (!LESSONS.length) {
    $('practiceBody').innerHTML = '<p class="status err">未能載入 lessons。請確認 lessons-data.js 存在。</p>';
    return;
  }
  renderNav();
  updateProgressTag();
  showLesson('home');
})();
