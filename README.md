# SSD Analysis Playbook (prototype)

SSD 분석 방법론을 문서화하고 탐색하는 실험용 사이트입니다. **모든 SSD 예시 및 수치는 가상 데이터입니다.**

## 웹사이트 구조

- **왼쪽:** `Playbooks` / `Products` 문서 트리 (폴더 중첩 지원)
- **Playbooks 메인:** Obsidian 스타일의 인터랙티브 관계 그래프 (D3 force)
- **문서 선택:** Markdown 본문, Frontmatter `title` / `description` / `tags` / `aliases` 표시
- **링크 관계:** Playbook Frontmatter의 커스텀 `links`를 읽어 그래프 연결선을 생성
- **그래프 조작:** 마우스 드래그로 노드 이동·배경 이동, 휠 확대/축소, 노드 호버 강조, 클릭하여 문서 열기, 초기화

## 소스 레이아웃

```text
docs/
├── index.html              # UI 엔트리
├── app.js                  # 문서 트리와 Markdown 뷰어
├── graph.js                # D3 force 인터랙티브 그래프
├── styles.css
├── manifest.json           # 브라우저에서 읽을 Markdown 파일 목록
├── playbooks/              # 공통 분석 방법론
├── products/               # 제품별 가상 설정
└── _quartz/                # 비교용 Quartz 빌드 도구 및 출력 경로
```

`docs/_quartz/`와 HTML/JS/CSS는 사이드바 목록에 포함되지 않습니다. 사이드바는 `docs/manifest.json`의 문서 경로로만 구성됩니다.

## GitHub Pages: 커스텀 UI 사용

Settings → Pages → **Deploy from a branch → main /docs**를 선택하면 됩니다.

웹사이트 주소: https://bigeye9312.github.io/test/

이 방식은 정적 HTML/JavaScript를 게시하므로 **npm 빌드가 필요하지 않습니다.** JavaScript 라이브러리 `js-yaml`, `marked`, `DOMPurify`, `D3`는 브라우저에서 CDN을 통해 로드합니다.

```bash
python -m http.server 8000 --directory docs
```

위 명령으로 로컬 테스트할 수 있습니다. 새 Markdown은 `docs/manifest.json`에 경로를 추가하세요.

## Quartz 비교 실험

Quartz용 스크립트는 `docs/_quartz/`에 있으며 GitHub Actions 워크플로는 GitHub 규정에 따라 `.github/workflows/quartz-pages.yml`에 있습니다. Quartz를 배포하려면 Pages Source를 **GitHub Actions**로 변경해야 합니다. 이 경우 커스텀 뷰어 대신 Quartz 사이트가 배포됩니다. 두 배포 방식을 동시에 활성화하지 않습니다.

## 주의

- `links`는 Quartz 또는 Obsidian의 공식 Frontmatter 표준이 아닌 데모 전용 관계 스키마입니다.
- 그래프는 관계 탐색용이며 분석 절차를 자동 실행하거나 인과관계를 증명하지 않습니다.
- Private 저장소라도 게시된 Pages 사이트가 공개될 수 있습니다. 실제 사내 Dump, 임계값 및 기밀 기술문서는 업로드하지 마세요.
