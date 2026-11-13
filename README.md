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
