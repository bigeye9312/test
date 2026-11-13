# Quartz Graph 예제

현재 저장소는 `docs/`의 정적 HTML 뷰어와 별도로, **동일한 Markdown을 Quartz 4에서 렌더링하는 예시**를 포함합니다.

## npm이 사용되는 곳

`npm`은 Node.js 패키지 관리자입니다. 이 저장소의 `docs/` 직접 게시에는 사용하지 않지만, Quartz는 빌드할 때 `npm ci`로 종속성을 설치하고 `npx quartz build`로 HTML/CSS/JS를 생성합니다. 빌드 작업은 GitHub Actions 실행 환경에서 수행되므로, 문서만 수정하는 사람에게 npm 설치는 필요하지 않습니다.

## Quartz Graph를 실제 Pages로 게시하려면

GitHub **Settings → Pages → Build and deployment → Source: GitHub Actions**로 변경합니다.

그 후 `Actions → Build Quartz Graph example → Run workflow`를 실행하거나 `docs/` 파일을 수정해 `main`에 반영합니다.

게시 URL: https://bigeye9312.github.io/test/

**중요:** Source를 GitHub Actions로 변경하면 기존 `main /docs` 정적 뷰어 대신 Quartz 사이트가 게시됩니다. 둘을 동시에 같은 Pages 루트에 게시하지는 않습니다.

## 구조

- `docs/playbooks/*.md`: 원본 분석 절차
- `docs/products/**/*.md`: 원본 제품별 가상 기준
- `quartz-example/prepare_content.py`: Markdown을 임시 Quartz `content/`에 복사하고 기존 Frontmatter의 `links.to`를 읽어 그래프용 `[[WikiLink]]`를 생성
- `.github/workflows/quartz-pages.yml`: 공식 Quartz 4를 받아 빌드 및 Pages 배포

Quartz 4 기본 레이아웃에는 `Component.Graph()`가 있어 Local Graph와 Global Graph가 기본 제공됩니다. Graph의 연결선은 *Markdown 문서 링크*를 바탕으로 생성되며 Frontmatter의 사용자 정의 `links`를 직접 인식하지는 않습니다.

## 출처

- https://quartz.jzhao.xyz/features/graph-view
- https://github.com/jackyzha0/quartz/tree/v4
- https://docs.github.com/en/pages
