user_seeds = Rails.root.join('db', 'seeds', 'user.rb')
puts "Loading seed file from: #{user_seeds}"
load(user_seeds)
