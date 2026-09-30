import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PublicHeader } from "@/app/components/PublicHeader";

export default async function HomePage() {
  const session = await auth();

  if (session?.user?.role === "admin") redirect("/admin");
  if (session?.user?.role === "teacher") redirect("/teacher");
  if (session?.user?.role === "student") redirect("/student");

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <PublicHeader />

      {/* HERO */}
      <section className="relative overflow-hidden bg-linear-to-br from-blue-900 via-blue-700 to-blue-500 text-white">
        <div className="max-w-5xl mx-auto px-6 py-24 text-center relative z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.jpg"
            alt="Atakumosa High School Logo"
            className="w-24 h-24 mx-auto mb-6 rounded-full object-cover bg-white/10 border-2 border-white/40"
          />
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3">
            ATAKUMOSA HIGH SCHOOL, OSU
          </h1>
          <p className="text-white/90 text-lg mb-1">Ife Road, Osu</p>
          <div className="mt-6 inline-flex flex-col items-center gap-1">
            <p className="text-xl sm:text-2xl font-semibold">Atakumosa High School</p>
            <p className="text-white/80 italic">Ko lafarawe</p>
          </div>
          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <a
              href="#about"
              className="bg-white text-blue-800 px-6 py-2.5 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              Learn More
            </a>
            <a
              href="/login"
              className="border border-white/70 px-6 py-2.5 rounded-lg font-medium hover:bg-white/10 transition-colors"
            >
              CBT Portal Login
            </a>
          </div>
        </div>
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
      </section>

      {/* ABOUT / HISTORY */}
      <section id="about" className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold mb-4">About Our School</h2>
        <p className="text-gray-600 leading-relaxed">
          {/* TODO: Replace with the school's actual history text once provided */}
          [Brief history of the school goes here — ask the school to provide a
          few paragraphs about when it was founded, its founding vision, and
          key milestones over the years.]
        </p>
      </section>

      {/* VISION & MISSION */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-6 grid sm:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-lg font-semibold mb-2 text-blue-800">Our Vision</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {/* TODO: Replace with the school's actual vision statement */}
              [Vision statement to be provided by the school.]
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-lg font-semibold mb-2 text-blue-800">Our Mission</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {/* TODO: Replace with the school's actual mission statement */}
              [Mission statement to be provided by the school.]
            </p>
          </div>
        </div>
      </section>

      {/* DIRECTOR'S SPEECH */}
      <section id="director" className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold mb-8 text-center">
          A Message From Our Director
        </h2>
        <div className="grid sm:grid-cols-[160px_1fr] gap-8 items-start">
          <div className="flex flex-col items-center sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/director.jpg"
              alt="Mr. Odedele, Director"
              className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
            />
            <p className="mt-3 font-semibold text-center sm:text-left">Mr. Odedele</p>
            <p className="text-sm text-gray-500 text-center sm:text-left">Director</p>
            <p className="text-xs text-gray-500 mt-1">+234 803 566 7978</p>
            <p className="text-xs text-gray-500">oolugbemi464@gmail.com</p>
          </div>
          <div className="bg-gray-50 border rounded-xl p-6 text-gray-600 leading-relaxed text-sm">
            {/* TODO: Replace with the Director's actual speech text */}
            [Director's speech goes here — ask Mr. Odedele for a short
            written message to parents and students, a few paragraphs long.]
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery" className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-8 text-center">Gallery</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((num) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={num}
                src={`/images/gallery-${num}.jpg`}
                alt={`School gallery photo ${num}`}
                className="aspect-square rounded-lg object-cover border bg-white"
              />
            ))}
          </div>
          
        </div>
      </section>

      {/* ANTHEM */}
      <section id="anthem" className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">School Anthem</h2>
        <div className="bg-gray-50 border rounded-xl p-6">
          {/* <audio controls className="w-full mb-4"> */}
            {/* <source src="/audio/anthem.mp3" type="audio/mpeg" /> */}
            {/* Your browser does not support the audio element. */}
          {/* </audio> */}
          <p className="whitespace-pre-line text-left text-gray-600 text-sm">
            {/* TODO: Replace with actual anthem lyrics */}
            [Anthem lyrics go here once provided by the school.]
          </p>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="bg-blue-900 text-white py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold mb-6">Contact Us</h2>
          <div className="grid sm:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-white/60 mb-1">Address</p>
              <p>Ife Road, Osu</p>
            </div>
            <div>
              <p className="text-white/60 mb-1">Phone</p>
              <p>0803 464 1406</p>
            </div>
            <div>
              <p className="text-white/60 mb-1">Email</p>
              <p>betterfuturesystems@gmail.com</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-400 py-8 text-center text-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo.jpg"
          alt="Atakumosa High School Logo"
          className="w-12 h-12 mx-auto mb-3 rounded-full object-cover"
        />
        <p className="text-white font-medium mb-1">
          ATAKUMOSA HIGH SCHOOL, OSU
        </p>
        <p className="italic mb-3">"Ko lafarawe"</p>
        <p>&copy; {new Date().getFullYear()} Atakumosa High School. All rights reserved.</p>
        <a href="/login" className="text-blue-400 hover:underline mt-2 inline-block">
          Staff & Student CBT Login →
        </a>
      </footer>
    </div>
  );
}