import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Side - Branding/Hero (Hidden on smaller screens) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-center px-16 relative overflow-hidden">
        {/* Soft background glow */}
        <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-3xl" />
        
        <div className="relative z-10 max-w-lg">
          <Link href="/" className="inline-block mb-12">
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              Wealth AI
            </h1>
          </Link>
          <h2 className="text-5xl font-bold mb-6 leading-tight text-white">
            Manage Your Finance <br /> with Intelligence
          </h2>
          <p className="text-lg text-slate-300">
            An AI-powered financial management platform that helps you track, analyze, and optimize your spending with real-time insights.
          </p>
        </div>
      </div>

      {/* Right Side - Form Container */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 bg-white relative">
        {/* Back to Home Button for mobile */}
        <div className="absolute top-8 left-8 lg:hidden">
          <Link href="/" className="font-bold text-xl text-blue-600">
            Wealth AI
          </Link>
        </div>

        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}