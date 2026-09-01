class LegalAcceptancesController < ApplicationController
  skip_legal_acceptance

  layout "auth"

  def show
    @documents = Current.user.outstanding_legal_documents(locale: I18n.locale.to_s)

    redirect_to root_path if @documents.empty?
  end

  def create
    documents = Current.user.outstanding_legal_documents(locale: I18n.locale.to_s)

    if params[:accept].blank?
      redirect_to legal_acceptance_path, alert: t(".must_accept")
      return
    end

    documents.each do |document|
      LegalAcceptance.record!(
        user: Current.user,
        legal_document: document,
        ip_address: Current.ip_address
      )
    end

    redirect_to root_path, notice: t(".accepted")
  end
end
