"use server";
import { clearAuthCookie } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function logout() {
  await clearAuthCookie();
  redirect("/sign-in");
}