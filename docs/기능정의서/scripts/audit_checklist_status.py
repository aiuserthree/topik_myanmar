#!/usr/bin/env python3
"""Apply audit statuses to 개발자_체크리스트.md completion column."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CHECKLIST = ROOT / "기능정의서" / "개발자_체크리스트.md"

# [x]=prototype/verified done  [p]=partial  [ ]=not started  [-]=N/A or policy-blocked
STATUSES: dict[int, str] = {}

def set_range(start: int, end: int, mark: str):
    for i in range(start, end + 1):
        STATUSES[i] = mark

# --- FO 1-83 (html/A안 primary deploy line) ---
for i in range(1, 4):
    STATUSES[i] = "[x]"  # GNB 4 menus, aria-current, auth branch
STATUSES[4] = "[x]"  # logout confirm
STATUSES[5] = "[x]"  # i18n 3 lang
STATUSES[6] = "[x]"  # localStorage lang
STATUSES[7] = "[p]"  # Padauk → Noto Sans Myanmar fallback
STATUSES[8] = "[p]"  # i18n keys: main nav yes; all new page body partial
for i in range(9, 11):
    STATUSES[i] = "[x]"  # mobile drawer ESC/outside
STATUSES[11] = "[p]"  # aria-expanded yes; focus trap no
STATUSES[12] = "[x]"  # login guard 4 menus, admit excluded
STATUSES[13] = "[x]"  # ?next=
STATUSES[14] = "[x]"  # footer i18n
STATUSES[15] = "[x]"  # footer _blank
STATUSES[16] = "[x]"  # D-Day
STATUSES[17] = "[p]"  # hero CTA: guard on load not href rewrite
STATUSES[18] = "[x]"  # notice preview localStorage
STATUSES[19] = "[x]"  # notice click → detail
STATUSES[20] = "[p]"  # schedule static on home
STATUSES[21] = "[x]"  # quicklinks
STATUSES[22] = "[x]"  # FAQ accordion home
STATUSES[23] = "[p]"  # guide: A안 guide.html# not separate files
STATUSES[24] = "[p]"  # guide external links partial
for i in range(25, 28):
    STATUSES[i] = "[p]"  # guide sections in single page
STATUSES[28] = "[p]"  # guide i18n partial
for i in range(29, 35):
    STATUSES[i] = "[p]"  # rules.html sections; fee 0526 in A안
STATUSES[35] = "[p]"
STATUSES[36] = "[x]"  # apply-howto
for i in range(37, 50):
    STATUSES[i] = "[x]"  # register wizard + BO sync localStorage
STATUSES[50] = "[p]"  # complete modal: confirm not dedicated modal component
for i in range(51, 56):
    STATUSES[i] = "[x]"  # mypage cards, badges, cancel
STATUSES[56] = "[p]"  # print CSS exists elsewhere; mypage print partial
for i in range(57, 61):
    STATUSES[i] = "[x]"  # admit 0527 topik.go.kr only
for i in range(61, 63):
    STATUSES[i] = "[x]"  # notice SPA filter search
STATUSES[63] = "[p]"  # view count session dedup partial
for i in range(64, 71):
    STATUSES[i] = "[x]"  # boards + inquiry comments (board-page.js)
STATUSES[67] = "[p]"  # refund email: mock queue only
STATUSES[68] = "[x]"  # status chips
STATUSES[71] = "[x]"  # FAQ page
for i in range(72, 81):
    STATUSES[i] = "[x]"  # signup/login/profile 0527 incl. photo resync
STATUSES[81] = "[p]"  # 6mo password: UI partial, email template gap
STATUSES[82] = "[x]"  # withdraw
STATUSES[83] = "[x]"  # no membership tiers (excluded by design)

# --- BO 84-142 ---
for i in range(84, 142):
    STATUSES[i] = "[x]"  # A안 admin.html + shared BO libs prototype
STATUSES[120] = "[p]"  # notice attachments partial
STATUSES[141] = "[-]"  # audit retention policy blocked
STATUSES[142] = "[p]"  # site preview link partial

# --- DB·이메일 143-195 ---
set_range(143, 195, "[ ]")
STATUSES[187] = "[x]"  # verified: FO 접수완료 no email (code/spec)
STATUSES[188] = "[x]"  # verified: 수험번호 부여 no email
STATUSES[185] = "[p]"  # gap templates in 시안/email; SMTP not wired
STATUSES[186] = "[p]"
STATUSES[189] = "[p]"  # C안 editorial 14 templates (시안/email)
STATUSES[190] = "[p]"  # HTML email preview only

# --- 인프라 196-221 ---
set_range(196, 221, "[ ]")
STATUSES[205] = "[p]"  # .gitignore/env pattern in docs; no .env committed
STATUSES[206] = "[p]"  # vercel build only, no full CI/CD

# --- dev-prod 222-268 ---
set_range(222, 268, "[ ]")
STATUSES[226] = "[p]"  # documented expectation; not deployed

# --- 보안 269-293 ---
set_range(269, 293, "[ ]")
STATUSES[291] = "[-]"
STATUSES[293] = "[-]"

# --- 성능·테스트 294-335 ---
STATUSES[294] = "[p]"  # localStorage; production plan not done
STATUSES[295] = "[p]"
STATUSES[296] = "[x]"  # admit 본인확인 removed per 0527
STATUSES[297] = "[-]"
for i in range(298, 300):
    STATUSES[i] = "[p]"  # email templates mock
STATUSES[300] = "[p]"  # i18n pages partial
STATUSES[301] = "[-]"
STATUSES[302] = "[p]"  # print CSS in admit legacy / mypage partial
STATUSES[303] = "[p]"  # aria partial
STATUSES[304] = "[p]"  # responsive: 1200px drawer not 768
for i in range(305, 309):
    STATUSES[i] = "[p]"  # BO client-side lock/export
STATUSES[309] = "[p]"  # FO-BO sync via localStorage not realtime API
STATUSES[310] = "[-]"
set_range(311, 327, "[ ]")
STATUSES[323] = "[p]"  # i18n testable manually
STATUSES[325] = "[p]"
STATUSES[328] = "[-]"
for i in range(329, 331):
    STATUSES[i] = "[p]"
STATUSES[332] = "[x]"  # Myanmar LTR confirmed
for i in range(333, 335):
    STATUSES[i] = "[p]"

# --- 미얀마 336-360 ---
set_range(336, 360, "[ ]")
STATUSES[341] = "[p]"  # mobile-first CSS exists
STATUSES[345] = "[p]"  # Unicode; Zawgyi not enforced
STATUSES[346] = "[p]"  # Noto not Padauk
STATUSES[349] = "[p]"  # MMT in countdown +06:30
STATUSES[351] = "[x]"  # offline payment only in copy
STATUSES[352] = "[p]"  # MMK/USD in rules-fee content
STATUSES[353] = "[p]"  # embassy links in guide/footer

# --- 오픈준비 361-444 ---
set_range(361, 444, "[ ]")
STATUSES[387] = "[p]"  # rules-fee page exists; amounts need ops signoff
STATUSES[424] = "[x]"  # same as FO 57-60
STATUSES[425] = "[p]"  # mypage CTA to admit partial

# --- 장애·법적 445-462 ---
set_range(445, 462, "[ ]")
for i in (456, 457, 458, 461, 462):
    STATUSES[i] = "[-]"

# --- 정책 합의 463-484 ---
set_range(463, 484, "[-]")
STATUSES[465] = "[x]"  # implemented in register: I+II same round
STATUSES[483] = "[p]"  # i18n exists; ops policy open

# Fill any missing as not started
for i in range(1, 485):
    STATUSES.setdefault(i, "[ ]")

ROW_RE = re.compile(
    r"^(\| (\d+) \|.*)\| (?:□|\[x\]|\[p\]|\[ \]|\[-\]) \|  \|  \|$",
    re.MULTILINE,
)


def section_stats(start: int, end: int):
    c = {"[x]": 0, "[p]": 0, "[ ]": 0, "[-]": 0}
    for i in range(start, end + 1):
        c[STATUSES.get(i, "[ ]")] += 1
    total = end - start + 1
    done = c["[x]"] + c["[p]"]
    return c, total, round(100 * done / total, 1) if total else 0


def main():
    text = CHECKLIST.read_text(encoding="utf-8")
    counts = {"[x]": 0, "[p]": 0, "[ ]": 0, "[-]": 0}

    def repl(m):
        no = int(m.group(2))
        mark = STATUSES.get(no, "[ ]")
        counts[mark] = counts.get(mark, 0) + 1
        return m.group(1) + f"| {mark} |  |  |"

    new_text, n = ROW_RE.subn(repl, text)
    if n < 400:
        raise SystemExit(f"Expected ~484 row updates, got {n}")

    # Legend + progress summary after title block
    fo_c, _, fo_pct = section_stats(1, 83)
    bo_c, _, bo_pct = section_stats(84, 142)

    legend = """## 감사 범례 (2026-06-02)

