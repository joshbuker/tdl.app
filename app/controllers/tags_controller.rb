class TagsController < ApiController
  before_action :set_tags, only: [:index]
  before_action :set_tag, only: [:update, :destroy]

  def index
    tags = @tags.map do |tag|
      tag.to_hash
    end

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

  def update
    @tag.update!(tag_params)

    render json: @tag.to_json
  end

  def destroy
    @tag.destroy!

    head :ok
  end

  def no_tags_count
    render json: current_user.tasks.next_up.tagless.size.to_json
  end

private

  def set_tag
    tag_id = params[:tag_id] || params[:id]
    @tag = current_user.tags.find(tag_id)
  end

  def set_tags
    @tags = current_user.tags.order(order: :asc, id: :asc)
  end

  def tag_params
    params.require(:tag).permit(:title, :color, :order)
  end
end
