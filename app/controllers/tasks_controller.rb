class TasksController < ApplicationController
  before_action :set_task, except: [:index, :create, :sync_ordering]

  def index
    authorize Task

    @tasks = policy_scope(Task).order(order: :asc, title: :asc)
  end

  def show
    authorize @task
  end

  def create
    @task = Task.new(task_params)
    @task.user = current_user

    authorize @task

    @task.save!

    render :show
  end

  def update
    authorize @task

    @task.update!(task_params)

    render :show
  end

  def destroy
    authorize @task

    @task.destroy!

    head :ok
  end

  # FIXME: This level of complexity is a code smell, fix it.
  # rubocop:disable Metrics
  def sync_ordering
    authorize Task

    tasks = policy_scope(Task)

    # TODO: Find the best way to test these edge cases / move them into the
    #       model so it can be unit tested.
    # :nocov:
    raise ActionController::ParameterMissing, :tasks if params[:tasks].blank?

    unless params[:tasks].is_a?(Array)
      raise ArgumentError, 'Tasks must be an array'
    end

    # :nocov:

    Task.transaction do
      params[:tasks].each do |task_order|
        task = tasks.find { |l| l.id == task_order[:id] }
        raise Pundit::NotAuthorizedError if task.nil?
        next if task.order == task_order[:order]
        unless task_order[:order].is_a?(Integer)
          raise ArgumentError, 'Order must be an integer'
        end

        task.update!(order: task_order[:order])
      end
    end

    head :ok
  rescue ArgumentError => e
    not_processable(e)
  end
  # rubocop:enable Metrics

  def mark_complete
    authorize @task

    if @task.completed?
      render json: { error: 'Already marked as complete' },
        status: :unprocessable_entity
      return
    end

    @task.update!(completed_at: Time.current)

    render :show
  end

  def mark_incomplete
    authorize @task

    unless @task.completed?
      render json: { error: 'Already marked as incomplete' },
        status: :unprocessable_entity
      return
    end

    @task.update!(completed_at: nil)

    render :show
  end

  def update_tags
    authorize @task

    allowed_tags = policy_scope(Tag)
    task_tags = []

    unless params[:tags].nil?
      params[:tags].each do |potential_tag|
        tag = allowed_tags.find { |t| t.id == potential_tag[:id] }
        raise Pundit::NotAuthorizedError if tag.nil?
        task_tags << tag
      end
    end

    @task.tags = task_tags
    @task.save!

    render :show
  end

  def update_list
    authorize @task

    list = policy_scope(List).find(params[:list_id])
    raise Pundit::NotAuthorizedError if list.nil?

    @task.list = list
    @task.save!

    render :show
  end

  private

  def set_task
    task_id = params[:task_id] || params[:id]
    @task = Task.find(task_id)
  end

  def task_params
    params.require(:task).permit(:title, :order, :list_id, :notes)
  end
end
