FactoryBot.define do
  factory :device do
    name { "MyString" }
    push_endpoint { "MyString" }
    push_p256dh { "MyString" }
    push_auth { "MyString" }
    user_agent { "MyString" }
    last_seen_at { "2020-11-23 11:22:23" }
    user { nil }
  end
end
