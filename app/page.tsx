// app/page.tsx
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
export const runtime = 'edge';
export default async function Home() {
  const token = process.env.ADMIN_SESSION_TOKEN
  const cookieStore = await cookies() // Next 15: cookies() è async
  const session = cookieStore.get("admin_session")?.value

  if (token && session === token) {
    redirect("/dashboard")
  }

  redirect("/login")
}
