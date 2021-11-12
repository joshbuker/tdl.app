class Rule < ApplicationRecord
  belongs_to :pre,
    class_name: 'Task',
    inverse_of: :post_rules
  belongs_to :post,
    class_name: 'Task',
    inverse_of: :pre_rules

  validates :pre, uniqueness: { scope: :post_id }
  validates :post, uniqueness: { scope: :pre_id }

  validate :different_tasks, :circular_rules, :redundant_rules
  after_save :prune_redundant_rules

  def different_tasks
    return unless pre == post

    errors.add(:base, I18n.t('activerecord.errors.models.rule.tasks_must_differ'))
  end

  # rubocop:disable Metrics/AbcSize
  # FIXME: consider relying on a master presence/persisted test
  #   to avoid redundancy and AbcSize conflicts
  def circular_rules
    # validation
    # A -> B -> C -> D
    # D -> A

    return unless pre.present? && post.present?
    return unless pre.persisted? && post.persisted?
    return unless post.all_posts.include?(pre) && pre.all_pres.include?(post)

    # rubocop:disable Metrics/LineLength
    # FIXME: need to figure out how to add I18n with interpolation
    errors.add(:rule, "\"#{pre.title}\" is already a postrequisite of \"#{post.title}\"")
  end

  def redundant_rules
    # validation
    # A -> B -> C -> D
    # A -> D

    return unless pre.present? && post.present?
    return unless pre.persisted? && post.persisted?
    return unless post.all_pres.include?(pre) && pre.all_posts.include?(post)

    errors.add(:rule, "\"#{post.title}\" is already a postrequisite of \"#{pre.title}\"")
    # rubocop:enable Metrics/LineLength
  end
  # rubocop:enable Metrics/AbcSize

  def prune_redundant_rules
    Rule.where(pre: pre.all_pres, post: post).find_each do |rule|
      rule.destroy! if rule.invalid?
    end

    Rule.where(pre: pre, post: post.all_posts).find_each do |rule|
      rule.destroy! if rule.invalid?
    end
  end
end
