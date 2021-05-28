require 'swagger_helper'

RSpec.describe 'Authentication', type: :request do
  let(:user) { create :user, password: 'Amazing!' }

  path '/login' do
    post 'Creates a session token' do
      security []
      parameter name: :login, in: :body, schema: {
        type: :object,
        properties: {
          login: { type: :string },
          password: { type: :string }
        }
      }
      consumes 'application/json'
      produces 'application/json'

      response '200', 'session created' do
        let(:login) { { login: user.username, password: 'Amazing!' } }

        run_test!
      end
    end
  end
end
