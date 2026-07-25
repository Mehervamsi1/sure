require "test_helper"

# Dependent Parent -> Child category selects on the transaction form.
#
# A top-level category is a complete choice on its own, so the subcategory half
# is always optional and the parent is persisted when no child is picked.
class TransactionsParentChildCategoryTest < ActionDispatch::IntegrationTest
  setup do
    sign_in @user = users(:family_admin)
    @entry = entries(:transaction)
    @parent = categories(:food_and_drink)
    @child = categories(:subcategory)
  end

  test "form renders parent and child selects with the cascade map" do
    get new_transaction_url

    assert_response :success
    assert_select "[data-controller='category-cascade']" do |elements|
      map = JSON.parse(elements.first["data-category-cascade-map-value"])
      assert_equal [ @child.id ], map[@parent.id],
        "parent should map to exactly its own subcategories"
    end

    # Parent select offers roots only; child select offers subcategories only.
    assert_select "input[name='entry[entryable_attributes][category_parent_id]']"
    assert_select "input[name='entry[entryable_attributes][category_id]']"
    assert_no_match(/#{Regexp.escape(@child.name)}/, parent_select_markup,
      "child category must not appear among the parent options")
  end

  test "saves the child category when a subcategory is chosen" do
    assert_difference "Transaction.count", 1 do
      post transactions_url, params: transaction_params(
        category_parent_id: @parent.id,
        category_id: @child.id
      )
    end

    assert_equal @child, Transaction.order(:created_at).last.category
  end

  test "saves the parent category when no subcategory is chosen" do
    assert_difference "Transaction.count", 1 do
      post transactions_url, params: transaction_params(
        category_parent_id: @parent.id,
        category_id: ""
      )
    end

    assert_equal @parent, Transaction.order(:created_at).last.category
  end

  test "category stays blank when neither parent nor child is chosen" do
    assert_difference "Transaction.count", 1 do
      post transactions_url, params: transaction_params(
        category_parent_id: "",
        category_id: ""
      )
    end

    assert_nil Transaction.order(:created_at).last.category
  end

  test "ignores a parent id belonging to another family" do
    foreign = Category.where.not(family_id: @user.family_id).first ||
      Family.where.not(id: @user.family_id).first&.categories&.create!(name: "Foreign")

    skip "no other family in fixtures" if foreign.nil?

    post transactions_url, params: transaction_params(
      category_parent_id: foreign.id,
      category_id: ""
    )

    assert_nil Transaction.order(:created_at).last.category
  end

  test "prefills parent and child when editing a transaction on a subcategory" do
    @entry.entryable.update!(category: @child)

    get edit_transaction_url(@entry)

    assert_response :success
    assert_select "input[name='entry[entryable_attributes][category_parent_id]'][value=?]", @parent.id
    assert_select "input[name='entry[entryable_attributes][category_id]'][value=?]", @child.id
  end

  test "prefills parent only when editing a transaction on a top-level category" do
    @entry.entryable.update!(category: @parent)

    get edit_transaction_url(@entry)

    assert_response :success
    assert_select "input[name='entry[entryable_attributes][category_parent_id]'][value=?]", @parent.id
    assert_select "input[name='entry[entryable_attributes][category_id]']" do |inputs|
      assert inputs.first["value"].blank?, "child select should be empty for a top-level category"
    end
  end

  private

    def transaction_params(category_parent_id:, category_id:)
      {
        entry: {
          account_id: @entry.account_id,
          name: "Badminton Drink",
          date: Date.current,
          currency: "USD",
          amount: 2.5,
          nature: "outflow",
          entryable_type: "Transaction",
          entryable_attributes: {
            category_parent_id: category_parent_id,
            category_id: category_id
          }
        }
      }
    end

    # Markup of the parent half only, so option assertions cannot accidentally
    # match the child select rendered further down the same form.
    def parent_select_markup
      css_select("[data-category-cascade-target='parent']").to_s
    end
end
