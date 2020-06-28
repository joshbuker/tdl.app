require 'rails_helper'

RSpec.describe Rule do
  subject { build :rule }
  let!(:user) { create :user }
  let!(:list) { create :list, user: user }

  it 'has valid factory' do
    expect(subject).to be_valid
  end

  context 'associations' do
    it { is_expected.to belong_to(:pre) }
    it { is_expected.to belong_to(:post) }
  end

  context 'validations' do
    it { is_expected.to validate_uniqueness_of(:pre).scoped_to(:post_id) }
    it { is_expected.to validate_uniqueness_of(:post).scoped_to(:pre_id) }

    describe 'prune_redundant_rules' do
      it 'prunes redundant rules involving pre' do
        # A -> B
        # A -> C
        # B -> C (removes A -> C)
        a = create :task, title: 'a', user: user, list: list
        b = create :task, title: 'b', user: user, list: list
        c = create :task, title: 'c', user: user, list: list
        ab = create :rule, pre: a, post: b
        ac = create :rule, pre: a, post: c

        expect(ac).to be_persisted

        bc = create :rule, pre: b, post: c

        expect(ac).not_to be_persisted
      end
    end

    describe 'circular_rule' do
      it 'prevents cyclic rule from being created' do
        # validation
        # A -> B -> C -> D
        # D -> A
        a = create :task, title: 'a', user: user, list: list
        b = create :task, title: 'b', user: user, list: list
        c = create :task, title: 'c', user: user, list: list
        d = create :task, title: 'd', user: user, list: list
        ab = create :rule, pre: a, post: b
        bc = create :rule, pre: b, post: c
        cd = create :rule, pre: c, post: d

        expect{create :rule, pre: d, post: a}.to raise_error
      end
    end

    describe 'redundant_rule' do
      it 'prevents redundant rules from being created' do
        a = create :task, title: 'a', user: user, list: list
        b = create :task, title: 'b', user: user, list: list
        c = create :task, title: 'c', user: user, list: list
        d = create :task, title: 'd', user: user, list: list
        ab = create :rule, pre: a, post: b
        bc = create :rule, pre: b, post: c
        cd = create :rule, pre: c, post: d

        expect{create :rule, pre: a, post: d}.to raise_error
      end
    end
  end
end
