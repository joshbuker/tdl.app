class TaskPolicy < ApplicationPolicy
  class Scope < Scope
    def resolve
      scope.where(user: user)
    end
  end

  def index?
    user.present?
  end

  def show?
    record_user_matches? && list_user_matches?
  end

  def create?
    record_user_matches? && list_user_matches?
  end

  def update?
    record_user_matches? && list_user_matches?
  end

  def destroy?
    record_user_matches? && list_user_matches?
  end

  def sync_ordering?
    user.present?
  end

  def list_user_matches?
    return false unless record.present? && user.present?
    return false if record.list.blank?

    record.list.user == user
  end
end
