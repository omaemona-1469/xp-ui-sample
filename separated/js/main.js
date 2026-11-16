// エントリ（main.js）
// -----------------
// このファイルが最初に読み込まれる。
// ここでは、各モジュールを読み込んで、
// 「アイコンやスタートメニューからウィンドウを開く」といった、
// 複数のモジュールにまたがる配線だけを行う。
//
// 読み込みの順番が、そのまま初期化の順番になる。
// ウィンドウ → ダイアログ → アイコン → 名前変更 → 見本 → スタートメニュー
// の順で読み込む。順番を変えると、タスクバーのボタンの並びなどが変わるので注意。
//
// なお、ESモジュール（type="module"）は、HTMLの解析が終わってから実行される。
// そのため、ここで document.getElementById などを使っても、要素はもう存在する。

// 各モジュールを読み込む。import しただけで、そのファイルの上のほうに書かれた
// 初期設定のコードが実行される。順番が大事なので並び替えないこと。
import { showWin } from './windows.js';
import { openDialog, closeDialog } from './dialogs.js';
import './icons.js';
import './rename.js';
import { closeMenus } from './panels.js';
import { closeStart } from './startmenu.js';

/* デスクトップアイコンはダブルクリック、スタートメニューは1回のクリックでウィンドウを開く */
document.querySelectorAll('[data-open]').forEach(function(el) {
  var isIcon = el.classList.contains('dicon');
  function openTarget() {
    var target = document.getElementById(el.getAttribute('data-open'));
    if (target) showWin(target);
    closeStart();
  }
  el.addEventListener('click', function() {
    /* デスクトップアイコンの選択は、アイコンのポインター処理でまとめて行う。ここではスマホ用の固定レイアウト（ドラッグできない場合）だけ、クリックで選択する */
    if (isIcon && window.getComputedStyle(el).position !== 'absolute') {
      document.querySelectorAll('.dicon').forEach(function(d) { d.classList.remove('selected'); });
      el.classList.add('selected');
    }
    /* デスクトップアイコンは1回のクリックでは選ぶだけ。開くのはダブルクリック */
    if (!isIcon) openTarget();
  });
  if (isIcon) {
    el.addEventListener('dblclick', openTarget);
    /* キーボード:Enterキーで選んだアイコンを開く */
    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); openTarget(); }
    });
  }
});

// ごみ箱のアイコン。ウィンドウではなく「ごみ箱は空です」というダイアログを開く。
var binIcon = document.getElementById('dicon-bin');
binIcon.addEventListener('click', function() {
  /* デスクトップ表示での選択はアイコンのポインター処理に任せる。この処理はスマホ用の固定レイアウトだけの予備 */
  if (window.getComputedStyle(binIcon).position === 'absolute') return;
  document.querySelectorAll('.dicon').forEach(function(d) { d.classList.remove('selected'); });
  binIcon.classList.add('selected');
});
binIcon.addEventListener('dblclick', function() {
  openDialog('info', 'ごみ箱', 'ごみ箱は空です。削除できる項目はありません。', ['OK']);
});
binIcon.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    openDialog('info', 'ごみ箱', 'ごみ箱は空です。削除できる項目はありません。', ['OK']);
  }
});

// Escキーで、スタートメニュー・メニュー・ダイアログをまとめて閉じる。
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { closeStart(); closeMenus(); closeDialog(); }
});
