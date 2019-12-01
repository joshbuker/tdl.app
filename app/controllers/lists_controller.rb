class ListsController < ApiController
  before_action :set_lists

  def index
    lists = @lists.map do |list|
      { title: list.title }
    end

    render json: lists.to_json
  end

private

  def set_lists
    if current_user.present?
      @lists = current_user.lists
    else
      @lists = list.all
    end
  end
end
