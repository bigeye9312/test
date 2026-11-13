# SSD Analysis Playbook — Proof of Concept

SSD 분석용 Markdown Playbook을 GitHub Pages의 **main /docs**에서 직접 보여주는 정적 데모입니다. 모든 SSD 제품값과 분석 절차는 **가상 예시**입니다.

## 구조

- `docs/index.html`, `docs/app.js`, `docs/styles.css`: 정적 브라우저 뷰어
- `docs/playbooks/*.md`: 공통 분석 관점 및 Frontmatter
- `docs/products/**/*.md`: 제품별 기준 (가상 값)

## 게시 설정 (최초 1회)

저장소 **Settings → Pages → Build and deployment**에서:
1. Source: **Deploy from a branch**
2. Branch: **main**
3. Folder: **/docs**
4. Save

게시 주소: https://bigeye9312.github.io/test/

별도 `npm install`, `vite build`, GitHub Actions 배포 설정은 필요하지 않습니다. `docs/` 파일 수정 후 push하면 GitHub Pages가 게시 내용을 갱신합니다.

## 로컬 확인

```bash
python -m http.server 8000 --directory docs
```
브라우저에서 http://localhost:8000/ 을 여세요. `file://`에서는 `fetch()`가 제한될 수 있습니다.

## 의존성 및 한계

브라우저에서 `js-yaml`, `marked`, `DOMPurify`를 CDN에서 로드합니다. 각 Markdown은 `app.js`의 `playbookFiles` 목록에 등록해야 탐색할 수 있습니다. Frontmatter `links`는 Obsidian/Quartz의 공식 필드가 아닌 **이 데모 전용 분석 관계**입니다.

Private Repository의 Pages 게시 가능 여부는 GitHub 요금제와 설정에 따라 달라지며, Pages 사이트 자체가 공개될 수 있습니다. 사내 데이터는 넣지 마세요.

## Quartz Graph 비교 데모

동일한 `docs/playbooks/`, `docs/products/` Markdown으로 **Quartz 4의 Local / Global Graph**를 표시하는 별도 빌드 예시를 추가했습니다.

- [Quartz 예제 구성 및 적용 방법](quartz-example/README.md)
- [Quartz GitHub Actions 빌드](.github/workflows/quartz-pages.yml)

Quartz를 공개 Pages의 실제 렌더러로 사용하려면 GitHub 저장소 **Settings → Pages → Source: GitHub Actions**로 바꿔 주세요. 그러면 `docs/`의 문서들을 Quartz가 빌드해 게시합니다. `/docs` 직접 게시는 이전 프로토타입 비교용으로 유지할 수 있지만, Pages 배포 소스는 하나만 선택할 수 있습니다.

**npm은 Quartz 빌드 환경에서만 사용합니다.** 문서를 읽거나 편집하는 사람은 설치할 필요가 없습니다.
