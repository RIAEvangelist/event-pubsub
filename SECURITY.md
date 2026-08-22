# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| 6.1.0 on npm and GitHub | Current supported release |
| 6.0.0 | Superseded GitHub source release |
| 5.x and older | No planned security fixes |

Version 6.1.0 is the current npm and GitHub release and requires Node.js 22.12 or newer. Version 6.0.0 remains available as the earlier GitHub source release, but users should install the latest available 6.x release.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use the repository's private [GitHub Security Advisory form](https://github.com/RIAEvangelist/event-pubsub/security/advisories/new).

Include:

- affected versions and runtimes;
- a minimal reproduction;
- expected and observed behavior;
- impact and realistic exploitation conditions; and
- any proposed mitigation.

Please allow reasonable time for triage and remediation before public disclosure.

## Trust model

event-pubsub synchronously invokes application-provided functions in the publisher's process and privilege context. It does not sandbox handlers, authorize event names, clone payloads, serialize data, catch synchronous throws, or observe returned promises. Applications are responsible for handling asynchronous rejections.

- Register only trusted code.
- Treat mutable payloads as shared references.
- Use `off` and `reset` at lifecycle boundaries so long-lived registries do not retain unnecessary closures or state.
- Add application-level authorization before publishing sensitive data across a shared hub.
- Isolate untrusted work in a process, worker, or other security boundary; an event emitter is not one.

Prototype-like event names are stored safely and covered by regression tests. This prevents object-prototype collisions but does not make arbitrary handler code safe.
