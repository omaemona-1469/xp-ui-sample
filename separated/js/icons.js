// デスクトップアイコン（icons.js）
// --------------------------------
// デスクトップアイコンの選択・ドラッグ移動・等間隔整列・
// 範囲選択（ゴムバンド）を扱う。
// 名前の変更だけは、少し長いので別ファイル rename.js に分けている。
// このファイルは state.js と dialogs.js に依存する。

import { desktop, setStatus } from './state.js';
import { openDialog } from './dialogs.js';

// デスクトップ上のアイコンを全部集める（配列に変換しておく）。
export const dicons = Array.prototype.slice.call(document.querySelectorAll('.dicon'));

// 全部のアイコンの選択を外す。
export function deselectIcons() {
  dicons.forEach(function(d) { d.classList.remove('selected'); });
}

// このアイコンだけを選ぶ（ほかの選択は外す）。
export function selectOnly(ic) {
  deselectIcons();
  ic.classList.add('selected');
}

// 今選ばれているアイコンだけを集めて返す。
export function selectedIcons() {
  return dicons.filter(function(d) { return d.classList.contains('selected'); });
}

// アイコンが「ドラッグできる配置」かどうか。
// スマホ幅ではアイコンが横並びの固定配置になり、ドラッグはできない。
export function iconsAbsolute() {
  return dicons.length && window.getComputedStyle(dicons[0]).position === 'absolute';
}

/* 最初の配置:アイコンを左端に縦一列に並べる */
(function layoutIcons() {
  if (!iconsAbsolute()) return;
  var y = 10;
  dicons.forEach(function(ic) {
    ic.style.left = '8px';
    ic.style.top = y + 'px';
    y += ic.offsetHeight + 6;
  });
})();

/* 全アイコンを等間隔の格子に並べる。1列目を上から下へ埋めてから次の列へ進む（XPの自動整列と同じ考え方） */
export function alignIcons() {
  if (!iconsAbsolute()) {
    openDialog('info', 'アイコンを整列', 'この表示ではアイコンが横並びに固定されているため、整列は不要です。', ['OK']);
    return;
  }
  var startX = 8, startY = 10, gapX = 8, gapY = 6;
  var cellW = 0, cellH = 0;
  dicons.forEach(function(ic) {
    cellW = Math.max(cellW, ic.offsetWidth);
    cellH = Math.max(cellH, ic.offsetHeight);
  });
  cellW += gapX; cellH += gapY;
  /* 1列に何個入るかを、デスクトップの高さ÷1個分の高さで計算する */
  var rows = Math.max(1, Math.floor((desktop.clientHeight - startY + gapY) / cellH));
  dicons.forEach(function(ic, i) {
    /* 何番目のアイコンかを、列番号と行番号に分ける。割り算の商が列、余りが行になる */
    var col = Math.floor(i / rows), row = i % rows;
    ic.classList.add('snap');
    ic.style.left = (startX + col * cellW) + 'px';
    ic.style.top = (startY + row * cellH) + 'px';
  });
  setTimeout(function() {
    dicons.forEach(function(ic) { ic.classList.remove('snap'); });
  }, 320);
  setStatus('デスクトップ アイコンを等間隔に整列しました');
}

