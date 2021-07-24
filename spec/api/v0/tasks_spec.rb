require 'swagger_helper'

RSpec.describe 'Tasks' do
  let(:user) { create :user }
  let(:user_session) { create :user_session, user: user }
  let(:token) do
    # This is dumb and jank, fix it.
    UserSessionsController.new.issue_jwt_token(
      { user_session_id: user_session.id.to_s }
    )
  end
  let(:Authorization) { "Bearer #{token}" }
  let!(:user_task) { create :task, user: user }
  let!(:other_task) { create :task }

  path '/tasks' do
    get 'Returns an array of the current user\'s tasks.' do
      response '200', 'Success' do
        run_test!
      end

      response '401', 'Not authenticated' do
        let(:Authorization) { nil }

        run_test!
      end
    end
  end
end
