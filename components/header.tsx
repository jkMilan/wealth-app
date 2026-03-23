import Image from "next/image"
import Link from "next/link"
import { Button } from "./ui/button"
import logo from "../public/assets/logo.png"
import { LayoutDashboard, PenBox, Repeat } from "lucide-react"
import { checkUser } from "@/lib/checkUser"
import UserButton from "./user-button";

const Header = async () => {
  const user = await checkUser();

  return (
    <div className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b">
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/">
          <Image
            src={logo}
            alt="Wealth AI Logo"
            width={200}
            height={60}
            className="h-12 w-auto object-contain"
          /> 
        </Link>

        <div className="flex items-center space-x-4">
          {user ? (
            <>
            <Link href={"/dashboard"} className="text-gray-600 hover:text-blue-600 flex items-center gap-2">
              <Button variant="outline" >
                <LayoutDashboard size={18}/>
                <span className="hidden md:inline">Dashboard</span>
              </Button>
            </Link>

            <Link href={"/subscriptions"} className="text-gray-600 hover:text-blue-600 flex items-center gap-2">
              <Button variant="outline" >
                <Repeat size={18}/>
                <span className="hidden md:inline">Subscriptions</span>
              </Button>
            </Link>

            <Link href={"/transactions/create"}>
              <Button className="flex items-center gap-2">
                <PenBox size={18}/>
                <span className="hidden md:inline">Add Transaction</span>
              </Button>
            </Link>

            <UserButton user={user} />

            </>
          ) : (
            <>
            <Link href={"/sign-in"}>
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link href={"/sign-up"}>
              <Button>Sign Up</Button>
            </Link>
            </>
          )}
        </div>
      </nav>
    </div>
  )
}

export default Header