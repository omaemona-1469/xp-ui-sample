// スタートメニューと時計（startmenu.js）
// --------------------------------
// スタートボタンを押すと出るメニューと、タスクバーの時計を扱う。
// このファイルは state.js、windows.js、icons.js、dialogs.js に依存する。

import { setStatus } from './state.js';
import { showWin } from './windows.js';
import { alignIcons } from './icons.js';
import { openDialog } from './dialogs.js';

var startbtn = document.getElementById('startbtn');
var startmenu = document.getElementById('startmenu');

// スタートメニューを閉じる。
export function closeStart() {
  startmenu.classList.remove('open');
  startbtn.classList.remove('open');
  startbtn.setAttribute('aria-expanded', 'false');
}
startbtn.addEventListener('click', function(e) {
  e.stopPropagation();
  var open = startmenu.classList.toggle('open');
  startbtn.classList.toggle('open', open);
  startbtn.setAttribute('aria-expanded', open ? 'true' : 'false');
});
document.addEventListener('click', function(e) {
  if (!e.target.closest('#startmenu') && !e.target.closest('#startbtn')) closeStart();
});
document.getElementById('sm-all').addEventListener('click', function() {
  closeStart();
  var w = document.getElementById('win-main'); showWin(w);
  setStatus('すべてのプログラム（見本ではコントロール見本を開きます）');
});
document.getElementById('sm-align').addEventListener('click', function() {
  closeStart();
  alignIcons();
});
document.getElementById('sm-logoff').addEventListener('click', function() {
  closeStart();
  openDialog('ques', 'ログオフ', 'ログオフしますか？（サンプルなので、実際にはログオフしません）', ['はい', 'いいえ']);
});
document.getElementById('sm-power').addEventListener('click', function() {
  closeStart();
  openDialog('info', '電源', 'サンプル ページなので、電源は切れません。タスク バーのボタンや × ボタンでウィンドウを閉じられます。', ['OK']);
});

// タスクバーの時計。15秒ごとに更新する。
var clock = document.getElementById('clock');
function tick() {
  var n = new Date();
  /* 1桁の数に0を付けて2桁にする（例:9時5分→09:05）。slice(-2)は末尾2文字だけを取り出す */
  clock.textContent = ('0' + n.getHours()).slice(-2) + ':' + ('0' + n.getMinutes()).slice(-2);
  clock.title = n.getFullYear() + '年' + (n.getMonth() + 1) + '月' + n.getDate() + '日';
}
tick(); setInterval(tick, 15000);
