// 見本ウィンドウの中身（panels.js）
// --------------------------------
// メインウィンドウの中にある見本の動きをまとめたもの。
// メニュー、タブ、ボタン、フォーム、リスト、ツリー、
// プログレスバー、スライダー、カレンダーの7つがある。
// どれも「クリックしたら何か表示を変える」だけの小さな配線なので、
// 1つのファイルにまとめている。
// このファイルは state.js、windows.js、dialogs.js に依存する。

import { setStatus } from './state.js';
import { syncTask } from './windows.js';
import { openDialog } from './dialogs.js';

/* ---------- メニュー ---------- */
var openMenu = null;

// 開いているメニューを全部閉じる。
export function closeMenus() {
  document.querySelectorAll('.menu.open').forEach(function(m) { m.classList.remove('open'); });
  document.querySelectorAll('.mbtn.open').forEach(function(b) { b.classList.remove('open'); });
  openMenu = null;
}
document.querySelectorAll('[data-menu]').forEach(function(btn) {
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    var m = document.getElementById(btn.getAttribute('data-menu'));
    var was = m.classList.contains('open');
    closeMenus();
    if (!was) { m.classList.add('open'); btn.classList.add('open'); openMenu = m; }
  });
});
document.addEventListener('click', function(e) {
  if (openMenu && !e.target.closest('.mitem')) closeMenus();
});
document.querySelectorAll('[data-menu-act]').forEach(function(el) {
  el.addEventListener('click', function() {
    var act = el.getAttribute('data-menu-act');
    closeMenus();
    if (act === '終了') {
      var w = document.getElementById('win-main');
      w._closed = true; w.style.display = 'none'; w.classList.remove('active'); syncTask();
      return;
    }
    if (act === 'バージョン情報') {
      openDialog('info', 'バージョン情報', 'Windows XP風 UIサンプル\nバージョン 1.0（CSSのみで再現した見本です）', ['OK']);
      return;
    }
    setStatus('「' + act + '」が選択されました');
  });
});

/* ---------- タブ ---------- */
// タブを押すと、選んだタブのページだけ表示して、ほかは隠す。
document.querySelectorAll('.tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.tab').forEach(function(t) { t.setAttribute('aria-selected', 'false'); });
    tab.setAttribute('aria-selected', 'true');
    document.querySelectorAll('.tabpage').forEach(function(p) { p.hidden = true; });
    document.getElementById(tab.getAttribute('data-tab')).hidden = false;
    setStatus('タブ: ' + tab.textContent);
  });
});

/* ---------- ボタンのタブ ---------- */
var count = 0, countEl = document.getElementById('btn-count');
document.querySelectorAll('[data-count]').forEach(function(b) {
  b.addEventListener('click', function() {
    count++; countEl.textContent = count;
    setStatus('ボタンが ' + count + ' 回押されました');
  });
});
// トグルボタン（太字・斜体・下線）は、押すたびに「押したまま」の状態を切り替える。
document.querySelectorAll('.xp-btn.toggle').forEach(function(b) {
  b.addEventListener('click', function() {
    var on = b.classList.toggle('pressed');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
});

/* ---------- フォーム ---------- */
document.getElementById('demo-form').addEventListener('submit', function(e) {
  e.preventDefault();
  var name = document.getElementById('f-name').value.trim();
  if (!name) {
    openDialog('err', '入力エラー', '名前が入力されていません。名前を入力してから、もう一度お試しください。', ['OK']);
    return;
  }
  openDialog('info', '登録完了', name + ' さんの設定を登録しました。（サンプルなので、どこにも送信されません）', ['OK']);
});
// スピンボタン（フォントサイズの▲▼）。6から48の範囲で増減する。
var num = document.getElementById('f-num');
function spin(d) {
  var v = parseInt(num.value, 10);
  if (isNaN(v)) v = 11;
  num.value = Math.max(6, Math.min(48, v + d));
}
document.getElementById('spin-up').addEventListener('click', function() { spin(1); });
document.getElementById('spin-down').addEventListener('click', function() { spin(-1); });

/* ---------- リスト ---------- */
// リストビューの行をクリックすると、その行だけ選ばれる。
document.querySelectorAll('#lv-body tr').forEach(function(tr) {
  tr.addEventListener('click', function() {
    document.querySelectorAll('#lv-body tr').forEach(function(r) { r.classList.remove('selected'); });
    tr.classList.add('selected');
    document.getElementById('lv-sel').textContent = tr.cells[0].textContent;
  });
});
var lb = document.getElementById('listbox');
lb.addEventListener('change', function() {
  var sel = Array.prototype.map.call(lb.selectedOptions, function(o) { return o.text; });
  document.getElementById('lb-sel').textContent = sel.length ? sel.join('、') : '（なし）';
});
// ツリーの＋／−ボタンで、子要素を折りたたむ・開く。
document.querySelectorAll('.tree .ttoggle').forEach(function(t) {
  t.addEventListener('click', function(e) {
    e.stopPropagation();
    var li = t.closest('li');
    var collapsed = li.classList.toggle('collapsed');
    t.textContent = collapsed ? '+' : '−';
  });
});
document.querySelectorAll('[data-node]').forEach(function(n) {
  n.addEventListener('click', function() {
    document.querySelectorAll('[data-node]').forEach(function(x) { x.classList.remove('selected'); });
    n.classList.add('selected');
  });
});

/* ---------- プログレスバーとスライダー ---------- */
var progBar = document.getElementById('prog-bar');
var progLabel = document.getElementById('prog-label');
var timer = null;
document.getElementById('prog-start').addEventListener('click', function() {
  if (timer) return;
  var p = 0;
  progBar.style.width = '0%';
  progLabel.textContent = 'コピー中… 0%';
  timer = setInterval(function() {
    p += Math.floor(Math.random() * 9) + 3;
    if (p >= 100) {
      p = 100; clearInterval(timer); timer = null;
      progLabel.textContent = 'コピーが完了しました。';
      setStatus('コピーが完了しました');
    } else {
      progLabel.textContent = 'コピー中… ' + p + '%';
    }
    progBar.style.width = p + '%';
  }, 220);
});
var vol = document.getElementById('vol');
vol.addEventListener('input', function() {
  document.getElementById('vol-val').textContent = vol.value;
});

/* ---------- カレンダー（今月） ---------- */
(function buildCal() {
  var now = new Date();
  var y = now.getFullYear(), m = now.getMonth(), today = now.getDate();
  var first = new Date(y, m, 1).getDay();
  /* 「来月の0日」は「今月の末日」と同じ日になる。月末の日数を得るためのよく使う書き方 */
  var days = new Date(y, m + 1, 0).getDate();
  var prevDays = new Date(y, m, 0).getDate();
  var html = '<h4>' + y + '年 ' + (m + 1) + '月</h4><table><tr><th>日</th><th>月</th><th>火</th><th>水</th><th>木</th><th>金</th><th>土</th></tr><tr>';
  var cell = 0;
  for (var i = 0; i < first; i++) { html += '<td class="dim">' + (prevDays - first + 1 + i) + '</td>'; cell++; }
  for (var d = 1; d <= days; d++) {
    html += '<td' + (d === today ? ' class="today"' : '') + '>' + d + '</td>';
    cell++;
    if (cell % 7 === 0 && d < days) html += '</tr><tr>';
  }
  var rest = cell % 7;
  if (rest) { for (var j = 1; j <= 7 - rest; j++) html += '<td class="dim">' + j + '</td>'; }
  html += '</tr></table>';
  document.getElementById('cal').innerHTML = html;
})();
