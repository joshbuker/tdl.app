class Task < ApplicationRecord
  include AutoStripTitle

  belongs_to :list
  belongs_to :user

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
    -> { order(order: :asc, title: :asc) },
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
    uniqueness: { case_sensitive: false, scope: :user_id }

  validate :list_and_task_owner_match, :prereqs_before_self

  scope :today, -> {
    where(review_at: nil).or(
      self.where(
        'review_at <= ?', Time.current.end_of_day
      )
    )
  }

  scope :tomorrow, -> {
    where(
      review_at: 1.day.from_now.beginning_of_day..1.day.from_now.end_of_day
    )
  }

  scope :upcoming, -> {
    where(
      review_at: 2.days.from_now.beginning_of_day..31.days.from_now.end_of_day
    )
  }

  scope :someday, -> {
    where(
      'review_at > ?', 31.days.from_now.end_of_day
    )
  }

  scope :next_up, -> {
    query = self # I like abstraction and I cannot lie
    return none unless query.any?
    array = query.map(&:id).to_s.gsub(/[\[\]]/, '')
    sql = <<-SQL
      SELECT DISTINCT t.id FROM tasks as t
      -- where incomplete and not listed as rules post
      WHERE t.completed = false
      AND t.id IN (#{array})
      AND (
        NOT EXISTS (
          SELECT r.post_id FROM rules AS r WHERE r.post_id = t.id
        )
        OR
        NOT EXISTS (
          SELECT r.pre_id FROM rules AS r, tasks as tt
          WHERE r.post_id = t.id
          AND r.pre_id = tt.id
          AND tt.completed = false
        )
      )
    SQL

    where("#{table_name}.id IN (#{sql})")
  }

  # TODO: This query might be simple enough to use pure ActiveRecord syntax
  scope :treeview, -> {
    query = self # I like abstraction and I cannot lie
    return none unless query.any?
    array = query.map(&:id).to_s.gsub(/[\[\]]/, '')
    sql = <<-SQL
      SELECT DISTINCT t.id FROM tasks as t
      -- where not listed as rules post
      WHERE t.id IN (#{array})
      AND (
        NOT EXISTS (
          SELECT r.post_id FROM rules AS r WHERE r.post_id = t.id
        )
      )
    SQL

    where("#{table_name}.id IN (#{sql})")
  }

  scope :tagless, -> {
    includes(:tags).
    where(tags: { id: nil })
  }

  after_commit :queue_reminder,
    if: -> {
      new_record? ||
      changes[:review_at] ||
      changes[:remind_me]
    }

  def self.search(title)
    if title.present?
      where('tasks.title iLIKE :title', title: "%#{title}%")
    else
      none
    end
  end

  def self.by_list(list_name, user)
    raise ArgumentError, 'Must provide a user' unless user.is_a?(User)
    if list_name.present?
      list = user.lists.find_by(title: list_name)
      return none if list.nil?
      includes(:list).
      where(list_id: list.id).
      order(order: :asc, id: :asc)
    else
      none
    end
  end

  def self.by_tag(tag_name, user)
    raise ArgumentError, 'Must provide a user' unless user.is_a?(User)
    if tag_name.present?
      tag = user.tags.find_by(title: tag_name)
      return none if tag.nil?
      includes(:tags, :taggings).
      where(tags: { id: tag.id }).
      order('taggings.order, tasks.id')
    else
      none
    end
  end

  def get_all_pres
    # rtree - Recursive Tree
    sql = <<-SQL
      WITH RECURSIVE task_tree(id, rtree) AS (
        SELECT t1.id, ARRAY[t1.id]
        FROM tasks t1
          INNER JOIN rules t2 ON t1.id = t2.pre_id
        WHERE post_id = #{self.id}
          AND t1.completed = 'false'
        UNION ALL
        SELECT t1.id, rtree || t1.id
        FROM tasks t1
          INNER JOIN rules t2 ON t1.id = t2.pre_id
          INNER JOIN task_tree ptree ON t2.post_id = ptree.id
        WHERE t1.completed = 'false'
          AND NOT (t1.id = ANY(ptree.rtree))
      )

      SELECT * FROM tasks WHERE id IN (SELECT DISTINCT(id) FROM task_tree);
    SQL
    # FIXME: Sanitize this query!
    # sql = sql_sanitize(sql)
    sql.chomp
    Task.find_by_sql(sql)
  end

  def get_all_posts
    sql = <<-SQL
      WITH RECURSIVE task_tree(id, rtree) AS (
        SELECT t1.id, ARRAY[t1.id]
        FROM tasks AS t1 INNER JOIN rules t2 ON t1.id = t2.post_id
        WHERE pre_id = #{self.id}
        UNION ALL
        SELECT t1.id, rtree || t1.id
        FROM tasks AS t1
          INNER JOIN rules AS t2 ON t1.id = t2.post_id
          INNER JOIN task_tree AS ptree ON t2.pre_id = ptree.id
        WHERE NOT (t1.id = ANY(ptree.rtree))
      )

      SELECT * FROM tasks WHERE id IN (SELECT DISTINCT(id) FROM task_tree);
    SQL
    # FIXME: Sanitize this query!
    # sql = sql_sanitize(sql)
    sql.chomp
    Task.find_by_sql(sql)
  end

  def to_tree
    results = self.to_hash

    results.merge!({ postreqs: postreqs.map{ |post| post.to_tree } }) if postreqs.any?

    results
  end

  def to_hash
    {
      id: id,
      order: order,
      title: title,
      completed: completed,
      list: list.task_hash,
      list_title: list.title, # TODO: Replace usage with List object
      notes: notes,
      remind_me: remind_me,
      review_at: review_at.present? ? I18n.l(review_at, format: :iso_8601) : nil,
      tag_ordering: taggings.reload.map { |tagging| tagging.task_hash },
      tags: tags.reload.map{ |tag| tag.task_hash }
    }
  end

  def to_json
    self.to_hash.to_json
  end

  def queue_reminder
    # Purge any existing notifications queued for this task
    Delayed::Job.all.find_each do |job|
      next unless job.payload_object.object.is_a?(Task)
      job.destroy if job.payload_object.id == id
    end
    # Don't queue notification if remind me is false or no time is set
    return unless remind_me? && review_at.present?
    # Don't queue notification if it would happen immediately
    return if review_at.in_time_zone <= Time.current
    # Queue new notification
    push_notification
  end

  def push_notification
    return false unless remind_me? && review_at.present?
    return false unless review_at.in_time_zone <= Time.current
    user.push_notification(title, 'Task notification')
    true
  end

  # This must be called after the method is declared
  handle_asynchronously :push_notification,
    run_at: Proc.new { |task| task.review_at }

  def list_and_task_owner_match
    return unless list.is_a?(List)
    return if user == list&.user
    errors.add(:base, 'List and Task must belong to the same user.')
  end

  def prereqs_before_self
    return # Disabled for now
    return unless completed? && prereqs.where(completed: false).any?
    errors.add(:completed, 'You must complete all prereqs first!')
  end
end
