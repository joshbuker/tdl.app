class ListsController < ApiController
  def index
    lists = List.all.map do |list|
      { title: list.title }
    end

    render json: lists.to_json
  end
end
