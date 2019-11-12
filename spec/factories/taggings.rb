FactoryBot.define do
  factory :tagging do
    # FIXME: This code is shit, do not use it as an example.
    transient do
      user { build :user }
      list { build :list, user: user }
    end
    tag { build :tag, user: user }
    task { build :task, list: list }
  end
end
