import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import BookingWidget from './components/BookingWidget';
import ErrorBoundary from './components/ErrorBoundary';

// Get user slug from URL params (e.g., ?user=john-plumber)
const urlParams = new URLSearchParams(window.location.search);
const userSlug = urlParams.get('user') || 'demo';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

function App() {
  return (
    <ErrorBoundary>
      <Elements stripe={stripePromise}>
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <BookingWidget userSlug={userSlug} />
          </div>
        </div>
      </Elements>
    </ErrorBoundary>
  );
}

export default App;
