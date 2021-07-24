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

  private

  def set_task
    task_id = params[:task_id] || params[:id]
    @task = Task.find(task_id)
  end

  def task_params
    params.require(:task).permit(:title, :order)
  end
end
