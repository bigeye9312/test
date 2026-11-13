# SSD Analysis Playbook — Proof of Concept

Markdown 기반 SSD 분석 가이드 프로토타입입니다. **모든 제품 정보와 분석 절차는 가상 예시**입니다.

## 구조

- `docs/playbooks/`: 제품 독립적인 분석 관점 (Markdown + YAML frontmatter)
- `docs/products/`: 제품별 사양 및 해석 참고 문서
- `src/`: 현재 노드와 다음 1 Depth를 보여주는 반응형 UI
- `.github/workflows/pages.yml`: GitHub Pages 정적 배포

## 로컬 실행

```bash
npm install
npm run dev
```

## GitHub Pages

Settings → Pages → **Build and deployment → Source: GitHub Actions** 를 선택하고 `main`에 push하면 배포 워크플로가 실행됩니다.

예상 경로: `https://bigeye9312.github.io/test/`

**주의:** Private Repository라도 GitHub Pages 게시 결과가 공개될 수 있습니다. 회사 데이터·내부 로그·기밀 분석 절차는 이 프로토타입에 올리지 마세요.

## 원칙

Frontmatter의 `links`는 Obsidian/Quartz 공식 필드가 아닌, 실험용 커스텀 관계 정의입니다. 이 사이트는 LLM 실행 엔진이 아니라 문서 탐색 UI입니다.
