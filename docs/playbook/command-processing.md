---
tags: [area/runtime, nvme, command, cqe]
---
# Command Processing

Admin 및 I/O Command의 처리 상태와 비정상 완료를 분석합니다.

## 분석 질문
1. Admin 또는 I/O Command 중 무엇이 문제인가?
2. SQ/CQ 및 Pending Command 상태를 확인했는가?
3. CQE의 상태값과 나머지 필드가 함께 타당한가?
4. 덤프가 단일 시점이라면 시간에 따른 진행 여부를 실제로 판단할 수 있는가?

## Dump Agent 가이드
명령의 관측 상태, 증거 위치, 불확실성을 분리해 반환한다.

## Related Playbooks

- [[playbook/fw-state|fw-state]] — 명령 처리 정체가 의심되면 FW 상태 확인
- [[playbook/performance|performance]] — Latency와 Throughput 영향 참고
