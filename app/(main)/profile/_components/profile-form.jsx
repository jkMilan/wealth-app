"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { updateProfile } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera } from "lucide-react";

export default function ProfileForm({ user }) {
  const [name, setName] = useState(user?.name || "");
  const [imageUrl, setImageUrl] = useState(user?.imageUrl || "");
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef(null);

  const getInitials = (nameStr) => {
    if (!nameStr) return "U";
    return nameStr.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image must be smaller than 2MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await updateProfile({ name, imageUrl });

      if (result.success) {
        toast.success("Profile updated successfully!");
      } else {
        toast.error(result.error || "Failed to update profile.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = name !== user?.name || imageUrl !== user?.imageUrl;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Hidden File Input */}
      <input 
        type="file" 
        accept="image/png, image/jpeg, image/jpg, image/gif" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleImageChange} 
      />

      {/* Avatar Display - Centered and isolated */}
      <div className="flex flex-col items-center sm:items-start gap-4">
        <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-3xl font-bold text-blue-700 overflow-hidden shadow-sm group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          {imageUrl ? (
            <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            getInitials(name)
          )}
          
          {/* Overlay that appears on hover, or is always visible at the bottom */}
          <div className="absolute bottom-0 w-full bg-black/50 py-1 flex justify-center text-white opacity-80 group-hover:opacity-100 transition-opacity">
            <Camera size={14} />
          </div>
        </div>
        {/* Inputs */}
      <div className="grid grid-cols-1 gap-6 pt-4 border-t">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input 
            id="name" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            className="h-11" 
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input 
            id="email" 
            defaultValue={user?.email || ""} 
            readOnly 
            className="h-11 bg-gray-50 text-gray-500 cursor-not-allowed" 
          />
        </div>
      </div>
      </div>

        {/* Cancel button if they uploaded an image */}
        {imageUrl !== user?.imageUrl && imageUrl && (
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            className="text-red-600 hover:text-red-700 h-8"
            onClick={() => setImageUrl(user?.imageUrl || "")}
          >
            Cancel Image Change
          </Button>
        )}
        
      </div>

      

      {/* Submit */}
      <div className="pt-6 border-t flex justify-end">
        <Button 
          type="submit" 
          className="px-8 bg-blue-600 hover:bg-blue-700" 
          disabled={loading || !hasChanges}
        >
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}