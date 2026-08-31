class SessionSweepJob < ApplicationJob
  queue_as :scheduled

  # Expired sessions are already rejected at authentication time, but the rows
  # linger until something removes them. Sweeping keeps the table small and
  # means a revoked device disappears from the active-sessions list rather than
  # sitting there looking live.
  def perform
    deleted = Session.expired.destroy_all.size

    Rails.logger.info("[SessionSweepJob] removed #{deleted} expired sessions") if deleted.positive?

    deleted
  end
end
