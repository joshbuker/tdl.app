class Tagging < ApplicationRecord
  belongs_to :tag
  belongs_to :task

  validate :tag_and_task_owner_match

  def task_hash
    {
      title: tag.title,
      order: order
    }
  end

  def tag_and_task_owner_match
    return unless tag.is_a?(Tag) && task.is_a?(Task)
    return if tag.user == task.list&.user
    errors.add(:base, 'Tag and Task must belong to the same user.')
  end
end
