class ListsController < ApiController
  before_action :set_lists, only: [:index]
  before_action :set_list, only: [:destroy]

  def index
    lists = @lists.map do |list|
      list.to_hash
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

    render json: list.to_json
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def destroy
    @list.destroy!

    head :ok
  end

private

  def set_list
    list_id = params[:list_id] || params[:id]
    @list = List.find(list_id)
  end

  def set_lists
    if current_user.present?
      @lists = current_user.lists
    else
      @lists = List.none
    end
  end

  def list_params
    params.require(:list).permit(:title)
  end
end