| 기호 | 의미 |
| --- | --- |
| `[x]` | **프로토타입 완료** — `html/A안`(배포 `public/`) 또는 B/C안 UI·localStorage 목업으로 요구사항 반영 |
| `[p]` | **부분** — UI/목업만 있거나 스펙 대비 미흡(백엔드·운영·정책 미확정 포함) |
| `[ ]` | **미착수** — 코드·인프라 근거 없음 |
| `[-]` | **N/A·보류** — 운영/법무/정책 합의 전제. 개발만으로 완료 불가 |

### 진행 요약 (자동 감사)

| 구분 | `[x]` | `[p]` | `[ ]` | `[-]` | 합계 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 전체 | {x} | {p} | {sp} | {d} | 484 |
| FO 화면 (1–83) | {fox} | {fop} | {fosp} | {fod} | 83 | **{fo_pct}%** (`[x]`+`[p]`) |
| BO 화면 (84–142) | {box} | {bop} | {bosp} | {bod} | 59 | **{bo_pct}%** |
| 프로토타입 전체 | — | — | — | — | 484 | **{proto_pct}%** (`[x]`+`[p]`) |
| 프로덕션 (`[x]`만) | — | — | — | — | 484 | **{prod_pct}%** (DB·인프라·SMTP 미구현) |

