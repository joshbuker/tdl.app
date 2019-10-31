class TasksController < ApiController
  before_action :set_task, only: [:update, :destroy]

  def index
    tasks = Task.all.order(:id => :asc).map do |task|
      {
        id: task.id,
        title: task.title,
        completed: false
      }
    end

    render json: tasks.to_json
  end

  def create
    task = Task.new(task_params)
    task.save!

    render json: task.to_json
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def update
    @task.update!(task_params)

    render json: @task.to_json
  end

  def destroy
    @task.destroy!

    head :ok
  end

private

  def set_task
    @task = Task.find(params[:id])
  end

  def task_params
    params.require(:task).permit(:title)
  end
end
