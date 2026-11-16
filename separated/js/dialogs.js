// モーダルダイアログ（dialogs.js）
// --------------------------------
// 「情報」「確認」「警告」「エラー」「ごみ箱」などの、
// デスクトップの上に重ねて出すダイアログを扱う。
// ダイアログはウィンドウとは別物で、専用の覆い（veil）の中に入っている。
// このファイルは state.js だけに依存する。

import { taskbtns, nextZ } from './state.js';

var veil = document.getElementById('veil');
var dlgTitle = document.getElementById('dlg-title');
var dlgText = document.getElementById('dlg-text');
var dlgUse = document.getElementById('dlg-use');
var dlgBtns = document.getElementById('dlg-btns');
var dlgResult = document.getElementById('dialog-result');
var ICONS = { info: '#i-info', ques: '#i-ques', warn: '#i-warn', err: '#i-err' };

/* モーダルダイアログ（例:ごみ箱）用のタスクバーボタン。ダイアログが開いている間だけ表示する */
var dlgTaskBtn = document.createElement('button');
dlgTaskBtn.type = 'button';
dlgTaskBtn.className = 'taskbtn active';
dlgTaskBtn.style.display = 'none';
dlgTaskBtn.addEventListener('click', function() {
  if (!veil.classList.contains('open')) return;
  var first = dlgBtns.querySelector('button');
  if (first) first.focus();
});
taskbtns.appendChild(dlgTaskBtn);

// ダイアログのタスクバーボタンを出したり消したりする。
function syncDlgTask(show, title, type) {
  if (show) {
    var icon = (title === 'ごみ箱') ? '#i-bin' : (ICONS[type] || '#i-info');
    dlgTaskBtn.innerHTML = '<svg><use href="' + icon + '"/></svg>' + title;
    /* ダイアログのタスクバーボタンも起動順に並べる */
    taskbtns.appendChild(dlgTaskBtn);
    dlgTaskBtn.style.display = '';
    dlgTaskBtn.classList.add('active');
  } else {
    dlgTaskBtn.style.display = 'none';
  }
}

// ダイアログを閉じる。
export function closeDialog() {
  veil.classList.remove('open');
  syncDlgTask(false);
}

// ダイアログを開く。type は info / ques / warn / err のどれか。
// buttons はボタンの文言の配列（例: ['はい', 'いいえ']）。
export function openDialog(type, title, text, buttons) {
  dlgTitle.textContent = title;
  dlgText.textContent = text;
  dlgUse.setAttribute('href', ICONS[type] || '#i-info');
  dlgBtns.innerHTML = '';
  buttons.forEach(function(label, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'xp-btn' + (i === 0 ? ' default' : '');
    b.textContent = label;
    b.addEventListener('click', function() {
      closeDialog();
      if (dlgResult) dlgResult.textContent = '「' + label + '」';
    });
    dlgBtns.appendChild(b);
  });
  var dlgEl = document.getElementById('dlg');
  /* 前回ドラッグで動かしていても、開き直すときは中央に戻す。スマホ表示では位置が!importantで固定されるため、こちらも!importantで指定する */
  dlgEl.style.setProperty('left', '50%', 'important');
  dlgEl.style.setProperty('top', '38%', 'important');
  dlgEl.style.setProperty('transform', 'translate(-50%,-50%)', 'important');
  /* ダイアログはウィンドウより手前に出すため、番号に900を足す */
  dlgEl.style.zIndex = nextZ() + 900;
  veil.classList.add('open');
  syncDlgTask(true, title, type);
  var first = dlgBtns.querySelector('button');
  if (first) first.focus();
}
document.getElementById('dlg-x').addEventListener('click', function() { closeDialog(); });

/* モーダルダイアログもタイトルバーをつかんで移動できる */
var dlgBox = document.getElementById('dlg');
var dlgBar = dlgBox.querySelector('.titlebar');
var dlgDrag = null;
dlgBar.addEventListener('pointerdown', function(e) {
  if (e.target.closest('.tbtn')) return;
  var r = dlgBox.getBoundingClientRect();
  var op = dlgBox.offsetParent;
  var opr = op ? op.getBoundingClientRect() : { left: 0, top: 0 };
  /* 中央寄せはtransformで実現しているので、つかんだ瞬間に同じ場所の具体的な座標へ書き換える。そうしないと掴んだ瞬間に位置がずれてしまう */
  dlgBox.style.setProperty('transform', 'none', 'important');
  dlgBox.style.setProperty('left', (r.left - opr.left) + 'px', 'important');
  dlgBox.style.setProperty('top', (r.top - opr.top) + 'px', 'important');
  dlgDrag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
  dlgBar.setPointerCapture(e.pointerId);
});
dlgBar.addEventListener('pointermove', function(e) {
  if (!dlgDrag) return;
  var op = dlgBox.offsetParent;
  var opr = op ? op.getBoundingClientRect() : { left: 0, top: 0 };
  var pw = op ? op.clientWidth : window.innerWidth;
  var ph = op ? op.clientHeight : window.innerHeight;
  var nl = e.clientX - opr.left - dlgDrag.dx;
  var nt = e.clientY - opr.top - dlgDrag.dy;
  nl = Math.max(-dlgBox.offsetWidth + 90, Math.min(pw - 60, nl));
  nt = Math.max(0, Math.min(ph - 30, nt));
  dlgBox.style.setProperty('left', nl + 'px', 'important');
  dlgBox.style.setProperty('top', nt + 'px', 'important');
});
dlgBar.addEventListener('pointerup', function() { dlgDrag = null; });
dlgBar.addEventListener('pointercancel', function() { dlgDrag = null; });

// 「ダイアログの見本」ウィンドウのボタンから、種類ごとのダイアログを開く。
document.querySelectorAll('[data-dialog]').forEach(function(b) {
  b.addEventListener('click', function() {
    var t = b.getAttribute('data-dialog');
    if (t === 'info') openDialog('info', '情報', '操作が正常に完了しました。これは情報ダイアログの見本です。', ['OK']);
    if (t === 'ques') openDialog('ques', '確認', '変更を保存しますか？', ['はい', 'いいえ']);
    if (t === 'warn') openDialog('warn', '警告', 'ディスクの空き領域が少なくなっています。これは警告ダイアログの見本です。', ['OK']);
    if (t === 'err') openDialog('err', 'エラー', 'ファイルが見つかりませんでした。（サンプルのエラー表示です）', ['OK']);
  });
});
