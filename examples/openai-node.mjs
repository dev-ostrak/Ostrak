// npm install openai, then: OSTRAK_API_KEY=osk_live_... node examples/openai-node.mjs
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OSTRAK_API_KEY, baseURL: "https://ostrak.one/v1" });

const { data, response } = await client.chat.completions
  .create({ model: "ostrak/auto", messages: [{ role: "user", content: "Say hello in five words." }] })
  .withResponse();

console.log(data.choices[0].message.content);
console.log("model:", response.headers.get("x-ostrak-model"), "cost (USD):", response.headers.get("x-ostrak-cost"));
