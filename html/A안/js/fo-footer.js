/**
 * FO 공통 푸터 — index.html 의 전체 푸터(브랜드·운영기관·관련 링크·문의처·카피라이트)를
 * 모든 FO 페이지에 동일하게 주입한다.
 *  - 페이지에 <footer> 가 있으면 내용을 전체 푸터로 교체, 없으면 body 끝에 생성.
 *  - 푸터 스타일과 SVG 스프라이트가 없는 페이지에서도 동작하도록 함께 보강한다.
 *  - i18n(data-i18n) 키는 i18n.js 와 동일하게 사용.
 */
(function (global) {
  var STYLE_ID = "__tm-footer-style";
  var MARK_ATTR = "data-tm-footer";

  var FOOTER_CSS =
    "footer{background:#1a2a4a;color:#aab8cc;padding:40px 24px 20px;text-align:left;}" +
    "footer .footer-inner{max-width:1200px;margin:0 auto;}" +
    "footer .footer-top{display:flex;gap:40px;flex-wrap:wrap;margin-bottom:32px;}" +
    "footer .footer-brand p{font-size:12px;margin-top:10px;line-height:1.8;max-width:280px;}" +
    "footer .footer-col h4{color:white;font-size:13px;font-weight:600;margin-bottom:12px;}" +
    "footer .footer-col ul{list-style:none;display:flex;flex-direction:column;gap:8px;}" +
    "footer .footer-col ul li a{color:#aab8cc;text-decoration:none;font-size:12px;display:flex;align-items:center;gap:6px;transition:color .2s;}" +
    "footer .footer-col ul li a:hover{color:var(--gold,#C8963E);}" +
    "footer .footer-brand-logo{display:flex;align-items:center;gap:10px;}" +
    "footer .footer-brand-logo .main{font-size:16px;font-weight:700;color:white;}" +
    "footer .footer-divider{border:none;border-top:1px solid #2e3e5c;margin:20px 0;}" +
    "footer .footer-bottom{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;font-size:12px;max-width:1200px;margin:0 auto;}" +
    "@media(max-width:760px){footer .footer-top{flex-direction:column;gap:24px;}}";

  var FOOTER_HTML =
    '<div class="footer-inner">' +
    '<div class="footer-top">' +
    '<div class="footer-brand">' +
    '<div class="footer-brand-logo">' +
    '<svg width="36" height="36"><use href="#ic-topik-logo"/></svg>' +
    '<div class="main">TOPIK Myanmar</div>' +
    "</div>" +
    '<p data-i18n="foot_brand" data-i18n-html="">주관: 국립국제교육원 (NIIED)<br/>운영: <strong>주미얀마 대한민국 대사관</strong><br/>운영시간: 평일 09:00~17:00 (UTC+6:30)<br/>문의: topik.myanmar@koica.go.kr</p>' +
    '<p style="margin-top:10px;font-size:11px;"><a href="#" onclick="alert(\'개인정보처리방침은 별도 페이지로 제공됩니다.\');return false;" style="color:#aab8cc;">개인정보처리방침</a> · <a href="rules.html" style="color:#aab8cc;">이용약관</a></p>' +
    "</div>" +
    '<div class="footer-col">' +
    '<h4 data-i18n="foot_menu">사이트 메뉴</h4>' +
    "<ul>" +
    '<li><a href="guide.html">TOPIK 안내</a></li>' +
    '<li><a href="rules.html">TOPIK 규정</a></li>' +
    '<li><a href="apply-howto.html">접수 방법</a></li>' +
    '<li><a href="notice.html">공지사항</a></li>' +
    '<li><a href="board-refund.html">환불·정보정정</a></li>' +
    '<li><a href="faq.html">FAQ</a></li>' +
    "</ul>" +
    "</div>" +
    '<div class="footer-col">' +
    '<h4 data-i18n="foot_links">관련 링크</h4>' +
    "<ul>" +
    '<li><a href="https://www.topik.go.kr/" target="_blank" rel="noopener noreferrer"><svg class="icon" width="12" height="12"><use href="#ic-link"/></svg>TOPIK (topik.go.kr)</a></li>' +
    '<li><a href="https://www.niied.go.kr/web/main/main" target="_blank" rel="noopener noreferrer"><svg class="icon" width="12" height="12"><use href="#ic-link"/></svg>NIIED (niied.go.kr)</a></li>' +
    '<li><a href="https://overseas.mofa.go.kr/mm-ko/index.do" target="_blank" rel="noopener noreferrer"><svg class="icon" width="12" height="12"><use href="#ic-link"/></svg>재외공관 안내</a></li>' +
    "</ul>" +
    "</div>" +
    '<div class="footer-col">' +
    '<h4 data-i18n="foot_contact">문의처</h4>' +
    "<ul>" +
    '<li><a href="#"><svg class="icon" width="12" height="12"><use href="#ic-phone"/></svg>+95-1-234-5678</a></li>' +
    '<li><a href="#"><svg class="icon" width="12" height="12"><use href="#ic-email"/></svg>topik.myanmar@koica.go.kr</a></li>' +
    '<li><a href="#"><svg class="icon" width="12" height="12"><use href="#ic-clock"/></svg>운영시간: 평일 09:00~17:00</a></li>' +
    "</ul>" +
    "</div>" +
    "</div>" +
    '<hr class="footer-divider"/>' +
    '<div class="footer-bottom">' +
    "<span>© 2026 TOPIK Myanmar. All rights reserved.</span>" +
    "<span>운영기관: 주미얀마 대한민국 대사관 · 주관: NIIED</span>" +
    "</div>" +
    "</div>";

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent = FOOTER_CSS;
    document.head.appendChild(st);
  }

  function ensureSprite() {
    if (document.getElementById("ic-link")) return;
    if (document.querySelector('script[src*="svg-sprite.js"]')) return;
    var sc = document.createElement("script");
    sc.src = "js/svg-sprite.js";
    document.head.appendChild(sc);
  }

  function render() {
    var footer = document.querySelector("footer");
    if (footer && footer.getAttribute(MARK_ATTR) === "1") return;
    if (!footer) {
      footer = document.createElement("footer");
      document.body.appendChild(footer);
    }
    injectStyle();
    ensureSprite();
    footer.setAttribute(MARK_ATTR, "1");
    footer.innerHTML = FOOTER_HTML;
    if (global.TMI18N && typeof TMI18N.apply === "function") {
      try {
        TMI18N.apply(TMI18N.getLang());
      } catch (e) {}
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }

  global.TMFOFooter = { render: render };
})(typeof window !== "undefined" ? window : this);
