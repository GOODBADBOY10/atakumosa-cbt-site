"use client";

import { useEffect, useState, type ReactNode } from "react";

export function HeroSlideshow({
    images,
    interval = 3000,
    children,
}: {
    images: string[];
    interval?: number;
    children: ReactNode;
}) {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        if (images.length < 2) return;
        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % images.length);
        }, interval);
        return () => clearInterval(timer);
    }, [images.length, interval]);

    return (
        <section className="relative overflow-hidden bg-blue-900 text-white">
            {/* Background images (all rendered, cross-fading) */}
            {images.map((src, i) => (
                <div
                    key={src}
                    aria-hidden="true"
                    className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${i === current ? "opacity-100" : "opacity-0"
                        }`}
                    style={{ backgroundImage: `url(${src})` }}
                />
            ))}

            {/* Dark blue overlay so the text stays readable */}
            <div className="absolute inset-0 bg-blue-900/70" />

            {/* Dotted pattern (optional, remove if you don't like it) */}
            <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                    backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                    backgroundSize: "22px 22px",
                }}
            />

            {/* Hero content */}
            <div className="relative z-10">{children}</div>
        </section>
    );
}