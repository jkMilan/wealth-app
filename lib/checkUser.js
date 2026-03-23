import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";
import { db } from "@/lib/prisma";

export const checkUser = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return null;

  try {
    const payload = await decrypt(token);
    if (!payload?.userId) return null;

    const loggedInUser = await db.user.findUnique({
      where: {
        id: payload.userId,
      },
    });

    return loggedInUser;
  } catch (error) {
    console.error("Authentication error:", error.message);
    return null;
  }
};