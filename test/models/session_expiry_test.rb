require "test_helper"

# Sessions were previously immortal: a 20-year cookie and a bare
# `Session.find_by(id:)` with no expiry on either axis.
class SessionExpiryTest < ActiveSupport::TestCase
  setup do
    @user = users(:family_admin)
    @session = @user.sessions.create!
  end

  test "a new session gets both an activity stamp and an absolute deadline" do
    assert_not_nil @session.last_active_at
    assert_not_nil @session.expires_at
    assert_in_delta Session.absolute_lifetime.from_now, @session.expires_at, 5.seconds
  end

  test "expires once idle past the idle timeout" do
    assert_not @session.expired?

    @session.update_columns(last_active_at: (Session.idle_timeout + 1.minute).ago)

    assert @session.expired?, "a session idle beyond the timeout must be expired"
  end

  test "expires at the absolute deadline even while active" do
    @session.update_columns(last_active_at: Time.current, expires_at: 1.second.ago)

    assert @session.expired?, "absolute lifetime must win over recent activity"
  end

  test "activity writes are throttled to once per minute" do
    @session.update_columns(last_active_at: 10.seconds.ago)

    assert_no_changes -> { @session.reload.last_active_at } do
      @session.touch_activity!
    end

    @session.update_columns(last_active_at: (Session::ACTIVITY_THROTTLE + 5.seconds).ago)

    assert_changes -> { @session.reload.last_active_at } do
      @session.touch_activity!
    end
  end

  test "expired scope finds both axes and active excludes them" do
    idle = @user.sessions.create!
    idle.update_columns(last_active_at: (Session.idle_timeout + 1.minute).ago)

    aged = @user.sessions.create!
    aged.update_columns(expires_at: 1.minute.ago)

    expired_ids = Session.expired.pluck(:id)

    assert_includes expired_ids, idle.id
    assert_includes expired_ids, aged.id
    assert_not_includes expired_ids, @session.id
    assert_includes Session.active.pluck(:id), @session.id
  end

  test "sessions created before the migration are not treated as freshly active" do
    legacy = @user.sessions.create!
    legacy.update_columns(last_active_at: nil, created_at: (Session.idle_timeout + 1.hour).ago)

    assert legacy.expired?, "a null last_active_at must fall back to created_at"
    assert_includes Session.expired.pluck(:id), legacy.id
  end

  test "revoke_all_for clears a user's sessions and can spare the current one" do
    other = @user.sessions.create!

    Session.revoke_all_for(@user, except: @session)

    assert Session.exists?(@session.id), "the caller's own session should survive"
    assert_not Session.exists?(other.id)

    Session.revoke_all_for(@user)
    assert_not Session.exists?(@session.id)
  end

  test "revoking does not touch another user's sessions" do
    stranger = users(:family_member).sessions.create!

    Session.revoke_all_for(@user)

    assert Session.exists?(stranger.id), "revocation must be scoped to one user"
  end

  test "the sweeper removes only expired sessions" do
    doomed = @user.sessions.create!
    doomed.update_columns(expires_at: 1.minute.ago)

    SessionSweepJob.new.perform

    assert_not Session.exists?(doomed.id)
    assert Session.exists?(@session.id)
  end

  test "seconds_until_idle_timeout counts down and floors at zero" do
    @session.update_columns(last_active_at: Time.current)
    assert_in_delta Session.idle_timeout.to_i, @session.seconds_until_idle_timeout, 5

    @session.update_columns(last_active_at: (Session.idle_timeout + 1.hour).ago)
    assert_equal 0, @session.seconds_until_idle_timeout
  end
end
