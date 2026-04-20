"use client";

import * as React from "react";
import { animate, useMotionValue } from "framer-motion";

import { cn } from "@/lib/utils";

function mapRange(value, fromLow, fromHigh, toLow, toHigh) {
  if (fromLow === fromHigh) {
    return toLow;
  }

  const percentage = (value - fromLow) / (fromHigh - fromLow);
  return toLow + percentage * (toHigh - toLow);
}

function useInstanceId() {
  const id = React.useId();
  return `etheral-shadow-${id.replace(/:/g, "")}`;
}

export function EtheralShadow({
  sizing = "fill",
  color = "rgba(17, 17, 17, 0.12)",
  animation = { scale: 56, speed: 78 },
  noise = { opacity: 0.08, scale: 1.1 },
  className,
  style,
}) {
  const id = useInstanceId();
  const feColorMatrixRef = React.useRef(null);
  const hueRotateMotionValue = useMotionValue(180);
  const hueRotateAnimation = React.useRef(null);

  const animationEnabled = Boolean(animation?.scale > 0);
  const displacementScale = animationEnabled
    ? mapRange(animation.scale, 1, 100, 20, 100)
    : 0;
  const animationDuration = animationEnabled
    ? mapRange(animation.speed, 1, 100, 1000, 50)
    : 1;

  React.useEffect(() => {
    if (!feColorMatrixRef.current || !animationEnabled) {
      return undefined;
    }

    if (hueRotateAnimation.current) {
      hueRotateAnimation.current.stop();
    }

    hueRotateMotionValue.set(0);
    hueRotateAnimation.current = animate(hueRotateMotionValue, 360, {
      duration: animationDuration / 25,
      repeat: Infinity,
      repeatType: "loop",
      ease: "linear",
      onUpdate: (value) => {
        if (feColorMatrixRef.current) {
          feColorMatrixRef.current.setAttribute("values", String(value));
        }
      },
    });

    return () => {
      if (hueRotateAnimation.current) {
        hueRotateAnimation.current.stop();
      }
    };
  }, [animationDuration, animationEnabled, hueRotateMotionValue]);

  return (
    <div
      aria-hidden="true"
      className={cn("relative h-full w-full overflow-hidden bg-white", className)}
      style={style}>
      <div
        className="absolute"
        style={{
          inset: -displacementScale,
          filter: animationEnabled ? `url(#${id}) blur(4px)` : "none",
        }}>
        {animationEnabled ? (
          <svg className="absolute h-0 w-0">
            <defs>
              <filter id={id}>
                <feTurbulence
                  result="undulation"
                  numOctaves="2"
                  baseFrequency={`${
                    mapRange(animation.scale, 0, 100, 0.001, 0.0005)
                  },${mapRange(animation.scale, 0, 100, 0.004, 0.002)}`}
                  seed="0"
                  type="turbulence"
                />
                <feColorMatrix
                  ref={feColorMatrixRef}
                  in="undulation"
                  type="hueRotate"
                  values="180"
                />
                <feColorMatrix
                  in="dist"
                  result="circulation"
                  type="matrix"
                  values="4 0 0 0 1  4 0 0 0 1  4 0 0 0 1  1 0 0 0 0"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="circulation"
                  scale={displacementScale}
                  result="dist"
                />
                <feDisplacementMap
                  in="dist"
                  in2="undulation"
                  scale={displacementScale}
                  result="output"
                />
              </filter>
            </defs>
          </svg>
        ) : null}

        <div
          style={{
            backgroundColor: color,
            maskImage:
              "url('https://framerusercontent.com/images/ceBGguIpUU8luwByxuQz79t7To.png')",
            WebkitMaskImage:
              "url('https://framerusercontent.com/images/ceBGguIpUU8luwByxuQz79t7To.png')",
            maskSize: sizing === "stretch" ? "100% 100%" : "cover",
            WebkitMaskSize: sizing === "stretch" ? "100% 100%" : "cover",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
            width: "100%",
            height: "100%",
          }}
        />
      </div>

      {noise && noise.opacity > 0 ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'url("https://framerusercontent.com/images/g0QcWrxr87K0ufOxIUFBakwYA8.png")',
            backgroundSize: noise.scale * 200,
            backgroundRepeat: "repeat",
            opacity: noise.opacity / 2,
          }}
        />
      ) : null}
    </div>
  );
}
