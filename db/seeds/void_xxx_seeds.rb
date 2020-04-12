void_xxx = User.create!(
  username: 'void_xxx',
  given_name: 'Kurt',
  family_name: 'Apple',
  email: 'username@void.xxx'
)

List.create!(
  user: void_xxx,
  title: 'Inbox'
)

# TODO: Do some seeds
