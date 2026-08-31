module Authentication
  extend ActiveSupport::Concern

  included do
    before_action :set_request_details
    before_action :authenticate_user!
    before_action :set_sentry_user
  end

  # Rails session keys that must survive the reset performed on login. Anything
  # not listed here is dropped, which is the point: a pre-login session id must
  # not carry state into an authenticated session. `mfa_user_id` is deliberately
  # absent — it is consumed by the time the session is created.
  PRESERVED_SESSION_KEYS = %w[
    pending_invitation_token
    id_token_hint
    sso_login_provider
    mobile_sso
    return_to
  ].freeze

  class_methods do
    def skip_authentication(**options)
      skip_before_action :authenticate_user!, **options
      skip_before_action :set_sentry_user, **options
    end
  end

  private
    def authenticate_user!
      if session_record = find_session_by_cookie
        Current.session = session_record
      elsif self_hosted_first_login?
        redirect_to new_registration_url
      else
        redirect_to_login
      end
    end

    def find_session_by_cookie
      cookie_value = cookies.signed[:session_token]
      return nil if cookie_value.blank?

      session_record = Session.find_by(id: cookie_value)
      return nil if session_record.nil?

      if session_record.expired?
        session_record.destroy
        cookies.delete(:session_token)
        return nil
      end

      session_record.touch_activity! unless background_request?
      session_record
    end

    # Requests the browser makes on its own — polling, websockets, PWA assets —
    # must not keep a session alive. Otherwise an open tab with nobody at the
    # keyboard defeats the idle timeout entirely.
    def background_request?
      return true if request.path.start_with?("/cable")
      return true if request.path.in?(%w[/manifest /service-worker])
      return true if request.path.start_with?("/accountable_sparklines")

      false
    end

    # A session can expire mid-Turbo-request. A bare redirect would be rendered
    # *inside* the frame, so break out to a full visit instead of quietly
    # painting the sign-in page into a fragment.
    def redirect_to_login
      if turbo_frame_request?
        render turbo_stream: turbo_stream.action(:redirect, new_session_url), status: :unauthorized
      else
        redirect_to new_session_url, status: :see_other
      end
    end

    def create_session_for(user)
      # Rotate the Rails session on authentication so a fixed pre-login session
      # id cannot be reused afterwards. Keys that legitimately survive login are
      # carried across explicitly.
      preserved = session.to_hash.slice(*PRESERVED_SESSION_KEYS)
      reset_session
      preserved.each { |key, value| session[key] = value }

      new_session = user.sessions.create!

      cookies.signed[:session_token] = {
        value: new_session.id,
        httponly: true,
        same_site: :lax,
        secure: request.ssl?,
        expires: Session.absolute_lifetime.from_now
      }

      new_session
    end

    def self_hosted_first_login?
      Rails.application.config.app_mode.self_hosted? && User.count.zero?
    end

    def set_request_details
      Current.user_agent = request.user_agent
      Current.ip_address = request.ip
    end

    def set_sentry_user
      return unless defined?(Sentry) && ENV["SENTRY_DSN"].present?

      if Current.user
        Sentry.set_user(
          id: Current.user.id,
          email: Current.user.email,
          username: Current.user.display_name,
          ip_address: Current.ip_address
        )
      end
    end
end
