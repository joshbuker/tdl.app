# Historical Versions (of TDL App)

Inline copies of the various previous versions of TDL App, to serve as a useful reference.

## Attempt #1

Start: 2019-10-24 | End: 2021-10-15
Folders:
- rails.legacy.tdl.app

The monolithic stack for the first attempt of TDL App, written entirely within Ruby on Rails, using vue inline in the views.

Major limitation was that it couldn't compile down to mobile/desktop apps, and was web only. Addressed by switching to Quasar for the frontend in attempt #2. Stuck with Ruby on Rails exclusively for the REST API backend.

## Attempt #2

Start: 2021-04-12 | End: 2021-11-28
Folders:
- historical-api.tdl.app
- historical-web.tdl.app

I believe we went to attempt #3 because Quasar v2 came out, and it was easier to just redo the repo from scratch and copy as needed. There was also a fair amount of janky cowboy code, and I wanted to be better about testing.

## Attempt #3

Start: 2021-11-28 | End: 2024-09-28
Folders:
- web.tdl.app
- api.tdl.app

Got pretty far, but major struggles in decoupling the frontend components and the backend logic, making it difficult to perform unit testing.
