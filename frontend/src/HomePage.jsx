import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Calendar, Clock, Users, BookOpen, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-emerald-600" />
            <span className="text-xl font-bold">UniSwap</span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link to="#features" className="text-sm font-medium hover:underline underline-offset-4">
              Features
            </Link>
            <Link to="#how-it-works" className="text-sm font-medium hover:underline underline-offset-4">
              How It Works
            </Link>
            <Link to="#testimonials" className="text-sm font-medium hover:underline underline-offset-4">
              Testimonials
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="outline" className="hidden md:flex">
                Log In
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-emerald-600 hover:bg-emerald-700">Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-white to-emerald-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center justify-center">
              <div className="space-y-4 text-center lg:text-left">
                <div className="inline-block rounded-lg bg-emerald-100 px-3 py-1 text-sm text-emerald-700">
                  University Hour Management
                </div>
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Effortlessly Swap Teaching Hours with Colleagues
                </h1>
                <p className="text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  UniSwap makes it simple for professors to coordinate and exchange teaching hours, ensuring flexibility
                  in academic schedules without administrative hassle.
                </p>
                <div className="flex flex-col gap-2 min-[400px]:flex-row justify-center lg:justify-start">
                  <Link to="/signup">
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="#how-it-works">
                    <Button variant="outline">Learn More</Button>
                  </Link>
                </div>
              </div>
              <div className="flex justify-center mx-auto">
                <div className="relative w-full max-w-md overflow-hidden rounded-xl border bg-white shadow-xl transition-all hover:shadow-2xl">
                  <div className="p-6">
                    <div className="flex items-center justify-between border-b pb-4">
                      <div>
                        <h3 className="text-lg font-semibold">Your Schedule</h3>
                        <p className="text-sm text-gray-500">Fall Semester 2023</p>
                      </div>
                      <Calendar className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="mt-4 space-y-3">
                      {[
                        { day: "Monday", time: "10:00 - 12:00", course: "Computer Science 101", room: "Room A-201" },
                        { day: "Wednesday", time: "14:00 - 16:00", course: "Data Structures", room: "Room B-105" },
                        { day: "Thursday", time: "09:00 - 11:00", course: "Algorithms", room: "Room C-302" },
                      ].map((item, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 rounded-lg border p-3 transition-all hover:bg-emerald-50"
                        >
                          <div className="mt-0.5 rounded-full bg-emerald-100 p-1.5">
                            <Clock className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {item.day}: {item.time}
                            </div>
                            <div className="text-sm text-gray-500">{item.course}</div>
                            <div className="text-xs text-gray-400">{item.room}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-center">
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Request Swap</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-emerald-100 px-3 py-1 text-sm text-emerald-700">
                  Key Features
                </div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Designed for Academic Flexibility</h2>
                <p className="max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our platform offers intuitive tools to help professors manage their teaching schedules efficiently.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8 justify-items-center">
              {[
                {
                  icon: <Calendar className="h-10 w-10 text-emerald-600" />,
                  title: "Visual Schedule Management",
                  description: "Intuitive calendar interface to view and manage your teaching hours at a glance.",
                },
                {
                  icon: <Users className="h-10 w-10 text-emerald-600" />,
                  title: "Colleague Matching",
                  description: "Smart algorithm to find compatible colleagues for hour swaps based on availability.",
                },
                {
                  icon: <Clock className="h-10 w-10 text-emerald-600" />,
                  title: "Real-time Notifications",
                  description: "Instant alerts for swap requests, approvals, and schedule changes.",
                },
                {
                  icon: <BookOpen className="h-10 w-10 text-emerald-600" />,
                  title: "Course Integration",
                  description: "Seamlessly integrates with your university's course catalog and room assignments.",
                },
                {
                  icon: <ArrowRight className="h-10 w-10 text-emerald-600" />,
                  title: "One-Click Swaps",
                  description: "Simplify the exchange process with one-click approval for compatible requests.",
                },
                {
                  icon: <Users className="h-10 w-10 text-emerald-600" />,
                  title: "Department Analytics",
                  description: "Insights for department heads on teaching load distribution and swap patterns.",
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-lg border p-6 hover:shadow-md transition-all duration-200 hover:border-emerald-200 w-full max-w-sm"
                >
                  <div className="mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-gray-500 mt-2">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="w-full py-12 md:py-24 bg-emerald-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-emerald-100 px-3 py-1 text-sm text-emerald-700">
                  How It Works
                </div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Simple Process, Powerful Results</h2>
                <p className="max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our streamlined process makes swapping hours with colleagues effortless.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3 mt-12 justify-items-center">
              {[
                {
                  step: "01",
                  title: "Register & Import Schedule",
                  description: "Create your account and import your teaching schedule from the university system.",
                },
                {
                  step: "02",
                  title: "Find Compatible Swaps",
                  description: "Browse available slots or let our system suggest compatible swap opportunities.",
                },
                {
                  step: "03",
                  title: "Request & Confirm",
                  description: "Send swap requests to colleagues and receive notifications when confirmed.",
                },
              ].map((step, index) => (
                <div key={index} className="relative flex flex-col items-center w-full max-w-xs">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white text-xl font-bold">
                    {step.step}
                  </div>
                  <div
                    className="mt-4 h-px w-full bg-emerald-200 md:mt-8 md:w-px md:h-full md:absolute md:left-8 md:top-16"
                    style={{ display: index === 2 ? "none" : "block" }}
                  ></div>
                  <div className="mt-6 space-y-2 md:mt-8 text-center">
                    <h3 className="text-xl font-bold">{step.title}</h3>
                    <p className="text-gray-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="w-full py-12 md:py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-emerald-100 px-3 py-1 text-sm text-emerald-700">
                  Testimonials
                </div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Trusted by Professors Nationwide</h2>
                <p className="max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Hear what faculty members have to say about their experience with UniSwap.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8 justify-items-center">
              {[
                {
                  quote:
                    "UniSwap has revolutionized how our department handles scheduling conflicts. It's saved us countless hours of administrative work.",
                  name: "Dr. Sarah Johnson",
                  title: "Department Chair, Computer Science",
                },
                {
                  quote:
                    "The intuitive interface makes finding and requesting swaps incredibly easy. I can manage my work-life balance much better now.",
                  name: "Prof. Michael Chen",
                  title: "Associate Professor, Mathematics",
                },
                {
                  quote:
                    "As someone who commutes long distance, being able to consolidate my teaching days has been life-changing. UniSwap made it possible.",
                  name: "Dr. Emily Rodriguez",
                  title: "Assistant Professor, Engineering",
                },
              ].map((testimonial, index) => (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-lg border p-6 hover:shadow-md transition-all duration-200 w-full max-w-sm"
                >
                  <div className="mb-4 text-emerald-600">
                    {'★'.repeat(5)}
                  </div>
                  <p className="italic text-gray-600">"{testimonial.quote}"</p>
                  <div className="mt-4 pt-4 border-t">
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 bg-emerald-600 text-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center justify-between">
              <div className="space-y-4 text-center lg:text-left">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                  Ready to Transform Your Teaching Schedule?
                </h2>
                <p className="text-emerald-100 md:text-xl/relaxed">
                  Join thousands of professors who have simplified their academic lives with UniSwap.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row justify-center lg:justify-end">
                <Link to="/signup">
                  <Button className="bg-white text-emerald-600 hover:bg-emerald-50">
                    Get Started Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" className="border-white text-white hover:bg-emerald-700">
                    Contact Support
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-white">
        <div className="container mx-auto flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-emerald-600" />
            <span className="text-xl font-bold">UniSwap</span>
          </div>
          <nav className="flex gap-4 md:gap-6">
            <Link to="#" className="text-sm hover:underline underline-offset-4">
              Terms of Service
            </Link>
            <Link to="#" className="text-sm hover:underline underline-offset-4">
              Privacy Policy
            </Link>
            <Link to="#" className="text-sm hover:underline underline-offset-4">
              Support
            </Link>
          </nav>
          <div className="text-sm text-gray-500">© {new Date().getFullYear()} UniSwap. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}