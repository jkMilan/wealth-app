"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/button";
import { useRef, useEffect } from "react";

const HeroSection = () => {
  const imageRef = useRef()

  useEffect(() => {
    const imageElement = imageRef.current;

    const handeleScroll = () => {
      const scrollPosition = window.scrollY;
      const scrollThreshold = 100;
      
      if (scrollPosition > scrollThreshold){
        imageElement.classList.add("scrolled");
      }else{
        imageElement.classList.remove("scrolled");
      }
    };

    window.addEventListener('scroll', handeleScroll)

    return () => {
      window.removeEventListener('scroll', handeleScroll)
    }
  }, [])

  return (
  <div className="pb-20 px-4">
    <div className="container mx-auto text-center">
        <h1 className="text-8xl lg:text-[105px] pb-6 gradient-title">
            Manage Your finance <br /> with Intelligence
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            An Ai-powered financial management platform that helps you track,
            analyze, and optimize your spending with real-time insights and personalized recommendations.
        </p>
        <div className="flex justify-center space-x-4">
          <Link href="/dashboard">
            <Button size="lg" className="px-8">
              Get Started
            </Button>
          </Link>
          {/* <Link href="/dashboard">
            <Button size="lg" variant="outline" className="px-8">
              Get Started
            </Button>
          </Link> */}
        </div>
        <div className="hero-image-wrapper">
          <div ref={imageRef} className="hero-image">
            <Image
            src="/assets/banner.jpeg"
            width={1280}
            height={720}
            alt="Dashboard Preview"
            className="rounded-lg shadow-2xl border mx-auto"
            priority
            />
          </div>
        </div>
    </div>
  </div>
  );
}

export default HeroSection