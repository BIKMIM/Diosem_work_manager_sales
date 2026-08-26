# Diosem 작업 배정 현황

영업팀과 기술팀이 같은 분석 엔진을 사용하는 공통 React/Vite 프로젝트입니다.

## 실행과 검증

```bash
npm test
npm run lint
npm run dev:sales
npm run dev:tech
npm run build:sales
npm run build:tech
```

- 영업팀 빌드: 분리 대상 설정과 위반 검사를 포함합니다.
- 기술팀 빌드: 분리 관련 코드와 화면을 포함하지 않습니다.
- 직원 명단은 `src/data/workers.js` 한 곳에서 관리합니다.

## 배포

`main` 브랜치가 갱신되면 GitHub Actions가 두 빌드를 검사한 뒤 기존 주소에 배포합니다.

- 영업팀: `https://bikmim.github.io/Diosem_work_manager_sales/`
- 기술팀: `https://bikmim.github.io/Diosem_Workers/`

기술팀 저장소에 배포하려면 이 저장소의 Actions secret에 `PAGES_DEPLOY_TOKEN`을 등록해야 합니다. 토큰은 `BIKMIM/Diosem_Workers` 저장소 Contents 쓰기 권한만 갖도록 최소 범위로 발급합니다.
