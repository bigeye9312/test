# CIA Wiki

SSD 분석을 위한 GitHub Pages 정적 Markdown 뷰어. 모든 샘플 절차와 제품값은 가상 데이터입니다.

## UI
- **일반 페이지:** 왼쪽 Playbooks / Products 계층형 Explorer, 오른쪽 Markdown Reading View. 상단 Properties 블록은 표시하지 않으며 태그는 본문 하단 우측에 표시합니다. 문서 편집기처럼 보이지만 실제로는 읽기 전용입니다.
- **Playbooks 메인:** Obsidian Graph View를 참고한 D3 그래프 캔버스와 우측 Filters / Groups / Display / Forces.
- **탐색:** 전체 그래프의 노드 클릭 → Local Graph (1/2 hops), 중심 노드 재클릭 → 문서, 더블클릭 → 문서 즉시 열기.
- **Explorer:** 검색, 폴더 열기/닫기, 문서 열기만 지원합니다. 새 탭·새 문서·닫기 등의 가짜 버튼은 없습니다.

## Markdown 지원
- CommonMark / GFM: 제목, 목록, 표, 코드, 체크리스트
- Obsidian YAML 메타데이터: `tags`는 본문 하단 우측 Labels로 표시하며 `aliases`는 저장만 하고 별도 UI로 표시하지 않습니다. **`cssclasses`는 지원하지 않음**
- Obsidian Callouts: `> [!NOTE]`, `> [!WARNING]` 등 기본 유형을 카드로 렌더링
- WikiLinks: `[[playbooks/pcie-enumeration]]`, `[[playbooks/pcie-enumeration#먼저 확인할 것]]`
- Heading Links: 문서에서 특정 제목으로 이동
- Backlinks: 현재 문서를 WikiLink로 참조한 다른 문서를 역으로 검색해 표시
- 태그 중 `area/*`는 그래프 색상 분류에 사용

참고: Callout 임베드와 block-id, 모든 Obsidian 확장 문법의 완전한 호환까지는 보장하지 않습니다.

## 파일 구조

```text
docs/
├── index.html
├── app.js           # 파일 트리 / 페이지 전환 / Backlinks
├── markdown.js      # Callouts / Heading Links / WikiLinks
├── graph.js         # D3 graph
├── styles.css
├── manifest.json
├── playbooks/
└── products/
```

## 배포

GitHub → Settings → Pages → **Deploy from a branch → main /docs**.
사이트: https://bigeye9312.github.io/test/

npm, Node.js, Quartz, GitHub Actions 빌드는 사용하지 않습니다. 브라우저에서는 CDN의 js-yaml / Marked / DOMPurify / D3를 로드합니다. 로컬 실행은 `python -m http.server 8000 --directory docs`로 가능합니다.

새 문서는 `docs/manifest.json`에 파일 경로를 추가해야 뷰어에서 인식합니다.

사이드바 최상위 폴더 표시 순서는 `docs/manifest.json`의 `sidebarOrder` 배열로 설정합니다. 예: `"sidebarOrder": ["products", "playbooks"]`는 **Device Info → Playbook** 순서입니다. `sidebarOrder`를 생략하면 **Playbook → Device Info** 순서가 기본값이며, 배열에 없는 기존 섹션은 기본 순서대로 뒤에 추가됩니다. 폴더 경로와 URL은 변경되지 않습니다.

## 공식 문서
- https://help.obsidian.md/properties
- https://help.obsidian.md/syntax
- https://help.obsidian.md/plugins/graph
- https://d3js.org/d3-force

**주의:** GitHub Pages 사이트는 공개될 수 있으므로 실제 사내 SSD Dump와 기밀 분석 자료를 업로드하지 마세요.
