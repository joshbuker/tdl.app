# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rails db:seed command (or created alongside the database with db:setup).
#
# Examples:
#
#   movies = Movie.create([{ name: 'Star Wars' }, { name: 'Lord of the Rings' }])
#   Character.create(name: 'Luke', movie: movies.first)
josh = User.create!(
  username: 'athix',
  given_name: 'Josh',
  family_name: 'Buker',
  email: 'apate+tdl@nyx.chat'
)

j_inbox = List.create(
  user: josh,
  title: 'Inbox'
)

10.times do |n|
  task = Task.create!(title: "Task #{n}", list: j_inbox)
  3.times do |m|
    subtask = Task.create!(title: "Set #{n} Subtask #{m}", list: j_inbox)
    Rule.create!(pre: task, post: subtask)
    2.times do |k|
      subsub = Task.create!(title: "Set #{n} Subset #{m} Subtask #{k}", list: j_inbox)
      Rule.create!(pre: subtask, post: subsub)
    end
  end
end
