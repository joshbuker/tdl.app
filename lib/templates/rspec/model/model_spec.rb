require 'rails_helper'

<% module_namespacing do -%>
RSpec.describe <%= class_name %> do
  subject { build :<%= class_name.underscore %> }

  it 'has valid factory.' do
    expect(subject).to be_valid
  end

  context 'associations' do
    # TODO: Add tests or remove placeholder
  end

  context 'validations' do
    # TODO: Add tests or remove placeholder
  end
end
<% end -%>
