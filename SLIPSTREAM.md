# Slipstream Features That Need Replicated

- [ ] UI
    - [ ] Dashboard Buttons
        - [X] Add Task
            - [X] Name TextBox
                - [X] Ensure new task is not dupe
                    - [X] live search
                        - [X] buffered
                        - [X] async
                        - [X] multithreaded
                        - [X] substring search
                        - [X] case insensitive (user setting) (list setting?)
        - [ ] feature add: Add tasks like workflowy does
            - [ ] Enter adds new task dialog below current, w/in same level
                1. A -> B
                1. [ENTER]
                1. A -> ___
            - [ ] TAB adds new post to task in focus, ie down one level
                1. A -> B
                1. [TAB]
                1. A -> B -> ___
        - [ ] Modify Task
            - [X] Prerequisites - same UI layout as Postrequisites
                - [X] Search for candidate Pres
                    - [X] See live search, but limit to valid candidates
                - [X] Add New Task as Prerequisite -> Add Task layout
                - [X] List current Prerequisites
                    - [X] Remove selected Prerequisite(s) button
            - [X] Postrequisites - see Pres
            - [ ] Permanent Loop Info
                - [ ] Visualize Perm Pre, This Task, and Perm Post
                    - A -> B -> C
                    - Or, whole process loop A -> B -> C -> D -> A
                        - Mark Flagged "next" in loop
                - [ ] Search for candidate perms - see search pres
                - [ ] Add as Perm Pre || Perm Post
                    - [ ] Currently limited to 1 Perm Pre and 1 Perm Post at a time
                        - [ ] If candidate perm post has no perm post, link the two
                            - A -> B -> A
                        - [ ] If candidate perm post has perm post, link into the perm chain
                            - A -> B -> C -> D -> A
                - [ ] Remove Perm Rule
                    - [ ] Deletes perm rule
                        - [ ] Perm pre's perm post is now this task's perm post
                            1. A -> B -> C -> A
                            1. A, B -> C -> B
        - [X] Delete Task -> Move to Trash
            - [X] Posts remain, rule to deleted task removed
        - [ ] Import/Export List
            - [ ] Validate on Import
            - [ ] Implicitly Valid on Export
            - [ ] Need new file format to represent:
                - [ ] Lists (default=DEFAULT, required)
                - [ ] Task names (full unicode, case insensitively unique, required)
                - [ ] Rules (A -> B, or A -> B -> A, ie perms)
                - [ ] Meta
                    - [ ] Tags
                    - [ ] DateTimes
                        - [ ] Created
                        - [ ] Modified
                        - [ ] Due
                        - [ ] Completed
                        - [ ] Reminder(s)
                    - [ ] CreatedBy
                    - [ ] AssignedTo
                    - [ ] SharedTo
                    - [ ] List (default=DEFAULT, required)
                    - [ ] Notes
                    - [ ] Arbitrary File uploads (ActiveStorage)
                    - [ ] Star/Unstar, or other simple mech
                    - [ ] TimeSpent
                    - [ ] TimeFocused (think green thoughts)
        - [X] Save List (not needed)
        - [X] Open (not needed)
        - [X] Close (not needed)
        - [ ] Search -> replaced with live search bar on dashboard
        - [ ] Boggle
            - [ ] Select 2 Tasks who do not depend on each other
            - [ ] UI allows user to place one or the other as pre
                - A -> B, or B -> A
            - [ ] or, skip
        - [X] Mark Done
            - [ ] If task has perm pre/post, flag perm post as "next"
            - [X] Move task to completed tasks land
    - [ ] TreeTableView
        - [X] Lazy Load
        - [ ] Sorted by Priority score
            - [ ] recursive count of posts
                - [ ] also lazily counted
                - [ ] does not traverse past "next" perm
        - [ ] Select/Highlight Task to interact
            - [ ] Ideally multiselect for batch-complete/delete
                - [ ] Add all as post
                - [ ] Ideally select, click-and-drag

Have a distinction between hard pre/post requisites and soft (this MUST be done,
vs I would LIKE this to be done before/after). Automatically drop stale soft
requirements over time?
