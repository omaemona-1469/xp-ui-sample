// アイコンの名前変更（rename.js）
// --------------------------------
// XP風の名前変更。F2キー、または「すでに1個だけ選ばれているアイコンの名前」を
// ゆっくりもう一度クリックすると、その場で名前を書き換えられる。
// このファイルは state.js と icons.js に依存する。

import { desktop, setStatus } from './state.js';
import { dicons, selectedIcons, selectOnly } from './icons.js';

// 今名前を変更しているアイコンの情報。変更中でなければ null。
var renaming = null;
// ゆっくりクリックの待ち時間をはかるタイマー。
var renameTimer = null;
// 押した瞬間の状態（どのアイコンか、名前の上かどうか、など）。
var downInfo = null;

function cancelRenameTimer() {
  if (renameTimer) { clearTimeout(renameTimer); renameTimer = null; }
}

// 名前変更を終わらせる。save が真なら入力内容で確定、偽なら取り消し。
function finishRename(save, refocus) {
  if (!renaming || renaming.done) return;
  renaming.done = true;
  var r = renaming; renaming = null;
  /* 連続する空白を1個にまとめ、両端の空白を取る。空欄なら元の名前に戻す */
  var v = r.input.value.replace(/\s+/g, ' ').trim();
  if (save && v && v !== r.original) {
    r.label.textContent = v;
    setStatus('アイコンの名前を「' + r.original + '」から「' + v + '」に変更しました');
  }
  r.label.style.visibility = '';
  r.ic.classList.remove('renaming');
  if (r.input.parentNode) r.input.parentNode.removeChild(r.input);
  if (refocus) {
    try { r.ic.focus({ preventScroll: true }); } catch (err) { try { r.ic.focus(); } catch (e2) {} }
  }
}

// 名前変更を始める。ラベルの上に白い入力欄を重ねて、そこに名前を書き込む。
export function startRename(ic) {
  cancelRenameTimer();
  if (renaming) finishRename(true, false);
  if (renaming) return;
  var label = ic.querySelector('span');
  if (!label) return;
  selectOnly(ic);
  var original = label.textContent;
  var dRect = desktop.getBoundingClientRect();
  var sRect = label.getBoundingClientRect();
  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'rename-input';
  input.value = original;
  input.setAttribute('aria-label', 'アイコンの名前を変更');
  var w = Math.min(Math.max(sRect.width + 14, 76), Math.max(76, dRect.width - 8));
  var left = sRect.left - dRect.left + (sRect.width - w) / 2;
  left = Math.max(0, Math.min(dRect.width - w, left));
  input.style.left = left + 'px';
  input.style.top = Math.max(0, sRect.top - dRect.top - 2) + 'px';
  input.style.width = w + 'px';
  desktop.appendChild(input);
  label.style.visibility = 'hidden';
  ic.classList.add('renaming');
  renaming = { ic: ic, label: label, input: input, original: original, done: false };
  input.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
  input.addEventListener('click', function(e) { e.stopPropagation(); });
  input.addEventListener('dblclick', function(e) { e.stopPropagation(); });
  input.addEventListener('keydown', function(e) {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); finishRename(true, true); }
    else if (e.key === 'Escape') { e.preventDefault(); finishRename(false, true); }
  });
  /* 入力欄からフォーカスが外れたら（ほかをクリックしたら）確定する */
  input.addEventListener('blur', function() { finishRename(true, false); });
  input.focus();
  try { input.select(); } catch (err) {}
}

/* 押した瞬間の状態を先に記録しておく。名前の変更は「すでに1個だけ選ばれているアイコンの名前」を、もう一度クリックしたときだけ始める。ダブルクリックと区別するため、開始は少し遅らせる */
desktop.addEventListener('pointerdown', function(e) {
  if (renaming && e.target !== renaming.input) finishRename(true, false);
  cancelRenameTimer();
  downInfo = null;
  if (e.button !== undefined && e.button !== 0) return;
  var ic = e.target.closest ? e.target.closest('.dicon') : null;
  if (!ic) return;
  downInfo = {
    ic: ic, x: e.clientX, y: e.clientY,
    sole: ic.classList.contains('selected') && selectedIcons().length === 1,
    onLabel: !!(e.target.closest && e.target.closest('span'))
  };
}, true);

dicons.forEach(function(ic) {
  ic.addEventListener('click', function(e) {
    if (!downInfo || downInfo.ic !== ic) return;
    var info = downInfo; downInfo = null;
    if (!info.sole || !info.onLabel) return;
    if (Math.abs(e.clientX - info.x) + Math.abs(e.clientY - info.y) > 6) return;
    if (ic._dragMoved) return;
    cancelRenameTimer();
    /* 500ミリ秒待ってから名前変更を始める。この間にダブルクリックが来たらタイマーを消して、開く動作を優先する */
    renameTimer = setTimeout(function() {
      renameTimer = null;
      if (ic.classList.contains('selected') && selectedIcons().length === 1) startRename(ic);
    }, 500);
  });
  ic.addEventListener('dblclick', function() { cancelRenameTimer(); });
  ic.addEventListener('keydown', function(e) {
    if (e.key === 'F2') {
      e.preventDefault(); e.stopPropagation();
      startRename(ic);
    }
  });
});

// F2キーでも名前変更を始める。入力欄にフォーカスがあるときは、そちらのキー操作を優先する。
document.addEventListener('keydown', function(e) {
  if (e.key !== 'F2' || renaming) return;
  var t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
  var sel = selectedIcons();
  if (!sel.length) return;
  var ae = document.activeElement;
  var ic = (ae && ae.classList && ae.classList.contains('dicon')) ? ae : sel[0];
  e.preventDefault();
  startRename(ic);
});
