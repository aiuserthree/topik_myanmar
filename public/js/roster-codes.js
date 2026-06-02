/**
 * 연명부 양식 코드 — FO 06_계정 · BO 02_접수관리
 * 직업 1~12 / 응시동기 1~11 / 응시목적 1~15
 * Labels: html/B안/signup.html (연명부 양식 mock, 고객사 0519)
 */
(function (root) {
  var JOBS = {
    '1': '학생', '2': '회사원', '3': '공무원', '4': '자영업', '5': '전문직',
    '6': '주부', '7': '무직', '8': '교사', '9': '군인', '10': '농업·어업',
    '11': '기타', '12': '미상'
  };
  var MOTIVES = {
    '1': '유학 및 진학', '2': '취업 및 이민', '3': '자격 취득', '4': '개인적 관심',
    '5': '학업 요건', '6': '장학금 신청', '7': '비자 발급', '8': '기업 요구',
    '9': '한국 문화 관심', '10': '기타', '11': '미상'
  };
  var PURPOSES = {
    '1': '대학 입학', '2': '대학원 입학', '3': '취업', '4': '비자 발급', '5': '장학금',
    '6': '자격증', '7': '개인 학습', '8': '기업 요구', '9': '유학', '10': '이민',
    '11': '한국어 교육', '12': '연구', '13': '교환학생', '14': '기타', '15': '미상'
  };
  function sortedKeys(map) {
    return Object.keys(map).sort(function (a, b) { return +a - +b; });
  }
  root.TPKM_ROSTER_CODES = {
    jobs: JOBS,
    motives: MOTIVES,
    purposes: PURPOSES,
    label: function (kind, code) {
      var m = kind === 'job' ? JOBS : kind === 'motive' ? MOTIVES : PURPOSES;
      return m[String(code)] || '';
    },
    fillSelect: function (sel, kind, opts) {
      if (!sel) return;
      opts = opts || {};
      var map = kind === 'job' ? JOBS : kind === 'motive' ? MOTIVES : PURPOSES;
      var numbered = !!opts.numbered;
      var ph = opts.placeholder;
      var html = ph === false ? '' : '<option value="">' + (ph == null ? '선택' : ph) + '</option>';
      sortedKeys(map).forEach(function (k) {
        html += '<option value="' + k + '">' + (numbered ? k + '. ' : '') + map[k] + '</option>';
      });
      sel.innerHTML = html;
    }
  };
})(typeof window !== 'undefined' ? window : this);
