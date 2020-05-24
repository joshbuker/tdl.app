class ListsController < ApiController
  before_action :set_lists

  def index
    lists = @lists.map do |list|
      {
        title: list.title,
        task_count: list.tasks.size
      }
    end

    lists.unshift({
      title: 'All Tasks',
      task_count: current_user.tasks.size
    })

    render json: lists.to_json
  end

  def create
    list = List.new(list_params)
    list.user = current_user

    list.save!

    render json: { title: list.title, task_count: 0 }
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

private

  def set_lists
    if current_user.present?
      @lists = current_user.lists
    else
      @lists = list.all
    end
  end

  def list_params
    params.require(:list).permit(:title)
  end
end
