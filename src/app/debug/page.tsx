import { auth } from "@clerk/nextjs/server";

export default async function DebugPage() {
  const session = await auth();

  return (
    <pre>
      {JSON.stringify(session, null, 2)}
    </pre>
  );
}