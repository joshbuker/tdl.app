void_xxx = User.create!(
  username: 'void_xxx',
  given_name: 'Kurt',
  family_name: 'Apple',
  email: 'username@void.xxx'
)

inbox = List.create!(
  user: void_xxx,
  title: 'Inbox'
)

# TODO: Do some seeds

10000.times do |n|
  puts n
  task = Task.create!(
    title: "Task #{n}",
    list: inbox,
    user: void_xxx
  )
  next unless n > 1
  if [true, false].sample
    loop do
      random_task = Task.where.not(id: task.id).where(user: void_xxx).order(Arel.sql('RANDOM()')).first
      rule = Rule.new(pre: task, post: random_task)
      if rule.valid?
        rule.save!
        break
      end
    end
  end
end
