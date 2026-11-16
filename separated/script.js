(function(){
        "use strict";
        var desktop = document.getElementById('desktop');
        var zTop = 10;
        var statusMain = document.getElementById('status-main');
        function setStatus(t){ if(statusMain) statusMain.textContent = t; }

        /* ---------- windows & taskbar ---------- */
        var wins = Array.prototype.slice.call(document.querySelectorAll('.window:not(.dialog)'));
        var taskbtns = document.getElementById('taskbtns');
        var taskMap = {};

        function iconFor(win){
          var use = win.querySelector('.titlebar .ticon use');
          return use ? use.getAttribute('href') : '#i-gear';
        }
        wins.forEach(function(win){
          win.style.zIndex = ++zTop;
          win._closed = false;
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'taskbtn';
          b.innerHTML = '<svg><use href="' + iconFor(win) + '"/></svg>' + win.getAttribute('data-title');
          b.addEventListener('click', function(){
            if (win._closed) return;
            if (win.style.display === 'none'){ showWin(win); }
            else if (win.classList.contains('active')){ win.style.display = 'none'; win.classList.remove('active'); syncTask(); }
            else { focusWin(win); }
          });
          taskbtns.appendChild(b);
          taskMap[win.id] = b;
        });
        function syncTask(){
          wins.forEach(function(w){
            var b = taskMap[w.id];
            /* closed windows are removed from the taskbar; minimized ones stay */
            b.style.display = w._closed ? 'none' : '';
            b.classList.toggle('active', !w._closed && w.style.display !== 'none' && w.classList.contains('active'));
          });
        }
        function focusWin(win){
          wins.forEach(function(w){ w.classList.remove('active'); });
          win.classList.add('active');
          win.style.zIndex = ++zTop;
          syncTask();
        }
        function showWin(win){
          win._closed = false;
          win.style.display = '';
          /* taskbar order follows launch order: move this window's button to the end */
          var tb = taskMap[win.id];
          if (tb) taskbtns.appendChild(tb);
          focusWin(win);
        }
        wins.forEach(function(win){
          win.addEventListener('pointerdown', function(){ focusWin(win); });
          win.querySelectorAll('.tbtn[data-act]').forEach(function(btn){
            btn.addEventListener('click', function(e){
              e.stopPropagation();
              var act = btn.getAttribute('data-act');
              if (act === 'close'){ win._closed = true; win.style.display = 'none'; win.classList.remove('active'); syncTask(); }
              if (act === 'min'){ win.style.display = 'none'; win.classList.remove('active'); syncTask(); }
              if (act === 'max'){
                var on = win.classList.toggle('maximized');
                btn.innerHTML = '<svg><use href="#i-' + (on ? 'restore' : 'max') + '"/></svg>';
                btn.setAttribute('aria-label', on ? '元に戻す' : '最大化');
              }
            });
          });
          /* drag by titlebar */
          var bar = win.querySelector('.titlebar');
          var drag = null;
          bar.addEventListener('pointerdown', function(e){
            if (e.target.closest('.tbtn')) return;
            if (window.getComputedStyle(win).position !== 'absolute') return;
            if (win.classList.contains('maximized')) return;
            drag = { dx: e.clientX - win.offsetLeft, dy: e.clientY - win.offsetTop };
            bar.setPointerCapture(e.pointerId);
          });
          bar.addEventListener('pointermove', function(e){
            if (!drag) return;
            var maxX = desktop.clientWidth - 80, maxY = desktop.clientHeight - 34;
            win.style.left = Math.max(-win.offsetWidth + 120, Math.min(maxX, e.clientX - drag.dx)) + 'px';
            win.style.top = Math.max(0, Math.min(maxY, e.clientY - drag.dy)) + 'px';
          });
          bar.addEventListener('pointerup', function(){ drag = null; });
          bar.addEventListener('pointercancel', function(){ drag = null; });
          /* resize by window edges / bottom-right grip */
          var MINW = 280, MINH = 160;
          ['e', 'w', 's', 'se', 'sw'].forEach(function(dir){
            var h = document.createElement('div');
            h.className = 'resize-handle';
            h.setAttribute('data-dir', dir);
            h.setAttribute('aria-hidden', 'true');
            if (dir === 'se') h.title = 'ドラッグでサイズ変更';
            win.appendChild(h);
            var rs = null;
            h.addEventListener('pointerdown', function(e){
              if (e.button !== undefined && e.button !== 0) return;
              if (window.getComputedStyle(win).position !== 'absolute') return;
              if (win.classList.contains('maximized')) return;
              e.preventDefault();
              e.stopPropagation();
              focusWin(win);
              rs = { x: e.clientX, y: e.clientY, l: win.offsetLeft, t: win.offsetTop, w: win.offsetWidth, ht: win.offsetHeight };
              h.setPointerCapture(e.pointerId);
            });
            h.addEventListener('pointermove', function(e){
              if (!rs) return;
              var dx = e.clientX - rs.x, dy = e.clientY - rs.y;
              var nw = rs.w, nh = rs.ht, nl = rs.l;
              if (dir.indexOf('e') >= 0) nw = rs.w + dx;
              if (dir.indexOf('s') >= 0) nh = rs.ht + dy;
              if (dir.indexOf('w') >= 0){ nw = rs.w - dx; nl = rs.l + dx; }
              var maxW = dir.indexOf('e') >= 0 ? desktop.clientWidth - rs.l : rs.l + rs.w;
              var maxH = desktop.clientHeight - rs.t;
              nw = Math.max(MINW, Math.min(Math.max(maxW, MINW), nw));
              nh = Math.max(MINH, Math.min(Math.max(maxH, MINH), nh));
              if (dir.indexOf('w') >= 0) nl = rs.l + (rs.w - nw);
              win.style.width = nw + 'px';
              win.style.height = nh + 'px';
              if (dir.indexOf('w') >= 0) win.style.left = nl + 'px';
            });
            function endResize(){
              if (!rs) return;
              rs = null;
              setStatus('ウィンドウのサイズを変更しました（' + win.offsetWidth + ' × ' + win.offsetHeight + '）');
            }
            h.addEventListener('pointerup', endResize);
            h.addEventListener('pointercancel', endResize);
          });
        });
        syncTask();

        /* open windows from desktop icons (double-click) / start menu (single click) */
        document.querySelectorAll('[data-open]').forEach(function(el){
          var isIcon = el.classList.contains('dicon');
          function openTarget(){
            var target = document.getElementById(el.getAttribute('data-open'));
            if (target) showWin(target);
            closeStart();
          }
          el.addEventListener('click', function(){
            /* desktop icon selection is handled in the icon pointer handlers below
               (single / Ctrl toggle / range drag); here a click only selects on the
               static (phone) layout, where icons cannot be dragged */
            if (isIcon && window.getComputedStyle(el).position !== 'absolute'){
              document.querySelectorAll('.dicon').forEach(function(d){ d.classList.remove('selected'); });
              el.classList.add('selected');
            }
            /* desktop icons only select on a single click; they open on double-click */
            if (!isIcon) openTarget();
          });
          if (isIcon){
            el.addEventListener('dblclick', openTarget);
            /* keyboard: Enter opens the focused icon */
            el.addEventListener('keydown', function(e){
              if (e.key === 'Enter'){ e.preventDefault(); openTarget(); }
            });
          }
        });
        var binIcon = document.getElementById('dicon-bin');
        binIcon.addEventListener('click', function(){
          /* on the desktop layout selection is handled by the icon pointer handlers;
             this click fallback only covers the static (phone) layout */
          if (window.getComputedStyle(binIcon).position === 'absolute') return;
          document.querySelectorAll('.dicon').forEach(function(d){ d.classList.remove('selected'); });
          binIcon.classList.add('selected');
        });
        binIcon.addEventListener('dblclick', function(){
          openDialog('info', 'ごみ箱', 'ごみ箱は空です。削除できる項目はありません。', ['OK']);
        });
        binIcon.addEventListener('keydown', function(e){
          if (e.key === 'Enter'){
            e.preventDefault();
            openDialog('info', 'ごみ箱', 'ごみ箱は空です。削除できる項目はありません。', ['OK']);
          }
        });

        /* ---------- desktop icons: multi-select, group drag, marquee, align ---------- */
        var dicons = Array.prototype.slice.call(document.querySelectorAll('.dicon'));
        function deselectIcons(){
          dicons.forEach(function(d){ d.classList.remove('selected'); });
        }
        function selectOnly(ic){
          deselectIcons();
          ic.classList.add('selected');
        }
        function selectedIcons(){
          return dicons.filter(function(d){ return d.classList.contains('selected'); });
        }
        function iconsAbsolute(){
          return dicons.length && window.getComputedStyle(dicons[0]).position === 'absolute';
        }
        /* initial layout: stack the icons in a column at the left edge, as before */
        (function layoutIcons(){
          if (!iconsAbsolute()) return;
          var y = 10;
          dicons.forEach(function(ic){
            ic.style.left = '8px';
            ic.style.top = y + 'px';
            y += ic.offsetHeight + 6;
          });
        })();
        /* arrange every icon on an even grid, filling the first column top-to-bottom
           and then the next column, like XP's auto-arrange */
        function alignIcons(){
          if (!iconsAbsolute()){
            openDialog('info', 'アイコンを整列', 'この表示ではアイコンが横並びに固定されているため、整列は不要です。', ['OK']);
            return;
          }
          var startX = 8, startY = 10, gapX = 8, gapY = 6;
          var cellW = 0, cellH = 0;
          dicons.forEach(function(ic){
            cellW = Math.max(cellW, ic.offsetWidth);
            cellH = Math.max(cellH, ic.offsetHeight);
          });
          cellW += gapX; cellH += gapY;
          var rows = Math.max(1, Math.floor((desktop.clientHeight - startY + gapY) / cellH));
          dicons.forEach(function(ic, i){
            var col = Math.floor(i / rows), row = i % rows;
            ic.classList.add('snap');
            ic.style.left = (startX + col * cellW) + 'px';
            ic.style.top = (startY + row * cellH) + 'px';
          });
          setTimeout(function(){
            dicons.forEach(function(ic){ ic.classList.remove('snap'); });
          }, 320);
          setStatus('デスクトップ アイコンを等間隔に整列しました');
        }
        dicons.forEach(function(ic){
          var drag = null, moved = false, wasInMulti = false;
          ic.addEventListener('pointerdown', function(e){
            if (e.button !== undefined && e.button !== 0) return;
            if (!iconsAbsolute()) return;
            /* Ctrl / Cmd click toggles just this icon; Shift click adds it */
            if (e.ctrlKey || e.metaKey){ ic.classList.toggle('selected'); return; }
            if (e.shiftKey){ ic.classList.add('selected'); return; }
            wasInMulti = ic.classList.contains('selected') && selectedIcons().length > 1;
            if (!ic.classList.contains('selected')) selectOnly(ic);
            /* drag moves every selected icon together, keeping their offsets */
            drag = {
              x: e.clientX, y: e.clientY,
              items: selectedIcons().map(function(d){
                return { el: d, l: d.offsetLeft, t: d.offsetTop, w: d.offsetWidth, h: d.offsetHeight };
              })
            };
            moved = false;
            ic.setPointerCapture(e.pointerId);
          });
          ic.addEventListener('pointermove', function(e){
            if (!drag) return;
            var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
            if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
            moved = true;
            drag.items.forEach(function(it){ it.el.classList.add('dragging'); });
            /* clamp the whole group so no selected icon leaves the desktop */
            var minL = Infinity, minT = Infinity, maxR = -Infinity, maxB = -Infinity;
            drag.items.forEach(function(it){
              minL = Math.min(minL, it.l); minT = Math.min(minT, it.t);
              maxR = Math.max(maxR, it.l + it.w); maxB = Math.max(maxB, it.t + it.h);
            });
            dx = Math.max(-minL, Math.min(desktop.clientWidth - maxR, dx));
            dy = Math.max(-minT, Math.min(desktop.clientHeight - maxB, dy));
            drag.items.forEach(function(it){
              it.el.style.left = (it.l + dx) + 'px';
              it.el.style.top = (it.t + dy) + 'px';
            });
          });
          function endDrag(){
            if (!drag) return;
            var items = drag.items;
            drag = null;
            items.forEach(function(it){ it.el.classList.remove('dragging'); });
            if (moved){
              /* a drag that ends in a quick second tap must not open the window */
              items.forEach(function(it){
                it.el._dragMoved = true;
                setTimeout(function(){ it.el._dragMoved = false; }, 350);
              });
            } else if (wasInMulti){
              /* plain click on one icon of a multi-selection narrows it to that icon */
              selectOnly(ic);
            }
            wasInMulti = false;
          }
          ic.addEventListener('pointerup', endDrag);
          ic.addEventListener('pointercancel', endDrag);
        });
        desktop.addEventListener('dblclick', function(e){
          var ic = e.target.closest ? e.target.closest('.dicon') : null;
          if (ic && ic._dragMoved){ e.stopPropagation(); e.preventDefault(); }
        }, true);

        /* ---------- desktop icons: rename, XP style (F2 / slow click on the label) ---------- */
        var renaming = null;
        var renameTimer = null;
        var downInfo = null;
        function cancelRenameTimer(){
          if (renameTimer){ clearTimeout(renameTimer); renameTimer = null; }
        }
        function finishRename(save, refocus){
          if (!renaming || renaming.done) return;
          renaming.done = true;
          var r = renaming; renaming = null;
          var v = r.input.value.replace(/\s+/g, ' ').trim();
          if (save && v && v !== r.original){
            r.label.textContent = v;
            setStatus('アイコンの名前を「' + r.original + '」から「' + v + '」に変更しました');
          }
          r.label.style.visibility = '';
          r.ic.classList.remove('renaming');
          if (r.input.parentNode) r.input.parentNode.removeChild(r.input);
          if (refocus){
            try { r.ic.focus({ preventScroll:true }); } catch (err) { try { r.ic.focus(); } catch (e2) {} }
          }
        }
        function startRename(ic){
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
          input.addEventListener('pointerdown', function(e){ e.stopPropagation(); });
          input.addEventListener('click', function(e){ e.stopPropagation(); });
          input.addEventListener('dblclick', function(e){ e.stopPropagation(); });
          input.addEventListener('keydown', function(e){
            e.stopPropagation();
            if (e.key === 'Enter'){ e.preventDefault(); finishRename(true, true); }
            else if (e.key === 'Escape'){ e.preventDefault(); finishRename(false, true); }
          });
          input.addEventListener('blur', function(){ finishRename(true, false); });
          input.focus();
          try { input.select(); } catch (err) {}
        }
        /* capture the press state before the icon handlers change the selection:
           a rename starts only when the label of the already solely-selected icon
           is clicked again. The start is delayed so a double-click still opens. */
        desktop.addEventListener('pointerdown', function(e){
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
        dicons.forEach(function(ic){
          ic.addEventListener('click', function(e){
            if (!downInfo || downInfo.ic !== ic) return;
            var info = downInfo; downInfo = null;
            if (!info.sole || !info.onLabel) return;
            if (Math.abs(e.clientX - info.x) + Math.abs(e.clientY - info.y) > 6) return;
            if (ic._dragMoved) return;
            cancelRenameTimer();
            renameTimer = setTimeout(function(){
              renameTimer = null;
              if (ic.classList.contains('selected') && selectedIcons().length === 1) startRename(ic);
            }, 500);
          });
          ic.addEventListener('dblclick', function(){ cancelRenameTimer(); });
          ic.addEventListener('keydown', function(e){
            if (e.key === 'F2'){
              e.preventDefault(); e.stopPropagation();
              startRename(ic);
            }
          });
        });
        document.addEventListener('keydown', function(e){
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
        /* rubber-band selection on empty desktop; a plain click there still
           clears the selection, as before */
        var marquee = document.createElement('div');
        marquee.className = 'marquee';
        desktop.appendChild(marquee);
        var mq = null;
        function mqRect(){
          var r = desktop.getBoundingClientRect();
          var x1 = Math.min(mq.x, mq.cx) - r.left, x2 = Math.max(mq.x, mq.cx) - r.left;
          var y1 = Math.min(mq.y, mq.cy) - r.top, y2 = Math.max(mq.y, mq.cy) - r.top;
          return { l: x1, t: y1, r: x2, b: y2 };
        }
        function mqApply(){
          var rc = mqRect();
          dicons.forEach(function(ic){
            var hit = ic.offsetLeft < rc.r && ic.offsetLeft + ic.offsetWidth > rc.l &&
                      ic.offsetTop < rc.b && ic.offsetTop + ic.offsetHeight > rc.t;
            var keep = mq.additive && mq.prev.indexOf(ic) >= 0;
            ic.classList.toggle('selected', hit || keep);
          });
        }
        desktop.addEventListener('pointerdown', function(e){
          if (e.button !== undefined && e.button !== 0) return;
          var onEmpty = e.target === desktop || (e.target.closest && e.target.closest('.hills'));
          if (!onEmpty) return;
          if (!iconsAbsolute()){ deselectIcons(); return; }
          mq = {
            x: e.clientX, y: e.clientY, cx: e.clientX, cy: e.clientY, moved: false,
            additive: !!(e.ctrlKey || e.metaKey), prev: selectedIcons()
          };
          try { desktop.setPointerCapture(e.pointerId); } catch (err) {}
        });
        desktop.addEventListener('pointermove', function(e){
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
        function endMq(){
          if (!mq) return;
          var wasMoved = mq.moved, wasAdditive = mq.additive;
          mq = null;
          marquee.style.display = 'none';
          if (!wasMoved && !wasAdditive) deselectIcons();
        }
        desktop.addEventListener('pointerup', endMq);
        desktop.addEventListener('pointercancel', endMq);

        /* ---------- menus ---------- */
        var openMenu = null;
        function closeMenus(){
          document.querySelectorAll('.menu.open').forEach(function(m){ m.classList.remove('open'); });
          document.querySelectorAll('.mbtn.open').forEach(function(b){ b.classList.remove('open'); });
          openMenu = null;
        }
        document.querySelectorAll('[data-menu]').forEach(function(btn){
          btn.addEventListener('click', function(e){
            e.stopPropagation();
            var m = document.getElementById(btn.getAttribute('data-menu'));
            var was = m.classList.contains('open');
            closeMenus();
            if (!was){ m.classList.add('open'); btn.classList.add('open'); openMenu = m; }
          });
        });
        document.addEventListener('click', function(e){
          if (openMenu && !e.target.closest('.mitem')) closeMenus();
        });
        document.querySelectorAll('[data-menu-act]').forEach(function(el){
          el.addEventListener('click', function(){
            var act = el.getAttribute('data-menu-act');
            closeMenus();
            if (act === '終了'){
              var w = document.getElementById('win-main');
              w._closed = true; w.style.display = 'none'; w.classList.remove('active'); syncTask();
              return;
            }
            if (act === 'バージョン情報'){
              openDialog('info', 'バージョン情報', 'Windows XP風 UIサンプル\nバージョン 1.0（CSSのみで再現した見本です）', ['OK']);
              return;
            }
            setStatus('「' + act + '」が選択されました');
          });
        });

        /* ---------- tabs ---------- */
        document.querySelectorAll('.tab').forEach(function(tab){
          tab.addEventListener('click', function(){
            document.querySelectorAll('.tab').forEach(function(t){ t.setAttribute('aria-selected','false'); });
            tab.setAttribute('aria-selected','true');
            document.querySelectorAll('.tabpage').forEach(function(p){ p.hidden = true; });
            document.getElementById(tab.getAttribute('data-tab')).hidden = false;
            setStatus('タブ: ' + tab.textContent);
          });
        });

        /* ---------- buttons tab ---------- */
        var count = 0, countEl = document.getElementById('btn-count');
        document.querySelectorAll('[data-count]').forEach(function(b){
          b.addEventListener('click', function(){
            count++; countEl.textContent = count;
            setStatus('ボタンが ' + count + ' 回押されました');
          });
        });
        document.querySelectorAll('.xp-btn.toggle').forEach(function(b){
          b.addEventListener('click', function(){
            var on = b.classList.toggle('pressed');
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
        });

        /* ---------- modal dialog ---------- */
        var veil = document.getElementById('veil');
        var dlgTitle = document.getElementById('dlg-title');
        var dlgText = document.getElementById('dlg-text');
        var dlgUse = document.getElementById('dlg-use');
        var dlgBtns = document.getElementById('dlg-btns');
        var dlgResult = document.getElementById('dialog-result');
        var ICONS = { info:'#i-info', ques:'#i-ques', warn:'#i-warn', err:'#i-err' };
        /* taskbar button for the modal dialog (e.g. ごみ箱): shown only while the dialog is open */
        var dlgTaskBtn = document.createElement('button');
        dlgTaskBtn.type = 'button';
        dlgTaskBtn.className = 'taskbtn active';
        dlgTaskBtn.style.display = 'none';
        dlgTaskBtn.addEventListener('click', function(){
          if (!veil.classList.contains('open')) return;
          var first = dlgBtns.querySelector('button');
          if (first) first.focus();
        });
        taskbtns.appendChild(dlgTaskBtn);
        function syncDlgTask(show, title, type){
          if (show){
            var icon = (title === 'ごみ箱') ? '#i-bin' : (ICONS[type] || '#i-info');
            dlgTaskBtn.innerHTML = '<svg><use href="' + icon + '"/></svg>' + title;
            /* dialog's taskbar button also follows launch order */
            taskbtns.appendChild(dlgTaskBtn);
            dlgTaskBtn.style.display = '';
            dlgTaskBtn.classList.add('active');
          } else {
            dlgTaskBtn.style.display = 'none';
          }
        }
        function closeDialog(){
          veil.classList.remove('open');
          syncDlgTask(false);
        }
        function openDialog(type, title, text, buttons){
          dlgTitle.textContent = title;
          dlgText.textContent = text;
          dlgUse.setAttribute('href', ICONS[type] || '#i-info');
          dlgBtns.innerHTML = '';
          buttons.forEach(function(label, i){
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'xp-btn' + (i === 0 ? ' default' : '');
            b.textContent = label;
            b.addEventListener('click', function(){
              closeDialog();
              if (dlgResult) dlgResult.textContent = '「' + label + '」';
            });
            dlgBtns.appendChild(b);
          });
          var dlgEl = document.getElementById('dlg');
          /* reopen centered, even if it was dragged last time
             (important: the phone layout pins left/top with !important) */
          dlgEl.style.setProperty('left', '50%', 'important');
          dlgEl.style.setProperty('top', '38%', 'important');
          dlgEl.style.setProperty('transform', 'translate(-50%,-50%)', 'important');
          dlgEl.style.zIndex = ++zTop + 900;
          veil.classList.add('open');
          syncDlgTask(true, title, type);
          var first = dlgBtns.querySelector('button');
          if (first) first.focus();
        }
        document.getElementById('dlg-x').addEventListener('click', function(){ closeDialog(); });
        /* drag the modal dialog by its title bar */
        var dlgBox = document.getElementById('dlg');
        var dlgBar = dlgBox.querySelector('.titlebar');
        var dlgDrag = null;
        dlgBar.addEventListener('pointerdown', function(e){
          if (e.target.closest('.tbtn')) return;
          var r = dlgBox.getBoundingClientRect();
          var op = dlgBox.offsetParent;
          var opr = op ? op.getBoundingClientRect() : { left:0, top:0 };
          /* switch from transform centering to explicit coordinates at the same spot
             (important: the phone layout pins left/top with !important) */
          dlgBox.style.setProperty('transform', 'none', 'important');
          dlgBox.style.setProperty('left', (r.left - opr.left) + 'px', 'important');
          dlgBox.style.setProperty('top', (r.top - opr.top) + 'px', 'important');
          dlgDrag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
          dlgBar.setPointerCapture(e.pointerId);
        });
        dlgBar.addEventListener('pointermove', function(e){
          if (!dlgDrag) return;
          var op = dlgBox.offsetParent;
          var opr = op ? op.getBoundingClientRect() : { left:0, top:0 };
          var pw = op ? op.clientWidth : window.innerWidth;
          var ph = op ? op.clientHeight : window.innerHeight;
          var nl = e.clientX - opr.left - dlgDrag.dx;
          var nt = e.clientY - opr.top - dlgDrag.dy;
          nl = Math.max(-dlgBox.offsetWidth + 90, Math.min(pw - 60, nl));
          nt = Math.max(0, Math.min(ph - 30, nt));
          dlgBox.style.setProperty('left', nl + 'px', 'important');
          dlgBox.style.setProperty('top', nt + 'px', 'important');
        });
        dlgBar.addEventListener('pointerup', function(){ dlgDrag = null; });
        dlgBar.addEventListener('pointercancel', function(){ dlgDrag = null; });
        document.querySelectorAll('[data-dialog]').forEach(function(b){
          b.addEventListener('click', function(){
            var t = b.getAttribute('data-dialog');
            if (t === 'info') openDialog('info', '情報', '操作が正常に完了しました。これは情報ダイアログの見本です。', ['OK']);
            if (t === 'ques') openDialog('ques', '確認', '変更を保存しますか？', ['はい', 'いいえ']);
            if (t === 'warn') openDialog('warn', '警告', 'ディスクの空き領域が少なくなっています。これは警告ダイアログの見本です。', ['OK']);
            if (t === 'err') openDialog('err', 'エラー', 'ファイルが見つかりませんでした。（サンプルのエラー表示です）', ['OK']);
          });
        });

        /* ---------- form ---------- */
        document.getElementById('demo-form').addEventListener('submit', function(e){
          e.preventDefault();
          var name = document.getElementById('f-name').value.trim();
          if (!name){
            openDialog('err', '入力エラー', '名前が入力されていません。名前を入力してから、もう一度お試しください。', ['OK']);
            return;
          }
          openDialog('info', '登録完了', name + ' さんの設定を登録しました。（サンプルなので、どこにも送信されません）', ['OK']);
        });
        var num = document.getElementById('f-num');
        function spin(d){
          var v = parseInt(num.value, 10);
          if (isNaN(v)) v = 11;
          num.value = Math.max(6, Math.min(48, v + d));
        }
        document.getElementById('spin-up').addEventListener('click', function(){ spin(1); });
        document.getElementById('spin-down').addEventListener('click', function(){ spin(-1); });

        /* ---------- lists ---------- */
        document.querySelectorAll('#lv-body tr').forEach(function(tr){
          tr.addEventListener('click', function(){
            document.querySelectorAll('#lv-body tr').forEach(function(r){ r.classList.remove('selected'); });
            tr.classList.add('selected');
            document.getElementById('lv-sel').textContent = tr.cells[0].textContent;
          });
        });
        var lb = document.getElementById('listbox');
        lb.addEventListener('change', function(){
          var sel = Array.prototype.map.call(lb.selectedOptions, function(o){ return o.text; });
          document.getElementById('lb-sel').textContent = sel.length ? sel.join('、') : '（なし）';
        });
        document.querySelectorAll('.tree .ttoggle').forEach(function(t){
          t.addEventListener('click', function(e){
            e.stopPropagation();
            var li = t.closest('li');
            var collapsed = li.classList.toggle('collapsed');
            t.textContent = collapsed ? '+' : '−';
          });
        });
        document.querySelectorAll('[data-node]').forEach(function(n){
          n.addEventListener('click', function(){
            document.querySelectorAll('[data-node]').forEach(function(x){ x.classList.remove('selected'); });
            n.classList.add('selected');
          });
        });

        /* ---------- progress & slider ---------- */
        var progBar = document.getElementById('prog-bar');
        var progLabel = document.getElementById('prog-label');
        var timer = null;
        document.getElementById('prog-start').addEventListener('click', function(){
          if (timer) return;
          var p = 0;
          progBar.style.width = '0%';
          progLabel.textContent = 'コピー中… 0%';
          timer = setInterval(function(){
            p += Math.floor(Math.random() * 9) + 3;
            if (p >= 100){
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
        vol.addEventListener('input', function(){
          document.getElementById('vol-val').textContent = vol.value;
        });

        /* ---------- calendar (current month) ---------- */
        (function buildCal(){
          var now = new Date();
          var y = now.getFullYear(), m = now.getMonth(), today = now.getDate();
          var first = new Date(y, m, 1).getDay();
          var days = new Date(y, m + 1, 0).getDate();
          var prevDays = new Date(y, m, 0).getDate();
          var html = '<h4>' + y + '年 ' + (m + 1) + '月</h4><table><tr><th>日</th><th>月</th><th>火</th><th>水</th><th>木</th><th>金</th><th>土</th></tr><tr>';
          var cell = 0;
          for (var i = 0; i < first; i++){ html += '<td class="dim">' + (prevDays - first + 1 + i) + '</td>'; cell++; }
          for (var d = 1; d <= days; d++){
            html += '<td' + (d === today ? ' class="today"' : '') + '>' + d + '</td>';
            cell++;
            if (cell % 7 === 0 && d < days) html += '</tr><tr>';
          }
          var rest = cell % 7;
          if (rest){ for (var j = 1; j <= 7 - rest; j++) html += '<td class="dim">' + j + '</td>'; }
          html += '</tr></table>';
          document.getElementById('cal').innerHTML = html;
        })();

        /* ---------- start menu & clock ---------- */
        var startbtn = document.getElementById('startbtn');
        var startmenu = document.getElementById('startmenu');
        function closeStart(){
          startmenu.classList.remove('open');
          startbtn.classList.remove('open');
          startbtn.setAttribute('aria-expanded','false');
        }
        startbtn.addEventListener('click', function(e){
          e.stopPropagation();
          var open = startmenu.classList.toggle('open');
          startbtn.classList.toggle('open', open);
          startbtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        document.addEventListener('click', function(e){
          if (!e.target.closest('#startmenu') && !e.target.closest('#startbtn')) closeStart();
        });
        document.getElementById('sm-all').addEventListener('click', function(){
          closeStart();
          var w = document.getElementById('win-main'); showWin(w);
          setStatus('すべてのプログラム（見本ではコントロール見本を開きます）');
        });
        document.getElementById('sm-align').addEventListener('click', function(){
          closeStart();
          alignIcons();
        });
        document.getElementById('sm-logoff').addEventListener('click', function(){
          closeStart();
          openDialog('ques', 'ログオフ', 'ログオフしますか？（サンプルなので、実際にはログオフしません）', ['はい', 'いいえ']);
        });
        document.getElementById('sm-power').addEventListener('click', function(){
          closeStart();
          openDialog('info', '電源', 'サンプル ページなので、電源は切れません。タスク バーのボタンや × ボタンでウィンドウを閉じられます。', ['OK']);
        });
        var clock = document.getElementById('clock');
        function tick(){
          var n = new Date();
          clock.textContent = ('0' + n.getHours()).slice(-2) + ':' + ('0' + n.getMinutes()).slice(-2);
          clock.title = n.getFullYear() + '年' + (n.getMonth() + 1) + '月' + n.getDate() + '日';
        }
        tick(); setInterval(tick, 15000);

        document.addEventListener('keydown', function(e){
          if (e.key === 'Escape'){ closeStart(); closeMenus(); closeDialog(); }
        });
      })();
