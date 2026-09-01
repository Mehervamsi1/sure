# Blocks the app until the signed-in user has accepted every legal document
# currently in force. This covers existing users too: when a new version takes
# effect, everyone is prompted on their next request, not just new signups.
module LegalAcceptable
  extend ActiveSupport::Concern

  included do
    before_action :require_legal_acceptance!
  end

  class_methods do
    def skip_legal_acceptance(**options)
      skip_before_action :require_legal_acceptance!, **options
    end
  end

  private

    def require_legal_acceptance!
      return if Current.user.blank?
      return unless Current.user.legal_acceptance_outstanding?(locale: I18n.locale.to_s)

      # Never trap a request that is itself part of accepting, reading the
      # documents, or leaving.
      return if request.path.start_with?("/legal")
      return if request.path.in?(%w[/privacy /terms])

      respond_to do |format|
        format.html { redirect_to legal_acceptance_path }
        format.turbo_stream { redirect_to legal_acceptance_path, status: :see_other }
        format.any { head :forbidden }
      end
    end
end
