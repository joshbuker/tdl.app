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

    errors.add(:base, 'A task cannot be its own pre/post!')
  end

  def circular_rules
    # validation
    # A -> B -> C -> D
    # D -> A

    return unless pre.present? && post.present?
    return unless pre.persisted? && post.persisted?

	unless post.all_posts.exclude?(pre) && pre.all_pres.exclude?(post)
   	  errors.add(:base, "\"#{pre.title}\" is already a postrequisite of \"#{post.title}\"")
   	end
  end

  def redundant_rules
    # validation
    # A -> B -> C -> D
    # A -> D

    return unless pre.present? && post.present?
    return unless pre.persisted? && post.persisted?

	unless post.all_pres.exclude?(pre) && pre.all_posts.exclude?(post)
	  errors.add(:base, "\"#{post.title}\" is already a postrequisite of \"#{pre.title}\"")
	end
  end

  def prune_redundant_rules
    Rule.where(pre: pre.all_pres, post: post).find_each do |rule|
      rule.destroy! if rule.invalid?
    end

    Rule.where(pre: pre, post: post.all_posts).find_each do |rule|
      rule.destroy! if rule.invalid?
    end
  end
end
