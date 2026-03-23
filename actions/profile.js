"use server";

import { checkUser } from "@/lib/checkUser";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProfile(data) {
  try {
    const user = await checkUser();
    if (!user) throw new Error("Unauthorized");

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        name: data.name,
        imageURL: data.imageURL,
      },
    });

    revalidatePath("/profile");
    
    revalidatePath("/", "layout"); 

    return { success: true, user: updatedUser };
  } catch (error) {
    return { success: false, error: error.message };
  }
}