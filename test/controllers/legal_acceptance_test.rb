require "test_helper"

# Terms and privacy were 12-line placeholder views with no way to record that
# anyone had agreed to anything. These cover the versioned acceptance gate.
class LegalAcceptanceTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:family_admin)

    @terms = LegalDocument.create!(
      kind: "terms", version: "2026-09-01", effective_at: 1.day.ago,
      body: "Placeholder terms body."
    )
    @privacy = LegalDocument.create!(
      kind: "privacy", version: "2026-09-01", effective_at: 1.day.ago,
      body: "Placeholder privacy body."
    )
  end

  test "a signed-in user with nothing accepted is sent to the acceptance page" do
    sign_in @user

    get root_url

    assert_redirected_to legal_acceptance_path
  end

  test "the acceptance page itself is never blocked" do
    sign_in @user

    get legal_acceptance_url

    assert_response :success
    assert_match @terms.body, response.body
    assert_match @privacy.body, response.body
  end

  test "reading the documents is never blocked by the gate" do
    sign_in @user

    get privacy_url
    assert_response :success

    get terms_url
    assert_response :success
  end

  test "accepting records the exact version and unblocks the app" do
    sign_in @user

    assert_difference "LegalAcceptance.count", 2 do
      post legal_acceptance_url, params: { accept: "1" }
    end

    assert_redirected_to root_path
    assert_equal [ @privacy.id, @terms.id ].sort,
      @user.legal_acceptances.pluck(:legal_document_id).sort

    get root_url
    assert_response :success
  end

  test "submitting without ticking the box records nothing" do
    sign_in @user

    assert_no_difference "LegalAcceptance.count" do
      post legal_acceptance_url
    end

    assert_redirected_to legal_acceptance_path
  end

  test "a new version re-prompts a user who accepted the previous one" do
    sign_in @user
    post legal_acceptance_url, params: { accept: "1" }

    get root_url
    assert_response :success

    LegalDocument.create!(
      kind: "terms", version: "2026-10-01", effective_at: 1.hour.ago,
      body: "Updated terms body.", summary_of_changes: "Clarified data retention."
    )

    get root_url
    assert_redirected_to legal_acceptance_path,
      "a newly effective version must be re-accepted"
  end

  test "a future-dated version does not prompt anyone yet" do
    sign_in @user
    post legal_acceptance_url, params: { accept: "1" }

    LegalDocument.create!(
      kind: "terms", version: "2027-01-01", effective_at: 1.month.from_now,
      body: "Future terms body."
    )

    get root_url
    assert_response :success, "a document that is not in effect must not block anyone"
  end

  test "re-accepting keeps the original timestamp" do
    sign_in @user
    post legal_acceptance_url, params: { accept: "1" }
    original = @user.legal_acceptances.find_by(legal_document: @terms).accepted_at

    LegalAcceptance.record!(user: @user, legal_document: @terms)

    assert_equal original, @user.legal_acceptances.find_by(legal_document: @terms).reload.accepted_at,
      "the date someone agreed must not move"
  end

  test "the ip address is stored only as a digest" do
    sign_in @user
    post legal_acceptance_url, params: { accept: "1" }

    acceptance = @user.legal_acceptances.first

    assert_not_includes LegalAcceptance.column_names, "ip_address"
    if acceptance.ip_address_digest.present?
      assert_equal 64, acceptance.ip_address_digest.length, "expected a SHA256 hex digest"
    end
  end

  test "published documents render on the public pages" do
    get privacy_url

    assert_response :success
    assert_match @privacy.body, response.body
    assert_match @privacy.version, response.body
  end

  test "current returns the newest document already in effect" do
    newer = LegalDocument.create!(
      kind: "terms", version: "2026-09-15", effective_at: 1.hour.ago, body: "Newer terms."
    )
    LegalDocument.create!(
      kind: "terms", version: "2099-01-01", effective_at: 10.years.from_now, body: "Far future."
    )

    assert_equal newer, LegalDocument.current("terms")
  end
end
