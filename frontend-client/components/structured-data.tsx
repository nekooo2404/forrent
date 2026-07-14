import { headers } from "next/headers";

export async function StructuredData({ data }: Readonly<{ data: object }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const json = JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

  return <script dangerouslySetInnerHTML={{ __html: json }} nonce={nonce} type="application/ld+json" />;
}
