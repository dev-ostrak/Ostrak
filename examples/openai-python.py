# pip install openai, then: OSTRAK_API_KEY=osk_live_... python examples/openai-python.py
import os

from openai import OpenAI

client = OpenAI(api_key=os.environ["OSTRAK_API_KEY"], base_url="https://ostrak.one/v1")

raw = client.chat.completions.with_raw_response.create(
    model="ostrak/auto",
    messages=[{"role": "user", "content": "Say hello in five words."}],
)
completion = raw.parse()
print(completion.choices[0].message.content)
print("model:", raw.headers.get("x-ostrak-model"), "cost (USD):", raw.headers.get("x-ostrak-cost"))
