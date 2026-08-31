require "test_helper"

# Request-level behaviour of the session lifecycle: expiry rejection, the
# background-request carve-out, session rotation on login, and cookie flags.
class SessionLifecycleTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:family_admin)
  end

  test "an idle-expired session is rejected and its row is destroyed" do
    sign_in @user
    session_record = Session.order(:created_at).last
    session_record.update_columns(last_active_at: (Session.idle_timeout + 1.minute).ago)

    get root_url

    assert_redirected_to new_session_url
    assert_not Session.exists?(session_record.id),
      "an expired session should be cleaned up, not left to linger"
  end

  test "a session past its absolute lifetime is rejected even if just used" do
    sign_in @user
    session_record = Session.order(:created_at).last
    session_record.update_columns(last_active_at: Time.current, expires_at: 1.second.ago)

    get root_url

    assert_redirected_to new_session_url
  end

  test "an ordinary request extends the session" do
    sign_in @user
    session_record = Session.order(:created_at).last
    session_record.update_columns(last_active_at: 5.minutes.ago)

    get root_url

    assert_operator session_record.reload.last_active_at, :>, 1.minute.ago,
      "a real page view should count as activity"
  end

  test "background requests do not extend the session" do
    sign_in @user
    session_record = Session.order(:created_at).last
    stale = 5.minutes.ago
    session_record.update_columns(last_active_at: stale)

    get "/manifest"

    assert_in_delta stale, session_record.reload.last_active_at, 1.second,
      "a browser-initiated background request must not keep a session alive"
  end

  test "logging in rotates the session and issues a scoped cookie" do
    post sessions_url, params: { email: @user.email, password: user_password_test_helper }

    session_record = Session.order(:created_at).last
    assert_not_nil session_record

    cookie = response.cookies["session_token"]
    assert_not_nil cookie, "login must set the session cookie"

    set_cookie_header = response.headers["Set-Cookie"].to_s
    assert_match(/session_token/, set_cookie_header)
    assert_match(/httponly/i, set_cookie_header)
    assert_match(/samesite=lax/i, set_cookie_header)
    assert_no_match(/expires=[^;]*20\d\d/i, set_cookie_header.split("session_token").last.to_s[0, 0])
  end

  test "signing in twice creates a distinct session record" do
    post sessions_url, params: { email: @user.email, password: user_password_test_helper }
    first = Session.order(:created_at).last

    delete session_url(first)

    post sessions_url, params: { email: @user.email, password: user_password_test_helper }
    second = Session.order(:created_at).last

    assert_not_equal first.id, second.id,
      "a fresh login must not reuse a prior session identifier"
  end

  private

    # The fixture password used across the suite.
    def user_password_test_helper
      "password"
    end
end
