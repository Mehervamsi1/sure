require "test_helper"

class ExpenseContainersControllerTest < ActionDispatch::IntegrationTest
  setup do
    sign_in @user = users(:family_admin)
    @family = @user.family
    @container = @family.expense_containers.create!(
      name: "Goa Trip", currency: @family.currency, target_amount: 2_000
    )
    @entry = entries(:transaction)
  end

  test "index lists containers" do
    get expense_containers_url

    assert_response :success
    assert_match "Goa Trip", response.body
  end

  test "creates a container defaulting to the family currency" do
    assert_difference "ExpenseContainer.count", 1 do
      post expense_containers_url, params: {
        expense_container: { name: "Kitchen Reno", target_amount: 5_000 }
      }
    end

    container = ExpenseContainer.order(:created_at).last
    assert_equal @family.currency, container.currency
    assert_equal "active", container.status
    assert_redirected_to expense_container_path(container)
  end

  test "container names are unique per family" do
    assert_no_difference "ExpenseContainer.count" do
      post expense_containers_url, params: { expense_container: { name: "Goa Trip" } }
    end

    assert_response :unprocessable_entity
  end

  test "show gathers only this container's transactions and totals them" do
    filed = @entry.entryable
    filed.update!(expense_container: @container)

    get expense_container_url(@container)

    assert_response :success
    assert_equal @entry.amount, @container.reload.total_spent
    assert_match @entry.name, response.body
  end

  test "assigning a container on a transaction files it without hiding it" do
    patch transaction_url(@entry), params: {
      entry: { entryable_type: "Transaction", entryable_attributes: { id: @entry.entryable_id, expense_container_id: @container.id } }
    }

    assert_equal @container, @entry.entryable.reload.expense_container

    # Still present in the normal transactions list - the container is an
    # additional lens, not a filter that removes it from the main view.
    get transactions_url
    assert_response :success
    assert_match @entry.name, response.body
  end

  test "archiving and reactivating a container" do
    patch archive_expense_container_url(@container)
    assert_equal "archived", @container.reload.status

    patch activate_expense_container_url(@container)
    assert_equal "active", @container.reload.status
  end

  test "deleting a container keeps its transactions and unfiles them" do
    @entry.entryable.update!(expense_container: @container)

    assert_difference "ExpenseContainer.count", -1 do
      assert_no_difference "Transaction.count" do
        delete expense_container_url(@container)
      end
    end

    assert_nil @entry.entryable.reload.expense_container_id
  end

  test "cannot reach another family's container" do
    other_family = families(:empty)
    foreign = other_family.expense_containers.create!(name: "Not Mine", currency: other_family.currency)

    assert_raises(ActiveRecord::RecordNotFound) { get expense_container_url(foreign) }
  end

  test "target progress reports over budget" do
    @container.update!(target_amount: 1)
    @entry.entryable.update!(expense_container: @container)

    assert @container.reload.over_budget?, "spend above target should report over budget"
  end
end
