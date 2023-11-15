import { IRequest } from "itty-router";

const handler = async (request: IRequest, env: Env, ctx: ExecutionContext) => {
  const { query: { type, url, inputNum } } = request;

  if (type == "setWebhook" && url) {
    const webhookUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook?url=${encodeURIComponent(url as string)}`;
    // const res = await fetch(webhookUrl);
    return new Response(webhookUrl);
  } else if (type =="random" && inputNum) {
    let sum: number = parseInt(inputNum as string);
    const randomNumbers = generateRandomNumbers(sum);
    const total = add(randomNumbers);
    return Response.json({
      arrs: randomNumbers,
      total
    });
  } else if (type == "env") {
    return Response.json(env);
  }

}

function add(arr: number[]) : number {
  let total = 0;
  arr.forEach(element => {
    total += element;
  });

  return total;
}

function generateRandomNumbers(totalAmount: number): number[] {
  const redPacketAmounts: number[] = [];
  let remainingAmount = totalAmount;

  for (let i = 0; i < 5; i++) {
    const maxAmount = remainingAmount * 0.7;
    const randomAmount = Math.random() * maxAmount;
    const roundedAmount = Math.round(randomAmount * 100) / 100;
    redPacketAmounts.push(roundedAmount);
    remainingAmount -= roundedAmount;
  }
  const last = Math.round(remainingAmount * 100) / 100;
  redPacketAmounts.push(last);

  return redPacketAmounts;
}

export default handler;