void_xxx = User.create!(
  username: 'void_xxx',
  given_name: 'Kurt',
  family_name: 'Apple',
  email: 'username@void.xxx',
  password: 'password'
)

inbox = List.create!(
  user: void_xxx,
  title: 'Inbox'
)

# TODO: Do some seeds

task_count = 1_000
rule_count = (task_count.to_f * 1.5).to_i

task_count.times do |n|
  puts "Creating task #{n+1}" if (n + 1) % 100 == 0
  task = Task.create!(
    title: "Task #{n}",
    list: inbox,
    user: void_xxx
  )
end

rule_count.times do |n|
  puts "Creating rule #{n+1}" if (n + 1) % 100 == 0
  loop do
    random_tasks = Task.where(user: void_xxx).order(Arel.sql('RANDOM()')).first(2)
    rule = Rule.new(pre: random_tasks.first, post: random_tasks.second)
    rule.save! and break if rule.valid?
    # puts 'invalid rule!'
  end
end
