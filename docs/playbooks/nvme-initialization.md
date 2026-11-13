---
tags: [area/discovery, nvme, initialization]
---
# NVMe 초기화

PCIe 인식 이후 NVMe Controller 및 Namespace 상태를 확인합니다.

## 확인할 사항
1. Controller 초기화가 어느 단계까지 진행됐는가?
2. Namespace가 기대한 구성대로 노출되는가?
3. Host가 보는 상태와 Dump가 가리키는 상태가 일치하는가?

## Dump Agent 가이드
관측된 상태와 추론을 분리해 보고한다. Controller나 Namespace 미인식이 확인되더라도 특정 원인을 성급히 확정하지 않는다.

## Related Playbooks

- [[playbooks/command-processing|command-processing]] — Controller가 동작하지만 명령 처리 문제가 있으면
- [[playbooks/fw-state|fw-state]] — 초기화 과정의 펌웨어 상태 참고
