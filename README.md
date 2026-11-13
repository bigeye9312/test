# SSD Analysis Knowledge Base

Markdown을 원본으로 사용하는 **Obsidian-inspired 정적 문서 뷰어** 실험 프로젝트입니다. 모든 SSD 분석 문서 및 제품값은 가상 예시입니다.

## 화면
- **왼쪽 리본·파일 탐색기**: Playbooks / Products 디렉터리 트리 및 파일명 검색
- **Playbooks 메인**: D3 force 기반 관계 그래프. Global → Local 탐색, 노드 드래그, 확대/축소, 연결 강조
- **클릭 동작**: Global/Category의 노드 1회 클릭 → Local Graph. Local의 중심 노드 재클릭 → 문서. 노드 더블클릭 → 문서 바로 열기
- **Local Graph**: 선택된 노드 기준 1-hop 또는 2-hop 인접 문서 표시 (카테고리를 넘어 연결된 문서 포함)
- **문서 화면**: Markdown 읽기 모드, Frontmatter Properties(펼치기/접기), 클릭 가능한 태그, 관련 Playbook 링크
- **디자인**: Obsidian 공식 인터페이스를 참고한 오리지널 다크 테마 CSS. Graph의 상단 scope control, search/zoom toolbar 및 하단 legend/status. Obsidian 자체 앱 코드/에셋은 복사하지 않았습니다.

## 소스 구조

```text
docs/
├── index.html
├── app.js              # 문서 탐색 / Markdown 뷰어
├── graph.js            # D3 기반 물리 시뮬레이션 그래프
├── styles.css          # 워크스페이스 UI
├── manifest.json       # 게시할 문서 파일 경로 목록
├── playbooks/          # 분석 관점
└── products/           # 제품별 예제
```

Quartz 관련 코드 및 GitHub Actions 워크플로는 제거했습니다. 정적 뷰어에는 npm이나 Node.js 빌드가 필요하지 않습니다. JavaScript 의존성(D3, Marked, js-yaml, DOMPurify)은 CDN에서 읽습니다.

## GitHub Pages

Settings → Pages → **Deploy from a branch → main /docs**로 설정하세요.
- 게시 URL: https://bigeye9312.github.io/test/
- GitHub Actions를 Pages Source로 선택하면 이 버전이 게시되지 않으므로, **Deploy from a branch**로 전환해야 합니다.

로컬 개발 서버:

```bash
python -m http.server 8000 --directory docs
```

브라우저에서 http://localhost:8000 접속.

새 문서를 추가하면 `docs/manifest.json`에 경로도 추가해야 탐색기에 표시됩니다. 그래프는 `docs/playbooks/*.md` 본문의 Obsidian `[[WikiLink]]` 관계를 사용합니다. 그래프 연결은 Markdown 본문의 `[[WikiLink]]`로 표시하며, 그룹 색상은 기본 속성 `tags`의 `area/*` 태그로 정합니다.

## 참고 자료
- Obsidian Graph View: https://obsidian.md/help/plugins/graph
- Obsidian CSS Variables: https://docs.obsidian.md/Reference/CSS+variables/About+styling
- D3: https://d3js.org/what-is-d3
- D3 Force: https://d3js.org/d3-force

## 주의
GitHub Pages는 외부 접근 가능성이 있습니다. 실제 사내 분석 문서, Dump, 임계값, 제품 정보 등은 넣지 마세요.

## Graph View (Obsidian-inspired)

Graph canvas occupies the editor, with a collapsible floating settings panel on the right.

- **Filters**: file search and orphan visibility.
- **Groups**: colors assigned by the existing Playbook category.
- **Display**: node labels, node size, and link thickness.
- **Forces**: repel force and link distance.
- **Navigation**: Global Graph is the landing view. Click a node to open Local Graph (1/2-hop), click the focused node again to open Markdown, or use Back to Global. Group colors are derived from native `tags` entries such as `area/discovery`.
- **Navigation**: click a node once to enter its Local graph; click the same focused node again to open the document. Double-click opens a document immediately.

Controls are intentionally limited to features supported by the current playbook data. Obsidian's attachment controls and query-driven groups are not included because there is no corresponding content model yet.

## Obsidian-compatible frontmatter

문서의 Frontmatter에는 Obsidian 기본 속성 `tags`, `aliases`, `cssclasses`만 사용합니다. 제목은 Markdown의 `# Heading`에서 읽습니다.

```yaml
---
tags: [area/discovery, pcie, enumeration]
---
```

연결 관계는 본문의 `[[playbooks/nvme-initialization|NVMe 초기화]]` 같은 WikiLink를 사용합니다. `area/discovery`도 Obsidian이 지원하는 중첩 태그 형식이며, 웹 그래프에서는 색상 그룹으로 사용합니다.

기존 커스텀 `id`, `category`, `links` 필드는 제거했습니다. UI의 Properties도 `tags`, `aliases`, `cssclasses`만 표시합니다.
