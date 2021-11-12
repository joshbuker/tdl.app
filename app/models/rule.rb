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

    # TODO: see why :rule doesn't break
    errors.add(
      :base,
      I18n.t('activerecord.errors.models.rule.tasks_must_differ')
    )
  end

  # rubocop:disable Metrics/AbcSize
  # rubocop:disable Metrics/MethodLength
  # FIXME: consider relying on a master presence/persisted test
  #   to avoid redundancy and AbcSize conflicts
  def circular_rules
    # validation
    # A -> B -> C -> D
    # D -> A

    return unless pre.present? && post.present?
    return unless pre.persisted? && post.persisted?
    return unless post.all_posts.include?(pre) || pre.all_pres.include?(post)

    # pre is already a post of post
    errors.add(
      :base,
      I18n.t(
        'activerecord.errors.models.rule.redundant_rule',
        task_i_title:  pre.title,
        task_ii_title: post.title
      )
    )
  end

  def redundant_rules
    # validation
    # A -> B -> C -> D
    # A -> D

    return unless pre.present? && post.present?
    return unless pre.persisted? && post.persisted?
    return unless post.all_pres.include?(pre) || pre.all_posts.include?(post)

    errors.add(
      :base,
      I18n.t(
        'activerecord.errors.models.rule.redundant_rule',
        task_i_title:  post.title,
        task_ii_title: pre.title
      )
    )
  end
  # rubocop:enable Metrics/AbcSize
  # rubocop:enable Metrics/MethodLength

  def prune_redundant_rules
    Rule.where(pre: pre.all_pres, post: post).find_each do |rule|
      rule.destroy! if rule.invalid?
    end

    Rule.where(pre: pre, post: post.all_posts).find_each do |rule|
      rule.destroy! if rule.invalid?
    end
  end
end
