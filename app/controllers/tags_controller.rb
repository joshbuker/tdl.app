class TagsController < ApiController
  before_action :set_tags

  def index
    tags = @tags.map do |tag|
      tag.to_hash
    end

    tags.push({
      title: 'No Tags',
      color: 'white',
      text_color: 'black',
      task_count: current_user.tasks.tagless.size
    })

    render json: tags.to_json
  end

  def create
    tag = Tag.new(tag_params)
    tag.user = current_user
    tag.randomize_color!

    tag.save!

    render json: tag.to_json
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

private

  def set_tags
    if current_user.present?
      @tags = current_user.tags
    else
      @tags = Tag.all
    end
  end

  def tag_params
    params.require(:tag).permit(:title)
  end
end
