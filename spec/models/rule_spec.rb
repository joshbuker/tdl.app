require 'rails_helper'

RSpec.describe Rule do
  subject { build :rule }

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
        a = create :task, title: 'a'
        b = create :task, title: 'b'
        c = create :task, title: 'c'
        ab = create :rule, pre: a, post: b
        ac = create :rule, pre: a, post; c

        expect(ac).to be_present

        bc = create :rule, pre: b, post: c
        expect(ac).not_to be_present
      end
    end

    describe 'circular_rule' do
      it 'prevents cyclic rule from being created' do
        # validation
        # A -> B -> C -> D
        # D -> A
        a = create :task, title: 'a'
        b = create :task, title: 'b'
        c = create :task, title: 'c'
        d = create :task, title: 'd'
        ab = create :rule, pre: a, post: b
        bc = create :rule, pre: b, post; c
        cd = create :rule, pre: c, post: d
        expect{create :rule, pre: d, post: a}.to raise_error
      end
    end

    describe 'redundant_rule' do
      if 'prevents redundant rules from being created' do
        a = create :task, title: 'a'
        b = create :task, title: 'b'
        c = create :task, title: 'c'
        d = create :task, title: 'd'
        ab = create :rule, pre: a, post: b
        bc = create :rule, pre: b, post; c
        cd = create :rule, pre: c, post: d
        expect{create :rule, pre: a, post: d}.to raise_error
      end
    end
  end
end
