class TagsController < ApiController
  def index
    tags = Tag.all.map do |tag|
      {
        title: tag.title,
        color: tag.color
      }
    end

    render json: tags.to_json
  end
end
