class TasksController < ApiController
  def create
    task = Task.new(task_params)
    task.save!

    return task.to_json
  end

  def update
    task.update!(task_params)

    return task.to_json
  end

  def destroy
    task.destroy!

    return head :ok
  end

private

  def set_task
    @task = Task.find(params[:id])
  end

  def task_params
    params.require(:task).permit(:title)
  end
end
