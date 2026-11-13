#!/usr/bin/env python3
"""Prepare Quartz content from docs/playbooks and docs/products.

No build files are added to the content tree, so the Quartz Explorer never
shows docs/_quartz or the static demo assets.
"""
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
ENGINE = ROOT / "_quartz" / ".engine"
CONTENT = ENGINE / "content"

if CONTENT.exists():
    shutil.rmtree(CONTENT)
CONTENT.mkdir(parents=True)

playbook_ids = {p.stem for p in (ROOT / "playbooks").rglob("*.md")}
for section in ("playbooks", "products"):
    for source in (ROOT / section).rglob("*.md"):
        relative = source.relative_to(ROOT)
        target = CONTENT / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        body = source.read_text(encoding="utf-8")

        if section == "playbooks":
            frontmatter = re.match(r"\A---\s*\n(.*?)\n---\s*\n", body, re.S)
            edges = []
            if frontmatter:
                edges = [node for node in re.findall(
                    r"^\s*-\s*to:\s*([a-z0-9-]+)\s*$",
                    frontmatter.group(1), flags=re.M,
                ) if node in playbook_ids]
            if edges:
                body += "\n\n## 관련 분석 관점\n\n"
                body += "\n".join(f"- [[playbooks/{node}]]" for node in edges) + "\n"

        target.write_text(body, encoding="utf-8")

(CONTENT / "index.md").write_text("""---
title: SSD Analysis Playbook
description: Quartz Graph — 가상 SSD 분석 데모
tags:
  - guide
---

# SSD Analysis Playbook

Playbooks와 Products는 왼쪽 문서 트리에서 탐색하세요.
Quartz 기본 Local Graph에서 문서 간 연결을 확인할 수 있습니다.

## Playbooks

- [[playbooks/pcie-enumeration|PCIe 인식 확인]]
- [[playbooks/nvme-initialization|NVMe 초기화]]
- [[playbooks/command-processing|Command Processing]]
- [[playbooks/pcie-error|PCIe 오류 증거]]
- [[playbooks/performance|성능 및 QoS]]
- [[playbooks/gc-state|GC 상태 해석]]
- [[playbooks/fw-state|Firmware 상태]]

## Products

- [[products/product-a/gc|Product A GC]]
- [[products/product-b/gc|Product B GC]]

> 모든 데이터는 가상 예시입니다.
""", encoding="utf-8")
print(f"Prepared {len(list(CONTENT.rglob('*.md')))} Markdown files")
