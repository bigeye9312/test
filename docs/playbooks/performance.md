---
tags: [area/performance, performance, latency, qos]
---
# 성능 및 QoS

Throughput, Latency, QoS와 Link 저하를 분석합니다.

## 확인할 사항
1. 성능 기준과 측정 환경이 비교 가능한가?
2. Throughput 저하인지 Tail Latency 악화인지 구분했는가?
3. Link Width / Speed, Queue Depth, Workload의 차이는 무엇인가?

## Dump Agent 가이드
실측 수치와 기대 기준, 측정 조건을 별도 항목으로 보고한다.

## Related Playbooks

- [[playbooks/command-processing|command-processing]] — 명령 대기·완료 지연이 의심되면
- [[playbooks/gc-state|gc-state]] — GC 및 내부 리소스 영향 검토가 필요하면
