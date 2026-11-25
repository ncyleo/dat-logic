/* Rising-edge flip-flop timing practice.
   Inputs are fully known. Q / Q-bar are revealed one rising edge at a time.
   Browser: window.FFTiming. Node: module.exports. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FFTiming = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CYCLES = 6;
  var SLOTS_PER = 4;
  var TRAIL = 2;
  var SLOTS = CYCLES * SLOTS_PER + TRAIL;
  var LABEL_W = 108;
  var AXIS_W = 22;
  var SLOT_W = 36;
  var ROW_H = 62;
  var TOP = 16;
  var CAP_H = 76;
  var WAVE_X = LABEL_W + AXIS_W;
  var SVG_W = WAVE_X + SLOTS * SLOT_W + 1;

  var TYPES = ['sr', 'd', 'jk', 't'];

  function repeat(unit, n) {
    var s = '';
    for (var i = 0; i < n; i++) s += unit;
    return s;
  }

  function parseBits(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) out.push(str.charAt(i) === '1' ? 1 : 0);
    return out;
  }

  function cycles(list, trailBit) {
    var s = list.join('');
    var t = trailBit == null ? '00' : (trailBit + '' + trailBit);
    if (s.length !== CYCLES * SLOTS_PER) throw new Error('cycle bits ' + s.length);
    return s + t;
  }

  /* Each cycle is 4 slots: clock low, low, high, high. The rising edge is the
     start of slot 2. Trail keeps the last level for two extra low slots so the
     final segment is as wide as the others, without adding another edge. */
  var SPECS = {
    sr: {
      title: 'SR 正反器時序例子',
      sub: '上升沿觸發　假設初始 Q＝0　S＝R＝1 係禁止態，其後 Q 不定',
      inputs: [
        { name: 'S', bits: cycles(['0000', '1111', '0000', '0000', '1111', '1111'], 1) },
        { name: 'R', bits: cycles(['0000', '0000', '0000', '1111', '0000', '1111'], 1) }
      ]
    },
    d: {
      title: 'D 正反器時序例子',
      sub: '上升沿觸發　假設初始 Q＝0　週期中途 D 改變，Q 唔會跟隨，只在上升沿取樣',
      inputs: [
        { name: 'D', bits: cycles(['0001', '1111', '1110', '0001', '1110', '0000'], 0) }
      ]
    },
    jk: {
      title: 'JK 正反器時序例子',
      sub: '上升沿觸發　假設初始 Q＝0　J＝K＝1 時，每個上升沿反轉一次',
      inputs: [
        { name: 'J', bits: cycles(['0000', '1111', '0000', '0000', '1111', '1111'], 1) },
        { name: 'K', bits: cycles(['0000', '0000', '0000', '1111', '1111', '1111'], 1) }
      ]
    },
    t: {
      title: 'T 正反器時序例子',
      sub: '上升沿觸發　假設初始 Q＝0　T＝1 只在上升沿反轉一次，時鐘高電平期間 Q 唔會連續震',
      inputs: [
        { name: 'T', bits: cycles(['0001', '1110', '0001', '1111', '1111', '1111'], 1) }
      ]
    }
  };

  function edgeSlot(cycle) { return cycle * SLOTS_PER + 2; }

  function xOfSlot(slot) { return WAVE_X + slot * SLOT_W; }

  function revealEndX(revealed) {
    if (revealed <= 0) return WAVE_X;
    if (revealed >= CYCLES) return xOfSlot(SLOTS);
    return xOfSlot(edgeSlot(revealed));
  }

  function visibleSlots(revealed) {
    if (revealed <= 0) return 0;
    if (revealed >= CYCLES) return SLOTS;
    return edgeSlot(revealed);
  }

  function nextQ(type, q, sample) {
    if (q === 'x') return 'x';
    if (type === 'd') return sample[0];
    if (type === 't') return sample[0] === 1 ? (q === 1 ? 0 : 1) : q;
    var a = sample[0], b = sample[1];
    if (a === 0 && b === 0) return q;
    if (a === 1 && b === 0) return 1;
    if (a === 0 && b === 1) return 0;
    if (type === 'jk') return q === 1 ? 0 : 1;
    return 'x';
  }

  function series(type) {
    var spec = SPECS[type];
    if (!spec) throw new Error('unknown type ' + type);
    var clk = parseBits(repeat('0011', CYCLES) + '00');
    var inputs = spec.inputs.map(function (inp) {
      return { name: inp.name, levels: parseBits(inp.bits) };
    });
    var qAfter = [];
    var q = 0;
    var c, slot, sample;
    for (c = 0; c < CYCLES; c++) {
      slot = edgeSlot(c);
      sample = inputs.map(function (inp) { return inp.levels[slot]; });
      q = nextQ(type, q, sample);
      qAfter.push(q);
    }
    var qSeries = new Array(SLOTS);
    var qbSeries = new Array(SLOTS);
    var cur = 0;
    var ei = 0;
    for (var s = 0; s < SLOTS; s++) {
      if (ei < CYCLES && s === edgeSlot(ei)) {
        cur = qAfter[ei];
        ei++;
      }
      qSeries[s] = cur;
      qbSeries[s] = cur === 'x' ? 'x' : (cur === 1 ? 0 : 1);
    }
    return {
      type: type,
      title: spec.title,
      sub: spec.sub,
      initial: 0,
      clk: clk,
      inputs: inputs,
      qAfter: qAfter,
      qSeries: qSeries,
      qbSeries: qbSeries
    };
  }

  function sampleAt(ser, cycle) {
    var slot = edgeSlot(cycle);
    return ser.inputs.map(function (inp) { return inp.levels[slot]; });
  }

  function qBefore(ser, cycle) {
    if (cycle <= 0) return ser.initial;
    return ser.qAfter[cycle - 1];
  }

  function intervalEnd(cycle) {
    if (cycle >= CYCLES - 1) return SLOTS;
    return edgeSlot(cycle + 1);
  }

  function changedAfter(levels, cycle) {
    var edge = edgeSlot(cycle);
    var end = intervalEnd(cycle);
    var sample = levels[edge];
    for (var s = edge + 1; s < end; s++) {
      if (levels[s] !== sample) return levels[s];
    }
    return null;
  }

  function pairLabel(sample, kind) {
    var tag = '' + sample[0] + sample[1];
    if (sample[0] === 0 && sample[1] === 0) return { text: '保持 (00)', tone: 'hold' };
    if (sample[0] === 1 && sample[1] === 0) return { text: '置位 (10)', tone: 'set' };
    if (sample[0] === 0 && sample[1] === 1) return { text: '重置 (01)', tone: 'reset' };
    if (kind === 'sr') return { text: '禁止／不定 (11)', tone: 'forbid' };
    return { text: '反轉 (11)', tone: 'toggle' };
  }

  function edgeInfo(type, cycle) {
    var ser = series(type);
    var sample = sampleAt(ser, cycle);
    var before = qBefore(ser, cycle);
    var after = ser.qAfter[cycle];
    var label, because, tone;
    if (type === 'sr' || type === 'jk') {
      var lab = pairLabel(sample, type);
      label = lab.text;
      tone = lab.tone;
      var names = type === 'sr' ? ['S', 'R'] : ['J', 'K'];
      if (tone === 'hold') because = '呢個沿 ' + names[0] + '＝0、' + names[1] + '＝0，係保持。';
      else if (tone === 'set') because = '呢個沿 ' + names[0] + '＝1、' + names[1] + '＝0，係置位。';
      else if (tone === 'reset') because = '呢個沿 ' + names[0] + '＝0、' + names[1] + '＝1，係重置。';
      else if (tone === 'forbid') because = '呢個沿 S＝1、R＝1，係禁止態。';
      else because = '呢個沿 J＝1、K＝1，每個上升沿只翻轉一次。';
    } else if (type === 'd') {
      var later = changedAfter(ser.inputs[0].levels, cycle);
      label = later == null ? ('D＝' + sample[0] + ' 寫入') : ('D＝' + sample[0] + '（中途變 ' + later + '）');
      tone = 'write';
      because = '呢個沿 D＝' + sample[0] + '，Q 抄呢一下。';
      if (later != null) because += '脈衝中間 D 有變，Q 唔會跟住變。';
    } else {
      var laterT = changedAfter(ser.inputs[0].levels, cycle);
      if (sample[0] === 1) {
        label = 'T＝1 反轉';
        tone = 'toggle';
        because = '呢個沿 T＝1，只喺上升沿翻轉一次。';
      } else {
        label = 'T＝0 保持';
        tone = 'hold';
        because = '呢個沿 T＝0，係保持。';
      }
      if (laterT != null) because += '中途 T 有變，都要等下一個上升沿。';
    }
    return {
      cycle: cycle,
      sample: sample,
      before: before,
      after: after,
      label: label,
      tone: tone,
      because: because
    };
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function resultSentence(q) {
    if (q === 'x') return 'Q 同 <span class="obar">Q</span> 都不定。斜線唔係 0，亦唔係 1。';
    var qb = q === 1 ? 0 : 1;
    return 'Q＝' + q + '，<span class="obar">Q</span>＝' + qb + '。';
  }

  function guessWord(g) {
    if (g === 'x') return '不定';
    if (g === '1') return 'Q＝1';
    return 'Q＝0';
  }

  function normGuess(g) {
    if (g === '0' || g === 0) return '0';
    if (g === '1' || g === 1) return '1';
    if (g === 'x') return 'x';
    return null;
  }

  function grade(type, edgeIndex, guess) {
    var g = normGuess(guess);
    if (g == null || edgeIndex < 0 || edgeIndex >= CYCLES) {
      return { ok: false, invalid: true, html: '請先揀一個估計。' };
    }
    var info = edgeInfo(type, edgeIndex);
    var expect = info.after === 'x' ? 'x' : String(info.after);
    var ok = g === expect;
    var head = ok ? '啱。' : ('未啱，你揀咗 ' + guessWord(g) + '。');
    return {
      ok: ok,
      invalid: false,
      html: head + info.because + resultSentence(info.after) + '呢段揭開咗。'
    };
  }

  function askModel(type, edgeIndex) {
    var info = edgeInfo(type, edgeIndex);
    var beforeTxt = info.before === 'x' ? '不定' : String(info.before);
    var html = '第 <strong>' + (edgeIndex + 1) + '</strong>／' + CYCLES +
      ' 個上升沿。沿之前 Q＝' + beforeTxt +
      '。睇住而家呢支較粗嘅橙色箭嘴，讀箭嘴當下嘅輸入，再估沿之後嘅 Q。';
    return { html: html, qBefore: info.before, answer: info.after, edge: edgeIndex };
  }

  function choices(type) {
    var list = [
      { id: '0', html: 'Q＝0、<span class="obar">Q</span>＝1' },
      { id: '1', html: 'Q＝1、<span class="obar">Q</span>＝0' }
    ];
    if (type === 'sr') {
      list.push({ id: 'x', html: '不定：Q 同 <span class="obar">Q</span> 都唔係確定嘅 0／1' });
    }
    return list;
  }

  function stepPath(levels, toSlot, yOf) {
    var d = '';
    var started = false;
    for (var s = 0; s < toSlot; s++) {
      var v = levels[s];
      if (v !== 0 && v !== 1) { started = false; continue; }
      var x1 = xOfSlot(s);
      var x2 = xOfSlot(s + 1);
      var y = yOf(v);
      if (!started) d += 'M' + x1 + ' ' + y;
      else d += 'L' + x1 + ' ' + y;
      d += 'L' + x2 + ' ' + y;
      started = true;
    }
    return d;
  }

  function y1of(i) { return TOP + i * ROW_H + 16; }
  function y0of(i) { return TOP + i * ROW_H + ROW_H - 14; }

  function toneFill(tone) {
    if (tone === 'forbid') return '#dc2626';
    if (tone === 'toggle') return '#0f766e';
    return '#1e293b';
  }

  function renderChart(type, revealed) {
    var ser = series(type);
    var nIn = ser.inputs.length;
    var qRow = 1 + nIn;
    var nRows = qRow + 2;
    var svgH = TOP + nRows * ROW_H + CAP_H;
    var plotRight = xOfSlot(SLOTS);
    var parts = [];
    parts.push('<svg class="ff-svg" role="img" focusable="false" width="' + SVG_W + '" height="' + svgH +
      '" viewBox="0 0 ' + SVG_W + ' ' + svgH + '" data-ff-revealed="' + revealed + '" data-ff-kind="' + type +
      '" aria-label="' + esc(ser.title) + '。時鐘同輸入已畫出。Q 已揭開 ' +
      Math.max(0, Math.min(revealed, CYCLES)) + ' 段，其餘未揭。">');
    parts.push('<title>' + esc(ser.title) + '</title>');
    parts.push('<defs><pattern id="ffHatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">' +
      '<line x1="0" y1="0" x2="0" y2="8" stroke="#e11d48" stroke-width="2"/></pattern></defs>');
    parts.push('<rect x="0.5" y="0.5" width="' + (SVG_W - 1) + '" height="' + (svgH - 1) +
      '" fill="#fff" stroke="#1e3a5f" stroke-width="1.5"/>');
    parts.push('<rect x="0" y="' + TOP + '" width="' + LABEL_W + '" height="' + (nRows * ROW_H) + '" fill="#f8fafc"/>');

    var band;
    for (band = 0; band < SLOTS; band += 2) {
      var fill = (band / 2) % 2 === 0 ? '#f4f8fc' : '#ffffff';
      parts.push('<rect x="' + xOfSlot(band) + '" y="' + TOP + '" width="' + (2 * SLOT_W) +
        '" height="' + (nRows * ROW_H) + '" fill="' + fill + '"/>');
    }
    for (var g = 0; g <= SLOTS; g++) {
      var gx = xOfSlot(g);
      var strong = g % 4 === 0;
      parts.push('<line x1="' + gx + '" y1="' + TOP + '" x2="' + gx + '" y2="' + (TOP + nRows * ROW_H) +
        '" stroke="' + (strong ? '#d5dee8' : '#e7eef6') + '" stroke-width="1"/>');
    }

    if (revealed < CYCLES) {
      var coverX = revealEndX(revealed);
      var coverW = plotRight - coverX;
      if (coverW > 0) {
        parts.push('<rect class="ff-q-cover" x="' + coverX + '" y="' + (TOP + qRow * ROW_H) +
          '" width="' + coverW + '" height="' + (2 * ROW_H) + '" fill="#ffffff"/>');
      }
    }

    if (revealed < CYCLES) {
      var hi = edgeSlot(revealed);
      parts.push('<rect data-ff-current="1" data-x="' + xOfSlot(hi) + '" x="' + xOfSlot(hi) +
        '" y="' + TOP + '" width="' + SLOT_W + '" height="' + ((qRow) * ROW_H) + '" fill="#ffedd5"/>');
    }

    function wave(levels, row, toSlot, cls) {
      var d = stepPath(levels, toSlot, function (v) { return v ? y1of(row) : y0of(row); });
      if (!d) return;
      parts.push('<path class="' + cls + '" d="' + d + '" fill="none" stroke="#111827" stroke-width="2.6" stroke-linejoin="miter" stroke-linecap="square"/>');
    }

    wave(ser.clk, 0, SLOTS, 'ff-clk');
    ser.inputs.forEach(function (inp, idx) {
      wave(inp.levels, idx + 1, SLOTS, 'ff-in');
    });

    var vis = visibleSlots(revealed);
    if (vis > 0) {
      wave(ser.qSeries, qRow, vis, 'ff-q-wave');
      wave(ser.qbSeries, qRow + 1, vis, 'ff-qb-wave');
      var hs = null;
      for (var s = 0; s <= vis; s++) {
        var on = s < vis && ser.qSeries[s] === 'x';
        if (on && hs == null) hs = s;
        if (!on && hs != null) {
          parts.push('<rect class="ff-hatch" x="' + xOfSlot(hs) + '" y="' + (TOP + qRow * ROW_H + 4) +
            '" width="' + ((s - hs) * SLOT_W) + '" height="' + (ROW_H - 8) + '" fill="url(#ffHatch)"/>');
          parts.push('<rect class="ff-hatch" x="' + xOfSlot(hs) + '" y="' + (TOP + (qRow + 1) * ROW_H + 4) +
            '" width="' + ((s - hs) * SLOT_W) + '" height="' + (ROW_H - 8) + '" fill="url(#ffHatch)"/>');
          hs = null;
        }
      }
    }

    for (var e = 0; e < CYCLES; e++) {
      var ex = xOfSlot(edgeSlot(e));
      var current = revealed < CYCLES && e === revealed;
      var stroke = current ? '#ea580c' : '#f59e0b';
      var sw = current ? 2.2 : 1.35;
      parts.push('<line class="ff-edge" x1="' + ex + '" y1="' + y1of(0) + '" x2="' + ex + '" y2="' +
        (TOP + nRows * ROW_H) + '" stroke="' + stroke + '" stroke-width="' + sw + '"/>');
      var ay = y1of(0) - (current ? 13 : 11);
      var aw = current ? 6 : 5;
      parts.push('<polygon class="ff-arrow" points="' + ex + ',' + ay + ' ' + (ex - aw) + ',' + (ay + 10) + ' ' +
        (ex + aw) + ',' + (ay + 10) + '" fill="' + stroke + '"/>');
    }

    var rowNames = [{ text: '時鐘脈衝' }];
    ser.inputs.forEach(function (inp) { rowNames.push({ text: inp.name }); });
    rowNames.push({ text: 'Q' });
    rowNames.push({ obar: true });

    rowNames.forEach(function (row, i) {
      var y = TOP + i * ROW_H;
      parts.push('<line x1="0" y1="' + y + '" x2="' + (SVG_W - 1) + '" y2="' + y + '" stroke="#d6dee8" stroke-width="1"/>');
      parts.push('<text class="ff-axis" x="' + (WAVE_X - 4) + '" y="' + (y1of(i) + 4) + '" text-anchor="end">1</text>');
      parts.push('<text class="ff-axis" x="' + (WAVE_X - 4) + '" y="' + (y0of(i) + 4) + '" text-anchor="end">0</text>');
      var inner = row.obar
        ? '<div xmlns="http://www.w3.org/1999/xhtml" class="ff-rowlab"><span class="obar">Q</span></div>'
        : '<div xmlns="http://www.w3.org/1999/xhtml" class="ff-rowlab">' + esc(row.text) + '</div>';
      parts.push('<foreignObject x="8" y="' + y + '" width="' + (LABEL_W - 12) + '" height="' + ROW_H + '">' + inner + '</foreignObject>');
    });
    parts.push('<line x1="0" y1="' + (TOP + nRows * ROW_H) + '" x2="' + (SVG_W - 1) + '" y2="' + (TOP + nRows * ROW_H) + '" stroke="#d6dee8"/>');
    parts.push('<line x1="' + LABEL_W + '" y1="' + TOP + '" x2="' + LABEL_W + '" y2="' + (TOP + nRows * ROW_H) + '" stroke="#d6dee8"/>');

    var capY = TOP + nRows * ROW_H + 22;
    for (var k = 0; k < revealed && k < CYCLES; k++) {
      var info = edgeInfo(type, k);
      var x1 = xOfSlot(edgeSlot(k));
      var x2 = xOfSlot(intervalEnd(k));
      var cx = Math.round((x1 + x2) / 2);
      parts.push('<text class="ff-cap" x="' + cx + '" y="' + capY + '" text-anchor="middle" fill="' +
        toneFill(info.tone) + '">' + esc(info.label) + '</text>');
    }

    if (type === 't' && revealed >= CYCLES) {
      var tx1 = xOfSlot(edgeSlot(3));
      var tx2 = xOfSlot(SLOTS);
      parts.push('<text class="ff-note" x="' + Math.round((tx1 + tx2) / 2) + '" y="' + (capY + 26) +
        '" text-anchor="middle" fill="#0f766e">T＝1 連續：Q 週期加倍（除 2 分頻）</text>');
    }
    if (type === 'jk' && revealed >= CYCLES) {
      var jx1 = xOfSlot(edgeSlot(4));
      var jx2 = xOfSlot(SLOTS);
      parts.push('<text class="ff-note" x="' + Math.round((jx1 + jx2) / 2) + '" y="' + (capY + 26) +
        '" text-anchor="middle" fill="#0f766e">連續反轉（兩個時鐘週期一次來回）</text>');
    }

    parts.push('</svg>');
    return parts.join('');
  }

  function runOf(memo, type) {
    var runs = memo && memo.runs;
    var st = runs && runs[type];
    if (!st) return { revealed: 0, hits: 0, pick: null, last: null };
    return st;
  }

  function shellHtml(memo) {
    var type = memo && TYPES.indexOf(memo.type) >= 0 ? memo.type : 'sr';
    var st = runOf(memo, type);
    var ser = series(type);
    var buttons = TYPES.map(function (id) {
      var done = runOf(memo, id).revealed >= CYCLES;
      var active = id === type;
      var name = { sr: 'SR 正反器', d: 'D 正反器', jk: 'JK 正反器', t: 'T 正反器' }[id];
      return '<button type="button" class="ff-type' + (active ? ' active' : '') + (done ? ' done' : '') +
        '" data-ff-type="' + id + '" aria-pressed="' + (active ? 'true' : 'false') + '">' +
        (done ? '✓ ' : '') + name + '</button>';
    }).join('');

    var ask;
    if (st.revealed >= CYCLES) {
      var extra = '';
      if (type === 'sr') extra = '最右段斜線係禁止態，Q 唔係 0，亦唔係 1。';
      else if (type === 'd') extra = '中途 D 變咗嘅位置，Q 係平線，要去到下一個箭嘴先至變。';
      else if (type === 'jk') extra = 'J＝K＝1 嗰兩段，每個箭嘴只翻一次，時鐘高電平 Q 係平線。';
      else extra = '最後三段 T 一路係 1。Q 每個上升沿先翻一次，週期係時鐘嘅兩倍。';
      ask = '<p class="ff-done">六個上升沿都揭開咗。呢隻估中 <strong>' + st.hits + '</strong>／' + CYCLES + '。' + extra + '</p>' +
        '<button type="button" class="btn btn-ghost" id="ffAgain">再估呢隻</button>';
    } else {
      var model = askModel(type, st.revealed);
      var opts = choices(type).map(function (ch) {
        var on = st.pick === ch.id;
        return '<button type="button" class="ff-choice' + (on ? ' active' : '') + '" data-ff-guess="' + ch.id +
          '" aria-pressed="' + (on ? 'true' : 'false') + '">' + ch.html + '</button>';
      }).join('');
      ask = '<p class="ff-q">' + model.html + '</p>' +
        '<p class="ff-remind">Q 只睇箭嘴當下嘅輸入。<span class="obar">Q</span> 會同 Q 一齊揭開，一定係相反。兩個箭嘴之間輸入變咗，或者時鐘維持高電平，Q 都唔會跳。</p>' +
        '<div class="ff-choices" role="group" aria-label="估計沿之後嘅 Q">' + opts + '</div>' +
        '<button type="button" class="btn btn-primary" id="ffCheckEdge"' + (st.pick ? '' : ' disabled') + '>檢查呢個沿</button>' +
        '<p class="ff-hint">未揀估計之前，呢段 Q 唔會出現。檢查之後先揭開正確波形，再去下一個上升沿。估錯都會話你知。</p>';
    }

    var fb = '';
    if (st.last && st.last.html) {
      fb = '<p class="ff-feedback ' + (st.last.ok ? 'ok' : 'bad') + '" role="status">' + st.last.html + '</p>';
    }

    return '<div class="ff-lab">' +
      '<div class="ff-types" role="tablist">' + buttons + '</div>' +
      '<div class="ff-chart">' +
        '<h3 class="ff-chart-title">' + esc(ser.title) + '</h3>' +
        '<p class="ff-chart-sub">' + esc(ser.sub) + '</p>' +
        '<div class="ff-scroll">' + renderChart(type, st.revealed) + '</div>' +
        '<p class="ff-foot">橙色箭嘴標示有效上升沿：Q 只在此時更新，兩次有效沿之間保持不變。</p>' +
      '</div>' +
      fb +
      '<div class="ff-ask">' + ask + '</div>' +
      '<p class="ff-score">呢隻已揭 ' + Math.min(st.revealed, CYCLES) + '／' + CYCLES + '　估中 ' + st.hits + '</p>' +
      '</div>';
  }

  return {
    types: TYPES,
    cycles: CYCLES,
    slots: SLOTS,
    series: series,
    revealEndX: revealEndX,
    edgeInfo: edgeInfo,
    grade: grade,
    askModel: askModel,
    renderChart: renderChart,
    shellHtml: shellHtml,
    nextQ: nextQ
  };
});
