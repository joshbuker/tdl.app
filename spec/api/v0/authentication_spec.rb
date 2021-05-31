require 'swagger_helper'

RSpec.describe 'Authentication' do
  let(:user) { create :user, password: 'Amazing!' }

  path '/login' do
    post 'Creates a session token' do
      security []
      parameter name: :login, in: :body, schema: {
        type: :object,
        properties: {
          username: { type: :string },
          password: { type: :string }
        }
      }
      consumes 'application/json'
      produces 'application/json'

      response '200', 'Logged in successfully' do
        let(:login) { { username: user.username, password: 'Amazing!' } }

        run_test!
      end
    end
  end

  path '/logout' do
    delete 'Destroys a session token' do
      produces 'application/json'

      response '200', 'Logged out successfully' do
        let(:user_session) { create :user_session, user: user }
        let(:token) do
          # This is dumb and jank, fix it.
          UserSessionsController.new.issue_jwt_token(
            { user_session_id: user_session.id.to_s }
          )
        end
        let(:Authorization) { "Bearer #{token}" }

        run_test!
      end
    end
  end
end
