class Session < ApplicationRecord
  include Encryptable

  # Encrypt user_agent if ActiveRecord encryption is configured
  if encryption_ready?
    encrypts :user_agent
  end

  belongs_to :user
  belongs_to :active_impersonator_session,
    -> { where(status: :in_progress) },
    class_name: "ImpersonationSession",
    optional: true

  # Sessions expire on two independent axes:
  #   idle     — no activity for IDLE_TIMEOUT
  #   absolute — alive longer than ABSOLUTE_LIFETIME regardless of activity
  # Both are ENV-tunable so they can be widened without a deploy.
  DEFAULT_IDLE_TIMEOUT_MINUTES = 30
  DEFAULT_ABSOLUTE_LIFETIME_DAYS = 7

  # `last_active_at` is written on nearly every request, so throttle it: a
  # session is only touched once per minute. Without this every page view costs
  # an extra UPDATE against a cross-region database.
  ACTIVITY_THROTTLE = 60.seconds

  before_create :capture_session_info
  before_create :set_expiry

  scope :expired, -> {
    where(arel_table[:expires_at].lteq(Time.current))
      .or(where(arel_table[:last_active_at].lteq(idle_timeout.ago)))
      .or(where(last_active_at: nil).where(arel_table[:created_at].lteq(idle_timeout.ago)))
  }

  scope :active, -> { where.not(id: expired.select(:id)) }

  class << self
    def idle_timeout
      positive_env_minutes("SESSION_IDLE_TIMEOUT_MINUTES", DEFAULT_IDLE_TIMEOUT_MINUTES)
    end

    def absolute_lifetime
      positive_env_days("SESSION_ABSOLUTE_LIFETIME_DAYS", DEFAULT_ABSOLUTE_LIFETIME_DAYS)
    end

    # Sign out everywhere. `except:` keeps the caller's own session alive so the
    # user is not signed out of the device they are actively using.
    def revoke_all_for(user, except: nil)
      scope = where(user: user)
      scope = scope.where.not(id: except.id) if except
      scope.destroy_all
    end

    private

      def positive_env_minutes(key, fallback)
        value = ENV.fetch(key, fallback).to_i
        (value.positive? ? value : fallback).minutes
      end

      def positive_env_days(key, fallback)
        value = ENV.fetch(key, fallback).to_i
        (value.positive? ? value : fallback).days
      end
  end

  def expired?
    return true if expires_at.present? && expires_at <= Time.current

    (last_active_at || created_at) <= self.class.idle_timeout.ago
  end

  # Seconds until the idle timeout fires, so the UI can warn before it does.
  def seconds_until_idle_timeout
    deadline = (last_active_at || created_at) + self.class.idle_timeout
    [ (deadline - Time.current).to_i, 0 ].max
  end

  def touch_activity!
    return if last_active_at.present? && last_active_at > ACTIVITY_THROTTLE.ago

    # update_column: no callbacks, no validations, no updated_at churn. This
    # runs on most requests, so it must stay a single cheap write.
    update_column(:last_active_at, Time.current)
  end

  def get_preferred_tab(tab_key)
    data.dig("tab_preferences", tab_key)
  end

  def set_preferred_tab(tab_key, tab_value)
    data["tab_preferences"] ||= {}
    data["tab_preferences"][tab_key] = tab_value
    save!
  end

  private

    def capture_session_info
      self.user_agent = Current.user_agent
      raw_ip = Current.ip_address
      self.ip_address = raw_ip
      self.ip_address_digest = Digest::SHA256.hexdigest(raw_ip.to_s) if raw_ip.present?
    end

    def set_expiry
      now = Time.current
      self.last_active_at ||= now
      self.expires_at ||= now + self.class.absolute_lifetime
    end
end
