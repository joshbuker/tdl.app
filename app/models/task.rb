class Task < ApplicationRecord
  belongs_to :list

  has_one :user, through: :list

  has_many :taggings,
    dependent: :destroy

  has_many :pre_rules,
    class_name: 'Rule',
    foreign_key: :post_id,
    dependent: :destroy
  has_many :post_rules,
    class_name: 'Rule',
    foreign_key: :pre_id,
    dependent: :destroy

  has_many :tags,
    through: :taggings

  has_many :prereqs,
    class_name: 'Task',
    through: :pre_rules,
    source: :pre
  has_many :postreqs,
    class_name: 'Task',
    through: :post_rules,
    source: :post

  validates :title,
    presence: true,
    uniqueness: { case_sensitive: false, scope: :list }

  scope :today, -> {
    where(remind_me_at: nil).or(
      self.where(
        'remind_me_at <= ?', Time.current.end_of_day
      )
    )
  }

  scope :tomorrow, -> {
    where(
      remind_me_at: 1.day.from_now.beginning_of_day..1.day.from_now.end_of_day
    )
  }

  scope :upcoming, -> {
    where(
      remind_me_at: 2.days.from_now.beginning_of_day..31.days.from_now.end_of_day
    )
  }

  scope :someday, -> {
    where(
      'remind_me_at > ?', 31.days.from_now.end_of_day
    )
  }

  scope :next_up, -> {
    where(completed: false).
    includes(:pre_rules).
    where(rules: { id: nil })
  }

  def self.search(title)
    if title.present?
      where('tasks.title iLIKE :title', title: "%#{title}%")
    else
      none
    end
  end

  def to_tree
    results = self.to_hash

    results.merge!({ postreqs: postreqs.map{ |post| post.to_tree } }) if postreqs.any?

    results
  end

  def to_hash
    {
      id: id,
      title: title,
      completed: completed,
      list_title: list.title,
      tags: tags.map{ |tag| { title: tag.title, color: tag.color, text_color: tag.text_color } }
    }
  end

  def to_json
    self.to_hash.to_json
  end
end
