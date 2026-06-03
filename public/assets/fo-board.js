/* FO 게시판(문의·환불) — API 작성 + 목록 + 상세 */
(function () {
  'use strict';

  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function nl2br(s) {
    return esc(s).replace(/\n/g, '<br>');
  }

  var STATUS_CLASS = {
    received: 'status-applied',
    in_review: 'status-photo',
    awaiting_reply: 'status-photo',
    answered: 'status-approved',
    completed: 'status-approved',
    rejected: 'status-rejected',
  };
  function statusClass(ws) {
    return STATUS_CLASS[ws] || 'status-applied';
  }

  function currentUserName() {
    try {
      var u = window.TopikApi && TopikApi.getUser && TopikApi.getUser();
      return (u && (u.name_ko || u.name)) || '본인';
    } catch (e) {
      return '본인';
    }
  }

  // -------------------------------------------------------------------------
  // 작성(공통)
  // -------------------------------------------------------------------------
  function wireSubmit(opts) {
    var btn = opts.submitBtn;
    if (!btn || !window.TopikApi) return;

    btn.addEventListener('click', function () {
      if (!TopikApi.canUseApi()) {
        alert('서버에 연결할 수 없습니다.');
        return;
      }
      if (!TopikApi.isLoggedIn()) {
        location.href =
          'login.html?next=' + encodeURIComponent(location.pathname.split('/').pop());
        return;
      }

      var title = (opts.titleEl && opts.titleEl.value.trim()) || '';
      var body = (opts.bodyEl && opts.bodyEl.value.trim()) || '';
      var category = opts.categoryEl ? opts.categoryEl.value.trim() : '';
      // refund-correction: 유형(환불/정보정정) 라디오를 category 로 사용
      if (!category && typeof opts.resolveCategory === 'function') {
        category = opts.resolveCategory() || '';
      }
      var isSecret = opts.secretRadio ? opts.secretRadio.checked : false;
      var secretPw = opts.secretPwEl ? opts.secretPwEl.value : '';

      if (!title || title.length > 100) {
        alert('제목을 100자 이내로 입력해 주세요.');
        return;
      }
      if (!body || body.length < 10) {
        alert('내용을 10자 이상 입력해 주세요.');
        return;
      }
      if (isSecret && (!secretPw || secretPw.length < 4)) {
        alert('비밀글 비밀번호는 4자 이상이어야 합니다.');
        return;
      }

      btn.disabled = true;
      var prev = btn.textContent;
      btn.textContent = '제출 중…';

      TopikApi.createBoardPost({
        board_type: opts.boardType,
        title: title,
        body: body,
        category: category || null,
        is_secret: isSecret,
        secret_password: isSecret ? secretPw : undefined,
      }).then(function (res) {
        btn.disabled = false;
        btn.textContent = prev;
        if (!res.ok) {
          alert(TopikApi.parseError(res));
          return;
        }
        alert(res.body.message || '접수되었습니다.');
        // 입력값 초기화
        if (opts.titleEl) opts.titleEl.value = '';
        if (opts.bodyEl) opts.bodyEl.value = '';
        if (opts.onSuccess) opts.onSuccess();
        else if (opts.listPaneId && window.show) window.show(opts.listPaneId);
      }).catch(function () {
        btn.disabled = false;
        btn.textContent = prev;
        alert('네트워크 오류입니다.');
      });
    });
  }

  // -------------------------------------------------------------------------
  // 목록 + 상세
  // -------------------------------------------------------------------------
  function initBoard(opts) {
    var listBody = opts.listBody;
    var pager = opts.pager;
    var colspan = opts.colspan || 6;
    var d = opts.detail || {};
    var show = opts.show || window.show || function () {};

    var state = { page: 1, items: [], pagination: null, filter: null };

    function emptyRow(msg) {
      return (
        '<tr><td colspan="' + colspan +
        '" style="text-align:center;padding:32px;color:var(--text-3);">' +
        esc(msg) + '</td></tr>'
      );
    }

    function visibleItems() {
      if (typeof state.filter === 'function') {
        return state.items.filter(state.filter);
      }
      return state.items;
    }

    function renderList() {
      var items = visibleItems();
      if (!items.length) {
        listBody.innerHTML = emptyRow('등록된 게시글이 없습니다.');
        return;
      }
      var total = (state.pagination && state.pagination.total_items) || items.length;
      var pageSize = (state.pagination && state.pagination.page_size) || items.length;
      var startNo = total - (state.page - 1) * pageSize;
      var author = currentUserName();
      var typeCell = opts.typeCell || function () { return '<span class="badge badge-outline">-</span>'; };

      listBody.innerHTML = items.map(function (p, idx) {
        var lock = p.is_secret ? '<span class="lock">🔒</span> ' : '';
        return (
          '<tr data-id="' + p.id + '">' +
          '<td class="col-num">' + esc(startNo - idx) + '</td>' +
          '<td class="' + (opts.typeCellClass || 'col-cat') + '">' + typeCell(p) + '</td>' +
          '<td>' + lock + esc(p.title) + '</td>' +
          '<td class="col-author">' + esc(author) + '</td>' +
          '<td class="col-date">' + esc(p.date_formatted) + '</td>' +
          '<td class="col-status"><span class="status ' + statusClass(p.workflow_status) +
          '">' + esc(p.status_label) + '</span></td>' +
          '</tr>'
        );
      }).join('');

      listBody.querySelectorAll('tr[data-id]').forEach(function (tr) {
        tr.addEventListener('click', function () {
          openDetail(tr.getAttribute('data-id'));
        });
      });
    }

    function renderPager() {
      if (!pager) return;
      var pg = state.pagination;
      if (!pg || pg.total_pages <= 1) { pager.innerHTML = ''; return; }
      var html = '';
      html += pg.page > 1
        ? '<a href="javascript:void(0)" data-page="' + (pg.page - 1) + '">‹</a>'
        : '<span class="disabled">‹</span>';
      for (var i = 1; i <= pg.total_pages; i++) {
        html += i === pg.page
          ? '<span class="current">' + i + '</span>'
          : '<a href="javascript:void(0)" data-page="' + i + '">' + i + '</a>';
      }
      html += pg.page < pg.total_pages
        ? '<a href="javascript:void(0)" data-page="' + (pg.page + 1) + '">›</a>'
        : '<span class="disabled">›</span>';
      pager.innerHTML = html;
      pager.querySelectorAll('a[data-page]').forEach(function (a) {
        a.addEventListener('click', function () {
          load(Number(a.getAttribute('data-page')));
        });
      });
    }

    function load(page) {
      state.page = page || 1;
      listBody.innerHTML = emptyRow('불러오는 중…');
      if (pager) pager.innerHTML = '';
      if (!window.TopikApi || !TopikApi.canUseApi()) {
        listBody.innerHTML = emptyRow('서버에 연결할 수 없습니다.');
        return;
      }
      TopikApi.getBoardPosts(opts.boardType, { page: state.page }).then(function (res) {
        if (!res.ok) {
          if (res.status === 401) {
            location.href = 'login.html?next=' +
              encodeURIComponent(location.pathname.split('/').pop());
            return;
          }
          listBody.innerHTML = emptyRow(TopikApi.parseError(res));
          return;
        }
        state.items = (res.body && res.body.items) || [];
        state.pagination = (res.body && res.body.pagination) || null;
        renderList();
        renderPager();
      }).catch(function () {
        listBody.innerHTML = emptyRow('네트워크 오류입니다.');
      });
    }

    function openDetail(id) {
      show(opts.detailPaneId || 'detailPane');
      if (d.title) d.title.textContent = '불러오는 중…';
      if (d.body) d.body.innerHTML = '<p style="color:var(--text-3);">로딩 중입니다.</p>';
      if (d.reply) d.reply.style.display = 'none';
      if (d.badge) d.badge.textContent = '';
      if (d.status) { d.status.textContent = ''; d.status.className = 'status'; }
      if (d.meta) d.meta.innerHTML = '';

      TopikApi.getBoardPost(id).then(function (res) {
        if (!res.ok) {
          if (d.title) d.title.textContent = '게시글을 불러올 수 없습니다';
          if (d.body) d.body.innerHTML = '<p>' + esc(TopikApi.parseError(res)) + '</p>';
          return;
        }
        var p = res.body;
        if (d.title) d.title.textContent = p.title;
        if (d.badge) {
          var label = p.category || p.post_type || '문의';
          d.badge.textContent = label;
          d.badge.className = opts.detailBadgeClass
            ? opts.detailBadgeClass(p)
            : 'badge badge-outline';
        }
        if (d.status) {
          d.status.className = 'status ' + statusClass(p.workflow_status);
          d.status.textContent = p.status_label || '';
        }
        if (d.meta) {
          var secret = p.is_secret ? '<span>·</span><span>🔒 비밀글</span>' : '';
          d.meta.innerHTML =
            '<span>' + esc(p.author_name || currentUserName()) + '</span>' +
            '<span>·</span><span>' + esc(p.date_formatted) + '</span>' + secret;
        }
        if (d.body) d.body.innerHTML = '<p>' + nl2br(p.body) + '</p>';
        if (d.reply) {
          if (p.admin_reply) {
            d.reply.style.display = '';
            if (d.replyBody) d.replyBody.innerHTML = nl2br(p.admin_reply);
            if (d.replyWhen) {
              d.replyWhen.textContent = p.admin_replied_at
                ? new Date(p.admin_replied_at).toLocaleDateString('ko-KR')
                : '';
            }
          } else {
            d.reply.style.display = 'none';
          }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }).catch(function () {
        if (d.title) d.title.textContent = '게시글을 불러올 수 없습니다';
        if (d.body) d.body.innerHTML = '<p>네트워크 오류입니다.</p>';
      });
    }

    function setFilter(fn) {
      state.filter = fn;
      renderList();
    }

    return {
      load: load,
      openDetail: openDetail,
      setFilter: setFilter,
      reload: function () { load(state.page); },
    };
  }

  window.TPKMBoard = {
    wireSubmit: wireSubmit,
    initBoard: initBoard,
    statusClass: statusClass,
  };
})();
