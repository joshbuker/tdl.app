json.array! @tasks do |task|
  json.(task, :id, :list_id, :title, :order, :notes)
  json.completed_at  task.completed_at_iso_8601
  json.deadline_at   task.deadline_at_iso_8601
  json.prioritize_at task.prioritize_at_iso_8601
  json.remind_me_at  task.remind_me_at_iso_8601
  json.review_at     task.review_at_iso_8601
end
