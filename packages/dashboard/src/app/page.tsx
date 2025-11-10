import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4">
            Peepo<span className="text-primary-500">Pay</span>
          </h1>
          <p className="text-xl mb-8 text-gray-600">
            Production-grade booking and payment platform for tradies
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/login"
              className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition"
            >
              Login
            </Link>
            <Link
              href="/auth/signup"
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            >
              Sign Up
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 border border-gray-200 rounded-lg">
              <h3 className="text-xl font-bold mb-2">🎯 Easy Booking</h3>
              <p className="text-gray-600">
                Embeddable widget for seamless customer booking experience
              </p>
            </div>

            <div className="p-6 border border-gray-200 rounded-lg">
              <h3 className="text-xl font-bold mb-2">💰 Direct Payments</h3>
              <p className="text-gray-600">
                Money flows directly to your Stripe account with 2.5% platform fee
              </p>
            </div>

            <div className="p-6 border border-gray-200 rounded-lg">
              <h3 className="text-xl font-bold mb-2">📊 Full Control</h3>
              <p className="text-gray-600">
                Manage services, availability, and bookings from your dashboard
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
