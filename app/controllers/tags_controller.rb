class TagsController < ApiController
  before_action :set_tags

  def index
    tags = @tags.map do |tag|
      {
        title: tag.title,
        color: tag.color,
        text_color: tag.text_color,
        task_count: tag.tasks.size
      }
    end

    tags.push({
      title: 'No Tags',
      color: 'white',
      text_color: 'black',
      task_count: current_user.tasks.tagless.size
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
