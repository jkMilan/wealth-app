import { checkUser } from "@/lib/checkUser";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Camera } from "lucide-react";
import Link from "next/link";
import ProfileForm from "./_components/profile-form";

export default async function ProfilePage() {
  const user = await checkUser();

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);
  };

  return (
    <div className="container mx-auto px-4 py-32 max-w-6xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>
      
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 space-y-1">
          <Link href="/profile" className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg font-medium transition-colors">
            <User size={18} /> Profile
          </Link>
        </div>

        <div className="flex-1">
          <Card className="border-gray-100 shadow-sm">
            <CardHeader className="pb-6 border-b border-gray-100 mb-6">
              <CardTitle className="text-2xl">Profile Details</CardTitle>
              <CardDescription>Manage your personal information and profile picture.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <ProfileForm user={user} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}