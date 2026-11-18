#!/bin/sh
# One call through Ostrak. ostrak/auto picks the cheapest model that can do the job.
# Set OSTRAK_API_KEY to an agent key (osk_live_...) from your Ostrak console.
curl -sS https://ostrak.one/v1/chat/completions \
  -H "Authorization: Bearer $OSTRAK_API_KEY" \
  -H "Content-Type: application/json" \
  -D - \
  -d '{"model": "ostrak/auto", "messages": [{"role": "user", "content": "Say hello in five words."}]}'
# Response headers include x-ostrak-model, x-ostrak-cost and x-request-id.
# Look up the receipt for any call: curl https://ostrak.one/v1/receipts/<receipt id>
