class TagsController < ApiController
  before_action :set_tags

  def index
    tags = @tags.map do |tag|
      {
        title: tag.title,
        color: tag.color
      }
    end

    render json: tags.to_json
  end

private

  def set_tags
    if current_user.present?
      @tags = current_user.tags
    else
      @tags = Tag.all
    end
  end
end
