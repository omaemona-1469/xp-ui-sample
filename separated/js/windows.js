// ウィンドウとタスクバー（windows.js）
// ----------------------------------
// ウィンドウの表示・フォーカス・ドラッグ・リサイズと、
// タスクバーのボタンをここでまとめて扱う。
// このファイルは state.js だけに依存する（ほかのモジュールには依存しない）。

import { desktop, taskbtns, nextZ, setStatus } from './state.js';

/* querySelectorAllの結果は配列ではないので、sliceで本物の配列に変換する（forEachなどが使えるようになる）。:not(.dialog)でモーダルダイアログを除く */
export const wins = Array.prototype.slice.call(document.querySelectorAll('.window:not(.dialog)'));
// ウィンドウの id とタスクバーのボタンを対応づける表。あとで「このウィンドウのボタン」を探すのに使う。
export const taskMap = {};

function iconFor(win) {
  var use = win.querySelector('.titlebar .ticon use');
  return use ? use.getAttribute('href') : '#i-gear';
}

// ウィンドウごとにタスクバーのボタンを1つ作る。
wins.forEach(function(win) {
  win.style.zIndex = nextZ();
  win._closed = false;
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'taskbtn';
  b.innerHTML = '<svg><use href="' + iconFor(win) + '"/></svg>' + win.getAttribute('data-title');
  b.addEventListener('click', function() {
    if (win._closed) return;
    if (win.style.display === 'none') { showWin(win); }
    else if (win.classList.contains('active')) { win.style.display = 'none'; win.classList.remove('active'); syncTask(); }
    else { focusWin(win); }
  });
  taskbtns.appendChild(b);
  taskMap[win.id] = b;
});

// タスクバーのボタンの表示を、今のウィンドウの状態に合わせる。
export function syncTask() {
  wins.forEach(function(w) {
    var b = taskMap[w.id];
    /* 閉じたウィンドウはタスクバーから消える。最小化したものは残る */
    b.style.display = w._closed ? 'none' : '';
    b.classList.toggle('active', !w._closed && w.style.display !== 'none' && w.classList.contains('active'));
  });
}

// ウィンドウを手前に出して「今使っているウィンドウ」にする。
export function focusWin(win) {
  wins.forEach(function(w) { w.classList.remove('active'); });
  win.classList.add('active');
  win.style.zIndex = nextZ();
  syncTask();
}

// 閉じたウィンドウを開き直す。タスクバーのボタンも起動順の末尾へ移す。
export function showWin(win) {
  win._closed = false;
  win.style.display = '';
  /* タスクバーの並びは起動順にする。appendChildは、すでにある要素を一度外して末尾へ移す働きがある */
  var tb = taskMap[win.id];
  if (tb) taskbtns.appendChild(tb);
  focusWin(win);
}

wins.forEach(function(win) {
  win.addEventListener('pointerdown', function() { focusWin(win); });
  win.querySelectorAll('.tbtn[data-act]').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var act = btn.getAttribute('data-act');
      if (act === 'close') { win._closed = true; win.style.display = 'none'; win.classList.remove('active'); syncTask(); }
      if (act === 'min') { win.style.display = 'none'; win.classList.remove('active'); syncTask(); }
      if (act === 'max') {
        var on = win.classList.toggle('maximized');
        btn.innerHTML = '<svg><use href="#i-' + (on ? 'restore' : 'max') + '"/></svg>';
        btn.setAttribute('aria-label', on ? '元に戻す' : '最大化');
      }
    });
  });
  /* タイトルバーをつかんでウィンドウを移動する */
  var bar = win.querySelector('.titlebar');
  var drag = null;
  bar.addEventListener('pointerdown', function(e) {
    if (e.target.closest('.tbtn')) return;
    if (window.getComputedStyle(win).position !== 'absolute') return;
    if (win.classList.contains('maximized')) return;
    /* つかんだ位置とウィンドウの左上の差を覚えておく。こうすると、つかんだ場所がずれないまま一緒に動く */
    drag = { dx: e.clientX - win.offsetLeft, dy: e.clientY - win.offsetTop };
    /* ポインターをこの要素に結びつける。マウスが要素の外に出ても移動イベントを受け取れる */
    bar.setPointerCapture(e.pointerId);
  });
  bar.addEventListener('pointermove', function(e) {
    if (!drag) return;
    /* Math.maxとMath.minで範囲を絞る（クランプ）。画面の外へ行き過ぎないようにする */
    var maxX = desktop.clientWidth - 80, maxY = desktop.clientHeight - 34;
    win.style.left = Math.max(-win.offsetWidth + 120, Math.min(maxX, e.clientX - drag.dx)) + 'px';
    win.style.top = Math.max(0, Math.min(maxY, e.clientY - drag.dy)) + 'px';
  });
  bar.addEventListener('pointerup', function() { drag = null; });
  bar.addEventListener('pointercancel', function() { drag = null; });
  /* 縁や右下のグリップをつかんでウィンドウの大きさを変える */
  /* 最小サイズ。これより小さくはならない */
  var MINW = 280, MINH = 160;
  ['e', 'w', 's', 'se', 'sw'].forEach(function(dir) {
    var h = document.createElement('div');
    h.className = 'resize-handle';
    h.setAttribute('data-dir', dir);
    h.setAttribute('aria-hidden', 'true');
    if (dir === 'se') h.title = 'ドラッグでサイズ変更';
    win.appendChild(h);
    var rs = null;
    h.addEventListener('pointerdown', function(e) {
      if (e.button !== undefined && e.button !== 0) return;
      if (window.getComputedStyle(win).position !== 'absolute') return;
      if (win.classList.contains('maximized')) return;
      e.preventDefault();
      e.stopPropagation();
      focusWin(win);
      rs = { x: e.clientX, y: e.clientY, l: win.offsetLeft, t: win.offsetTop, w: win.offsetWidth, ht: win.offsetHeight };
      h.setPointerCapture(e.pointerId);
    });
    h.addEventListener('pointermove', function(e) {
      if (!rs) return;
      var dx = e.clientX - rs.x, dy = e.clientY - rs.y;
      var nw = rs.w, nh = rs.ht, nl = rs.l;
      if (dir.indexOf('e') >= 0) nw = rs.w + dx;
      if (dir.indexOf('s') >= 0) nh = rs.ht + dy;
      /* 左の縁をつかんだときは、幅が変わると左端の位置も一緒に動かす必要がある */
      if (dir.indexOf('w') >= 0) { nw = rs.w - dx; nl = rs.l + dx; }
      var maxW = dir.indexOf('e') >= 0 ? desktop.clientWidth - rs.l : rs.l + rs.w;
      var maxH = desktop.clientHeight - rs.t;
      /* 最小サイズ以上、デスクトップの範囲以内に収める */
      nw = Math.max(MINW, Math.min(Math.max(maxW, MINW), nw));
      nh = Math.max(MINH, Math.min(Math.max(maxH, MINH), nh));
      if (dir.indexOf('w') >= 0) nl = rs.l + (rs.w - nw);
      win.style.width = nw + 'px';
      win.style.height = nh + 'px';
      if (dir.indexOf('w') >= 0) win.style.left = nl + 'px';
    });
    function endResize() {
      if (!rs) return;
      rs = null;
      setStatus('ウィンドウのサイズを変更しました（' + win.offsetWidth + ' × ' + win.offsetHeight + '）');
    }
    h.addEventListener('pointerup', endResize);
    h.addEventListener('pointercancel', endResize);
  });
});
syncTask();
