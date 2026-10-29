# Prioritize date

Status: Proposed
Release: v1
Related: [Deadlines](deadlines.md), [Schedule](schedule.md)

## Summary

A task can have a prioritize date. Once it passes, the task is flagged as high priority.

## Design intent

From #2, where a task showed a "high priority" icon once its prioritize date passed. It marks the point where a task should start getting attention, which can be well before its deadline and independent of when it's scheduled.

## Rules

- An incomplete task whose prioritize date has passed is flagged as high priority.

## Scenarios

### Flag after the prioritize date

- Given an incomplete task with a prioritize date of yesterday
- Then it is flagged as high priority

## Open questions

- Should the flag affect [Agenda](../views/agenda.md) order or presets?
- Should prioritize dates propagate to prerequisites like deadlines do?
