class TasksController < ApiController
  before_action :set_task, only: [:update, :destroy, :mark_task_complete, :mark_task_incomplete]
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
    task.save!

    render json: task.to_json
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def update
    @task.update!(task_params)

    render json: @task.to_json
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
    if current_user.present?
      @tasks = current_user.tasks
    else
      @tasks = Task.all
    end
  end

  def task_params
    params.require(:task).permit(:title)
  end
end
