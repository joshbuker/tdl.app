# Slipstream Features That Need Replicated

- [ ] UI
    - [ ] Dashboard Buttons
        - [ ] Add Task
            - [ ] Name TextBox
                - [ ] Ensure new task is not dupe
                    - [ ] live search
                        - [ ] buffered
                        - [ ] async
                        - [ ] multithreaded
                        - [ ] substring search
                        - [ ] case insensitive (user setting) (list setting?)
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
            - [ ] Prerequisites - same UI layout as Postrequisites
                - [ ] Search for candidate Pres
                    - [ ] See live search, but limit to valid candidates
                - [ ] Add New Task as Prerequisite -> Add Task layout
                - [ ] List current Prerequisites
                    - [ ] Remove selected Prerequisite(s) button
            - [ ] Postrequisites - see Pres
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
        - [ ] Delete Task -> Move to Trash
            - [ ] Posts remain, rule to deleted task removed
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
        - [ ] Save List (not needed)
        - [ ] Open (not needed)
        - [ ] Close (not needed)
        - [ ] Search -> replaced with live search bar on dashboard
        - [ ] Boggle
            - [ ] Select 2 Tasks who do not depend on each other
            - [ ] UI allows user to place one or the other as pre
                - A -> B, or B -> A
            - [ ] or, skip
        - [ ] Mark Done
            - [ ] If task has perm pre/post, flag perm post as "next"
            - [ ] Move task to completed tasks land
    - [ ] TreeTableView
        - [ ] Lazy Load
        - [ ] Sorted by Priority score
            - [ ] recursive count of posts
                - [ ] also lazily counted
                - [ ] does not traverse past "next" perm
        - [ ] Select/Highlight Task to interact
            - [ ] Ideally multiselect for batch-complete/delete
                - [ ] Add all as post
                - [ ] Ideally select, click-and-drag

Have a distinction between hard pre/post requisites and soft (this MUST be done,
or I would LIKE this to be done before/after). Automatically drop stale soft
requirements over time?
