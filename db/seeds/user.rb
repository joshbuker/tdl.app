testuser = User.create!(
  username: 'awesome',
  given_name: 'awesome',
  family_name: 'username',
  email: 'username@awesome',
  password: 'Awesome1!',
  terms_and_conditions: DateTime.new(1970,1,2,1)
)
