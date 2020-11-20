class TasksController < ApiController
  before_action :set_task, except: [
    :index, :treeview, :search, :create, :clear_completed
  ]
  before_action :set_tasks, only: [:index, :treeview]

  def index
    tasks = []
    if @tasks.any?
      next_up = @tasks.includes(:tags, :list).next_up

      # FIXME: This causes a race condition on day rollover (tasks that roll
      #        from tomorrow to today will be missing if today was parsed before
      #        midnight, and tomorrow after midnight)
      next_up.today.each do |task|
        tasks << task.to_hash
      end

      next_up.tomorrow.each do |task|
        tasks << task.to_hash
      end

      next_up.upcoming.each do |task|
        tasks << task.to_hash
      end

      next_up.someday.each do |task|
        tasks << task.to_hash
      end
    end

    render json: tasks.to_json
  end

  def treeview
    if @tasks.any?
      tasks = @tasks.includes(:tags, :list).treeview.map do |task|
        if task.postreqs.any?
          task.to_hash.merge!({ postreqs: [] })
        else
          task.to_hash
        end
      end
    else
      tasks = []
    end

    render json: tasks.to_json
  end

  def search
    tasks = current_user.tasks.
      includes(:tags, :list, :postreqs).
      search(params[:title]).
      order(order: :asc, id: :asc).
      map(&:to_hash)

    render json: tasks.to_json
  end

  def create
    task = Task.new(task_params)

    if params[:tags].present? && params[:tags].is_a?(Array)
      tags = []
      params[:tags].each do |tag_title|
        if tag = current_user.tags.find_by(title: tag_title)
          tags << tag
        end
      end
      task.tags = tags
    end

    if params[:list].present? && params[:list] != 'All Tasks'
      task.list = current_user.lists.find_by(title: params[:list])
    else
      task.list = current_user.lists.find_by(title: 'Inbox')
    end

    if params[:time].present?
      case params[:time].to_s.titleize
      when 'Today'
        task.review_at = Time.current
      when 'Tomorrow'
        task.review_at = 1.day.from_now
      when 'Upcoming'
        task.review_at = 2.weeks.from_now
      when 'Someday'
        task.review_at = 2.months.from_now
      end
    end

    task.user = current_user

    task.save!

    render json: task.to_json
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def update
    @task.update!(task_params)

    render json: @task.to_json
  end

  def prereqs
    results = @task.prereqs.map(&:to_hash)

    render json: results.to_json
  end

  def postreqs
    results = @task.postreqs.map(&:to_hash)

    render json: results.to_json
  end

  def tree_postreqs
    results = @task.postreqs.map do |task|
      if task.postreqs.any?
        task.to_hash.merge!({ postreqs: [] })
      else
        task.to_hash
      end
    end

    render json: results.to_json
  end

  def add_prerequisite
    prereq = Task.find_by(id: params[:pre_task_id])

    Rule.create!(pre: prereq, post: @task)

    render json: prereq.to_json
  end

  def remove_prerequisite
    prereq = Task.find_by(id: params[:pre_task_id])
    rule = Rule.find_by(pre: prereq, post: @task)

    rule.destroy!

    updated_pres = @task.prereqs.map(&:to_hash)

    render json: updated_pres.to_json
  end

  def add_postrequisite
    postreq = Task.find_by(id: params[:post_task_id])

    Rule.create!(pre: @task, post: postreq)

    render json: postreq.to_json
  end

  def remove_postrequisite
    postreq = Task.find_by(id: params[:post_task_id])
    rule = Rule.find_by(pre: @task, post: postreq)

    rule.destroy!

    updated_posts = @task.postreqs.map(&:to_hash)

    render json: updated_posts.to_json
  end

  def update_tags
    unless params[:tag_titles].is_a?(Array)
      render json: { error: 'Invalid Tags!' }, status: :unprocessable_entity
      return
    end

    tags = []

    params[:tag_titles].each do |tag_title|
      if tag = current_user.tags.find_by(title: tag_title)
        tags << tag
      end
    end

    @task.tags = tags
    @task.save!

    render json: @task.tags.reload.map(&:to_hash).to_json
  end

  def update_list
    list = current_user&.lists&.find_by(title: params[:list_title])

    unless list.is_a?(List)
      render json: { error: 'Invalid List!' }, status: :unprocessable_entity
      return
    end

    @task.list = list
    @task.save!

    render json: @task.list.title.to_json
  end

  def update_notes
    @task.notes = params[:notes]
    @task.save!

    render json: @task.notes.to_json
  end

  def update_review_at
    @task.review_at =
      case params[:review_at]
      when 'tomorrow'
        1.day.from_now
      when 'next week'
        1.week.from_now
      when 'upcoming'
        31.days.from_now
      when 'someday'
        2.months.from_now
      else
        params[:review_at]
      end
    @task.save!

    if @task.review_at.present?
      render json: I18n.l(@task.review_at, format: :iso_8601).to_json
    else
      head :ok
    end
  end

  def update_order
    if params[:tag_title].present?
      tag = @task.tags.find_by(title: params[:tag_title])
      tagging = Tagging.find_by(tag: tag, task: @task)
      tagging.order = params[:order]

      tagging.save!

      render json: tagging.order.to_json
    else
      @task.order = params[:order]

      @task.save!

      render json: @task.order.to_json
    end
  end

  def mark_task_complete
    if @task.completed?
      render json: { error: 'Already marked as complete' }, status: :unprocessable_entity
      return
    end

    @task.update!(completed: true)

    render json: @task.to_json
  end

  def mark_task_incomplete
    unless @task.completed?
      render json: { error: 'Already marked as incomplete' }, status: :unprocessable_entity
      return
    end

    @task.update!(completed: false)

    render json: @task.to_json
  end

  def clear_completed
    if current_user.present?
      current_user.tasks.where(completed: true).destroy_all
    else
      head :forbidden
      return
    end

    head :ok
  end

  def destroy
    @task.destroy!

    head :ok
  end

private

  def set_task
    task_id = params[:task_id] || params[:id]
    @task = current_user.tasks.find(task_id)
  end

  def set_tasks
    if current_user.present?
      @tasks = current_user.tasks.order(order: :asc, id: :asc)
    else
      @tasks = Task.none
    end
  end

  def task_params
    params.require(:task).permit(:title)
  end
end
