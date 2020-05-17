class TasksController < ApiController
  before_action :set_task,
    only: [
      :update, :destroy, :mark_task_complete, :mark_task_incomplete, :prereqs,
      :postreqs, :add_prerequisite, :add_postrequisite
    ]
  before_action :set_tasks, only: [:today, :tomorrow, :upcoming, :someday]

  def index
    tasks = Task.search(params[:title]).order(:id => :asc).map do |task|
      task.to_tree
    end

    render json: tasks.to_json
  end

  def today
    if @tasks.any?
      tasks = @tasks.includes(:tags, :list).today.next_up.order(:id => :asc).map do |task|
        task.to_hash
      end
    else
      tasks = []
    end

    render json: tasks.to_json
  end

  def tomorrow
    if @tasks.any?
      tasks = @tasks.includes(:tags, :list).tomorrow.next_up.order(:id => :asc).map do |task|
        task.to_hash
      end
    else
      tasks = []
    end

    render json: tasks.to_json
  end

  def upcoming
    if @tasks.any?
      tasks = @tasks.includes(:tags, :list).upcoming.next_up.order(:id => :asc).map do |task|
        task.to_hash
      end
    else
      tasks = []
    end

    render json: tasks.to_json
  end

  # This is when I plan on making this DRY
  def someday
    if @tasks.any?
      tasks = @tasks.includes(:tags, :list).someday.next_up.order(:id => :asc).map do |task|
        task.to_hash
      end
    else
      tasks = []
    end

    render json: tasks.to_json
  end

  def search
    tasks = Task.includes(:tags, :list).
      search(params[:title]).
      where(user: current_user)
    tasks = tasks.map do |task|
      task.to_hash
    end

    render json: tasks.to_json
  end

  def create
    task = Task.new(task_params)
    task.list = current_user&.lists&.find_by(title: 'Inbox')
    task.user = current_user
    case params[:time]
    when 'Today'
      task.remind_me_at = Time.current
    when 'Tomorrow'
      task.remind_me_at = 1.day.from_now
    when 'Upcoming'
      task.remind_me_at = 2.weeks.from_now
    when 'Someday'
      task.remind_me_at = 2.months.from_now
    end
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

  def add_prerequisite
    prereq = Task.find_by(id: params[:pre_task_id])

    Rule.create!(pre: prereq, post: @task)

    render json: prereq.to_json
  end

  def add_postrequisite
    postreq = Task.find_by(id: params[:post_task_id])

    Rule.create!(pre: @task, post: postreq)

    render json: postreq.to_json
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

  def destroy
    @task.destroy!

    head :ok
  end

private

  def set_task
    task_id = params[:task_id] || params[:id]
    @task = Task.find(task_id)
  end

  def set_tasks
    # FIXME: Refactor evil if/else chain into Task scope/class method
    if current_user.present?
      if params[:limiter_type].present? && params[:limiter_value].present?
        if params[:limiter_type] == 'list'
          if params[:limiter_value] == 'All Tasks'
            @tasks = current_user.tasks
          else
            @tasks = current_user.tasks.by_list(
              params[:limiter_value],
              current_user
            )
          end
        elsif params[:limiter_type] == 'tag'
          if params[:limiter_value] == 'No Tags'
            @tasks = current_user.tasks.tagless
          else
            @tasks = current_user.tasks.by_tag(
              params[:limiter_value],
              current_user
            )
          end
        else
          @tasks = Task.none
        end
      else
        @tasks = current_user.tasks
      end
    else
      @tasks = Task.none
    end
  end

  def task_params
    params.require(:task).permit(:title)
  end
end
