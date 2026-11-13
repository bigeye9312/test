#!/usr/bin/env python3
"""Prepare a Quartz 4 content tree from docs/ without editing source Markdown.

The existing demo uses custom frontmatter links. Quartz's graph is based on
actual Markdown links, so we render those relationships into a generated
"Related analyses" section in the temporary build copy.
"""
from pathlib import Path
import re
import shutil

source = Path("docs")
dest = Path("quartz-site/content")
dest.mkdir(parents=True, exist_ok=True)

for path in source.rglob("*.md"):
    relative = path.relative_to(source)
    target = dest / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    body = path.read_text(encoding="utf-8")

    if relative.parts[0] == "playbooks":
        frontmatter = re.match(r"\A---\s*\n(.*?)\n---\s*\n", body, re.S)
        edges = []
        if frontmatter:
            # Extract only known stable playbook IDs from the custom links list.
            valid_ids = {p.stem for p in (source / "playbooks").glob("*.md")}
            edges = [id for id in re.findall(r"^\s*-\s*to:\s*([a-z0-9-]+)\s*$",
                                            frontmatter.group(1), flags=re.M)
                     if id in valid_ids]
        if edges:
            body += "\n\n## 연관 분석 관점 (Quartz Graph)\n\n"
            body += "\n".join(f"- [[playbooks/{id}]]" for id in edges) + "\n"
    target.write_text(body, encoding="utf-8")

(dest / "index.md").write_text("""---
title: SSD Analysis Playbook
description: Quartz Graph 예제 — 모든 SSD 자료는 가상입니다.
tags:
  - guide
---

# SSD Analysis Playbook

이 사이트는 `docs/`의 Markdown을 Quartz로 렌더링한 **가상 데모**입니다.

오른쪽 **Local Graph**에서 현재 문서와 연결된 분석 관점을 볼 수 있고,
그래프 확장 버튼으로 전체 문서 관계를 탐색할 수 있습니다.

## 분석 관점

- [[playbooks/pcie-enumeration|PCIe 인식 확인]]
- [[playbooks/nvme-initialization|NVMe 초기화]]
- [[playbooks/command-processing|Command Processing]]
- [[playbooks/pcie-error|PCIe 오류 증거]]
- [[playbooks/performance|성능 및 QoS]]
- [[playbooks/gc-state|GC 상태 해석]]
- [[playbooks/fw-state|Firmware 상태]]

## 제품별 예제

- [[products/product-a/gc|Product A GC]]
- [[products/product-b/gc|Product B GC]]

> 이 페이지의 모든 분석 절차와 기준값은 실제 제품과 무관한 가상 예시입니다.
""", encoding="utf-8")
print(f"Prepared {len(list(dest.rglob('*.md')))} Quartz Markdown files")