> 감사 기준: 배포 라인 `build.py` → `html/A안` → `public/`. DB·SMTP·서버·법무·정책 합의(463–484)는 프로덕션 미착수 또는 `[-]`.

""".format(
        x=counts["[x]"],
        p=counts["[p]"],
        sp=counts.get("[ ]", 0),
        d=counts["[-]"],
        fox=fo_c["[x]"], fop=fo_c["[p]"], fosp=fo_c["[ ]"], fod=fo_c["[-]"],
        box=bo_c["[x]"], bop=bo_c["[p]"], bosp=bo_c["[ ]"], bod=bo_c["[-]"],
        fo_pct=fo_pct, bo_pct=bo_pct,
        proto_pct=round(100 * (counts["[x]"] + counts["[p]"]) / 484, 1),
        prod_pct=round(100 * counts["[x]"] / 484, 1),
    )

    # Update INDEX completion row symbols
    index_updates = [
        ("| FO 화면 | 68 | 12 | 3 | 83 | □ 진행중 |", "| FO 화면 | 68 | 12 | 3 | 83 | 감사 반영 |"),
        ("| BO 화면 | 54 | 4 | 1 | 59 | □ 진행중 |", "| BO 화면 | 54 | 4 | 1 | 59 | 감사 반영 |"),
        ("| DB·이메일 | 45 | 8 | 0 | 53 | □ 진행중 |", "| DB·이메일 | 45 | 8 | 0 | 53 | 대부분 `[ ]` |"),
        ("| 인프라·배포 | 21 | 5 | 0 | 26 | □ 진행중 |", "| 인프라·배포 | 21 | 5 | 0 | 26 | `[ ]` |"),
        ("| dev-prod 서버 | 42 | 5 | 0 | 47 | □ 진행중 |", "| dev-prod 서버 | 42 | 5 | 0 | 47 | `[ ]` |"),
        ("| 보안 검토 | 24 | 1 | 0 | 25 | □ 진행중 |", "| 보안 검토 | 24 | 1 | 0 | 25 | `[ ]` |"),
        ("| 성능·테스트 | 24 | 17 | 1 | 42 | □ 진행중 |", "| 성능·테스트 | 24 | 17 | 1 | 42 | 혼합 |"),
        ("| 미얀마 현지환경 | 19 | 6 | 0 | 25 | □ 진행중 |", "| 미얀마 현지환경 | 19 | 6 | 0 | 25 | `[ ]` |"),
        ("| 오픈 준비·운영 | 71 | 12 | 1 | 84 | □ 진행중 |", "| 오픈 준비·운영 | 71 | 12 | 1 | 84 | `[ ]` |"),
        ("| 장애·법적 | 10 | 8 | 0 | 18 | □ 진행중 |", "| 장애·법적 | 10 | 8 | 0 | 18 | `[-]`/`[ ]` |"),
        ("| 정책 합의 | 13 | 9 | 0 | 22 | □ 진행중 |", "| 정책 합의 | 13 | 9 | 0 | 22 | `[-]` |"),
        ("| 합 계 | 391 | 87 | 6 | 484 |  |", f"| 합 계 | 391 | 87 | 6 | 484 | x={counts['[x]']} p={counts['[p]']} □={counts.get('[ ]',0)} -={counts['[-]']} |"),
    ]
    for old, new in index_updates:
        new_text = new_text.replace(old, new)

    # Replace old usage legend line
    new_text = new_text.replace(
        "| 완료 여부 기호 | □ 미완료  /  ✅ 완료  /  ⏳ 진행중  /  🚫 보류·스킵 |  |  |  |  |",
        "| 완료 여부 기호 | `[x]` `[p]` `[ ]` `[-]` — 상단 **감사 범례** 참고 |  |  |  |  |",
    )

    # Refresh legend block
    if "## 감사 범례" in new_text:
        new_text = re.sub(
            r"## 감사 범례 \(2026-06-02\).*?(?=\n\n\| TOPIK Myanmar)",
            legend.rstrip(),
            new_text,
            count=1,
            flags=re.DOTALL,
        )
    else:
        new_text = new_text.replace("## INDEX\n\n", "## INDEX\n\n" + legend + "\n", 1)

    # Update bottom legend section
    new_text = re.sub(
        r"\| □ \| 미완료 \|\n\| ✅ \| 완료 \|\n\| ⏳ \| 진행 중 \|\n\| 🚫 \| 보류 / 스킵 \|",
        "| `[x]` | 프로토타입·검증 완료 |\n| `[p]` | 부분 완료 |\n| `[ ]` | 미착수 |\n| `[-]` | N/A·정책 보류 |",
        new_text,
    )

    CHECKLIST.write_text(new_text, encoding="utf-8")
    fo_c, fo_n, fo_pct = section_stats(1, 83)
    bo_c, bo_n, bo_pct = section_stats(84, 142)
    print(f"Updated {n} rows: {counts}")
    print(f"FO 1-83: x={fo_c['[x]']} p={fo_c['[p]']} blank={fo_c.get('[ ]',0)} → prototype {fo_pct}%")
    print(f"BO 84-142: x={bo_c['[x]']} p={bo_c['[p]']} blank={bo_c.get('[ ]',0)} → prototype {bo_pct}%")


if __name__ == "__main__":
    main()
