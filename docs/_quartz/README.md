# Quartz build workspace

이 폴더는 Quartz 렌더링을 위한 **빌드 코드 및 산출물 전용**입니다. 문서가 아니므로 Explorer/사이드바에 포함하지 않습니다.

- `prepare_content.py`: `docs/playbooks/`와 `docs/products/`만 가져와 Quartz 콘텐츠 생성. Playbook `links.to`를 그래프용 WikiLink로 변환
- `configure.py`: 다운로드한 Quartz 기본 설정 수정
- `.engine/`: GitHub Actions에서 다운로드·설치하는 Quartz 4 실행 소스 및 임시 콘텐츠 (**Git에 커밋하지 않음**)
- `dist/`: 생성된 정적 사이트 HTML·CSS·JavaScript (**Git에 커밋하지 않음**)

작업은 GitHub-hosted `ubuntu-latest` Runner에서 수행합니다. 완료 후 `docs/_quartz/dist/`를 GitHub Pages artifact로 업로드합니다. 빌드 결과를 Git 저장소에 다시 push하지 않으므로 GitHub 웹의 파일 목록에는 `dist/` 콘텐츠가 보이지 않습니다.

실제 Actions 워크플로 위치인 `.github/workflows/quartz-pages.yml`는 GitHub 플랫폼의 고정 경로라 이 폴더 안으로 이동할 수 없습니다.

**Pages 게시 소스는 GitHub Actions로 선택해야 Quartz가 배포됩니다.** `Deploy from a branch → /docs`를 택하면 기존 정적 데모가 게시됩니다.

빌드 결과에는 `_quartz` 디렉터리 자체가 포함되지 않습니다. Explorer에도 추가되지 않습니다.
