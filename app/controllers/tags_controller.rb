class TagsController < ApiController
  before_action :set_tags

  def index
    tags = @tags.map do |tag|
      {
        title: tag.title,
        color: tag.color,
        text_color: tag.text_color
      }
    end

    tags.push({
      title: 'No Tags',
      color: 'white',
      text_color: 'black'
    })

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
