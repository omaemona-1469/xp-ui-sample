// 共有状態（state.js）
// --------------------
// このファイルは、複数のモジュールで使う「共有のもの」を1か所に集めたもの。
// ウィンドウの重なり順の番号や、よく使う要素、ステータスバーの表示をここに置く。
// こうすると「どこで何が変わるのか」が追いやすくなる。
// ほかのモジュールは、ここから必要なものを import して使う。

// デスクトップ全体の要素。ウィンドウやアイコンの親になる。
export const desktop = document.getElementById('desktop');

// タスクバーのボタンを並べる場所。
export const taskbtns = document.getElementById('taskbtns');

// メインウィンドウ下のステータスバー（左側の広い欄）。
const statusMain = document.getElementById('status-main');

/* 重なり順の番号。ウィンドウを開くたびに1ずつ増やし、後から開いたものが手前に来る */
// 元のコードでは zTop という変数だった。モジュール間で共有するため、
// 直接いじらず nextZ() で1つ進めた番号をもらう形にした。
// （こうすると、番号がどこで進むのかが nextZ() の呼び出しだけに絞られる）
let zTop = 10;

// 重なり順の番号を1つ進めて、その番号を返す。
export function nextZ() {
  zTop += 1;
  return zTop;
}

// ステータスバーに文字を出す。要素がない場合は何もしない。
export function setStatus(t) {
  if (statusMain) statusMain.textContent = t;
}
