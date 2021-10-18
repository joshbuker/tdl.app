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

    if post.get_all_posts.include?(pre) || pre.get_all_pres.include?(post)
      errors.add(:base, "Candidate prerequisite \"#{pre.title}\" is already a postrequisite of candidate postrequisite \"#{post.title}\"")
    end
  end

  def redundant_rules
    # validation
    # A -> B -> C -> D
    # A -> D

    return unless pre.present? && post.present?
    return unless pre.persisted? && post.persisted?

    if post.get_all_pres.include?(pre) ||  pre.get_all_posts.include?(post)
      errors.add(:base, "Candidate postrequisite \"#{post.title}\" is already a postrequisite of \"#{pre.title}\"")
    end
  end

  def prune_redundant_rules
    #validation
    # B -> C -> D -> E
    # A -> E
    # A -> B (removes A -> E) pre: pre, post: post.get_all_posts
    # if you're doing this: remove rules where pre: pre and post: post.get_all_posts
    # remove rules where pre: post.get_all_posts and post: the post of that one ^

    # getPosts().removeIf(t -> {
    #     if(task.findBelow(t) != null) {
    #         t.DEPENDENCY.removePre(this);
    #         t.flagBelow();
    #         flagAbove();
    #         return true;
    #     }
    #     return false;
    # });


    # A -> B
    # A -> C
    # B -> C
    # A -> B -> C (removes A -> C)


    # task.getPres().removeIf(t -> {
    #     if (findAbove(t) != null) {
    #         t.DEPENDENCY.removePost(task);
    #         t.flagAbove();
    #         flagBelow();
    #         return true;
    #     }
    #     return false;
    # });

    Rule.where(pre: pre.get_all_pres, post: post).each do |rule|
      rule.destroy! if rule.invalid?
    end

    Rule.where(pre: pre, post: post.get_all_posts).each do |rule|
      rule.destroy! if rule.invalid?
    end
  end

end