// アイコンのドラッグ移動。選んだアイコンは全員まとめて動く。
dicons.forEach(function(ic) {
  var drag = null, moved = false, wasInMulti = false;
  ic.addEventListener('pointerdown', function(e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (!iconsAbsolute()) return;
    /* Ctrlキー（MacはCmdキー）を押しながらクリックすると、そのアイコンだけ選択・解除を切り替える。Shiftキーなら追加する */
    if (e.ctrlKey || e.metaKey) { ic.classList.toggle('selected'); return; }
    if (e.shiftKey) { ic.classList.add('selected'); return; }
    wasInMulti = ic.classList.contains('selected') && selectedIcons().length > 1;
    if (!ic.classList.contains('selected')) selectOnly(ic);
    /* ドラッグでは、選んだアイコン全員を、それぞれの位置関係を保ったまま一緒に動かす */
    drag = {
      x: e.clientX, y: e.clientY,
      items: selectedIcons().map(function(d) {
        return { el: d, l: d.offsetLeft, t: d.offsetTop, w: d.offsetWidth, h: d.offsetHeight };
      })
    };
    moved = false;
    ic.setPointerCapture(e.pointerId);
  });
  ic.addEventListener('pointermove', function(e) {
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    /* 4ピクセル未満の小さな動きは「クリック」とみなし、ドラッグ扱いにしない */
    if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    moved = true;
    drag.items.forEach(function(it) { it.el.classList.add('dragging'); });
    /* 選んだアイコン全体がデスクトップからはみ出さないよう、移動量を制限する */
    var minL = Infinity, minT = Infinity, maxR = -Infinity, maxB = -Infinity;
    drag.items.forEach(function(it) {
      minL = Math.min(minL, it.l); minT = Math.min(minT, it.t);
      maxR = Math.max(maxR, it.l + it.w); maxB = Math.max(maxB, it.t + it.h);
    });
    dx = Math.max(-minL, Math.min(desktop.clientWidth - maxR, dx));
    dy = Math.max(-minT, Math.min(desktop.clientHeight - maxB, dy));
    drag.items.forEach(function(it) {
      it.el.style.left = (it.l + dx) + 'px';
      it.el.style.top = (it.t + dy) + 'px';
    });
  });
  function endDrag() {
    if (!drag) return;
    var items = drag.items;
    drag = null;
    items.forEach(function(it) { it.el.classList.remove('dragging'); });
    if (moved) {
      /* ドラッグ直後の素早い2回目のタップで、誤ってウィンドウが開かないようにする */
      items.forEach(function(it) {
        it.el._dragMoved = true;
        setTimeout(function() { it.el._dragMoved = false; }, 350);
      });
    } else if (wasInMulti) {
      /* 複数選んだ状態で1個だけクリックしたら、その1個だけの選択に戻す */
      selectOnly(ic);
    }
    wasInMulti = false;
  }
  ic.addEventListener('pointerup', endDrag);
  ic.addEventListener('pointercancel', endDrag);
});

// ドラッグ直後のダブルクリックで、誤ってウィンドウが開くのを防ぐ。
desktop.addEventListener('dblclick', function(e) {
  var ic = e.target.closest ? e.target.closest('.dicon') : null;
  if (ic && ic._dragMoved) { e.stopPropagation(); e.preventDefault(); }
}, true);

/* デスクトップの何もないところをドラッグすると、ゴムバンド（四角い枠）で範囲選択する。ただのクリックなら今までどおり選択を全部外す */
var marquee = document.createElement('div');
marquee.className = 'marquee';
desktop.appendChild(marquee);
var mq = null;
function mqRect() {
  var r = desktop.getBoundingClientRect();
  var x1 = Math.min(mq.x, mq.cx) - r.left, x2 = Math.max(mq.x, mq.cx) - r.left;
  var y1 = Math.min(mq.y, mq.cy) - r.top, y2 = Math.max(mq.y, mq.cy) - r.top;
  return { l: x1, t: y1, r: x2, b: y2 };
}
function mqApply() {
  var rc = mqRect();
  dicons.forEach(function(ic) {
    /* アイコンと四角い枠が重なっているか、左右・上下の重なりで判定する */
    var hit = ic.offsetLeft < rc.r && ic.offsetLeft + ic.offsetWidth > rc.l &&
              ic.offsetTop < rc.b && ic.offsetTop + ic.offsetHeight > rc.t;
    var keep = mq.additive && mq.prev.indexOf(ic) >= 0;
    ic.classList.toggle('selected', hit || keep);
  });
}
desktop.addEventListener('pointerdown', function(e) {
  if (e.button !== undefined && e.button !== 0) return;
  var onEmpty = e.target === desktop || (e.target.closest && e.target.closest('.hills'));
  if (!onEmpty) return;
  if (!iconsAbsolute()) { deselectIcons(); return; }
  mq = {
    x: e.clientX, y: e.clientY, cx: e.clientX, cy: e.clientY, moved: false,
    additive: !!(e.ctrlKey || e.metaKey), prev: selectedIcons()
  };
  try { desktop.setPointerCapture(e.pointerId); } catch (err) {}
});
desktop.addEventListener('pointermove', function(e) {
  if (!mq) return;
  mq.cx = e.clientX; mq.cy = e.clientY;
  if (!mq.moved && Math.abs(mq.cx - mq.x) + Math.abs(mq.cy - mq.y) < 4) return;
  mq.moved = true;
  var rc = mqRect();
  marquee.style.display = 'block';
  marquee.style.left = rc.l + 'px';
  marquee.style.top = rc.t + 'px';
  marquee.style.width = (rc.r - rc.l) + 'px';
  marquee.style.height = (rc.b - rc.t) + 'px';
  mqApply();
});
function endMq() {
  if (!mq) return;
  var wasMoved = mq.moved, wasAdditive = mq.additive;
  mq = null;
  marquee.style.display = 'none';
  if (!wasMoved && !wasAdditive) deselectIcons();
}
desktop.addEventListener('pointerup', endMq);
desktop.addEventListener('pointercancel', endMq);
