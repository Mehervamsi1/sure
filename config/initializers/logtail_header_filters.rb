# frozen_string_literal: true

# logtail-rack logs every request and response with a full `headers_json` dump.
# That included `Cookie` (the plaintext `_sure_session` value) and `Set-Cookie`,
# so anyone who could read production logs could lift a live session and
# impersonate the user. Rails' `filter_parameters` does not apply here: it
# filters params, not headers, and these events come from the gem's own Rack
# middleware rather than Rails' logger.
#
# `http_header_filters` is the gem's supported hook — matched headers are
# emitted as "[FILTERED]" instead of their value, for both requests and
# responses. Names are normalised internally (downcased, dashes to
# underscores), so the casing below is only for readability.
#
# Filtering these also cuts log volume substantially: the cookie alone was
# several hundred bytes on every single line.
if defined?(Logtail::Integrations::Rack::HTTPEvents)
  Logtail::Integrations::Rack::HTTPEvents.http_header_filters = [
    "Cookie",
    "Set-Cookie",
    "Authorization",
    "Proxy-Authorization",
    "X-Api-Key",
    "X-Auth-Token",
    "X-CSRF-Token"
  ]
end
