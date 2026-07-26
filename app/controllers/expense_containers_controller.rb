class ExpenseContainersController < ApplicationController
  before_action :set_container, only: %i[show edit update destroy archive activate]

  def index
    @containers = Current.family.expense_containers.alphabetically
    @active_containers = @containers.select(&:active?)
    @archived_containers = @containers.reject(&:active?)

    @breadcrumbs = [
      [ t("breadcrumbs.home"), root_path ],
      [ t("expense_containers.index.title"), nil ]
    ]
  end

  # The container lens: the same transactions that appear in the normal list,
  # gathered here with a running total against the target.
  def show
    entries = Current.family.entries
      .where(entryable_type: "Transaction")
      .where(entryable_id: @container.transactions.select(:id))
      .includes(entryable: [ :category, :merchant ])
      .reverse_chronological

    @pagy, @entries = pagy(entries, limit: params[:per_page] || 50)

    @breadcrumbs = [
      [ t("breadcrumbs.home"), root_path ],
      [ t("expense_containers.index.title"), expense_containers_path ],
      [ @container.name, nil ]
    ]
  end

  def new
    @container = Current.family.expense_containers.new(
      currency: Current.family.currency,
      color: ExpenseContainer::COLORS.sample
    )
  end

  def edit
  end

  def create
    @container = Current.family.expense_containers.new(container_params)
    @container.currency = Current.family.currency if @container.currency.blank?

    if @container.save
      redirect_to expense_container_path(@container), notice: t(".created")
    else
      render :new, status: :unprocessable_entity
    end
  end

  def update
    if @container.update(container_params)
      redirect_to expense_container_path(@container), notice: t(".updated")
    else
      render :edit, status: :unprocessable_entity
    end
  end

  # Transactions are only unfiled, never deleted with the container.
  def destroy
    @container.destroy!
    redirect_to expense_containers_path, notice: t(".destroyed")
  end

  def archive
    @container.archive!
    redirect_back_or_to expense_containers_path, notice: t(".archived")
  end

  def activate
    @container.activate!
    redirect_back_or_to expense_containers_path, notice: t(".activated")
  end

  private

    def set_container
      @container = Current.family.expense_containers.find(params[:id])
    end

    def container_params
      params.require(:expense_container).permit(
        :name, :description, :target_amount, :currency,
        :starts_on, :ends_on, :color, :lucide_icon, :status
      )
    end
end
