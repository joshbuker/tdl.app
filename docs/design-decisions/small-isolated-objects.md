# Small, isolated objects (Sandi Metz)

## Context

Attempt #3's frontend and backend logic were hard to pull apart, so unit tests were hard to write (see [Test-driven development](test-driven-development.md)). Code that is easy to test in isolation is usually also easy to change. Sandi Metz's work on object-oriented design (*Practical Object-Oriented Design*, *99 Bottles of OOP*, and her talks "The Magic Tricks of Testing" and "All the Little Things") gives concrete habits for writing that kind of code. Her ideas apply to TypeScript modules and functions as well as to classes.

## Decision

Design code the way Sandi Metz recommends:

- **Single responsibility.** Each object, module or function does one thing, and you can describe it in one sentence without "and".
- **Inject dependencies.** Pass in collaborators such as the clock, the database or the transport, instead of creating them or reaching for globals. Tests then substitute them.
- **Depend on behavior, not on structure.** Send a message to the object you hold; don't reach through it (the Law of Demeter). Depend on things that change less often than you do.
- **Prefer duplication to the wrong abstraction.** Wait for the third case before extracting, and inline an abstraction that no longer fits rather than adding parameters to it.
- **Keep units small.** As guidelines, not hard rules: classes under about 100 lines, functions and methods under about 5 lines, at most 4 parameters (pass an object for more), and each request handler sets up only one object. Break a guideline when there's a reason, and say why.

### Testing (from "The Magic Tricks of Testing")

| Message | Query (returns a value) | Command (has a side effect) |
| --- | --- | --- |
| **Incoming** (from outside the unit) | Assert on the return value. | Assert on the direct, public side effect. |
| **Sent to self** (private) | Don't test. | Don't test. |
| **Outgoing** (to a collaborator) | Don't test. | Expect that the message is sent, using a test double. |

Test through the public interface only, so internals can be refactored without breaking tests.

## Alternatives considered

- **No stated design style**: lets coupling creep in unnoticed, which is what made attempt #3 hard to unit test.
- **Enforcing the size guidelines with lint rules**: too blunt. Some functions, such as a schema or a lookup table, are long for good reasons. Reviewers judge size instead.

## Consequences

- Implementers follow these habits in new code, and reviewers check for them.
- Existing code is brought into line when its area is next changed, not in separate refactor passes.
- Injected dependencies make the clock, IDs and I/O easy to fake. That matters for sync code, where tests control time and ordering.
