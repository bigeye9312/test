---
id: performance
title: 성능 및 QoS
description: Throughput, Latency, QoS와 Link 저하를 분석합니다.
category: performance
tags: [performance, latency, qos]
links:
  - to: command-processing
    type: check_when
    label: 명령 대기·완료 지연이 의심되면
  - to: gc-state
    type: check_when
    label: GC 및 내부 리소스 영향 검토가 필요하면
---
# 성능 및 QoS

## 확인할 사항
1. 성능 기준과 측정 환경이 비교 가능한가?
2. Throughput 저하인지 Tail Latency 악화인지 구분했는가?
3. Link Width / Speed, Queue Depth, Workload의 차이는 무엇인가?

## Dump Agent 가이드
실측 수치와 기대 기준, 측정 조건을 별도 항목으로 보고한다.
