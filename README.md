# TOPIK Myanmar

미얀마 TOPIK 공식 안내·접수 FO (C안 HTML/CSS/JS) + Node API + BO 프로토타입.

## 배포 (FO)

```bash
python3 build.py          # html/C안/FO + html/shared → public/
vercel --prod             # 또는 Git push → Vercel (vercel.json buildCommand 동일)
```

- FO URL (임시): https://topik-myanmar.vercel.app
- API (Railway): https://topikmyanmar-production.up.railway.app — `build.py`의 `API_META`와 Railway `CORS_ORIGINS` 정합 필요

## 로컬 미리보기

```bash
python3 build.py
cd public && python3 -m http.server 8080
# API 연동 시: cd api && npm run dev  (Postgres + migrate)
```

상세: `docs/기능정의서/배포_아키텍처.md`, `docs/기능정의서/API_배포_가이드_Railway.md`, `api/로컬실행_가이드.md`
