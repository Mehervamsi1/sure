require "test_helper"

# Guards the fix for session cookies leaking into production logs: logtail-rack
# dumps full request/response headers, so Cookie/Authorization must be filtered.
class LogtailHeaderFiltersTest < ActiveSupport::TestCase
  test "sensitive headers are registered for filtering" do
    skip "logtail-rack not loaded" unless defined?(Logtail::Integrations::Rack::HTTPEvents)

    filters = Logtail::Integrations::Rack::HTTPEvents.http_header_filters.to_a

    %w[cookie set_cookie authorization].each do |header|
      assert_includes filters, header,
        "#{header} must be filtered or session tokens end up in plaintext logs"
    end
  end

  test "filtered headers are redacted rather than emitted" do
    skip "logtail-rack not loaded" unless defined?(Logtail::Integrations::Rack::HTTPEvents)

    events = Logtail::Integrations::Rack::HTTPEvents.new(->(_env) { [ 200, {}, [ "ok" ] ] })
    filtered = events.send(:filter_http_headers, {
      "Cookie" => "_sure_session=super-secret-value",
      "Authorization" => "Bearer super-secret-token",
      "Accept" => "text/html"
    })

    refute_includes filtered.to_s, "super-secret-value"
    refute_includes filtered.to_s, "super-secret-token"
    assert_equal "text/html", filtered["Accept"], "harmless headers must still be logged"
  end
end
