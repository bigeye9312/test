---
tags: [area/internal, gc, ftl, firmware]
---
# GC 상태 해석

내부 리소스와 GC 실행 조건을 분석합니다.

## 확인할 사항
1. Free Block 수를 확인한다.
2. 선택된 제품의 GC 진입 기준과 비교한다.
3. GC Scheduler, Inhibit 조건 및 현재 실행 상태를 함께 확인한다.

## 제품별 참고
- [Product A GC](../device-info/product-a/gc.md)
- [Product B GC](../device-info/product-b/gc.md)

## 주의
GC 진입 조건의 충족이 실제 GC 실행을 의미하지는 않는다.

## Related Playbooks

- [[playbook/fw-state|fw-state]] — 펌웨어 스케줄러와 내부 상태 참고
